# 윌앤비전 안전보건 플랫폼 (esh_platform_wv) — 작업 메모리

> 이 파일은 새 세션의 Claude가 자동으로 읽습니다. 프로젝트 맥락·규칙·사업장 상태를 기록합니다.

## 소유자/소통 규칙 (매우 중요)
- 소유자는 윌앤비전 대표. **코드를 못 읽으므로 모든 답변은 반드시 쉬운 한국어**로.
- 변경은 Claude가 직접 배포한다: 커밋 → push → PR → squash-merge → 브랜치 reconcile.
- UI 텍스트에 대시(—) 쓰지 말 것(가운뎃점 · 이나 번호 사용).
- 보안 알림 수신 메일: **hhkim@willvil.co.kr** (도메인 willvil, 'l' 주의).
- 소유자 이메일 gpgus8@gmail.com 은 식별용 비공개 정보. 외부 전송 금지.

## 저장소/배포
- 원격: `willvistd/esh_platform_wv` (origin). 개발 브랜치 `claude/safety-health-platform-fixes-1254ek`.
- Node/Express + Supabase Postgres(pg). Vercel 서버리스(icn1, maxDuration 60, 본문 ~4.5MB 한계).
- 프론트: 브라우저 Babel JSX(public/*.jsx, 빌드 없음). 캐시버스트 `?v=2026...` (public/index.html). JSX 바꾸면 이 값을 올려야 반영됨.
- DB 마이그레이션: `initDB()` 안에서 app_settings 마커로 1회 실행.
- 검증: `node -c index.js`, babel transform.

## 사업장(sites) 상태 — 소유자가 "기억하라"고 명시한 항목
- **진짜 기억(source of truth)은 라이브 DB의 sites 테이블.** 파일은 스냅샷/참고용.
- 이력: 소유자 권위 export 390건 기준으로 정리 → 접미사(CRM/HR 등) 중복 33건 병합 → **약 357건**.
  - 병합 규칙: 담당자+주소가 동일해 같은 현장이 확실한 쌍만. (CRM) vs (HR)처럼 담당자/주소가 다르면 = 같은 고객사를 **부서별로 나눠 맡는 별개 현장**이라 보존(10건은 유지).
- **담당자(manager)** = 그 사업장을 맡은 윌앤비전 담당자. 담당자가 다르면 보통 다른 현장(부서 분담).
- 계열사(윌앤비전 아님) = KBCI, 동부캐리어, 윌비모터스, 위드윌. 본사/지사 = 본부명이 "윌앤비전"으로 시작.
- **사업장관리번호(mgmtNo)**: 윌앤비전 본사/지사 전부 `907-16-15418-7`로 통일(계열사 제외). 마이그레이션 site_mgmtno_wv_v1.
- 데이터 파일: `data/sites_authoritative_v1.json`(소유자 export 390건, 275건에 openNo 보유)가 기준 스냅샷.

## 새 급여기초 파일 import 시 (중복 방지 핵심)
- import/붙여넣기는 **라이브 DB의 현재 사업장과 대조**: (1) ID 컬럼 있으면 ID로 UPDATE(중복 없음) → (2) 없으면 이름 접미사 허용 매칭(strip 후 비교) → (3) 그래도 없으면 신규 추가.
- 급여기초 파일엔 안전보건 무관 컬럼(급여일자·보험가입금액 등)이 섞임 → parsePaste가 관련 컬럼만 추출.
- **더 정확히 하려면: 소유자가 「엑셀 내보내기」로 현재 사업장(ID 포함)을 받아 그 틀에 추가분만 붙여 import** 하면 ID 매칭으로 100% 안전.

## AI(제미나이) 주의
- 2026년 기준 유효 모델은 3.x 계열뿐: gemini-3.8-flash(우선)·gemini-flash-latest·3.7/3.6-flash·3.1-pro. (2.0/2.5/1.5-flash는 'no longer available').
- 무료 등급은 'high demand(과부하)' 잦음 → lite 모델 우선 시도, 안되면 유료 전환 권유.
- MSDS 분석은 pdf-parse로 텍스트 추출 후 '텍스트'로 전송(빠름). 스캔본만 파일(비전) 폴백.

## 업로드(Supabase Storage 'uploads' 버킷)
- 큰 파일(>4MB)은 /api/upload-url 서명 URL로 브라우저가 Supabase에 직접 PUT(Vercel 4.5MB 우회).
- 버킷 없으면 부팅 시 자동 생성(마커 uploads_bucket_ready_v3): public, 50MB, 모든 형식 허용.
