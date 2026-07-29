# 윌앤비전 안전보건관리 시스템

산업안전보건법 의무자료 통합 관리 시스템 (윌앤비전 전용).

## 기능
- 위험성평가 (6단계 양식 + PDF 출력)
- 안전보건교육 (일지 작성/조회/수정 + PDF)
- MSDS 자동화 (PDF 업로드 → AI 추출, 경고표지 출력)
- 현장점검 보고서 (AI 사진 분석 + 출력)
- 이행사항 제출 매트릭스
- 종사자 의견 청취 / 근무환경 조사표
- 법정의무 자동 판정
- 사업장·계정·본부 관리

## 조직
FM / HR / CRM / 공항사업본부 + KBCI / 동부캐리어 / 윌비모터스

## 기술 스택
- Backend: Node.js Express 5, PostgreSQL (Supabase)
- Frontend: React 18 (CDN), Babel Standalone
- AI: OpenAI API (MSDS PDF 추출 / 현장점검 사진 분석)
- 배포: Vercel (서버리스). 상주 서버(로컬/사내 서버)로도 그대로 실행 가능
- PDF: 브라우저 인쇄(`window.print` → "PDF로 저장") — 서버 Puppeteer 미사용

## 환경변수
> ⚠️ 모든 키·비밀값은 **환경변수로만** 주입합니다. 소스 코드에 직접 입력하거나 커밋하지 마세요.
> `.env` 파일은 `.gitignore`로 제외되어 있습니다.
> 배포 시 **Vercel → Settings → Environment Variables** 에 등록. 자세한 값·설명은 `docs/VERCEL_배포.md` 참고.
```
# ── 데이터베이스 (Supabase) ──  ※ 서버리스는 커넥션 풀러(6543) 사용
PGHOST               Supabase 풀러 호스트 (...pooler.supabase.com)
PGPORT               6543  (Transaction pooler)
PGDATABASE           postgres
PGUSER               postgres.<프로젝트ID>
PGPASSWORD           DB 비밀번호
PG_POOL_MAX          (선택) 서버리스 커넥션 수, 기본 1

# ── 파일 스토리지 (Supabase Storage) ──
SUPABASE_URL         Supabase 프로젝트 URL
SUPABASE_SERVICE_KEY Supabase service role 키

# ── AI / 외부 API ──
OPENAI_API_KEY       MSDS 추출·현장점검 사진분석 (sk-...) ※ 없으면 이 두 기능만 비활성
MSDS_API_KEY         한국산업안전보건공단 OpenAPI

# ── 기타 ──
SESSION_SECRET       세션 서명용 — 미설정 시 PGPASSWORD 기반 자동 파생
UPLOADS_DIR          (선택) 로컬 디스크 저장 시 경로. Supabase 사용 시 불필요
```
> 참고: 이전 Railway 배포에서 쓰던 `DATABASE_URL`·`PORT`·`GEMINI_API_KEY`·`PUPPETEER_EXECUTABLE_PATH`는 더 이상 사용하지 않습니다.

## 로컬 실행 (상주 서버 방식)
```bash
npm install
node index.js
# → http://localhost:3000
```
`index.js`는 직접 실행 시 `app.listen`, 서버리스(Vercel)에서는 `module.exports = app`으로 동작.
→ 추후 사내 상주 서버(NAS 등)로 옮겨도 코드 변경 없이 그대로 실행됩니다.

## 배포 (Vercel)
- GitHub 저장소를 Vercel에 Import → 환경변수 등록 → Deploy
- 프론트(`public/`)는 정적 서빙, 백엔드(`index.js`)는 서버리스 함수(`/api/*`)로 동작
- 자세한 절차: `docs/VERCEL_배포.md`

## 파일 구조
```
public/          프론트엔드 (React 18 CDN, 빌드 없음)
index.js         백엔드 (Express 5 + PostgreSQL) — 서버리스/상주 겸용
vercel.json      Vercel 배포 설정 (정적 + 서버리스 함수 라우팅)
docs/            배포·인수인계 문서
uploads/         업로드 파일 (로컬 디스크 모드 전용, git 제외)
```
