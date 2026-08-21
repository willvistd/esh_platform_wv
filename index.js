require('dotenv').config(); // 로컬 .env 자동 로드 (Railway는 env vars 직접 주입)
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ── 세션 (HMAC 서명 쿠키, 무상태) ──
// SESSION_SECRET 권장. 없으면 PGPASSWORD 기반 파생(재시작에도 안정 — 새 env 없이 동작)
const SESSION_SECRET = process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update('wv-session|' + (process.env.PGPASSWORD || 'dev')).digest('hex');
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const signSession = (user) => {
  const payload = b64u(JSON.stringify({ uid: user.id, role: user.role, exp: Date.now() + SESSION_TTL_MS }));
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
};
const verifySession = (token) => {
  try {
    if (!token) return null;
    const [payload, sig] = String(token).split('.');
    const expect = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    if (!sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    return data; // { uid, role, exp }
  } catch { return null; }
};
const getCookie = (req, name) => {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
};

// ── 비밀번호 해싱 헬퍼 (평문↔해시 전환기 안전) ──
const hashPw = (pw) => bcrypt.hashSync(String(pw), 10);
const isHashed = (v) => typeof v === 'string' && v.startsWith('$2');
// 저장값이 해시면 bcrypt 비교, 아직 평문이면 직접 비교(마이그레이션 과도기 호환)
const verifyPw = (input, stored) => {
  if (stored == null) return false;
  const s = String(stored);
  return isHashed(s) ? bcrypt.compareSync(String(input), s) : String(input) === s;
};

// ── WebSocket 폴리필 (supabase-js Node 호환) ──
if (typeof globalThis.WebSocket === 'undefined') {
  try { globalThis.WebSocket = require('ws'); } catch(e) {}
}
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const app = express();
app.use(cors());
// PDF 생성 시 모든 STEP 데이터(사진 base64 포함) 전송하므로 limit 확대
app.use(express.json({ limit: '50mb' }));

// ── 서버리스(Vercel) 대비: 요청 처리 전 DB 초기화 1회 보장 ──
// 상주 서버는 아래 app.listen 전에 initDB가 돌지만, 서버리스는 콜드스타트마다 모듈이
// 새로 로드되므로 첫 요청 때 지연 초기화(캐시된 Promise로 인스턴스당 1회)한다.
let _dbReady = null;
const ensureDb = () => (_dbReady = _dbReady || initDB());
app.use((req, res, next) => {
  ensureDb().then(() => next()).catch((e) => {
    console.error('DB 초기화 실패:', e);
    res.status(500).json({ error: 'DB 초기화 실패' });
  });
});

// ── 파일 업로드 설정 ──
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
// 로컬 디스크 저장 모드일 때만 폴더 생성. Supabase 사용/서버리스(Vercel 읽기전용 FS)에서는 불필요.
if (!supabase) {
  try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }); }
  catch (e) { console.warn('uploads 폴더 생성 생략:', e.message); }
}

// 로컬 실행 시 로컬 uploads 폴더 정적 서빙 (Railway+Supabase 환경에서는 URL이 절대경로라 미사용)
if (!supabase) app.use('/uploads', express.static(uploadsDir));

// ── 프론트엔드 정적 파일 서빙 ──
const frontendDir = process.env.FRONTEND_DIR || path.join(__dirname, 'public');
// .jsx/.js/.css/.html은 no-cache로 서빙 → 배포/수정 후 F5만 해도 최신 반영
// (브라우저가 ETag로 재검증 → 변경 없으면 304, 변경 시 새 파일. 강력 새로고침 불필요)
app.use(express.static(frontendDir, {
  setHeaders: (res, filePath) => {
    if (/\.(jsx|js|css|html)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  },
}));

// ── 도구: 안전보건표지 인쇄 (자기완결형 HTML). .html 없이도 접근 가능하게 ──
app.get('/tools/safety-signs', (req, res) => {
  res.sendFile(path.join(frontendDir, 'tools', 'safety-signs.html'));
});

// ── API 전체 인증 미들웨어 ──
// 로그인 세션 쿠키(wv_sess) 없으면 /api/* 접근 401.
// 예외(인증 불필요):
//  - /api/login, /api/logout, /api/register: 로그인/가입 자체
//  - /api/meta: 로그인 화면이 데모 여부 조회
//  - /api/hq (GET): 회원가입 화면의 본부 선택 드롭다운 (로그인 전 호출)
const AUTH_EXEMPT = [
  { method: 'POST', re: /^\/login$/ },
  { method: 'POST', re: /^\/logout$/ },
  { method: 'POST', re: /^\/register$/ },
  { method: 'GET',  re: /^\/meta$/ },
  { method: 'GET',  re: /^\/hq$/ },
];
app.use('/api', (req, res, next) => {
  if (AUTH_EXEMPT.some(r => r.method === req.method && r.re.test(req.path))) return next();
  const sess = verifySession(getCookie(req, 'wv_sess'));
  if (!sess) return res.status(401).json({ error: '로그인이 필요합니다.' });
  req.session = sess;
  next();
});

// ── multer: Supabase면 메모리, 로컬이면 디스크 ──
const upload = multer({
  storage: supabase ? multer.memoryStorage() : multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

  if (supabase) {
    const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname);
    const { error } = await supabase.storage.from('uploads').upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (error) return res.status(500).json({ error: error.message });
    const { data } = supabase.storage.from('uploads').getPublicUrl(filename);
    return res.json({ name: originalName, url: data.publicUrl, size: req.file.size });
  }

  // 로컬 폴백
  res.json({ name: originalName, url: `/uploads/${req.file.filename}`, size: req.file.size });
});

const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'willvision',
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || '',
  ssl: (process.env.PGHOST || '').includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
  // 서버리스(Vercel) 대비: 인스턴스당 커넥션 최소화.
  // ⚠ Supabase는 반드시 '커넥션 풀러'(포트 6543, ...pooler.supabase.com)를 PGHOST/PGPORT로 사용.
  max: parseInt(process.env.PG_POOL_MAX || '1'),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

// 데모 모드: 포트폴리오용 별도 배포에서 DEMO_MODE=true 설정 시 가짜 데이터 시딩 + 데모 안내 표시
const DEMO_MODE = /^(1|true|yes|on)$/i.test(process.env.DEMO_MODE || '');

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT, email TEXT, password TEXT,
      dept TEXT, role TEXT, status TEXT DEFAULT 'active',
      "joinedAt" TEXT, "menuOverrides" TEXT
    );
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title TEXT, content TEXT, "categoryId" TEXT,
      "authorId" TEXT, "authorName" TEXT,
      "createdAt" TEXT, status TEXT DEFAULT 'active',
      priority TEXT DEFAULT 'normal', "dueAt" TEXT,
      pinned TEXT, "mustRead" TEXT,
      "hasSubmission" TEXT, "submissionTarget" TEXT,
      attachments TEXT
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT, description TEXT, type TEXT,
      icon TEXT, "groupName" TEXT, approval BOOLEAN DEFAULT false
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS sites (
      id SERIAL PRIMARY KEY,
      name TEXT, region TEXT, client TEXT,
      manager TEXT, phone TEXT, status TEXT DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS hq (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      description TEXT,
      "ownerDept" TEXT,
      "sortOrder" INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      "createdAt" TEXT
    );
    CREATE TABLE IF NOT EXISTS compliance_submissions (
      id SERIAL PRIMARY KEY,
      "siteId" INTEGER,
      "itemKey" TEXT,
      "itemLabel" TEXT,
      status TEXT DEFAULT 'submitted',
      "submittedAt" TEXT,
      "submitterUserId" INTEGER,
      "submitterName" TEXT,
      "fileName" TEXT,
      "fileUrl" TEXT,
      note TEXT,
      period TEXT,
      "createdAt" TEXT,
      "updatedAt" TEXT,
      UNIQUE ("siteId", "itemKey", period)
    );
    -- 기존 테이블이 있으면 fileUrl 컬럼 보장
    CREATE TABLE IF NOT EXISTS worker_feedback (
      id SERIAL PRIMARY KEY,
      "privacyAgreed" BOOLEAN DEFAULT false,
      "hqId" INTEGER,
      "siteName" TEXT,
      "reporterName" TEXT,
      "isAnonymous" BOOLEAN DEFAULT false,
      category TEXT,
      detail TEXT,
      "improvementSuggestion" TEXT,
      status TEXT DEFAULT 'new',
      response TEXT,
      "submitterUserId" INTEGER,
      "createdAt" TEXT,
      "respondedAt" TEXT
    );
    -- 안전보건교육 종류 마스터 (관리자가 가감)
    CREATE TABLE IF NOT EXISTS education_types (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      hours TEXT,
      content TEXT,
      "sortOrder" INTEGER DEFAULT 0,
      "createdAt" TEXT DEFAULT NOW()::TEXT,
      "updatedAt" TEXT
    );
    -- 안전보건교육 일지
    CREATE TABLE IF NOT EXISTS education_logs (
      id SERIAL PRIMARY KEY,
      "교육종류" TEXT,
      "사업장명" TEXT,
      "교육일자" TEXT,
      "시작시간" TEXT,
      "종료시간" TEXT,
      "교육시간" TEXT,
      "교육장소" TEXT,
      "강사명" TEXT,
      "강사직책" TEXT,
      "교육방법" TEXT,
      "교육내용" TEXT,
      "교육교재" TEXT,
      "대상자수_계" INTEGER DEFAULT 0,
      "대상자수_남" INTEGER DEFAULT 0,
      "대상자수_여" INTEGER DEFAULT 0,
      "실시자수_계" INTEGER DEFAULT 0,
      "실시자수_남" INTEGER DEFAULT 0,
      "실시자수_여" INTEGER DEFAULT 0,
      "미실시사유" TEXT,
      "특이사항" TEXT,
      "담당서명" TEXT,
      "검토서명" TEXT,
      "승인서명" TEXT,
      "작성자" TEXT,
      "작성일" TEXT,
      "createdAt" TEXT DEFAULT NOW()::TEXT
    );
    -- 교육 참석자 명단
    CREATE TABLE IF NOT EXISTS education_attendees (
      id SERIAL PRIMARY KEY,
      "educationId" INTEGER REFERENCES education_logs(id) ON DELETE CASCADE,
      "번호" INTEGER,
      "성명" TEXT,
      "소속" TEXT,
      "직급" TEXT,
      "사번" TEXT,
      "서명" TEXT,
      "createdAt" TEXT DEFAULT NOW()::TEXT
    );
    CREATE TABLE IF NOT EXISTS approvals (
      id SERIAL PRIMARY KEY,
      title TEXT,
      content TEXT,
      "categoryId" TEXT,
      "authorId" TEXT,
      "authorName" TEXT,
      "authorDept" TEXT,
      "preservePeriod" TEXT DEFAULT '영구',
      "createdAt" TEXT,
      status TEXT DEFAULT 'pending',
      "approvalLines" TEXT,
      "referrers" TEXT,
      "recipients" TEXT
    );
    CREATE TABLE IF NOT EXISTS approval_actions (
      id SERIAL PRIMARY KEY,
      "approvalId" INTEGER,
      "userId" TEXT,
      "userName" TEXT,
      "userDept" TEXT,
      action TEXT,
      comment TEXT,
      "actedAt" TEXT,
      step INTEGER
    );
  `);

  // 기존 테이블에 approval 컬럼 없을 경우 추가
  await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS approval BOOLEAN DEFAULT false;`);

  // 기존 sites 테이블에 hq_id 컬럼 추가 (다른 본부에 묶기 위한 외래키)
  await pool.query(`ALTER TABLE sites ADD COLUMN IF NOT EXISTS "hqId" INTEGER;`);
  await pool.query(`ALTER TABLE sites ADD COLUMN IF NOT EXISTS address TEXT;`);
  // 사업장 계약 종료일(계정 사용 가능 기한) — 비우면 무기한. 만료 시 해당 사업장 현장계정 로그인 차단.
  await pool.query(`ALTER TABLE sites ADD COLUMN IF NOT EXISTS "expiresAt" TEXT;`);

  // 기존 users 테이블에 셀프서비스/가입승인 컬럼 추가
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "hqId" INTEGER;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "requestedAt" TEXT;`);
  // 최근 로그인 시각 / 비밀번호 마지막 변경 시각 (계정 목록 관리에서 표시)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "pwChangedAt" TEXT;`);
  // 담당 사업장 ID 목록 (CSV) — site_manager/site_staff는 자기 사업장, 본사 staff는 담당 사업장
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "siteIds" TEXT;`);
  // ── 역할 통합 마이그레이션: 팀장(manager) → 팀 공용(staff) ──
  // 팀장·일반직원 권한이 동일해져 '팀 공용'(staff) 하나로 통합. 기존 팀장 계정을 팀 공용으로 이관.
  // (idempotent — 콜드스타트마다 실행돼도 안전)
  await pool.query(`UPDATE users SET role='staff' WHERE role='manager';`);
  // 이행사항 제출에 fileUrl 컬럼 (기존 테이블에도 보장)
  await pool.query(`ALTER TABLE compliance_submissions ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;`);
  // 교육종류 숨김 플래그 (회사에서 미사용 교육은 숨김 처리)
  await pool.query(`ALTER TABLE education_types ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;`);
  // 카테고리 정렬 순서 (드래그앤드롭으로 변경)
  await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER;`);
  // 외부 링크 카테고리용 URL (type='link'일 때 클릭 시 새 탭으로 이동)
  await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS url TEXT;`);
  // 자료실(library) 카테고리용 — 썸네일 이미지 URL + 하위 분류
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS "thumbUrl" TEXT;`);
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS "subCategory" TEXT;`);
  // 게시글 조회수
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;`);
  // 기존 행 중 sortOrder NULL인 것들에 자동 부여 (id 알파벳순으로 10씩)
  await pool.query(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) * 10 AS rn
      FROM categories WHERE "sortOrder" IS NULL
    )
    UPDATE categories c SET "sortOrder" = ranked.rn
    FROM ranked WHERE c.id = ranked.id;
  `);

  // 안전보건 조직도 — scope('hq'|'site')별 1행, data는 JSON(제목·박스·연결)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS org_charts (
      scope TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      "updatedAt" TEXT
    );
  `);

  // 본부(HQ) 시드 — 위험성평가 코드 본부명단과 일치
  const hqExisting = await pool.query('SELECT COUNT(*) FROM hq');
  if (parseInt(hqExisting.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO hq (name, code, "ownerDept", "sortOrder", status, "createdAt") VALUES
      ('윌앤비전 FM사업본부',  'FM',   'FM사업본부',  1, 'active', NOW()::TEXT),
      ('윌앤비전 HR사업본부',  'HR',   'HR사업본부',  2, 'active', NOW()::TEXT),
      ('윌앤비전 CRM사업본부', 'CRM',  'CRM사업본부', 3, 'active', NOW()::TEXT),
      ('KBCI',                  'KBCI', 'KBCI',         4, 'active', NOW()::TEXT),
      ('동부캐리어',            'DBC',  '동부캐리어',   5, 'active', NOW()::TEXT),
      ('윌비모터스',            'WBM',  '윌비모터스',   6, 'active', NOW()::TEXT)
    `);
    console.log('[DB] 본부(HQ) 시드 6건 입력 완료');
  }

  // ⚠️ (제거됨) 예전엔 여기서 '공항사업본부'를 자동 재삽입해, 사용자가 지워도 서버가 뜰 때마다
  //    다시 생기고(진짜 본부는 '윌앤비전 공항사업본부'라 존재 체크가 계속 실패), 서버리스 동시
  //    콜드스타트 시 unique 제약이 없어 중복까지 쌓이던 버그가 있었음 → 자동 추가 로직 삭제.
  // 과거에 잘못 생성된 '공항사업본부'(plain) 유령 중복 정리:
  //   사업장이 하나도 연결되지 않은 것만 삭제(사업장 붙은 본부는 보존 → 고아 방지). idempotent.
  await pool.query(`
    DELETE FROM hq
    WHERE name = '공항사업본부'
      AND id NOT IN (SELECT "hqId" FROM sites WHERE "hqId" IS NOT NULL)
  `);

  // ── 사업장 담당자 정리(1회) ──
  // 예전엔 담당자 칸에 본부명·팀 공용계정명·사업장명(현장계정명)이 그대로 박혀 목록에서 중복 표시됐음.
  // 담당자 텍스트를 콤마로 분리해, 아래에 해당하는 토큰만 제거하고 '실제 사람 이름'만 남김:
  //   · 본부명(hq.name)  · 팀/현장 계정명(staff·manager·site_manager·site_staff user.name)  · 그 사업장 자기 이름(sites.name)
  // 개인 계정(관리자·안전관리자)·자유입력 실명은 보존. app_settings 마커로 1회만 실행.
  try {
    const done = await pool.query("SELECT value FROM app_settings WHERE key='site_manager_cleanup_v2'");
    if (done.rowCount === 0) {
      const norm = (v) => String(v || '').trim();
      const hqNames = (await pool.query('SELECT name FROM hq')).rows.map(r => norm(r.name)).filter(Boolean);
      const acctNames = (await pool.query(
        "SELECT name FROM users WHERE role IN ('staff','manager','site_manager','site_staff')"
      )).rows.map(r => norm(r.name)).filter(Boolean);
      const baseRemove = new Set([...hqNames, ...acctNames]);
      const siteRows = (await pool.query('SELECT id, name, manager FROM sites')).rows;
      let changed = 0;
      for (const s of siteRows) {
        const cur = norm(s.manager);
        if (!cur) continue;
        const remove = new Set(baseRemove);
        if (norm(s.name)) remove.add(norm(s.name));   // 이 사업장 자기 이름(현장계정명)도 제거
        const kept = cur.split(',').map(t => t.trim()).filter(Boolean).filter(t => !remove.has(t));
        const cleaned = kept.join(', ');
        if (cleaned !== cur) {
          await pool.query('UPDATE sites SET manager=$1 WHERE id=$2', [cleaned, s.id]);
          changed++;
        }
      }
      await pool.query("INSERT INTO app_settings (key, value) VALUES ('site_manager_cleanup_v2', NOW()::TEXT) ON CONFLICT (key) DO NOTHING");
      if (changed > 0) console.log(`[DB] 사업장 담당자 정리 v2: ${changed}건`);
    }
  } catch (e) {
    console.error('사업장 담당자 정리 실패:', e);
  }

  const existing = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(existing.rows[0].count) === 0 && DEMO_MODE) {
    // ── 데모 전용 가짜 계정 (실제 개인정보 없음) ──
    await pool.query(`
      INSERT INTO users (name, email, password, dept, role, status) VALUES
      ('데모 관리자', 'demo@demo.com',   'demo1234', '데모본부', 'admin',        'active'),
      ('홍길동',      'hong@demo.com',   'demo1234', '안전관리팀', 'safety',       'active'),
      ('김철수',      'kim@demo.com',    'demo1234', 'FM운영팀',  'manager',      'active'),
      ('이영희',      'lee@demo.com',    'demo1234', 'CRM운영팀', 'staff',        'active'),
      ('박현장',      'site@demo.com',   'demo1234', '현장',      'site_manager', 'active')
    `);
    console.log('[DB] 데모 계정 시드 완료 (demo@demo.com / demo1234)');
  } else if (parseInt(existing.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO users (name, email, password, dept, role, status) VALUES
      ('관리자', 'admin@willvi.co.kr', 'admin1234', '시스템관리자', 'admin', 'active'),
      ('이월재', 'safety1@willvi.co.kr', 'admin1234', '안전보건관리책임', 'admin', 'active'),
      ('김혜현', 'safety2@willvi.co.kr', 'admin1234', '안전관리자', 'safety', 'active'),
      ('보건관리자', 'health1@willvil.co.kr', 'admin1234', '보건관리자', 'safety', 'active'),
      ('송병학', 'fm1@willvi.co.kr', 'admin1234', '팀장', 'manager', 'active'),
      ('이주원', 'fm2@willvi.co.kr', 'admin1234', '팀원', 'staff', 'active'),
      ('김능현', 'fm3@willvi.co.kr', 'admin1234', '팀원', 'staff', 'active'),
      ('김현수', 'fm4@willvi.co.kr', 'admin1234', '팀원', 'staff', 'active'),
      ('이준형', 'fm5@willvi.co.kr', 'admin1234', '팀원', 'staff', 'active'),
      ('관리소장', 'fmsite1@willvil.co.kr', 'admin1234', '현장관리자', 'site_manager', 'active'),
      ('현장팀원', 'fmsite2@willvil.co.kr', 'admin1234', '현장팀원', 'site_staff', 'active')
    `);
  }

  // ── 기존 평문 비밀번호 일괄 해싱 (이미 해시($2..)인 건 건너뜀) ──
  try {
    const plain = await pool.query("SELECT id, password FROM users WHERE password IS NOT NULL AND password NOT LIKE '$2%'");
    for (const row of plain.rows) {
      await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashPw(row.password), row.id]);
    }
    if (plain.rowCount > 0) console.log(`[DB] 비밀번호 해싱 마이그레이션: ${plain.rowCount}건`);
  } catch (e) { console.error('[DB] 비번 해싱 마이그레이션 오류:', e.message); }

  const catExisting = await pool.query('SELECT COUNT(*) FROM categories');
  if (parseInt(catExisting.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO categories (id, name, description, type, icon, "groupName", approval) VALUES
      ('board-docs',      '게시판 게시 서류',            '안전보건위원회 회의록, 산업안전보건법 게시 의무 자료', 'board',      'doc',        '', false),
      ('procedures',      '절차서 및 지침서',            '전사 안전보건 표준 절차서, 작업별 안전 지침',         'board',      'book',       '', false),
      ('training',        '안전보건교육',                '정기/특별 안전보건교육 양식 및 수료 제출',            'form',       'graduation', '', false),
      ('risk-assessment', '위험성평가',                  '정기·수시 위험성평가 양식, 부서별 작성',              'form',       'alert',      '', false),
      ('msds',            '물질안전보건자료 (MSDS)',      '화학물질 MSDS 비치 자료 및 제출 양식',               'board-form', 'flask',      '', false),
      ('ergonomic',       '근골격계부담작업 유해요인조사', '3년 1회 정기 조사 및 수시 조사 자료',                'board',      'body',       '', false),
      ('signage',         '안전보건표지',                '현장 부착용 표지, 라벨, 안내문 다운로드',             'library',    'sign',       '', false),
      ('posters',         '안전보건 포스터',             '월간 캠페인 포스터, 게시판 부착용 자료',              'library',    'image',      '', false),
      ('worker-feedback', '종사자 의견 청취',            '산업안전보건법 제4조 7호에 따라 종사자의 안전보건 관련 의견 청취', 'form',       'comment',    '', false)
    `);
  }

  // ── 안전보건교육 종류 시드 (산업안전보건법 시행규칙 [별표 5]) ──
  const eduTypesExisting = await pool.query('SELECT COUNT(*) FROM education_types');
  if (parseInt(eduTypesExisting.rows[0].count) === 0) {
    const eduTypeSeed = [
      ['정기교육_근로자',          '정기교육 (근로자)',                   '2시간',
       '산업안전보건법 시행규칙 [별표 5] 제1호 가목 (정기교육)\n○ 산업안전 및 산업재해 예방에 관한 사항(화재ㆍ폭발 사고 발생 시 대피에 관한 사항을 포함한다)\n○ 산업보건 및 건강장해 예방에 관한 사항(폭염ㆍ한파작업으로 인한 건강장해 발생 시 응급조치에 관한 사항을 포함한다)\n○ 위험성 평가에 관한 사항\n○ 건강증진 및 질병 예방에 관한 사항\n○ 유해ㆍ위험 작업환경 관리에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항', 10],
      ['채용시교육_근로자',         '채용 시 교육 (근로자)',                '8시간',
       '산업안전보건법 시행규칙 [별표 5] 제1호 다목 (채용 시 교육 및 작업내용 변경 시 교육)\n○ 산업안전 및 산업재해 예방에 관한 사항(화재ㆍ폭발 사고 발생 시 대피에 관한 사항을 포함한다)\n○ 산업보건 및 건강장해 예방에 관한 사항\n○ 위험성 평가에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항\n○ 기계ㆍ기구의 위험성과 작업의 순서 및 동선에 관한 사항\n○ 작업 개시 전 점검에 관한 사항\n○ 정리정돈 및 청소에 관한 사항\n○ 사고 발생 시 긴급조치에 관한 사항\n○ 물질안전보건자료에 관한 사항', 20],
      ['작업내용변경_근로자',        '작업내용 변경 시 교육 (근로자)',        '2시간',
       '산업안전보건법 시행규칙 [별표 5] 제1호 다목 (채용 시 교육 및 작업내용 변경 시 교육)\n○ 산업안전 및 산업재해 예방에 관한 사항(화재ㆍ폭발 사고 발생 시 대피에 관한 사항을 포함한다)\n○ 산업보건 및 건강장해 예방에 관한 사항\n○ 위험성 평가에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 기계ㆍ기구의 위험성과 작업의 순서 및 동선에 관한 사항\n○ 작업 개시 전 점검에 관한 사항\n○ 정리정돈 및 청소에 관한 사항\n○ 사고 발생 시 긴급조치에 관한 사항\n○ 물질안전보건자료에 관한 사항', 30],
      ['정기교육_관리감독자',        '정기교육 (관리감독자)',                '2시간',
       '산업안전보건법 시행규칙 [별표 5] 제1호의2 가목 (정기교육)\n○ 산업안전 및 산업재해 예방에 관한 사항(화재ㆍ폭발 사고 발생 시 대피에 관한 사항을 포함한다)\n○ 산업보건 및 건강장해 예방에 관한 사항(폭염ㆍ한파작업으로 인한 건강장해 발생 시 응급조치에 관한 사항을 포함한다)\n○ 위험성평가에 관한 사항\n○ 유해ㆍ위험 작업환경 관리에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항\n○ 작업공정의 유해ㆍ위험과 재해 예방대책에 관한 사항\n○ 사업장 내 안전보건관리체제 및 안전ㆍ보건조치 현황에 관한 사항\n○ 표준안전 작업방법 결정 및 지도ㆍ감독 요령에 관한 사항\n○ 현장근로자와의 의사소통능력 및 강의능력 등 안전보건교육 능력 배양에 관한 사항\n○ 비상시 또는 재해 발생 시 긴급조치에 관한 사항\n○ 그 밖의 관리감독자의 직무에 관한 사항', 40],
      ['채용시교육_관리감독자',      '채용 시 교육 (관리감독자)',             '8시간',
       '산업안전보건법 시행규칙 [별표 5] 제1호의2 나목 (채용 시 교육 및 작업내용 변경 시 교육)\n○ 산업안전 및 산업재해 예방에 관한 사항(화재ㆍ폭발 사고 발생 시 대피에 관한 사항을 포함한다)\n○ 산업보건 및 건강장해 예방에 관한 사항\n○ 위험성평가에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항\n○ 기계ㆍ기구의 위험성과 작업의 순서 및 동선에 관한 사항\n○ 작업 개시 전 점검에 관한 사항\n○ 물질안전보건자료에 관한 사항\n○ 사업장 내 안전보건관리체제 및 안전ㆍ보건조치 현황에 관한 사항\n○ 표준안전 작업방법 결정 및 지도ㆍ감독 요령에 관한 사항\n○ 비상시 또는 재해 발생 시 긴급조치에 관한 사항\n○ 그 밖의 관리감독자의 직무에 관한 사항', 50],
      ['작업내용변경_관리감독자',     '작업내용 변경 시 교육 (관리감독자)',     '2시간',
       '산업안전보건법 시행규칙 [별표 5] 제1호의2 나목 (채용 시 교육 및 작업내용 변경 시 교육)\n○ 산업안전 및 산업재해 예방에 관한 사항(화재ㆍ폭발 사고 발생 시 대피에 관한 사항을 포함한다)\n○ 산업보건 및 건강장해 예방에 관한 사항\n○ 위험성평가에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 기계ㆍ기구의 위험성과 작업의 순서 및 동선에 관한 사항\n○ 작업 개시 전 점검에 관한 사항\n○ 물질안전보건자료에 관한 사항\n○ 사업장 내 안전보건관리체제 및 안전ㆍ보건조치 현황에 관한 사항\n○ 표준안전 작업방법 결정 및 지도ㆍ감독 요령에 관한 사항\n○ 비상시 또는 재해 발생 시 긴급조치에 관한 사항\n○ 그 밖의 관리감독자의 직무에 관한 사항', 60],
      ['MSDS',                  '물질안전보건자료 (MSDS)',              '2시간',
       '물질안전보건자료(MSDS) 교육\n○ 대상화학물질의 명칭\n○ 물리적 위험성 및 건강 유해성\n○ 취급상의 주의사항\n○ 적절한 보호구\n○ 응급조치 요령 및 사고 시 대처방법', 70],
      ['특별교육_공통_근로자',       '특별교육 공통내용 (근로자)',            '8시간',
       '산업안전보건법 시행규칙 [별표 5] 제3호 가목 (특별교육 공통내용)\n○ 산업안전 및 산업재해 예방에 관한 사항\n○ 위험성평가에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항\n○ 기계ㆍ기구의 위험성과 작업의 순서 및 동선에 관한 사항\n○ 작업 개시 전 점검에 관한 사항\n○ 정리정돈 및 청소에 관한 사항\n○ 사고 발생 시 긴급조치에 관한 사항\n○ 물질안전보건자료에 관한 사항\n○ 보호구 착용 및 취급방법에 관한 사항', 80],
      ['특별교육_공통_관리감독자',    '특별교육 공통내용 (관리감독자)',         '8시간',
       '산업안전보건법 시행규칙 [별표 5] 제3호 나목 (특별교육 공통내용 - 관리감독자)\n○ 산업안전 및 산업재해 예방에 관한 사항\n○ 위험성평가에 관한 사항\n○ 유해ㆍ위험 작업환경 관리에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 작업공정의 유해ㆍ위험과 재해 예방대책에 관한 사항\n○ 표준안전 작업방법 결정 및 지도ㆍ감독 요령에 관한 사항\n○ 현장근로자와의 의사소통능력 및 강의능력 등 안전보건교육 능력 배양에 관한 사항\n○ 비상시 또는 재해 발생 시 긴급조치에 관한 사항', 90],
      ['특별교육_용접',             '특별교육 개별 (제2호 용접)',            '8시간',
       '특별교육 대상 작업별 교육 <개별내용> 제2호\n아세틸렌 용접장치 또는 가스집합 용접장치를 사용하는 금속의 용접·용단 또는 가열작업\n○ 용접 흄, 분진 및 유해광선 등의 유해성에 관한 사항\n○ 가스용접기, 압력조정기, 호스 및 취관두 등의 기기점검에 관한 사항\n○ 작업방법·순서 및 응급처치에 관한 사항\n○ 안전기 및 보호구 취급에 관한 사항\n○ 화재예방 및 초기대응에 관한 사항\n○ 그 밖에 안전·보건관리에 필요한 사항', 100],
      ['특별교육_전기',             '특별교육 개별 (제17호 전기)',           '8시간',
       '특별교육 대상 작업별 교육 <개별내용> 제17호\n전압이 75볼트 이상인 정전 및 활선작업\n○ 전기의 위험성 및 전격 방지에 관한 사항\n○ 해당 설비의 보수 및 점검에 관한 사항\n○ 정전작업·활선작업 시의 안전작업방법 및 순서에 관한 사항\n○ 절연용 보호구, 절연용 방호구 및 활선작업용 기구 등의 사용에 관한 사항\n○ 그 밖에 안전·보건관리에 필요한 사항', 110],
      ['특별교육_보일러',            '특별교육 개별 (제31호 보일러)',         '8시간',
       '특별교육 대상 작업별 교육 <개별내용> 제31호\n보일러의 설치 및 취급 작업\n○ 기계 및 기기 점화장치 계측기의 점검에 관한 사항\n○ 열관리 및 방호장치에 관한 사항\n○ 작업순서 및 방법에 관한 사항\n○ 그 밖에 안전·보건관리에 필요한 사항', 120],
      ['특별교육_압력용기',          '특별교육 개별 (제32호 압력용기)',        '8시간',
       '특별교육 대상 작업별 교육 <개별내용> 제32호\n게이지 압력을 제곱센티미터당 1킬로그램 이상으로 사용하는 압력용기의 설치 및 취급작업\n○ 안전시설 및 안전기준에 관한 사항\n○ 압력용기의 위험성에 관한 사항\n○ 용기 취급 및 설치기준에 관한 사항\n○ 작업안전 점검 방법 및 요령에 관한 사항\n○ 그 밖에 안전·보건관리에 필요한 사항', 130],
      ['특별교육_밀폐공간',          '특별교육 개별 (제34호 밀폐공간)',        '8시간',
       '특별교육 대상 작업별 교육 <개별내용> 제34호\n밀폐공간에서의 작업\n○ 산소농도 측정 및 작업환경에 관한 사항\n○ 사고 시의 응급처치 및 비상 시 구출에 관한 사항\n○ 보호구 착용 및 보호 장비 사용에 관한 사항\n○ 작업내용ㆍ안전작업방법 및 절차에 관한 사항\n○ 장비ㆍ설비 및 시설 등의 안전점검에 관한 사항\n○ 그 밖에 안전ㆍ보건관리에 필요한 사항', 140],
      ['특별교육_유해물질',          '특별교육 개별 (제35호 유해물질취급)',      '8시간',
       '특별교육 대상 작업별 교육 <개별내용> 제35호\n허가 또는 관리 대상 유해물질의 제조 또는 취급작업\n○ 취급물질의 성질 및 상태에 관한 사항\n○ 유해물질이 인체에 미치는 영향\n○ 국소배기장치 및 안전설비에 관한 사항\n○ 안전작업방법 및 보호구 사용에 관한 사항\n○ 그 밖에 안전ㆍ보건관리에 필요한 사항', 150],
      ['위험성평가_회의록',          '위험성평가 (회의록)',                 '1시간',
       '위험성평가 (회의록)\n○ 유해ㆍ위험요인 파악 및 위험성 결정\n○ 위험성 감소대책 수립 및 이행\n○ 위험성평가 결과 및 감소대책 논의\n○ 유해ㆍ위험요인별 개선 완료사항 확인\n○ 근로자 의견 청취 및 반영사항', 160],
      ['위험성평가_결과전파',         '위험성평가 (결과 전파교육)',            '1시간',
       '위험성평가 (결과 전파교육)\n○ 위험성평가 실시 결과 공유\n○ 유해ㆍ위험요인 및 감소대책 안내\n○ 작업별 안전수칙 및 주의사항 전달\n○ 근로자 의견 수렴\n○ 개선 완료사항 및 향후 일정 안내', 170],
      ['근골격계',                 '근골격계 유해요인조사',                 '-',
       '근골격계 유해요인조사\n○ 근골격계 부담작업 유해요인 조사 실시\n○ 작업별 유해요인 파악 및 평가\n○ 근골격계질환 예방을 위한 개선대책 수립\n○ 근로자 증상조사 및 건강상태 파악\n○ 작업환경 개선 조치사항 안내', 180],
    ];
    for (const [id, label, hours, content, sortOrder] of eduTypeSeed) {
      await pool.query(
        `INSERT INTO education_types (id, label, hours, content, "sortOrder") VALUES ($1,$2,$3,$4,$5)`,
        [id, label, hours, content, sortOrder]
      );
    }
    console.log(`[DB] education_types 시드 완료: ${eduTypeSeed.length}건`);
  }

  // ── base64 썸네일 → 스토리지 URL 이관(1회) ──
  // 예전엔 미리보기 이미지를 base64로 posts.thumbUrl에 통째로 저장해 DB가 무겁고 느렸음.
  // base64 썸네일을 스토리지(uploads 버킷)로 옮기고 URL로 교체. app_settings 마커로 1회만.
  try {
    if (supabase) {
      const done = await pool.query("SELECT value FROM app_settings WHERE key='thumb_base64_migrate_v1'");
      if (done.rowCount === 0) {
        const rows = (await pool.query(`SELECT id, "thumbUrl" FROM posts WHERE "thumbUrl" LIKE 'data:image/%'`)).rows;
        let moved = 0;
        for (const r of rows) {
          try {
            const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(r.thumbUrl);
            if (!m) continue;
            const mime = m[1];
            const buf = Buffer.from(m[2], 'base64');
            const ext = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
            const filename = `thumb-${r.id}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
            const up = await supabase.storage.from('uploads').upload(filename, buf, { contentType: mime, upsert: false });
            if (up.error) continue;
            const { data } = supabase.storage.from('uploads').getPublicUrl(filename);
            await pool.query('UPDATE posts SET "thumbUrl"=$1 WHERE id=$2', [data.publicUrl, r.id]);
            moved++;
          } catch (e) { /* 개별 실패는 건너뜀 */ }
        }
        await pool.query("INSERT INTO app_settings (key, value) VALUES ('thumb_base64_migrate_v1', NOW()::TEXT) ON CONFLICT (key) DO NOTHING");
        if (moved > 0) console.log(`[DB] base64 썸네일 이관: ${moved}건`);
      }
    }
  } catch (e) { console.error('base64 썸네일 이관 실패:', e); }

  console.log('DB 초기화 완료!');
}

// ── Users ──
app.get('/api/users', async (req, res) => {
  const result = await pool.query('SELECT * FROM users ORDER BY id');
  // 비밀번호는 절대 내보내지 않음 (해시라도 노출 금지)
  const users = result.rows.map(({ password, ...rest }) => rest);
  res.json({ users });
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password, dept, role, hqId, siteIds, phone, position } = req.body;
    // 입력 검증
    if (!name || !String(name).trim()) return res.status(400).json({ error: '이름을 입력해주세요.' });
    if (!email || !String(email).trim()) return res.status(400).json({ error: '아이디를 입력해주세요.' });
    if (String(email).trim().length < 3) return res.status(400).json({ error: '아이디는 3자 이상이어야 합니다.' });
    if (!password || !String(password).trim()) return res.status(400).json({ error: '비밀번호를 입력해주세요.' });
    // 중복 체크
    const dup = await pool.query('SELECT id, name FROM users WHERE LOWER(TRIM(email))=LOWER(TRIM($1))', [email]);
    if (dup.rowCount > 0) {
      return res.status(409).json({ error: `이미 사용 중인 아이디입니다 (사용자: ${dup.rows[0].name}).` });
    }
    const nowIso = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO users (name, email, password, dept, role, status, "hqId", "siteIds", phone, position, "joinedAt", "pwChangedAt")
       VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, email, hashPw(password), dept, role, hqId||null, siteIds||'', phone||'', position||'', nowIso, nowIso]
    );
    const { password: _pw, ...safeUser } = result.rows[0];
    res.json({ user: safeUser });
  } catch (e) {
    console.error('POST /api/users 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { name, email, password, dept, role, status, phone, position, hqId, siteIds } = req.body;
  try {
    // 입력 검증
    if (!name || !String(name).trim()) return res.status(400).json({ error: '이름을 입력해주세요.' });
    if (!email || !String(email).trim()) return res.status(400).json({ error: '아이디를 입력해주세요.' });
    if (String(email).trim().length < 3) return res.status(400).json({ error: '아이디는 3자 이상이어야 합니다.' });
    // 아이디 중복 체크 — 본인 제외하고 다른 사용자가 같은 email 쓰는지
    const dup = await pool.query(
      'SELECT id, name FROM users WHERE LOWER(TRIM(email))=LOWER(TRIM($1)) AND id != $2',
      [email, req.params.id]
    );
    if (dup.rowCount > 0) {
      return res.status(409).json({ error: `이미 사용 중인 아이디입니다 (사용자: ${dup.rows[0].name}).` });
    }
    // password가 제공됐을 때만 같이 업데이트, 아니면 기존 유지
    if (password && String(password).trim()) {
      const result = await pool.query(
        `UPDATE users SET name=$1, email=$2, password=$3, dept=$4, role=$5, status=$6,
                          phone=$7, position=$8, "hqId"=$9, "siteIds"=$10, "pwChangedAt"=$11
         WHERE id=$12 RETURNING *`,
        [name||'', email||'', hashPw(password), dept||'', role||'staff', status||'active',
         phone||'', position||'', hqId||null, siteIds||'', new Date().toISOString(), req.params.id]
      );
      const { password: _p, ...safe } = result.rows[0];
      res.json({ user: safe });
    } else {
      const result = await pool.query(
        `UPDATE users SET name=$1, email=$2, dept=$3, role=$4, status=$5,
                          phone=$6, position=$7, "hqId"=$8, "siteIds"=$9
         WHERE id=$10 RETURNING *`,
        [name||'', email||'', dept||'', role||'staff', status||'active',
         phone||'', position||'', hqId||null, siteIds||'', req.params.id]
      );
      const { password: _p, ...safe } = result.rows[0];
      res.json({ user: safe });
    }
  } catch (e) {
    console.error('PUT /api/users 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// 사용자 영구 삭제
app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id=$1 RETURNING id, name, email', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: '해당 사용자가 없습니다.' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (e) {
    console.error('DELETE /api/users 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// 임시 비밀번호 재발급 (랜덤 8자 생성 후 DB 업데이트, 새 비밀번호 응답)
app.post('/api/users/:id/reset-password', async (req, res) => {
  try {
    // 영문대소문자+숫자 8자
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let newPw = '';
    for (let i = 0; i < 8; i++) newPw += chars[Math.floor(Math.random() * chars.length)];
    const result = await pool.query('UPDATE users SET password=$1, "pwChangedAt"=$2 WHERE id=$3 RETURNING id, name, email', [hashPw(newPw), new Date().toISOString(), req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: '해당 사용자가 없습니다.' });
    res.json({ success: true, user: result.rows[0], newPassword: newPw });
  } catch (e) {
    console.error('POST /api/users/:id/reset-password 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── 회원가입: 신청 (status='pending'으로 저장, 관리자 승인 대기) ──
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, dept, role, phone, hqId, position, siteIds } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: '이름/아이디/비밀번호는 필수 입력입니다.' });
    }
    // 아이디 중복 체크
    const dup = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (dup.rowCount > 0) {
      return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
    }
    const nowIso = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO users (name, email, password, dept, role, status, phone, "hqId", "siteIds", position, "joinedAt", "requestedAt", "pwChangedAt")
       VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,$10,$11,$12) RETURNING id, name, email, dept, status`,
      [
        name, email, hashPw(password), dept||'', role||'staff',
        phone||'', hqId||null, siteIds||'', position||'',
        nowIso, nowIso, nowIso
      ]
    );
    res.json({ success: true, user: result.rows[0], message: '가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.' });
  } catch (e) {
    console.error('POST /api/register 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── 가입 승인: pending → active ──
app.post('/api/users/:id/approve', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET status='active' WHERE id=$1 AND status='pending' RETURNING id, name, email, status`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: '대기 중인 가입 신청을 찾을 수 없습니다.' });
    res.json({ success: true, user: result.rows[0] });
  } catch (e) {
    console.error('POST /api/users/:id/approve 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── 가입 거부: pending 계정 영구 삭제 ──
app.post('/api/users/:id/reject', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM users WHERE id=$1 AND status='pending' RETURNING id, name, email`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: '대기 중인 가입 신청을 찾을 수 없습니다.' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (e) {
    console.error('POST /api/users/:id/reject 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── 셀프 수정: 본인이 자기 정보 수정 (phone, dept만 허용) ──
//   ※ 아이디/비밀번호/권한/상태는 관리자만 변경 가능
app.put('/api/users/:id/self', async (req, res) => {
  try {
    const { phone, dept, currentUserId } = req.body;
    // 보안: 요청자 본인 id와 URL의 id가 같아야만 허용
    if (String(currentUserId) !== String(req.params.id)) {
      return res.status(403).json({ error: '본인 계정만 수정할 수 있습니다.' });
    }
    const result = await pool.query(
      `UPDATE users SET phone=$1, dept=$2 WHERE id=$3 RETURNING id, name, email, dept, phone`,
      [phone||'', dept||'', req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    res.json({ success: true, user: result.rows[0] });
  } catch (e) {
    console.error('PUT /api/users/:id/self 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Sessions (noop) ──
app.post('/api/sessions', async (req, res) => {
  res.json({ success: true });
});

// ── 사이트 메타 (데모 모드 여부 등) — 프론트가 데모 안내/배너 표시에 사용 ──
app.get('/api/meta', (req, res) => {
  res.json({ demo: DEMO_MODE });
});

// ── 로그아웃 (세션 쿠키 제거) ──
app.post('/api/logout', (req, res) => {
  res.clearCookie('wv_sess', { path: '/' });
  res.json({ success: true });
});

// ── 서버 로그인 (비번 검증을 서버에서 — 비번이 프론트로 안 나감) ──
app.post('/api/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const pw = String(req.body.password || '').trim();
    if (!email || !pw) return res.json({ success: false, message: '이메일과 비밀번호를 입력하세요.' });
    const r = await pool.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = $1 LIMIT 1', [email]);
    const u = r.rows[0];
    if (!u || !verifyPw(pw, u.password)) {
      return res.json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    if (u.status === 'pending')  return res.json({ success: false, message: '관리자 승인 대기 중인 계정입니다. 승인 후 로그인할 수 있습니다.' });
    if (u.status === 'inactive') return res.json({ success: false, message: '비활성화된 계정입니다.' });
    if (u.status === 'dormant')  return res.json({ success: false, message: '휴면 계정입니다. 관리자에게 문의하세요.' });
    // ── 사업장 계약 만료 차단 ──
    // 현장계정(site_manager/site_staff)이 담당하는 사업장의 계약 종료일이 모두 지났으면 로그인 거부.
    // (다른 회사가 사업장을 인수했는데 이전 계정으로 계속 접근하는 것을 방지)
    // 본사 관리자·안전관리자·팀 공용계정은 사업장 기한과 무관하게 로그인 가능(연장 등록을 위해).
    if (u.role === 'site_manager' || u.role === 'site_staff') {
      try {
        const siteIds = String(u.siteIds || '').split(',').map(s => s.trim()).filter(Boolean);
        if (siteIds.length > 0) {
          const sr = await pool.query(
            `SELECT id, "expiresAt" FROM sites WHERE id = ANY($1::int[])`,
            [siteIds.map(Number)]
          );
          const rows = sr.rows || [];
          // 만료 판정: 첫화면에 표시되는 "오늘 날짜"와 동일한 기준(한국시간·일 단위).
          // 서버가 UTC로 돌아도 한국시간(UTC+9) 기준 오늘 날짜 문자열(YYYY-MM-DD)로 비교.
          // → 계약 종료일 '당일'까지는 사용 가능, 그 다음 날(한국시간)부터 차단.
          const todayKST = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
          const isExpired = (v) => {
            if (!v) return false; // 기한 없음 = 무기한
            const d = String(v).slice(0, 10);
            return d < todayKST; // 종료일이 오늘(한국)보다 이전이면 만료
          };
          // 담당 사업장이 하나라도 유효(만료 아님)하면 로그인 허용. 전부 만료면 차단.
          const hasValid = rows.some(s => !isExpired(s.expiresAt));
          if (rows.length > 0 && !hasValid) {
            return res.json({ success: false, message: '담당 사업장의 계약 기간이 만료되어 로그인할 수 없습니다. 본사 관리자에게 문의하세요.' });
          }
        }
      } catch (e) {
        console.error('사업장 만료 확인 실패:', e);
      }
    }
    // 평문이었으면 이번 로그인 기회에 해시로 승격 (지연 마이그레이션)
    if (!isHashed(u.password)) {
      try { await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashPw(pw), u.id]); } catch (e) {}
    }
    // 최근 접속 시각 기록
    const nowIso = new Date().toISOString();
    try { await pool.query('UPDATE users SET "lastLoginAt"=$1 WHERE id=$2', [nowIso, u.id]); } catch (e) {}
    u.lastLoginAt = nowIso;
    // 세션 쿠키 발급 (httpOnly — JS로 탈취 불가, 이후 모든 API 요청에 자동 첨부)
    res.cookie('wv_sess', signSession(u), {
      httpOnly: true,
      sameSite: 'lax',
      secure: (req.headers['x-forwarded-proto'] === 'https') || req.secure,
      maxAge: SESSION_TTL_MS,
      path: '/',
    });
    const { password, ...safe } = u;
    res.json({ success: true, user: safe });
  } catch (e) {
    console.error('POST /api/login 오류:', e);
    res.status(500).json({ success: false, message: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

// ── Posts ──
app.get('/api/posts', async (req, res) => {
  const { categoryId } = req.query;
  let result;
  if (categoryId) {
    // 특정 카테고리만 — 썸네일(thumbUrl) 포함 전체 (자료실 그리드용). 그 카테고리 것만이라 가벼움.
    result = await pool.query('SELECT * FROM posts WHERE "categoryId"=$1 ORDER BY id DESC', [categoryId]);
  } else {
    // 전체 목록 — base64로 저장되는 무거운 thumbUrl은 제외(카운트·대시보드·검색용).
    // ⚠️ 이전엔 SELECT * 로 모든 카테고리의 base64 썸네일까지 통째로 실어보내 로딩이 매우 느렸음.
    result = await pool.query(`SELECT id, title, content, "categoryId", "authorId", "authorName",
      "createdAt", status, priority, "dueAt", pinned, "mustRead", "hasSubmission",
      "submissionTarget", attachments, "subCategory", views FROM posts ORDER BY id DESC`);
  }
  res.json({ posts: result.rows });
});

// 게시글 조회수 +1 (상세 진입 시 호출)
app.post('/api/posts/:id/view', async (req, res) => {
  try {
    const r = await pool.query('UPDATE posts SET views = COALESCE(views,0)+1 WHERE id=$1 RETURNING views', [req.params.id]);
    res.json({ views: r.rows[0] ? r.rows[0].views : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/posts', async (req, res) => {
  const { title, content, categoryId, authorId, authorName, priority, dueAt, pinned, mustRead, hasSubmission, submissionTarget, attachments, thumbUrl, subCategory } = req.body;
  const result = await pool.query(
    `INSERT INTO posts (title, content, "categoryId", "authorId", "authorName", "createdAt", priority, "dueAt", pinned, "mustRead", "hasSubmission", "submissionTarget", attachments, "thumbUrl", "subCategory")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [title, content, categoryId, authorId, authorName, new Date().toISOString(), priority||'normal', dueAt||'', pinned||'', mustRead||'', hasSubmission||'', submissionTarget||'', attachments||'', thumbUrl||'', subCategory||'']
  );
  res.json({ post: result.rows[0] });
});

app.put('/api/posts/:id', async (req, res) => {
  const { title, content, categoryId, priority, dueAt, pinned, mustRead, hasSubmission, submissionTarget, attachments, thumbUrl, subCategory } = req.body;
  const result = await pool.query(
    `UPDATE posts SET title=$1, content=$2, "categoryId"=$3, priority=$4, "dueAt"=$5, pinned=$6, "mustRead"=$7, "hasSubmission"=$8, "submissionTarget"=$9, attachments=$10, "thumbUrl"=$11, "subCategory"=$12 WHERE id=$13 RETURNING *`,
    [title, content, categoryId, priority||'normal', dueAt||'', pinned||'', mustRead||'', hasSubmission||'', submissionTarget||'', attachments||'', thumbUrl||'', subCategory||'', req.params.id]
  );
  res.json({ post: result.rows[0] });
});

app.delete('/api/posts/:id', async (req, res) => {
  await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// ── Categories ──
app.get('/api/categories', async (req, res) => {
  // sortOrder NULL은 맨 뒤, 같으면 id 알파벳순
  const result = await pool.query(
    'SELECT id, name, description AS desc, type, icon, "groupName", approval, "sortOrder", url FROM categories ORDER BY "sortOrder" NULLS LAST, id'
  );
  res.json({ categories: result.rows });
});

app.post('/api/categories', async (req, res) => {
  try {
    const { id, name, description, desc, type, icon, groupName, approval, url } = req.body;
    // 새 카테고리는 가장 큰 sortOrder + 10 (목록 맨 뒤에)
    const maxRow = await pool.query(`SELECT COALESCE(MAX("sortOrder"), 0) AS m FROM categories`);
    const nextSort = (maxRow.rows[0].m || 0) + 10;
    const result = await pool.query(
      'INSERT INTO categories (id, name, description, type, icon, "groupName", approval, "sortOrder", url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, name, description AS desc, type, icon, "groupName", approval, "sortOrder", url',
      [id, name, description||desc||'', type||'board', icon||'file', groupName||'', approval||false, nextSort, url||null]
    );
    res.json({ category: result.rows[0] });
  } catch (e) {
    console.error('POST /api/categories 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    // sortOrder는 reorder 엔드포인트 전용 — 일반 수정은 건드리지 않음
    const { name, description, desc, type, icon, groupName, approval, url } = req.body;
    const result = await pool.query(
      'UPDATE categories SET name=$1, description=$2, type=$3, icon=$4, "groupName"=$5, approval=$6, url=$7 WHERE id=$8 RETURNING id, name, description AS desc, type, icon, "groupName", approval, "sortOrder", url',
      [name, description||desc||'', type||'board', icon||'doc', groupName||'', approval||false, url||null, req.params.id]
    );
    res.json({ category: result.rows[0] });
  } catch (e) {
    console.error('PUT /api/categories 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// ── 앱 설정 저장소 (key-value JSON). 하위메뉴 이름/순서/표시여부 등 ──
app.get('/api/settings/:key', async (req, res) => {
  try {
    const r = await pool.query('SELECT value FROM app_settings WHERE key = $1', [req.params.key]);
    res.json({ value: r.rows[0] ? JSON.parse(r.rows[0].value) : null });
  } catch (e) {
    console.error('GET /api/settings 오류:', e);
    res.status(500).json({ error: e.message });
  }
});
app.put('/api/settings/:key', async (req, res) => {
  try {
    const val = JSON.stringify(req.body.value ?? null);
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [req.params.key, val]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('PUT /api/settings 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// 카테고리 순서 일괄 변경 — body: { order: ["id1", "id2", ...] }
app.post('/api/categories/reorder', async (req, res) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order 배열 필요' });
    // 트랜잭션으로 한꺼번에 갱신
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < order.length; i++) {
        await client.query(
          `UPDATE categories SET "sortOrder"=$1 WHERE id=$2`,
          [(i + 1) * 10, order[i]]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    res.json({ success: true, count: order.length });
  } catch (e) {
    console.error('POST /api/categories/reorder 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── 안전보건 조직도 (본사용/사업장용) ───
app.get('/api/org-charts', async (req, res) => {
  try {
    const result = await pool.query('SELECT scope, data FROM org_charts');
    const out = {};
    result.rows.forEach(r => { out[r.scope] = r.data; });
    res.json(out);
  } catch (e) {
    console.error('GET /api/org-charts 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/org-charts/:scope', async (req, res) => {
  try {
    const scope = req.params.scope;
    const data = (req.body && req.body.data !== undefined) ? req.body.data : req.body;
    await pool.query(
      `INSERT INTO org_charts (scope, data, "updatedAt") VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (scope) DO UPDATE SET data = EXCLUDED.data, "updatedAt" = EXCLUDED."updatedAt"`,
      [scope, JSON.stringify(data), new Date().toISOString()]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/org-charts 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── HQ (본부) ──
app.get('/api/hq', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hq ORDER BY "sortOrder", id');
    res.json({ hq: result.rows });
  } catch (e) {
    console.error('GET /api/hq 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/hq', async (req, res) => {
  try {
    const { name, code, description, ownerDept, sortOrder, status } = req.body;
    if (!name) return res.status(400).json({ error: '본부명을 입력하세요.' });
    const result = await pool.query(
      `INSERT INTO hq (name, code, description, "ownerDept", "sortOrder", status, "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, code||'', description||'', ownerDept||'', sortOrder||0, status||'active', new Date().toISOString()]
    );
    res.json({ hq: result.rows[0] });
  } catch (e) {
    console.error('POST /api/hq 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/hq/:id', async (req, res) => {
  try {
    const { name, code, description, ownerDept, sortOrder, status } = req.body;
    const result = await pool.query(
      `UPDATE hq SET name=$1, code=$2, description=$3, "ownerDept"=$4, "sortOrder"=$5, status=$6 WHERE id=$7 RETURNING *`,
      [name||'', code||'', description||'', ownerDept||'', sortOrder||0, status||'active', req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: '본부를 찾을 수 없습니다.' });
    res.json({ hq: result.rows[0] });
  } catch (e) {
    console.error('PUT /api/hq 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/hq/:id', async (req, res) => {
  try {
    // 본부 삭제 전: 소속 사업장 있는지 확인
    const inUse = await pool.query('SELECT COUNT(*) FROM sites WHERE "hqId"=$1', [req.params.id]);
    if (parseInt(inUse.rows[0].count) > 0) {
      return res.status(409).json({ error: `이 본부에 소속된 사업장이 ${inUse.rows[0].count}개 있습니다. 먼저 사업장의 본부를 변경하거나 삭제해주세요.` });
    }
    const result = await pool.query('DELETE FROM hq WHERE id=$1 RETURNING id, name', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: '본부를 찾을 수 없습니다.' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (e) {
    console.error('DELETE /api/hq 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Compliance Submissions (이행사항 제출) ──
app.get('/api/compliance-submissions', async (req, res) => {
  try {
    const { period } = req.query;
    const sql = period
      ? `SELECT * FROM compliance_submissions WHERE period=$1 ORDER BY "createdAt" DESC`
      : `SELECT * FROM compliance_submissions ORDER BY "createdAt" DESC`;
    const result = period
      ? await pool.query(sql, [period])
      : await pool.query(sql);
    res.json({ submissions: result.rows });
  } catch (e) {
    console.error('GET /api/compliance-submissions 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/compliance-submissions', async (req, res) => {
  try {
    const {
      siteId, itemKey, itemLabel, period,
      submitterUserId, submitterName, fileName, fileUrl, note, status,
    } = req.body;
    if (!siteId || !itemKey) {
      return res.status(400).json({ error: '사업장과 이행항목이 필요합니다.' });
    }
    // UPSERT — (siteId, itemKey, period) 동일하면 UPDATE
    const result = await pool.query(
      `INSERT INTO compliance_submissions
        ("siteId", "itemKey", "itemLabel", status, "submittedAt", "submitterUserId", "submitterName",
         "fileName", "fileUrl", note, period, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,NOW()::TEXT,$5,$6,$7,$8,$9,$10,NOW()::TEXT,NOW()::TEXT)
       ON CONFLICT ("siteId", "itemKey", period) DO UPDATE SET
         "itemLabel" = EXCLUDED."itemLabel",
         status = EXCLUDED.status,
         "submittedAt" = NOW()::TEXT,
         "submitterUserId" = EXCLUDED."submitterUserId",
         "submitterName" = EXCLUDED."submitterName",
         "fileName" = COALESCE(NULLIF(EXCLUDED."fileName", ''), compliance_submissions."fileName"),
         "fileUrl" = COALESCE(NULLIF(EXCLUDED."fileUrl", ''), compliance_submissions."fileUrl"),
         note = EXCLUDED.note,
         "updatedAt" = NOW()::TEXT
       RETURNING *`,
      [siteId, itemKey, itemLabel||'', status||'submitted',
       submitterUserId||null, submitterName||'', fileName||'', fileUrl||'', note||'', period||'']
    );
    res.json({ success: true, submission: result.rows[0] });
  } catch (e) {
    console.error('POST /api/compliance-submissions 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/compliance-submissions/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM compliance_submissions WHERE id=$1 RETURNING id', [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: '제출 내역을 찾을 수 없습니다.' });
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/compliance-submissions 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Worker Feedback (종사자 의견 청취) ──
app.get('/api/worker-feedback', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wf.*, hq.name AS "hqName", hq.code AS "hqCode"
       FROM worker_feedback wf
       LEFT JOIN hq ON hq.id = wf."hqId"
       ORDER BY wf."createdAt" DESC`
    );
    res.json({ feedback: result.rows });
  } catch (e) {
    console.error('GET /api/worker-feedback 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/worker-feedback', async (req, res) => {
  try {
    const {
      privacyAgreed, hqId, siteName, reporterName, isAnonymous,
      category, detail, improvementSuggestion, submitterUserId,
    } = req.body;
    // 필수 검증
    if (!privacyAgreed) return res.status(400).json({ error: '개인정보 수집·이용에 동의해주세요.' });
    if (!hqId) return res.status(400).json({ error: '소속 구분을 선택해주세요.' });
    if (!siteName || !String(siteName).trim()) return res.status(400).json({ error: '부서명 또는 사업장명을 입력해주세요.' });
    if (!category) return res.status(400).json({ error: '제안 내용 유형을 선택해주세요.' });
    if (!detail || !String(detail).trim()) return res.status(400).json({ error: '상세 내용을 입력해주세요.' });
    if (!isAnonymous && (!reporterName || !String(reporterName).trim())) {
      return res.status(400).json({ error: '제보자 성함을 입력하거나 익명을 선택해주세요.' });
    }
    const result = await pool.query(
      `INSERT INTO worker_feedback
       ("privacyAgreed", "hqId", "siteName", "reporterName", "isAnonymous",
        category, detail, "improvementSuggestion", "submitterUserId", status, "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'new',NOW()::TEXT) RETURNING *`,
      [
        !!privacyAgreed, hqId || null, siteName || '',
        isAnonymous ? '익명' : (reporterName || ''),
        !!isAnonymous, category || '', detail || '',
        improvementSuggestion || '', submitterUserId || null,
      ]
    );
    res.json({ success: true, feedback: result.rows[0] });
  } catch (e) {
    console.error('POST /api/worker-feedback 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/worker-feedback/:id', async (req, res) => {
  try {
    const { status, response } = req.body;
    const result = await pool.query(
      `UPDATE worker_feedback SET status=$1, response=$2, "respondedAt"=NOW()::TEXT
       WHERE id=$3 RETURNING *`,
      [status || 'reviewing', response || '', req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: '의견을 찾을 수 없습니다.' });
    res.json({ success: true, feedback: result.rows[0] });
  } catch (e) {
    console.error('PUT /api/worker-feedback 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/worker-feedback/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM worker_feedback WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: '의견을 찾을 수 없습니다.' });
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/worker-feedback 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── 안전보건교육 일지 ──
app.get('/api/edu-logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM education_logs ORDER BY "교육일자" DESC, id DESC');
    res.json({ logs: result.rows });
  } catch (e) {
    console.error('GET /api/edu-logs 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/edu-logs', async (req, res) => {
  try {
    const b = req.body || {};
    const result = await pool.query(
      `INSERT INTO education_logs (
        "교육종류","사업장명","교육일자","시작시간","종료시간","교육시간","교육장소",
        "강사명","강사직책","교육방법","교육내용","교육교재",
        "대상자수_계","대상자수_남","대상자수_여",
        "실시자수_계","실시자수_남","실시자수_여",
        "미실시사유","특이사항","담당서명","검토서명","승인서명","작성자","작성일","createdAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,NOW()::TEXT
      ) RETURNING *`,
      [
        b['교육종류'] || '', b['사업장명'] || '', b['교육일자'] || '', b['시작시간'] || '', b['종료시간'] || '',
        b['교육시간'] || '', b['교육장소'] || '',
        b['강사명'] || '', b['강사직책'] || '', b['교육방법'] || '', b['교육내용'] || '', b['교육교재'] || '',
        parseInt(b['대상자수_계']) || 0, parseInt(b['대상자수_남']) || 0, parseInt(b['대상자수_여']) || 0,
        parseInt(b['실시자수_계']) || 0, parseInt(b['실시자수_남']) || 0, parseInt(b['실시자수_여']) || 0,
        b['미실시사유'] || '', b['특이사항'] || '',
        b['담당서명'] || '', b['검토서명'] || '', b['승인서명'] || '',
        b['작성자'] || '', b['작성일'] || new Date().toISOString(),
      ]
    );
    res.json({ success: true, log: result.rows[0], 'EducationLog': result.rows[0] });
  } catch (e) {
    console.error('POST /api/edu-logs 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/edu-logs/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const result = await pool.query(
      `UPDATE education_logs SET
         "교육종류"=$1, "사업장명"=$2, "교육일자"=$3, "시작시간"=$4, "종료시간"=$5,
         "교육시간"=$6, "교육장소"=$7,
         "강사명"=$8, "강사직책"=$9, "교육방법"=$10, "교육내용"=$11, "교육교재"=$12,
         "대상자수_계"=$13, "대상자수_남"=$14, "대상자수_여"=$15,
         "실시자수_계"=$16, "실시자수_남"=$17, "실시자수_여"=$18,
         "미실시사유"=$19, "특이사항"=$20,
         "담당서명"=$21, "검토서명"=$22, "승인서명"=$23
       WHERE id=$24 RETURNING *`,
      [
        b['교육종류'] || '', b['사업장명'] || '', b['교육일자'] || '', b['시작시간'] || '', b['종료시간'] || '',
        b['교육시간'] || '', b['교육장소'] || '',
        b['강사명'] || '', b['강사직책'] || '', b['교육방법'] || '', b['교육내용'] || '', b['교육교재'] || '',
        parseInt(b['대상자수_계']) || 0, parseInt(b['대상자수_남']) || 0, parseInt(b['대상자수_여']) || 0,
        parseInt(b['실시자수_계']) || 0, parseInt(b['실시자수_남']) || 0, parseInt(b['실시자수_여']) || 0,
        b['미실시사유'] || '', b['특이사항'] || '',
        b['담당서명'] || '', b['검토서명'] || '', b['승인서명'] || '',
        req.params.id,
      ]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: '교육일지를 찾을 수 없습니다.' });
    res.json({ success: true, log: result.rows[0] });
  } catch (e) {
    console.error('PUT /api/edu-logs 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/edu-logs/:id', async (req, res) => {
  try {
    // CASCADE로 참석자도 함께 삭제됨 (FK ON DELETE CASCADE)
    const result = await pool.query('DELETE FROM education_logs WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: '교육일지를 찾을 수 없습니다.' });
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/edu-logs 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── 교육 참석자 명단 ──
app.get('/api/edu-attendees', async (req, res) => {
  try {
    const eduId = req.query.educationId;
    const sql = eduId
      ? 'SELECT * FROM education_attendees WHERE "educationId"=$1 ORDER BY "번호", id'
      : 'SELECT * FROM education_attendees ORDER BY "educationId", "번호", id';
    const result = await pool.query(sql, eduId ? [eduId] : []);
    res.json({ attendees: result.rows });
  } catch (e) {
    console.error('GET /api/edu-attendees 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/edu-attendees', async (req, res) => {
  try {
    const b = req.body || {};
    const result = await pool.query(
      `INSERT INTO education_attendees ("educationId","번호","성명","소속","직급","사번","서명","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()::TEXT) RETURNING *`,
      [
        b.educationId || null,
        parseInt(b['번호']) || 0,
        b['성명'] || '', b['소속'] || '', b['직급'] || '', b['사번'] || '', b['서명'] || '',
      ]
    );
    res.json({ success: true, attendee: result.rows[0] });
  } catch (e) {
    console.error('POST /api/edu-attendees 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// 특정 교육의 참석자 전체 삭제 — 수정 시 재저장 패턴용
app.delete('/api/edu-attendees', async (req, res) => {
  try {
    const eduId = req.query.educationId;
    if (!eduId) return res.status(400).json({ error: 'educationId 쿼리 파라미터 필요' });
    const result = await pool.query('DELETE FROM education_attendees WHERE "educationId"=$1', [eduId]);
    res.json({ success: true, deleted: result.rowCount });
  } catch (e) {
    console.error('DELETE /api/edu-attendees 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── 안전보건교육 종류 마스터 (관리자 가감) ──
// ?includeHidden=true → 숨김 항목 포함 (관리 화면용)
// 기본은 visible만 반환 (드롭다운/필터용)
app.get('/api/edu-types', async (req, res) => {
  try {
    const includeHidden = req.query.includeHidden === 'true';
    const sql = includeHidden
      ? 'SELECT * FROM education_types ORDER BY "sortOrder", id'
      : 'SELECT * FROM education_types WHERE COALESCE(hidden, false) = false ORDER BY "sortOrder", id';
    const result = await pool.query(sql);
    res.json({ types: result.rows });
  } catch (e) {
    console.error('GET /api/edu-types 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/edu-types', async (req, res) => {
  try {
    const { id, label, hours, content, sortOrder } = req.body || {};
    if (!id || !String(id).trim()) return res.status(400).json({ error: 'id를 입력해주세요.' });
    if (!label || !String(label).trim()) return res.status(400).json({ error: '교육명을 입력해주세요.' });
    const dup = await pool.query('SELECT id FROM education_types WHERE id=$1', [id]);
    if (dup.rowCount > 0) return res.status(409).json({ error: `이미 존재하는 ID입니다: ${id}` });
    const result = await pool.query(
      `INSERT INTO education_types (id, label, hours, content, "sortOrder", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,NOW()::TEXT) RETURNING *`,
      [id, label, hours || '', content || '', parseInt(sortOrder) || 999]
    );
    res.json({ success: true, type: result.rows[0] });
  } catch (e) {
    console.error('POST /api/edu-types 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/edu-types/:id', async (req, res) => {
  try {
    // 부분 업데이트 지원 — body에 들어온 필드만 갱신
    const b = req.body || {};
    // 현재 행 조회
    const cur = await pool.query('SELECT * FROM education_types WHERE id=$1', [req.params.id]);
    if (cur.rowCount === 0) return res.status(404).json({ error: '교육종류를 찾을 수 없습니다.' });
    const row = cur.rows[0];
    const next = {
      label:     b.label     !== undefined ? String(b.label)   : row.label,
      hours:     b.hours     !== undefined ? String(b.hours)   : row.hours,
      content:   b.content   !== undefined ? String(b.content) : row.content,
      sortOrder: b.sortOrder !== undefined ? (parseInt(b.sortOrder) || 999) : row.sortOrder,
      hidden:    b.hidden    !== undefined ? !!b.hidden : (row.hidden || false),
    };
    const result = await pool.query(
      `UPDATE education_types SET label=$1, hours=$2, content=$3, "sortOrder"=$4, hidden=$5, "updatedAt"=NOW()::TEXT
       WHERE id=$6 RETURNING *`,
      [next.label, next.hours, next.content, next.sortOrder, next.hidden, req.params.id]
    );
    res.json({ success: true, type: result.rows[0] });
  } catch (e) {
    console.error('PUT /api/edu-types 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/edu-types/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM education_types WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: '교육종류를 찾을 수 없습니다.' });
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/edu-types 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Sites ──
app.get('/api/sites', async (req, res) => {
  const result = await pool.query('SELECT * FROM sites ORDER BY "hqId" NULLS LAST, id');
  res.json({ sites: result.rows });
});

// ── 사업장 ↔ 담당 직원 siteIds 동기화 헬퍼 ──
// 사업장 저장 시 호출. 해당 site id를:
//   - assigneeIds에 포함된 user의 siteIds(CSV)에 추가
//   - 그 외 user의 siteIds에서는 제거 (수정 시 옛 담당자 해제)
async function syncSiteAssignees(siteId, assigneeIds) {
  const sid = String(siteId);
  const wantIds = (assigneeIds || []).map(String);

  // 모든 사용자 중 (1) siteIds에 sid 가진 자 + (2) 새 담당자 후보
  const allUsers = await pool.query('SELECT id, "siteIds" FROM users');
  for (const u of allUsers.rows) {
    const curIds = String(u.siteIds || '').split(',').map(s => s.trim()).filter(Boolean);
    const hasIt = curIds.includes(sid);
    const shouldHave = wantIds.includes(String(u.id));
    if (hasIt && !shouldHave) {
      // 제거
      const next = curIds.filter(x => x !== sid).join(',');
      await pool.query('UPDATE users SET "siteIds"=$1 WHERE id=$2', [next, u.id]);
    } else if (!hasIt && shouldHave) {
      // 추가
      const next = [...curIds, sid].join(',');
      await pool.query('UPDATE users SET "siteIds"=$1 WHERE id=$2', [next, u.id]);
    }
  }
}

app.post('/api/sites', async (req, res) => {
  try {
    const { name, region, client, manager, phone, status, hqId, address, assigneeIds, expiresAt } = req.body;
    const result = await pool.query(
      `INSERT INTO sites (name, region, client, manager, phone, status, "hqId", address, "expiresAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name||'', region||'', client||'', manager||'', phone||'', status||'active', hqId||null, address||'', expiresAt||null]
    );
    const site = result.rows[0];
    // 담당자 동기화 (배열로 들어왔을 때만)
    if (Array.isArray(assigneeIds)) {
      await syncSiteAssignees(site.id, assigneeIds);
    }
    // 팀 공용계정(manager/staff)이 사업장을 직접 추가하면 그 계정의 담당 사업장(siteIds)에 자동 연결.
    // ⚠️ 이미 siteIds가 지정된(=팀 단위로 스코프된) 계정에만 적용.
    //    siteIds가 비어있는 계정은 "본부 전체" 접근이므로 append하면 오히려 1개로 축소돼 회귀 → 제외.
    try {
      const uid = req.session && req.session.uid;
      const urole = req.session && req.session.role;
      if (uid && (urole === 'manager' || urole === 'staff')) {
        const ur = await pool.query('SELECT "siteIds" FROM users WHERE id=$1', [uid]);
        const cur = String((ur.rows[0] && ur.rows[0].siteIds) || '').split(',').map(s => s.trim()).filter(Boolean);
        if (cur.length > 0 && !cur.includes(String(site.id))) {
          cur.push(String(site.id));
          await pool.query('UPDATE users SET "siteIds"=$1 WHERE id=$2', [cur.join(','), uid]);
        }
      }
    } catch (e) {
      console.error('사업장 자동 연결(siteIds) 실패:', e);
    }
    res.json({ site });
  } catch (e) {
    console.error('POST /api/sites 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/sites/:id', async (req, res) => {
  try {
    const { name, region, client, manager, phone, status, hqId, address, assigneeIds, expiresAt } = req.body;
    // 계약 종료일(expiresAt)은 본사 관리자·안전관리자·팀 공용계정만 변경 가능.
    // 현장대리인(site_manager/site_staff)이 자기 사업장 정보를 수정할 때는 기존 종료일을 그대로 유지.
    let finalExpiresAt = expiresAt || null;
    const urole = req.session && req.session.role;
    if (urole === 'site_manager' || urole === 'site_staff') {
      const cur = await pool.query('SELECT "expiresAt" FROM sites WHERE id=$1', [req.params.id]);
      finalExpiresAt = (cur.rows[0] && cur.rows[0].expiresAt) || null;
    }
    const result = await pool.query(
      `UPDATE sites SET name=$1, region=$2, client=$3, manager=$4, phone=$5, status=$6, "hqId"=$7, address=$8, "expiresAt"=$9
       WHERE id=$10 RETURNING *`,
      [name||'', region||'', client||'', manager||'', phone||'', status||'active', hqId||null, address||'', finalExpiresAt, req.params.id]
    );
    if (Array.isArray(assigneeIds)) {
      await syncSiteAssignees(req.params.id, assigneeIds);
    }
    res.json({ site: result.rows[0] });
  } catch (e) {
    console.error('PUT /api/sites 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/sites/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sites WHERE id=$1 RETURNING id, name', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: '사업장을 찾을 수 없습니다.' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (e) {
    console.error('DELETE /api/sites 오류:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Approvals ──
app.get('/api/approvals', async (req, res) => {
  const result = await pool.query('SELECT * FROM approvals ORDER BY id DESC');
  res.json({ approvals: result.rows });
});

app.get('/api/approvals/:id', async (req, res) => {
  const doc = await pool.query('SELECT * FROM approvals WHERE id = $1', [req.params.id]);
  const actions = await pool.query('SELECT * FROM approval_actions WHERE "approvalId" = $1 ORDER BY step, id', [req.params.id]);
  res.json({ approval: doc.rows[0], actions: actions.rows });
});

app.post('/api/approvals', async (req, res) => {
  const { title, content, categoryId, authorId, authorName, authorDept, preservePeriod, approvalLines, referrers, recipients } = req.body;
  const result = await pool.query(
    `INSERT INTO approvals (title, content, "categoryId", "authorId", "authorName", "authorDept", "preservePeriod", "createdAt", status, "approvalLines", "referrers", "recipients")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10,$11) RETURNING *`,
    [title, content, categoryId, authorId, authorName, authorDept||'', preservePeriod||'영구', new Date().toISOString(),
     JSON.stringify(approvalLines||[]), JSON.stringify(referrers||[]), JSON.stringify(recipients||[])]
  );
  res.json({ approval: result.rows[0] });
});

app.post('/api/approvals/:id/action', async (req, res) => {
  const { userId, userName, userDept, action, comment, step } = req.body;
  const approvalId = req.params.id;

  await pool.query(
    `INSERT INTO approval_actions ("approvalId", "userId", "userName", "userDept", action, comment, "actedAt", step)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [approvalId, userId, userName, userDept||'', action, comment||'', new Date().toISOString(), step||0]
  );

  const doc = await pool.query('SELECT * FROM approvals WHERE id = $1', [approvalId]);
  const approvalLines = JSON.parse(doc.rows[0].approvalLines || '[]');
  const actions = await pool.query('SELECT * FROM approval_actions WHERE "approvalId" = $1', [approvalId]);

  let newStatus = 'pending';
  if (action === 'reject') {
    newStatus = 'rejected';
  } else {
    const approvedCount = actions.rows.filter(a => a.action === 'approve').length;
    if (approvedCount >= approvalLines.length) newStatus = 'approved';
  }

  await pool.query('UPDATE approvals SET status = $1 WHERE id = $2', [newStatus, approvalId]);
  res.json({ success: true, status: newStatus });
});

app.delete('/api/approvals/:id', async (req, res) => {
  await pool.query('DELETE FROM approval_actions WHERE "approvalId" = $1', [req.params.id]);
  await pool.query('DELETE FROM approvals WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════
//  MSDS 자동생성 API
// ══════════════════════════════════════════════════════

// AI 추출용 API 키 — 반드시 환경변수 OPENAI_API_KEY 로만 주입 (소스에 직접 입력 금지)
// 유효 문자(영문/숫자/_/-)만 남김 — Railway 등 환경변수 붙여넣기 시 딸려오는
// 개행·공백·따옴표 등 모든 이상문자 제거. (미제거 시 https 경로에 이상문자 →
// "Request path contains unescaped characters" 에러)
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').replace(/[^A-Za-z0-9_\-]/g, '');

// 한국산업안전보건공단 MSDS OpenAPI 서비스 키 — 원문에 특수문자 포함될 수 있어 공백/개행만 제거
const MSDS_API_KEY = (process.env.MSDS_API_KEY || '').replace(/\s+/g, '');

// ── OpenAI API 호출 (PDF → JSON 추출) ──
const MSDS_PROMPT = `이 MSDS(물질안전보건자료) PDF를 분석하여 아래 JSON 형식으로만 반환하세요. 마크다운 코드블록(\`\`\`) 없이 순수 JSON만 반환하세요.

{
  "productName": "제품명(한국어)",
  "signalWord": "MSDS에 명시된 신호어. '위험' 또는 '경고'만. 신호어가 없는 물질이면 빈 문자열(\"\") — 억지로 채우지 말 것",
  "hazard": "유해성·위험성 요약 (MSDS 2절 내용, 줄바꿈 가능)",
  "handling": "취급 주의사항 (MSDS 7절)",
  "storage": "저장 주의사항 (MSDS 7절)",
  "eyeEmergency": "눈 접촉 시 응급조치 (MSDS 4절)",
  "skinEmergency": "피부 접촉 시 응급조치 (MSDS 4절)",
  "inhaleEmergency": "흡입 시 응급조치 (MSDS 4절)",
  "ingestEmergency": "섭취 시 응급조치 (MSDS 4절)",
  "otherEmergency": "기타 응급조치",
  "fireEmergency": "폭발·화재 시 대처방법 (MSDS 5절)",
  "spillEmergency": "누출사고 대처방법 (MSDS 6절)",
  "supplier": "제조사/공급자 정보 (업체명, 전화번호, 주소를 한 줄로)",
  "hazardCodes": "유해·위험문구 (MSDS 2절 H문구. 코드 제외하고 문구만, 한 줄에 하나씩 줄바꿈으로 구분)",
  "preventPhrases": "예방조치문구 중 예방(P2xx) 항목 (문구만, 한 줄에 하나씩)",
  "responsePhrases": "예방조치문구 중 대응(P3xx) 항목 (문구만, 한 줄에 하나씩)",
  "storagePhrases": "예방조치문구 중 저장(P4xx) 항목 (문구만, 한 줄에 하나씩)",
  "disposalPhrases": "예방조치문구 중 폐기(P5xx) 항목 (문구만, 한 줄에 하나씩)",
  "companyName": "공급자/제조사 업체명 (㈜ 등 회사명만, 부서·상담실 명칭 제외)",
  "companyPhone": "공급자 전화번호 — 숫자와 하이픈만 (예: 080-859-5757). '소비자 상담실:', '(업무시간 내)', '/ 119' 같은 부가 설명은 절대 포함하지 말 것. 번호 하나만",
  "companyAddress": "공급자 주소 (도로명/지번 주소만)",
  "ghsIds": [MSDS에 표시된 GHS 그림문자 번호를 숫자 배열로. 반드시 정수. 1=폭발물(폭탄) 2=인화성(불꽃) 3=급성독성(해골) 4=발암성/생식독성(사람실루엣) 5=수생환경유해성(나무물고기) 6=산화성(원위불꽃) 7=고압가스(가스통) 8=부식성(손과표면) 9=경고(느낌표)],
  "ppeIds": [MSDS에 명시된 개인보호구 번호를 숫자 배열로. 반드시 정수. 301=보안경 302=방독마스크 303=방진마스크 304=보안면 305=안전모 308=안전장갑 309=안전복 307=안전화]
}

주의: ghsIds와 ppeIds는 반드시 숫자(정수) 배열로 반환. 문자열 금지. 해당 항목이 없으면 [] 반환.`;

// 순서대로 시도할 모델 목록 (앞쪽 모델 실패 시 다음으로)
const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o'];

function callOpenAIModel(pdfBase64, model) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: MSDS_PROMPT },
          { type: 'file', file: { filename: 'msds.pdf', file_data: `data:application/pdf;base64,${pdfBase64}` } },
        ],
      }],
      max_tokens: 4096,
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      // ⚠ string으로 누적하면 안 됨 — UTF-8 멀티바이트 글자(한글 3바이트)가
      //    chunk 경계에서 잘리면 각 chunk가 깨진 절반을 담고 += 시점에 �로 굳어짐.
      //    Buffer로 모았다가 한번에 toString('utf8')로 디코딩해야 안전.
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        try {
          const data = Buffer.concat(chunks).toString('utf8');
          const response = JSON.parse(data);
          // API 레벨 오류 (high demand, quota 등)
          if (response.error) {
            reject(new Error(response.error.message || 'OpenAI API 오류'));
            return;
          }
          const text = response.choices?.[0]?.message?.content || '{}';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('JSON을 찾을 수 없습니다.');
          resolve(JSON.parse(jsonMatch[0]));
        } catch (e) {
          reject(new Error(e.message));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 재시도 + 모델 폴백 포함 호출
async function callOpenAI(pdfBase64) {
  let lastErr;
  for (const model of OPENAI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[OpenAI] 시도: ${model} (attempt ${attempt + 1})`);
        const result = await callOpenAIModel(pdfBase64, model);
        console.log(`[OpenAI] 성공: ${model}`);
        return result;
      } catch (err) {
        lastErr = err;
        const isRetryable = /rate limit|overload|429|500|503|quota/i.test(err.message);
        console.warn(`[OpenAI] 실패 (${model}): ${err.message.substring(0, 80)}`);
        if (isRetryable && attempt === 0) {
          console.log('[OpenAI] 3초 후 재시도...');
          await new Promise(r => setTimeout(r, 3000));
        } else {
          break; // 재시도 불필요 → 다음 모델로
        }
      }
    }
  }
  throw lastErr;
}

// ── MSDS 정부 API XML 파싱 헬퍼 ──
function parseXml(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}
function parseXmlAll(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim());
  return results;
}
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      // Buffer 누적 → 한번에 UTF-8 디코딩 (멀티바이트 한글 안전)
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 400) {
          // data.go.kr은 500 본문에 실제 사유(키 미등록·트래픽 초과 등)를 담아 보냄 → 같이 노출
          const detail = body.replace(/\s+/g, ' ').trim().slice(0, 300);
          reject(new Error(`KOSHA API 연결 실패 (HTTP ${res.statusCode}): ${detail || '응답 본문 없음. 키 전파 지연이거나 API 서버 점검 중일 수 있습니다.'}`));
        } else {
          resolve(body);
        }
      });
    }).on('error', reject);
  });
}

// ── POST /api/msds/extract — PDF 업로드 → OpenAI AI 추출 ──
// AI 추출 결과 정제 — AI가 부가문구를 같이 가져오는 복불복 문제를 코드로 확정 처리
function sanitizeMsds(d) {
  if (!d || typeof d !== 'object') return d;
  // 전화번호: 첫 번째 "전화번호 패턴"만 남김 (지역번호/대표번호 형식)
  if (d.companyPhone) {
    const m = String(d.companyPhone).match(/0\d{1,3}[-\s.)]*\d{3,4}[-\s.]*\d{4}/);
    d.companyPhone = m ? m[0].replace(/[\s.)]+/g, '-').replace(/-+/g, '-') : '';
  }
  // 신호어: 위험/경고만 허용, 그 외(없음·문장 등)는 빈 값
  if (d.signalWord && d.signalWord !== '위험' && d.signalWord !== '경고') d.signalWord = '';
  // 업체명: 괄호 부가설명·상담실 명칭 제거, 첫 줄만
  if (d.companyName) {
    d.companyName = String(d.companyName).split('\n')[0]
      .replace(/\((?:업무시간|소비자|상담).*?\)/g, '')
      .replace(/(소비자\s*상담실|고객센터|상담실)\s*[:：].*/g, '')
      .trim();
  }
  return d;
}

app.post('/api/msds/extract', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // Supabase 모드=memoryStorage(req.file.buffer) / 로컬=diskStorage(req.file.path)
  const cleanup = () => { if (req.file.path) fs.unlink(req.file.path, () => {}); };
  if (!OPENAI_API_KEY) {
    cleanup();
    return res.status(503).json({ error: 'OPENAI_API_KEY가 설정되지 않았습니다.' });
  }
  try {
    const pdfBuffer = req.file.buffer || fs.readFileSync(req.file.path);
    const pdfBase64 = pdfBuffer.toString('base64');
    cleanup();
    const result = sanitizeMsds(await callOpenAI(pdfBase64));
    res.json(result);
  } catch (err) {
    console.error('[MSDS extract]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/inspection/analyze — 현장점검 사진 AI 분석 ──
const INSPECTION_PROMPT = `당신은 산업안전보건 전문가입니다. 첨부한 현장 사진을 분석하여 아래 JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 출력.

{
  "title": "사진에 보이는 장소/구역 한 줄 명칭 (예: 화학물질 보관창고, 전기패널 구역)",
  "risk": "높음 또는 중간 또는 낮음 중 하나만 — 즉각 시정 필요 시 높음, 개선 권고 시 중간, 양호하나 주의 필요 시 낮음",
  "문제점": ["발견된 위험요인 또는 법적 위반 가능 항목을 구체적으로. 없으면 빈 배열"],
  "보완사항": ["즉시 또는 단기에 시정해야 할 조치 사항. 없으면 빈 배열"],
  "구매조치": ["구매 또는 설치가 필요한 안전장비·자재. 없으면 빈 배열"],
  "요청사항": ["담당 부서 또는 외부 기관에 요청할 사항. 없으면 빈 배열"]
}

주의사항:
- 각 배열 항목은 한국어로 구체적이고 간결하게 작성 (1~2문장)
- 사진에서 명확히 보이는 것만 기재, 추측 금지
- 안전보건 관련 없는 항목 제외
- 사진이 너무 흐리거나 판단 불가 시 모든 배열을 빈 배열로 반환하되 title에 "분석 불가" 기재`;

function callInspectionModel(imageBase64, mimeType, model) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: INSPECTION_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` } },
        ],
      }],
      max_tokens: 2048,
    });
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    };
    const req2 = https.request(options, (r) => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => {
        try {
          const data = Buffer.concat(chunks).toString('utf8');
          const resp = JSON.parse(data);
          if (resp.error) { reject(new Error(resp.error.message)); return; }
          const text = resp.choices?.[0]?.message?.content || '{}';
          const m = text.match(/\{[\s\S]*\}/);
          if (!m) throw new Error('JSON을 찾을 수 없습니다.');
          resolve(JSON.parse(m[0]));
        } catch (e) { reject(e); }
      });
    });
    req2.on('error', reject);
    req2.write(body);
    req2.end();
  });
}

app.post('/api/inspection/analyze', async (req, res) => {
  if (!OPENAI_API_KEY) return res.status(503).json({ error: 'OPENAI_API_KEY가 설정되지 않았습니다.' });
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 필드가 없습니다.' });

  const models = ['gpt-4o-mini', 'gpt-4o'];
  let lastErr;
  for (const model of models) {
    try {
      console.log(`[inspection analyze] 모델 시도: ${model}`);
      const result = await callInspectionModel(imageBase64, mimeType, model);
      console.log(`[inspection analyze] 성공: ${model}`);
      return res.json(result);
    } catch (err) {
      console.warn(`[inspection analyze] ${model} 실패:`, err.message);
      lastErr = err;
    }
  }
  res.status(500).json({ error: lastErr?.message || '모든 모델 시도 실패' });
});

// ── GET /api/msds/search?q=제품명 — 산업안전보건공단 MSDS DB 검색 ──
app.get('/api/msds/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ items: [] });

  if (!MSDS_API_KEY) {
    return res.status(503).json({ error: 'MSDS_API_KEY가 설정되지 않았습니다.' });
  }

  try {
    // 키가 이미 URL 인코딩된 형태(인코딩 키, %XX 포함)면 그대로 쓰고,
    // 아니면(디코딩 키) encodeURIComponent 적용 → 인코딩·디코딩 키 아무거나 동작 (이중 인코딩 방지)
    const encodedKey = /%[0-9A-Fa-f]{2}/.test(MSDS_API_KEY) ? MSDS_API_KEY : encodeURIComponent(MSDS_API_KEY);
    // ⚠️ 올바른 오퍼레이션은 /msdschem/getChemList (검색). 예전엔 /msdschem만 호출해 항상 HTTP 500이었음.
    const url = `https://apis.data.go.kr/B552468/msdschem/getChemList?serviceKey=${encodedKey}&searchWrd=${encodeURIComponent(q)}&searchCnd=0&numOfRows=15&pageNo=1`;
    console.log('[MSDS search] URL:', url.replace(encodedKey, '***'));
    const xml = await httpsGet(url);
    console.log('[MSDS search] Raw XML (first 800):', xml.substring(0, 800));

    // API 에러 확인
    const resultCode = parseXml(xml, 'resultCode');
    const resultMsg = parseXml(xml, 'resultMsg');
    if (resultCode && resultCode !== '00' && resultCode !== '0000') {
      console.error('[MSDS search] API 오류:', resultCode, resultMsg);
      return res.status(502).json({ error: `MSDS API 오류: ${resultCode} ${resultMsg}` });
    }

    // getChemList <item> 파싱 — 검색은 화학물질 식별정보(chemId·국문명·CAS 등)만 반환.
    //   상세 절(유해성·응급조치·취급저장 등)은 chemId로 getChemDetail01~16을 따로 호출(아래 /api/msds/detail).
    const itemsXml = parseXmlAll(xml, 'item');
    const items = itemsXml.map(itemXml => ({
      chemId:      parseXml(itemXml, 'chemId'),
      productName: parseXml(itemXml, 'chemNameKor'),   // 실제 필드명은 chemNameKor (chemNm 아님)
      casNo:       parseXml(itemXml, 'casNo'),
      enNo:        parseXml(itemXml, 'enNo'),
      unNo:        parseXml(itemXml, 'unNo'),
    })).filter(item => item.productName);

    res.json({ items });
  } catch (err) {
    console.error('[MSDS search]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/msds/detail?chemId= — getChemDetail01~08을 모아 MSDS 폼 데이터로 조립 (AI 불필요) ──
// KOSHA 상세 응답은 절마다 <item>{msdsItemCode, msdsItemNameKor, itemDetail(| 구분)} 행 구조.
const GHS_FILE_TO_APPID = { '01': 1, '02': 2, '03': 6, '04': 7, '05': 8, '06': 3, '07': 9, '08': 4, '09': 5 };
const PPE_KEYWORDS = [
  [/보안경|보호안경|고글/, 301], [/방독/, 302], [/방진/, 303], [/보안면|안면\s*보호/, 304],
  [/안전모|보호모|헬멧/, 305], [/안전화|보호화/, 307], [/장갑/, 308], [/보호복|안전복|보호의|앞치마/, 309],
];
const kosDecode = s => String(s || '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const kosClean = s => kosDecode(s).split('|').map(x => x.trim())
  .filter(x => x && !/^자료\s*없음$/.test(x)).join('\n');
function kosItems(xml) {
  return parseXmlAll(xml, 'item').map(it => ({
    code: parseXml(it, 'msdsItemCode') || '',
    name: parseXml(it, 'msdsItemNameKor') || '',
    detail: parseXml(it, 'itemDetail') || '',
  }));
}
function kosPick(items, ...kws) {
  const hit = items.find(i => kws.some(k => i.name.includes(k)) && i.detail && !/^자료\s*없음$/.test(i.detail.trim()));
  return hit ? kosClean(hit.detail) : '';
}
const kosJoin = items => items.map(i => kosClean(i.detail)).filter(Boolean).join('\n');
async function kosGetDetail(sec, chemId, key) {
  const url = `https://apis.data.go.kr/B552468/msdschem/getChemDetail${sec}?serviceKey=${key}&chemId=${encodeURIComponent(chemId)}&numOfRows=100&pageNo=1`;
  return kosItems(await httpsGet(url));
}

app.get('/api/msds/detail', async (req, res) => {
  const chemId = (req.query.chemId || '').trim();
  if (!chemId) return res.status(400).json({ error: 'chemId가 필요합니다.' });
  if (!MSDS_API_KEY) return res.status(503).json({ error: 'MSDS_API_KEY가 설정되지 않았습니다.' });
  try {
    const key = /%[0-9A-Fa-f]{2}/.test(MSDS_API_KEY) ? MSDS_API_KEY : encodeURIComponent(MSDS_API_KEY);
    const [s01, s02, s04, s05, s06, s07, s08] = await Promise.all(
      ['01', '02', '04', '05', '06', '07', '08'].map(s => kosGetDetail(s, chemId, key).catch(() => []))
    );

    // GHS 그림문자 (GHS02.gif …) → 앱 내부 id
    const ghsRaw = kosPick(s02, '그림문자');
    const ghsIds = [...new Set((ghsRaw.match(/GHS(\d{2})/g) || []).map(m => GHS_FILE_TO_APPID[m.slice(3)]).filter(Boolean))];

    // 예방조치문구 P코드 → 예방(P2)/대응(P3)/저장(P4)/폐기(P5) 분류
    const pAll = [...new Set((s02.map(i => kosDecode(i.detail)).join('|').match(/P\d{3}[^|]*/g) || []).map(x => x.trim()))];
    const pBucket = { '2': [], '3': [], '4': [], '5': [] };
    pAll.forEach(p => { const b = pBucket[p[1]]; if (b) b.push(p); });

    // 개인보호구 텍스트 → 앱 보호구 id
    const ppeText = s08.map(i => i.name + ' ' + kosDecode(i.detail)).join(' ');
    const ppeIds = PPE_KEYWORDS.filter(([re]) => re.test(ppeText)).map(([, id]) => id);

    const signalWord = kosPick(s02, '신호어');
    res.json({
      signalWord:      (signalWord === '위험' || signalWord === '경고') ? signalWord : '',
      hazard:          kosPick(s02, '유해성·위험성 분류', '위험성 분류', '분류'),
      hazardCodes:     kosPick(s02, '유해·위험문구', '유해위험문구'),
      preventPhrases:  pBucket['2'].join('\n'),
      responsePhrases: pBucket['3'].join('\n'),
      storagePhrases:  pBucket['4'].join('\n'),
      disposalPhrases: pBucket['5'].join('\n'),
      eyeEmergency:    kosPick(s04, '눈'),
      skinEmergency:   kosPick(s04, '피부'),
      inhaleEmergency: kosPick(s04, '흡입'),
      ingestEmergency: kosPick(s04, '먹었', '섭취'),
      fireEmergency:   kosJoin(s05),
      spillEmergency:  kosJoin(s06),
      handling:        kosPick(s07, '안전취급요령', '취급'),
      storage:         kosPick(s07, '안전한 저장방법', '저장'),
      companyName:     kosPick(s01, '회사명'),
      companyAddress:  kosPick(s01, '주소'),
      companyPhone:    kosPick(s01, '전화', '긴급전화', '긴급'),
      ghsIds,
      ppeIds,
    });
  } catch (err) {
    console.error('[MSDS detail]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 위험성평가 PDF: 클라이언트(브라우저 인쇄)로 생성 ──
// 서버 Puppeteer 제거 → Vercel 서버리스 호환. 전체 출력은 프론트 window.print()로 처리.

// ── Express body 크기 제한 확장 (PDF 생성 시 사진 base64 + 모든 STEP 데이터 포함) ──
// app.use(express.json()) 보다 큰 limit 필요 — 기존 use 위치보다 후순위는 안되니까 별도 처리
// 위에서 이미 app.use(express.json()) 되어있으므로, 라우트 단위로 처리 필요시 추가

const PORT = process.env.PORT || 3000;
// 상주 서버(로컬/사내 서버 등)로 직접 실행할 때만 리슨.
// 서버리스(Vercel)에서는 이 파일을 함수로 로드하므로 아래 module.exports 로 app만 넘긴다.
if (require.main === module) {
  ensureDb().then(() => {
    app.listen(PORT, () => console.log('서버 실행중: http://localhost:' + PORT));
  });
}
module.exports = app;
