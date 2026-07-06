// ── 위험성평가 PDF 생성 모듈 (진행률 폴링 방식) ──
// 클라이언트:  POST /api/risk/generate-pdf → 토큰 발급 (즉시 응답, 백그라운드 생성 시작)
//             GET  /api/risk/pdf-status/:token → 진행 상태 (0.5초마다 폴링)
//             GET  /api/risk/pdf-result/:token → 완료 후 PDF 다운로드
// puppeteer:  GET  /api/risk/print-data/:token → 각 STEP 페이지가 데이터 가져감

const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const crypto = require('crypto');

const tempStore = new Map();   // 토큰 → STEP 데이터 (puppeteer fetch용)
const jobs = new Map();         // 토큰 → 진행 상태 + 완료된 PDF 버퍼
const TTL_MS = 10 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [k, v] of tempStore.entries()) if (now - v.createdAt > TTL_MS) tempStore.delete(k);
  for (const [k, v] of jobs.entries()) if (now - v.createdAt > TTL_MS) jobs.delete(k);
}

function registerRiskPdfRoutes(app, { frontendBaseUrl = 'http://localhost:3000' } = {}) {

  // ── 1. PDF 생성 시작 — 토큰만 즉시 응답, 작업은 백그라운드 ──
  app.post('/api/risk/generate-pdf', (req, res) => {
    cleanup();
    const { ctx, coverData, siteData, meetingData, trainingData, photosData, tableSheets } = req.body || {};
    if (!ctx || !ctx.evalId) return res.status(400).json({ error: 'ctx.evalId 누락' });

    const token = crypto.randomBytes(16).toString('hex');
    tempStore.set(token, {
      createdAt: Date.now(),
      ctx, coverData, siteData, meetingData, trainingData, photosData, tableSheets,
    });
    jobs.set(token, {
      createdAt: Date.now(),
      progress: '시작 준비 중...',
      percent: 0,
      current: 0,
      total: 0,
      done: false,
      error: null,
    });

    // 즉시 토큰 응답
    res.json({ token });

    // 백그라운드로 생성 시작
    runGeneration(token).catch(err => {
      const j = jobs.get(token);
      if (j) { j.error = String(err.message || err); j.done = true; }
      console.error('[PDF] 백그라운드 작업 오류:', err);
    });
  });

  // ── 2. 진행 상태 조회 (폴링) ──
  app.get('/api/risk/pdf-status/:token', (req, res) => {
    const j = jobs.get(req.params.token);
    if (!j) return res.status(404).json({ error: '토큰 만료 또는 무효' });
    // PDF 버퍼는 응답에 안 보냄 (별도 다운로드 엔드포인트)
    const { pdfBuffer, ...status } = j;
    res.json(status);
  });

  // ── 3. 완료된 PDF 다운로드 ──
  app.get('/api/risk/pdf-result/:token', (req, res) => {
    const j = jobs.get(req.params.token);
    if (!j) return res.status(404).json({ error: '토큰 만료' });
    if (j.error) return res.status(500).json({ error: j.error });
    if (!j.done || !j.pdfBuffer) return res.status(425).json({ error: '아직 생성 중' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="${encodeURIComponent(j.filename || 'risk.pdf')}"`);
    res.send(Buffer.from(j.pdfBuffer));

    // 5초 후 정리
    setTimeout(() => {
      jobs.delete(req.params.token);
      tempStore.delete(req.params.token);
    }, 5000);
  });

  // ── 4. puppeteer 페이지가 데이터 fetch ──
  app.get('/api/risk/print-data/:token', (req, res) => {
    const data = tempStore.get(req.params.token);
    if (!data) return res.status(404).json({ error: '토큰 만료' });
    res.json(data);
  });

  console.log('[PDF] PDF 생성 라우트 등록 완료 (진행률 폴링 방식, 4개 엔드포인트)');

  // ── 내부: 실제 생성 작업 ──
  async function runGeneration(token) {
    const data = tempStore.get(token);
    const job = jobs.get(token);
    if (!data || !job) return;

    // 백엔드 콘솔과 프론트 진행률이 100% 동일한 메시지 보도록 헬퍼
    job.logs = [];
    function log(msg, percent) {
      console.log(msg);
      job.logs.push(msg);
      job.progress = msg;          // 프론트 폴링은 이걸 표시
      if (typeof percent === 'number') job.percent = percent;
    }

    const { ctx, tableSheets } = data;
    const steps = [
      { step: 'cover',    orientation: 'portrait',  label: '표지' },
      { step: 'site',     orientation: 'portrait',  label: '사업장정보' },
      { step: 'meeting',  orientation: 'portrait',  label: '회의록' },
      ...((tableSheets || []).map(t => ({
        step: 'table', area: t.area, orientation: 'landscape', label: `평가표-${t.area}`
      }))),
      { step: 'photos',   orientation: 'landscape', label: '사진대지' },  // ⭐ 가로
      { step: 'training', orientation: 'portrait',  label: '전파교육일지' },
    ];

    job.total = steps.length + 1; // +1 = 합치기 단계
    job.current = 0;

    let browser;
    const t0 = Date.now();
    try {
      log(`[PDF] 시작 — evalId=${ctx.evalId}, STEP=${steps.length}개`, 1);

      browser = await puppeteer.launch({
        headless: 'new',
        // Railway 등 컨테이너 환경: 시스템 Chromium 사용 (env로 경로 지정)
        // 로컬: Puppeteer가 자체 다운로드한 Chromium 자동 사용
        ...(process.env.PUPPETEER_EXECUTABLE_PATH && {
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        }),
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const pdfBuffers = [];
      for (let i = 0; i < steps.length; i++) {
        const cfg = steps[i];
        job.current = i + 1;

        const page = await browser.newPage();
        // 에러만 콘솔로 (디버그 메시지는 평소엔 표시 안 함)
        page.on('pageerror', err => console.log(`  [BROWSER:${cfg.step} ERROR]`, err.message));
        if (cfg.orientation === 'landscape') {
          await page.setViewport({ width: 1200, height: 794, deviceScaleFactor: 2 });
        } else {
          await page.setViewport({ width: 820, height: 1123, deviceScaleFactor: 2 });
        }
        const url = `${frontendBaseUrl}/?print=${cfg.step}&token=${token}` +
                    (cfg.area ? `&area=${encodeURIComponent(cfg.area)}` : '');

        // ⭐ 백엔드 콘솔과 프론트 진행률 정확히 동일한 메시지
        log(`[PDF] ${cfg.label} 렌더 중 (${cfg.orientation})... ${url}`,
            Math.round((i / job.total) * 100));

        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        await new Promise(r => setTimeout(r, 800));

        // ⚠️ 핵심 수정 v2: addStyleTag(head)는 React가 body에 렌더한 RISK_STYLE보다 cascade에서 짐.
        //   → page.evaluate로 BODY 끝에 직접 <style> 주입해서 RISK_STYLE보다 후순위 보장.
        //   동시에 preferCSSPageSize:false + 명시적 width/height 사용 — 가장 확실한 방식.
        await page.evaluate((isLandscape) => {
          const style = document.createElement('style');
          style.textContent = isLandscape
            ? '@page { size: A4 landscape !important; margin: 6mm !important; }'
            : '@page { size: A4 portrait !important; margin: 15mm !important; }';
          document.body.appendChild(style);
        }, cfg.orientation === 'landscape');
        await new Promise(r => setTimeout(r, 200));

        // width/height를 명시적으로 지정 + preferCSSPageSize:false →
        //   puppeteer의 옵션이 CSS @page를 확실히 이김
        const pdf = await page.pdf({
          width:  cfg.orientation === 'landscape' ? '297mm' : '210mm',
          height: cfg.orientation === 'landscape' ? '210mm' : '297mm',
          landscape: cfg.orientation === 'landscape',
          printBackground: true,
          preferCSSPageSize: false,
          margin: cfg.orientation === 'landscape'
            ? { top: '6mm', bottom: '6mm', left: '6mm', right: '6mm' }
            : { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
        });
        pdfBuffers.push(pdf);
        await page.close();
      }

      await browser.close();
      browser = null;

      job.current = steps.length + 1;
      log('[PDF] 합치는 중...', 95);

      const merged = await PDFDocument.create();
      for (const buf of pdfBuffers) {
        const doc = await PDFDocument.load(buf);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const combinedBytes = await merged.save();
      const elapsed = Date.now() - t0;

      const sitename = (ctx.사업장명 || ctx.company || 'risk').replace(/[\\/:*?"<>|]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);

      job.pdfBuffer = combinedBytes;
      job.filename = `위험성평가_${sitename}_${dateStr}.pdf`;
      log(`[PDF] 완료 — ${(combinedBytes.length / 1024).toFixed(1)}KB, ${elapsed}ms`, 100);
      job.done = true;
    } catch (e) {
      console.error('[PDF] 생성 오류:', e);
      if (browser) try { await browser.close(); } catch {}
      job.error = String(e.message || e);
      job.done = true;
      throw e;
    }
  }
}

module.exports = { registerRiskPdfRoutes };
