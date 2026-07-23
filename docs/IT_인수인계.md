# ESH 플랫폼 — IT 사업본부 인수인계

> 최종 점검일: 2026-07-23
> 대상 저장소: `kimbamsun/esh_platform_wv`

## 1. 시스템 구성
- **프론트엔드**: `public/` (React 18 + Babel standalone, 정적 서빙)
- **백엔드**: `index.js` (Node.js / Express)
- **PDF 생성**: `risk-pdf.js` (Puppeteer)
- **DB**: PostgreSQL
- **배포**: Railway (nixpacks)

## 2. 외부 연동 서비스

| 구분 | 서비스 | 용도 | 키/환경변수 | 코드 위치 |
|---|---|---|---|---|
| AI | Google Gemini | MSDS PDF 추출 · 현장점검 사진 분석 | `GEMINI_API_KEY` | `index.js:1438~1650` |
| 공공 | 안전보건공단 MSDS OpenAPI | 화학물질 정보 조회 | `MSDS_API_KEY` | `index.js:1680, 1735` |
| 스토리지 | Supabase (선택) | 첨부파일 업로드 | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | `index.js:58` |
| CDN | unpkg / jsdelivr / Google Fonts | React·폰트 등 정적 리소스 | 없음(무인증) | `public/index.html`, `public/styles.css` |

## 3. 환경변수 (배포 플랫폼에만 등록 — 소스 코드에 입력·커밋 금지)

```
DATABASE_URL                          DB 접속 (또는 PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD)
SESSION_SECRET                        세션 서명용 (미설정 시 자동 파생)
GEMINI_API_KEY                        AI 추출용
MSDS_API_KEY                          안전보건공단 OpenAPI
SUPABASE_URL / SUPABASE_SERVICE_KEY   파일 스토리지 (선택)
UPLOADS_DIR                           업로드 볼륨 경로 (선택)
PUPPETEER_EXECUTABLE_PATH             PDF 생성용 (Railway nixpacks 자동 설정)
PORT / DEMO_MODE                      런타임 옵션
```

## 4. 보안 현황 (2026-07-23 점검 완료)
- **하드코딩된 API 키 없음** — 소스 및 git 히스토리 전수 검사 완료. 모든 키는 환경변수(`process.env.*`)로만 주입.
- `.env` 파일은 `.gitignore`로 제외됨.
- **권장**: 개인 계정으로 발급했던 Gemini 키가 있다면 폐기/재발급 후 회사 키로 교체.

## 5. AI 공급자 전환 가이드 (Gemini → 사내 게이트웨이 / 타 AI)

수정 대상 위치:

| 항목 | 위치 | 현재 값 |
|---|---|---|
| 모델명 목록 | `index.js:1438`, `index.js:1650` | `['gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.0-flash']` |
| 호출 호스트 | `index.js:1452`, `index.js:1619` | `hostname: 'generativelanguage.googleapis.com'` |
| 호출 경로 | `index.js:1453`, `index.js:1620` | `/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}` |
| 프롬프트 | `index.js:1407` (`GEMINI_PROMPT`) | MSDS → JSON 추출 프롬프트 |

전환 시 확인 사항:
1. **인증 방식**: 현재는 URL 쿼리(`?key=`). 사내 게이트웨이가 헤더 방식(`Authorization: Bearer ...`)이면 요청 헤더 옵션도 수정.
2. **요청/응답 스키마**: JSON 구조가 다르면 요청 본문 구성부와 응답 파싱부 조정 필요.
3. **모델명**: 회사 제공 모델명으로 목록 교체.

## 6. 운영
- Railway 환경변수 대시보드에서 키 관리. 키 교체 시 **재배포** 필요.
- MSDS 자동추출이 **HTTP 503** 반환 → `GEMINI_API_KEY` 미설정 상태.
- 로컬 실행: `npm install && node index.js` → `http://localhost:3000`
