# Vercel 배포 가이드 (esh_platform_wv)

이 저장소는 Vercel 서버리스로 배포되도록 구성돼 있습니다.
- 프론트(`public/`) = Vercel 정적 서빙
- 백엔드(`index.js` Express) = Vercel 서버리스 함수 (`/api/*`)
- 데이터·파일 = Supabase (DB + Storage)

PDF는 서버 Puppeteer 없이 **브라우저 인쇄(window.print → "PDF로 저장")**로 생성합니다.

## 1. Vercel 프로젝트 설정
- Framework Preset: **Other** (별도 빌드 없음. `vercel.json`이 라우팅 담당)
- Root Directory: 저장소 루트
- Build/Output: 설정 불필요 (정적 + 서버리스 함수)

## 2. 환경변수 (Vercel → Settings → Environment Variables)

| 변수 | 값 | 비고 |
|---|---|---|
| `PGHOST` | Supabase **커넥션 풀러** 호스트 (`...pooler.supabase.com`) | ⚠ 직접 DB 호스트 말고 **풀러** 사용 |
| `PGPORT` | `6543` | ⚠ 풀러 포트 (기본 5432 아님) |
| `PGDATABASE` | `postgres` | Supabase 기본 |
| `PGUSER` | Supabase 풀러 사용자 (`postgres.xxxx`) | 풀러용 사용자명 |
| `PGPASSWORD` | DB 비밀번호 | |
| `SUPABASE_URL` | Supabase 프로젝트 URL | 파일 업로드 |
| `SUPABASE_SERVICE_KEY` | Supabase service role 키 | 파일 업로드 |
| `OPENAI_API_KEY` | `sk-...` | MSDS 추출·현장점검 사진분석 |
| `MSDS_API_KEY` | 안전보건공단 OpenAPI 키 | MSDS 검색 |
| `SESSION_SECRET` | 임의의 긴 랜덤 문자열 | 미설정 시 PGPASSWORD 기반 자동 파생 |
| `PG_POOL_MAX` | (선택) 기본 `1` | 서버리스 커넥션 수 |

> **왜 풀러(6543)?** 서버리스는 요청마다 인스턴스가 늘어나 DB 커넥션이 폭증할 수 있어,
> Supabase의 커넥션 풀러(Transaction pooler)를 써야 안정적입니다.
> Supabase 대시보드 → Project Settings → Database → **Connection Pooling**에서 값 확인.

## 3. 함수 실행시간 (필요 시)
MSDS 추출 등 OpenAI 호출이 오래 걸리면 무료(Hobby) 제한(기본 10초)에 걸릴 수 있습니다.
필요하면 `vercel.json`에 `functions` 설정으로 `maxDuration`을 늘리거나 Pro 플랜을 사용하세요.

## 4. 로컬 실행 (상주 서버 방식 그대로)
```bash
npm install
node index.js   # → http://localhost:3000  (app.listen)
```
`index.js`는 직접 실행 시 `app.listen`, 서버리스에서는 `module.exports = app`으로 동작합니다.
→ 추후 사내 상주 서버(NAS 등)로 이전해도 코드 변경 없이 그대로 실행됩니다.
