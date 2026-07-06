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
- Backend: Node.js Express 5, PostgreSQL, Puppeteer
- Frontend: React 18 (CDN), Babel Standalone
- AI: Google Gemini API (MSDS PDF 추출 / 현장점검 사진 분석)

## 환경변수
```
DATABASE_URL         (Railway가 자동 주입)
PORT                 (Railway가 자동 주입)
GEMINI_API_KEY       (Gemini AI 추출용)
MSDS_API_KEY         (한국산업안전보건공단 OpenAPI)
UPLOADS_DIR          (선택, Railway 볼륨 경로)
PUPPETEER_EXECUTABLE_PATH  (Railway nixpacks가 자동 설정)
```

## 로컬 실행
```bash
npm install
node index.js
# → http://localhost:3000
```

## 파일 구조
```
public/          프론트엔드 (React 18 CDN, 빌드 없음)
index.js         백엔드 (Express 5 + PostgreSQL + Puppeteer)
uploads/         업로드 파일 (git 제외)
```
