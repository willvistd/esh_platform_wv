// pages-msds.jsx — MSDS 문서 자동생성 (v4 — 인라인 편집)

// ── 상수 ──────────────────────────────────────────────────
const GHS_LIST = [
  { id: 1, label: '폭발성' },
  { id: 2, label: '인화성' },
  { id: 3, label: '급성독성' },
  { id: 4, label: '발암성' },
  { id: 5, label: '수생환경' },
  { id: 6, label: '산화성' },
  { id: 7, label: '고압가스' },
  { id: 8, label: '부식성' },
  { id: 9, label: '경고' },
];
const PPE_LIST = [
  { id: 301, label: '보안경' },
  { id: 302, label: '방독마스크' },
  { id: 303, label: '방진마스크' },
  { id: 304, label: '보안면' },
  { id: 305, label: '안전모' },
  { id: 308, label: '안전장갑' },
  { id: 309, label: '안전복' },
  { id: 307, label: '안전화' },
];
// 용기 사이즈 — 소량용기 / 116×78mm 2종만 사용
// perPage: A4 한 장에 들어가는 최대 개수 / cols: 그리드 열 수
// tiny = 폼텍 8칸(LS-3107) 99.1×67.7mm / s = 폼텍 6칸(PS-2016) 99.1×93.1mm
const MSDS_CAP = {
  tiny: { w: 99.1, h: 67.7, label: '소량용기 (폼텍 8칸)',  sub: '99.1×67.7mm · LS-3107', tiny: true,  perPage: 8, cols: 2 },
  s:    { w: 99.1, h: 93.1, label: '5ℓ ~ 50ℓ (폼텍 6칸)', sub: '99.1×93.1mm · PS-2016', tiny: false, perPage: 6, cols: 2 },
};
const MM2PX = 3.7795;
const A4H   = 880;
const EMRG  = [
  { k: 'eye',    lb: '눈' },
  { k: 'skin',   lb: '피부' },
  { k: 'inhale', lb: '흡입' },
  { k: 'ingest', lb: '섭취' },
  { k: 'other',  lb: '기타' },
  { k: 'fire',   lb: '폭발·화재' },
  { k: 'spill',  lb: '누출 사고' },
];

// ── 모듈 레벨 컴포넌트 ──────────────────────────────────

const MsdsGhsItem = ({ item, selected, onToggle }) => (
  <div className={`msds-img-item${selected ? ' sel' : ''}`} onClick={() => onToggle(item.id)}>
    <GhsPic id={item.id} size={46} />
    <div className="msds-img-label">{item.label}</div>
  </div>
);

const MsdsPpeItem = ({ item, selected, onToggle }) => (
  <div className={`msds-img-item${selected ? ' sel' : ''}`} onClick={() => onToggle(item.id)}>
    <PpePic id={item.id} size={42} />
    <div className="msds-img-label">{item.label}</div>
  </div>
);

// ── 인라인 편집 컴포넌트 ─────────────────────────────────
const MsdsInlineEdit = ({ value, onChange, placeholder, rows, isSelect, bold, center, inline, bullets }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft,   setDraft]   = React.useState('');

  const start   = () => { setDraft(value || ''); setEditing(true); };
  const confirm = () => { onChange(draft); setEditing(false); };
  const cancel  = () => setEditing(false);

  const display = value
    ? value.split('\n').filter(l => !bullets || l.trim()).map((l, i, a) =>
        <React.Fragment key={i}>
          {bullets ? '· ' + l.replace(/^[·•\-\s]+/, '') : l}
          {i < a.length - 1 && <br />}
        </React.Fragment>)
    : <span className="msds-ph" style={{ color: '#bbb', fontWeight: 400 }}>{placeholder || '—'}</span>;

  if (editing) {
    if (isSelect) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <select value={draft} onChange={e => setDraft(e.target.value)} autoFocus
            style={{ padding: '3px 8px', border: '1.5px solid var(--primary)', borderRadius: 5,
              fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit' }}>
            <option value="">없음 (미표기)</option>
            <option value="위험">위험</option>
            <option value="경고">경고</option>
          </select>
          <button className="msds-edit-ok" onClick={confirm}>확인</button>
          <button className="msds-edit-cancel" onClick={cancel}>취소</button>
        </div>
      );
    }
    return (
      <div>
        <textarea className="msds-edit-area" autoFocus rows={rows || 3}
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') cancel(); if (e.key === 'Enter' && e.ctrlKey) confirm(); }}
          style={{ width: '100%', fontSize: 'inherit', fontFamily: 'inherit', lineHeight: 1.7, fontWeight: 400 }} />
        <div className="msds-edit-actions">
          <button className="msds-edit-ok" onClick={confirm}>확인</button>
          <button className="msds-edit-cancel" onClick={cancel}>취소</button>
          <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>Ctrl+Enter</span>
        </div>
      </div>
    );
  }

  return (
    <div className="msds-inline-wrap" style={{
      textAlign: center ? 'center' : undefined,
      fontWeight: bold ? 'inherit' : undefined,
      // inline: "신호어: 위험"처럼 라벨 텍스트와 같은 줄에 표시
      display: inline ? 'inline-block' : undefined,
      verticalAlign: inline ? 'baseline' : undefined,
      cursor: 'pointer',
    }}
      // 텍스트 어디를 클릭해도 편집 진입 — 수정 버튼이 화면 밖에 있어도 항상 편집 가능
      onClick={start}
      title="클릭하여 수정">
      {display}
      <button className="msds-edit-btn" onClick={e => { e.stopPropagation(); start(); }}>✏️ 수정</button>
    </div>
  );
};

// ── 메인 컴포넌트 ────────────────────────────────────────
// ── MSDS 성분 규제 판정 패널 (작업환경측정·특수검진) ──
const MsdsJudgePanel = ({ components, setComponents, judgeRes, judging, runJudge, product }) => {
  const setRow = (i, k, v) => setComponents(cs => cs.map((c, j) => j === i ? { ...c, [k]: v } : c));
  const addRow = () => setComponents(cs => [...cs, { name: '', cas: '', content: '' }]);
  const delRow = (i) => setComponents(cs => cs.filter((_, j) => j !== i));

  const RES = (typeof SJ_RESULT_STYLE !== 'undefined') ? SJ_RESULT_STYLE : {
    TARGET: { label: '측정 대상', bg: '#fdeeee', fg: '#b42318', bd: '#f3c0bd' },
    BELOW_THRESHOLD: { label: '기준 미달', bg: '#fff7e6', fg: '#b25e09', bd: '#f5d199' },
    NOT_LISTED: { label: '대상 아님', bg: '#eef2f7', fg: '#475467', bd: '#d5dce6' },
    UNDETERMINED: { label: '판정 불가', bg: '#f2eefe', fg: '#6941c6', bd: '#d9ccf7' },
  };
  const badge = (r) => { const s = RES[r] || RES.NOT_LISTED; return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: s.bg, color: s.fg, border: `1px solid ${s.bd}`, whiteSpace: 'nowrap' }}>{s.label}</span>); };

  const exportCsv = () => {
    if (!judgeRes) return;
    const H = ['연번','제품명','성분명','CAS No.','함유량','취급부서','취급장소','월 취급량','작업환경측정 대상','특수건강진단 대상','특별관리물질','허가대상','판정근거','판정일','데이터 기준일'];
    const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const lines = [H.map(q).join(',')];
    judgeRes.components.forEach((c, i) => lines.push([i + 1, judgeRes.product_name || (product && product.name) || '', c.name, c.cas || c.cas_raw || '', c.content_raw, '', '', '',
      (RES[c.wem.result] || {}).label || c.wem.result, c.she.result === 'TARGET' ? '대상' : '—',
      c.flags.includes('특별관리물질') ? '○' : '', c.flags.includes('허가대상물질') ? '○' : '', c.wem.reason, judgeRes.judged_at, judgeRes.data_baseline].map(q).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `화학물질판정대장_${((product && product.name) || 'MSDS').replace(/[^\w가-힣]+/g, '')}_${judgeRes.judged_at}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  const inp = { padding: '6px 8px', border: '1px solid #d5dce6', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' };
  const th = { textAlign: 'left', fontSize: 12, color: '#667085', fontWeight: 700, padding: '7px 9px', borderBottom: '2px solid #e5e9ef', whiteSpace: 'nowrap' };
  const td = { padding: '7px 9px', borderBottom: '1px solid #eef1f5', fontSize: 13, verticalAlign: 'top' };

  return (
    <div style={{ padding: '4px 2px' }}>
      <p style={{ color: '#667085', fontSize: 13, margin: '4px 0 12px' }}>
        MSDS에서 추출한 구성성분을 법정 유해인자 목록(작업환경측정·특수건강진단·관리대상)과 대조한 결과입니다.
        성분·함유량을 직접 수정한 뒤 다시 판정할 수 있습니다.
      </p>
      {/* 성분 편집 표 */}
      <div style={{ overflowX: 'auto', border: '1px solid #e5e9ef', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead><tr><th style={{ ...th, width: 34 }}>#</th><th style={th}>성분명</th><th style={{ ...th, width: 140 }}>CAS</th><th style={{ ...th, width: 110 }}>함유량</th><th style={{ ...th, width: 36 }}></th></tr></thead>
          <tbody>
            {components.length === 0 && (<tr><td style={{ ...td, color: '#98a2b3', textAlign: 'center' }} colSpan={5}>MSDS를 업로드하면 성분이 자동으로 채워집니다. 직접 추가할 수도 있어요.</td></tr>)}
            {components.map((c, i) => (
              <tr key={i}>
                <td style={{ ...td, color: '#98a2b3' }}>{i + 1}</td>
                <td style={td}><input style={inp} value={c.name} onChange={e => setRow(i, 'name', e.target.value)} placeholder="톨루엔" /></td>
                <td style={td}><input style={inp} value={c.cas} onChange={e => setRow(i, 'cas', e.target.value)} placeholder="108-88-3" /></td>
                <td style={td}><input style={inp} value={c.content} onChange={e => setRow(i, 'content', e.target.value)} placeholder="30~40%" /></td>
                <td style={td}><button className="btn btn-ghost btn-sm" onClick={() => delRow(i)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={addRow}>+ 성분 추가</button>
        <button className="btn btn-primary" onClick={() => runJudge()} disabled={judging || !components.length}>{judging ? '판정 중…' : '판정하기'}</button>
        {judgeRes && <button className="btn btn-ghost btn-sm" onClick={exportCsv}>📥 판정 대장 CSV</button>}
      </div>

      {judgeRes && (<>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
          {[['측정 대상', judgeRes.summary.wem_target_count, '#b42318', '#fdeeee'],
            ['특수검진', judgeRes.summary.she_target_count, '#087443', '#eafaf0'],
            ['기준 미달', judgeRes.summary.wem_below_count, '#b25e09', '#fff7e6'],
            ['판정 불가', judgeRes.summary.undetermined_count, '#6941c6', '#f2eefe'],
            ['대상 아님', judgeRes.summary.not_listed_count, '#475467', '#eef2f7']].map(([l, n, fg, bg], k) => (
            <div key={k} style={{ background: bg, color: fg, borderRadius: 8, padding: '8px 14px', minWidth: 80, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{n}</div><div style={{ fontSize: 11, fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
        {(judgeRes.summary.special_substance || judgeRes.summary.permit_substance) && (
          <div style={{ padding: '8px 12px', background: '#fef3f2', border: '1px solid #f3c0bd', borderRadius: 8, color: '#b42318', fontSize: 13, marginBottom: 12 }}>
            ⚠ {judgeRes.summary.special_substance && '특별관리물질 포함'} {judgeRes.summary.permit_substance && '· 허가대상물질 포함'} — 별도 관리·기록 의무가 있습니다.
          </div>
        )}
        <div style={{ overflowX: 'auto', border: '1px solid #e5e9ef', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead><tr><th style={th}>성분명</th><th style={th}>CAS</th><th style={th}>함유량</th><th style={th}>작업환경측정</th><th style={th}>특수검진</th><th style={th}>구분</th></tr></thead>
            <tbody>
              {judgeRes.components.map((c, i) => (
                <tr key={i}>
                  <td style={td}>{c.name || <span style={{ color: '#bbb' }}>—</span>}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{c.cas || c.cas_raw || '—'}</td>
                  <td style={td}>{c.content_raw || '—'}</td>
                  <td style={td}>{badge(c.wem.result)}</td>
                  <td style={td}><span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: c.she.result === 'TARGET' ? '#eafaf0' : '#eef2f7', color: c.she.result === 'TARGET' ? '#087443' : '#98a2b3', border: `1px solid ${c.she.result === 'TARGET' ? '#bce8cf' : '#e0e5ec'}` }}>{c.she.result === 'TARGET' ? '대상' : '—'}</span></td>
                  <td style={td}>{c.flags.filter(f => f !== '이름매칭(신뢰도 낮음)').map((f, k) => (<span key={k} style={{ display: 'inline-block', fontSize: 11, background: '#eef2f7', color: '#475467', borderRadius: 5, padding: '1px 6px', margin: '1px 2px 1px 0' }}>{f}</span>))}{c.match_method === 'keyword' && <span style={{ fontSize: 11, color: '#b25e09' }}>이름매칭</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul style={{ fontSize: 12, color: '#667085', marginTop: 12, paddingLeft: 18, lineHeight: 1.7 }}>
          {judgeRes.notices.map((n, i) => <li key={i}>{n}</li>)}
          <li>판정일 {judgeRes.judged_at} · 법령 데이터 기준일 {judgeRes.data_baseline}</li>
        </ul>
      </>)}
    </div>
  );
};

const MsdsGeneratorView = ({ onNav, currentUser, role }) => {

  const [inputTab,   setInputTab]   = React.useState(0);
  const [previewTab, setPreviewTab] = React.useState(0);
  const [capSize,    setCapSize]    = React.useState('tiny');
  const [printCount, setPrintCount] = React.useState('1');   // 문자열로 관리 (빈 값 허용)
  const [uploadSt,   setUploadSt]   = React.useState('idle');
  const [uploadFile, setUploadFile] = React.useState('');
  const [uploadErr,  setUploadErr]  = React.useState('');
  const [a4Over,     setA4Over]     = React.useState(false);
  const [apiQuery,   setApiQuery]   = React.useState('');
  const [apiLoading, setApiLoading] = React.useState(false);
  const [apiResults, setApiResults] = React.useState([]);
  const [ghsSel,     setGhsSel]     = React.useState([]);
  const [ppeSel,     setPpeSel]     = React.useState([]);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    productName: '', signalWord: '',
    hazard: '', handling: '', storage: '',
    eye: '', skin: '', inhale: '', ingest: '', other: '', fire: '', spill: '',
    hazardCodes: '', preventPhrases: '', responsePhrases: '',
    storagePhrases: '', disposalPhrases: '',
    companyName: '', companyPhone: '', companyAddress: '',
  });
  const [components, setComponents] = React.useState([]);   // MSDS 3절 구성성분
  const [judgeRes,   setJudgeRes]   = React.useState(null); // 판정 결과
  const [judging,    setJudging]    = React.useState(false);

  const fileRef = React.useRef(null);
  const cardRef = React.useRef(null);

  React.useEffect(() => {
    if (previewTab !== 0 || !cardRef.current) return;
    const over = cardRef.current.scrollHeight > A4H;
    setA4Over(p => p === over ? p : over);
  }, [previewTab, form, ghsSel, ppeSel]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleGhs = id => setGhsSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const togglePpe = id => setPpeSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const applyData = d => {
    setForm(f => ({
      ...f,
      productName:     d.productName      || f.productName,
      // 신호어는 PDF에 명시될 때만 채움. 없으면 빈 값(미표기) 유지 — 위험/경고 강제 안 함
      signalWord:      (d.signalWord === '위험' || d.signalWord === '경고') ? d.signalWord : '',
      hazard:          d.hazard           || f.hazard,
      handling:        d.handling         || f.handling,
      storage:         d.storage          || f.storage,
      eye:             d.eyeEmergency     || f.eye,
      skin:            d.skinEmergency    || f.skin,
      inhale:          d.inhaleEmergency  || f.inhale,
      ingest:          d.ingestEmergency  || f.ingest,
      other:           d.otherEmergency   || f.other,
      fire:            d.fireEmergency    || f.fire,
      spill:           d.spillEmergency   || f.spill,
      hazardCodes:     d.hazardCodes      || f.hazardCodes,
      preventPhrases:  d.preventPhrases   || f.preventPhrases,
      responsePhrases: d.responsePhrases  || f.responsePhrases,
      storagePhrases:  d.storagePhrases   || f.storagePhrases,
      disposalPhrases: d.disposalPhrases  || f.disposalPhrases,
      companyName:     d.companyName      || f.companyName,
      companyPhone:    d.companyPhone     || f.companyPhone,
      companyAddress:  d.companyAddress   || f.companyAddress,
    }));
    if (Array.isArray(d.ghsIds) && d.ghsIds.length) setGhsSel(d.ghsIds.map(Number).filter(n => !isNaN(n) && n > 0));
    if (Array.isArray(d.ppeIds) && d.ppeIds.length) setPpeSel(d.ppeIds.map(Number).filter(n => !isNaN(n) && n > 0));
    if (Array.isArray(d.components)) {
      setComponents(d.components.filter(c => c && (c.name || c.cas)).map(c => ({
        name: c.name || '', cas: c.cas || '', content: c.content || '',
      })));
      setJudgeRes(null);   // 새 MSDS → 판정 초기화
    }
  };

  // 성분 목록으로 규제 판정 실행
  const runJudge = React.useCallback((comps) => {
    const list = comps || components;
    if (!list.length) return;
    setJudging(true); setJudgeRes(null);
    fetch('/api/substances/judge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ components: list, product: { name: form.productName, manufacturer: form.companyName, revisionDate: '' } }),
    }).then(r => r.json()).then(d => { if (!d.error) setJudgeRes(d); })
      .catch(() => {}).finally(() => setJudging(false));
  }, [components, form.productName, form.companyName]);

  // 판정 탭 진입 시 성분 있으면 자동 판정
  React.useEffect(() => {
    if (previewTab === 2 && components.length && !judgeRes && !judging) runJudge(components);
  }, [previewTab, components]);

  // 실제 업로드 처리 (파일 선택, 드래그&드롭 모두 공통 호출)
  const processPdfFile = async (file) => {
    if (!file) return;
    // PDF 확장자/타입 검증
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setUploadErr('PDF 파일만 업로드 가능합니다.');
      setUploadFile(file.name);
      setUploadSt('error');
      return;
    }
    setUploadFile(file.name); setUploadSt('uploading'); setUploadErr('');
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch('/api/msds/extract', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok || d.error) {
        if (res.status === 503) setUploadErr('AI 추출 키가 설정되지 않았습니다. 서버 관리자에게 환경변수(GEMINI_API_KEY) 설정을 요청하세요.');
        else setUploadErr(d.error || 'AI 분석 실패');
        setUploadSt('error'); return;
      }
      applyData(d); setUploadSt('done');
    } catch (err) { setUploadErr('서버 연결 오류'); setUploadSt('error'); }
  };

  // <input type="file"> onChange 핸들러
  const handleFile = (e) => processPdfFile(e.target.files?.[0]);

  // 드래그&드롭 상태 + 핸들러
  const [isDragOver, setIsDragOver] = React.useState(false);
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    processPdfFile(file);
  };

  const handleSearch = async () => {
    if (!apiQuery.trim()) return;
    setApiLoading(true); setApiResults([]);
    try {
      const res = await fetch(`/api/msds/search?q=${encodeURIComponent(apiQuery.trim())}`);
      const d = await res.json();
      if (!res.ok || d.error) {
        setApiResults([{ _error: d.error || `서버 오류 (${res.status})` }]);
      } else {
        setApiResults(d.items && d.items.length ? d.items : [{ _empty: true }]);
      }
    } catch { setApiResults([{ _error: '서버 연결 오류. 백엔드가 실행 중인지 확인하세요.' }]); }
    finally { setApiLoading(false); }
  };

  const selectedGhs = GHS_LIST.filter(g => ghsSel.includes(g.id));
  const selectedPpe = PPE_LIST.filter(p => ppeSel.includes(p.id));

  // ── 인쇄 ───────────────────────────────────────────────
  const handlePrint = () => {
    const base = window.location.href.replace(/[^/]+$/, '');
    const target = previewTab === 0
      ? document.querySelector('.msds-card')
      : document.querySelector('.msds-label-wrap');
    if (!target) return;

    // PDF 저장 파일명 — 인식된 제품명 기준 자동 ('제품명 관리요령'). 파일명 금지문자 제거.
    const safeName = (s) => String(s || '').replace(/[\\/:*?"<>|\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
    const prod = safeName(form.productName);
    const pdfTitle = (prod ? prod + ' ' : '') + (previewTab === 0 ? '관리요령' : '경고표지');

    const html = target.outerHTML.replace(/src="(assets\/)/g, `src="${base}$1`);

    const labelCss = previewTab === 0 ? `
      /* 카드 외곽 border 제거. 제목이 자체적으로 외곽선 역할.
         width를 4px 줄여 카드(제목+표) 우측 끝을 페이지 인쇄영역 경계에서 띄움.
         → 우측 외곽선이 경계에 걸려 안티앨리어싱으로 흐려지는 현상 방지(좌측은 0에 붙어 또렷, 우측도 동일하게). */
      .msds-card { width:calc(100% - 4px); border:none; box-sizing:border-box; }
      .msds-card-title { background:#e8ecf0; text-align:center; padding:9px; font-size:14px; font-weight:700; border:1px solid #999; border-bottom:none; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      /* border-collapse는 인쇄 시 우측·하단 외곽선이 얇아지는 버그가 있음.
         → separate 로 바꿔 '표=상·좌, 셀=우·하' 로 그리면 외곽선을 셀이 직접 그려 좌우 동일한 1px 보장. */
      .msds-ft { width:100%; border-collapse:separate; border-spacing:0; border-top:1px solid #999; border-left:1px solid #999; }
      .msds-ft td { border-right:1px solid #999; border-bottom:1px solid #999; padding:4px 9px; font-size:11px; vertical-align:top; line-height:1.7; }
      .msds-ft, .msds-ft td, .msds-card-title { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .msds-fl { background:#e8ecf0 !important; font-weight:700; text-align:center; vertical-align:middle !important; white-space:nowrap; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .msds-fh { background:#e8ecf0 !important; font-weight:700; font-size:11px; vertical-align:middle !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    ` : `
      /* ── 경고표지(폼텍 라벨지) 인쇄 — @page 여백 0, 라벨지 실측 여백을 padding으로 재현 ── */
      @page { size: 210mm 297mm; margin: 0; }
      body { display: block; }
      .msds-label-wrap { display: block; }
      .msds-label-page {
        width: 210mm; height: 297mm; box-sizing: border-box;
        page-break-after: always; break-after: page;
        margin: 0; border: none; border-radius: 0; background: white;
      }
      .msds-label-page:last-child { page-break-after: auto; break-after: auto; }
      .msds-label-page.fomtek-8 { padding: 13.1mm 5.9mm; }
      .msds-label-page.fomtek-6 { padding: 8.85mm 5.9mm; }
      .msds-label-grid { gap: 0 !important; }
      .msds-label-page-no { display: none !important; }
      .msds-label-cell > div { box-shadow: none !important; }
    `;

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"/>
<title>${pdfTitle}</title>
<style>
  @page { size: 210mm 297mm; margin: 10mm 12mm; }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin:0; padding:0; font-family:'Malgun Gothic','맑은 고딕',sans-serif; }
  .msds-edit-btn { display:none !important; }
  .msds-ph { display:none !important; }   /* 빈 필드 placeholder는 인쇄 안 함 */
  .msds-inline-wrap { position:relative; }
  img { display:inline-block; vertical-align:middle; }
  ${labelCss}
</style>
</head><body>${html}</body></html>`);
    w.document.close();
    w.document.title = pdfTitle;   // 일부 브라우저는 인쇄 시점 document.title을 PDF 파일명으로 사용
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  // ── 경고표지 렌더 ──────────────────────────────────────
  const renderLabel = (_idx) => {
    const sz  = MSDS_CAP[capSize];
    const wPx = sz.w * MM2PX;
    const hPx = sz.h * MM2PX;
    const sc  = wPx / 440;
    const fs  = n => `${Math.max(6, Math.round(n * sc))}px`;
    const ghsS = Math.max(20, Math.min(72, wPx * 0.16));

    const outer = {
      width: wPx, minHeight: hPx,
      border: '3px solid #111', borderRadius: 6,
      padding: `${Math.max(6, wPx * 0.03)}px ${Math.max(8, wPx * 0.04)}px`,
      background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: Math.max(4, wPx * 0.015),
    };
    const td0 = { border: '1px solid #555', padding: `${Math.max(3, wPx * 0.007)}px ${Math.max(4, wPx * 0.01)}px`, fontSize: fs(10), verticalAlign: 'top', lineHeight: 1.55, position: 'relative' };
    const lbl = { ...td0, background: '#f0f0f0', fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' };

    if (sz.tiny) {
      // 라벨 높이 기준 비례 + 그림문자는 개수에 따라 자동 축소 (3개 이상도 라벨 안에 수납)
      const _nameLen = Math.max(1, (form.productName || '').length);
      const _availW = wPx - 24;  // 양쪽 패딩 제외 가용 너비
      // 글자 수 기준 너비 채움: 한글 1자 ≈ fontSize × 1.05px
      const _sizeByWidth = Math.floor(_availW / (_nameLen * 1.05));
      const tProd = Math.max(11, Math.min(_sizeByWidth, Math.round(hPx * 0.22)));  // 높이 22% 상한
      const tSig  = Math.max(18, Math.round(hPx * 0.20));    // 신호어 (20%)
      const tNote = Math.max(8,  Math.round(hPx * 0.06));    // 안내 텍스트 (6%)
      // 그림문자: 기본 40% 크기, 개수 많아지면 가용 폭에 맞춰 축소
      const nGhs = Math.max(1, Math.min(4, selectedGhs.length));
      const sigW = tSig * 2.2;                               // 신호어("위험") 예상 폭
      const availW = wPx - sigW - 24;                        // 좌우 패딩·간격 제외 가용 폭
      const tGhsBase = Math.round(hPx * 0.40);
      const tGhs = Math.max(30, Math.min(tGhsBase, Math.floor((availW - (nGhs - 1) * 4) / nGhs)));
      return (
        <div style={{ ...outer, padding: 0, gap: 0, display: 'flex', flexDirection: 'column' }}>
          {/* 1. 제품명 (상단 가로 전체) */}
          <div style={{
            borderBottom: '1.5px solid #111',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: Math.round(hPx * 0.22),
            textAlign: 'center',
            fontWeight: 900,
            fontSize: tProd,
            lineHeight: 1.2,
            padding: '4px 8px',
            overflow: 'hidden',
          }}>
            <MsdsInlineEdit value={form.productName} onChange={v => sf('productName', v)} placeholder="제품명" rows={1} center bold />
          </div>

          {/* 2. 그림문자 + 신호어 (중간 큰 영역) — 개수에 따라 자동 축소되어 한 줄 수납 */}
          <div style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '4px 6px',
            minHeight: tGhs + 8,
            overflow: 'hidden',
          }}>
            {selectedGhs.length > 0
              ? selectedGhs.slice(0, 4).map(g => <GhsPic key={g.id} id={g.id} size={tGhs} />)
              : <span className="msds-ph" style={{ color: '#ccc', fontSize: 11 }}>그림문자</span>}
            <span style={{
              fontWeight: 900,
              fontSize: tSig,
              color: '#111',
              marginLeft: 4,
              whiteSpace: 'nowrap',
            }}>
              <MsdsInlineEdit value={form.signalWord} onChange={v => sf('signalWord', v)} isSelect placeholder="신호어" />
            </span>
          </div>

          {/* 3. 공급자정보 (업체명, 전화번호 — PDF/API 추출값 연동) */}
          <div style={{
            borderTop: '1.5px solid #111',
            fontSize: Math.max(9, Math.round(hPx * 0.07)),
            padding: '2px 8px',
            whiteSpace: 'nowrap', overflow: 'hidden',
            display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'center',
          }}>
            <span style={{ fontWeight: 800 }}>공급자정보 :</span>
            <MsdsInlineEdit value={form.companyName}  onChange={v => sf('companyName', v)}  placeholder="업체명"   rows={1} inline />
            <span>,</span>
            <MsdsInlineEdit value={form.companyPhone} onChange={v => sf('companyPhone', v)} placeholder="전화번호" rows={1} inline />
          </div>

          {/* 4. 안내 (하단 가로 전체) */}
          <div style={{
            borderTop: '1px solid #111',
            textAlign: 'center',
            fontSize: tNote,
            color: '#666',
            lineHeight: 1.3,
            padding: '2px 6px',
          }}>
            기타 자세한 사항은 MSDS를 참조하시오.
          </div>
        </div>
      );
    }

    // ── 5ℓ~50ℓ: 고용노동부 고시 표준 서식 (표 없는 깔끔한 레이아웃) ──
    //   상단: 명칭(제품명) + 신호어 / 좌측: 그림문자 / 우측: 유해위험·예방조치문구 / 하단: 공급자정보
    const ghsBig = Math.max(48, Math.round(wPx * 0.185));
    const labelW = Math.round(wPx * 0.21);   // "유해위험문구" 라벨 칸 폭 (그림문자와 가깝게)
    const breakStyle = { overflowWrap: 'anywhere', wordBreak: 'break-all' };  // 긴 글자 넘침 방지
    return (
      <div style={{ ...outer, border: '1.5px solid #111', gap: Math.max(4, wPx * 0.014) }}>
        {/* 명칭 (제품명) */}
        <div style={{ textAlign: 'center', fontWeight: 900, fontSize: fs(27), letterSpacing: '0.12em', lineHeight: 1.2, ...breakStyle }}>
          <MsdsInlineEdit value={form.productName} onChange={v => sf('productName', v)} placeholder="명 칭" rows={1} center bold />
        </div>
        {/* 본문: 좌 그림문자 / 우 문구 */}
        <div style={{ flex: 1, display: 'flex', gap: Math.max(6, wPx * 0.016), alignItems: 'flex-start', marginTop: Math.max(6, wPx * 0.018) }}>
          {/* 좌측 그림문자 (2열 그리드로 자동 줄바꿈) */}
          <div style={{
            width: ghsBig * 2 + 8, flexShrink: 0,
            display: 'flex', flexWrap: 'wrap', gap: 5,
            alignContent: 'flex-start', justifyContent: 'center',
          }}>
            {selectedGhs.length > 0
              ? selectedGhs.map(g => <GhsPic key={g.id} id={g.id} size={ghsBig} />)
              : <span className="msds-ph" style={{ color: '#bbb', fontSize: fs(10) }}>그림문자 선택</span>}
          </div>

          {/* 우측 문구 영역 — 라벨(제목) 아래에 텍스트가 오는 세로 배치 */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: Math.max(6, wPx * 0.018) }}>
            {/* 신호어 — 라벨은 유해위험문구와 동일(크기·굵기), 값은 본문과 시각적으로 같은 크기 */}
            <div style={{ whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 900, fontSize: fs(13) }}>신호어: </span>
              <span style={{ fontWeight: 500, fontSize: fs(13) }}>
                <MsdsInlineEdit value={form.signalWord} onChange={v => sf('signalWord', v)} isSelect inline placeholder="신호어" />
              </span>
            </div>
            {/* 유해위험문구 */}
            <div>
              <div style={{ fontWeight: 900, fontSize: fs(13), marginBottom: 2 }}>유해위험문구</div>
              <div style={{ fontSize: fs(10.5), lineHeight: 1.5, paddingLeft: 4, ...breakStyle }}>
                <MsdsInlineEdit value={form.hazardCodes} onChange={v => sf('hazardCodes', v)} placeholder="유해위험 문구" rows={3} />
              </div>
            </div>
            {/* 예방조치문구 — 예방/대응/저장/폐기 통합, 각 줄 · 불릿 */}
            <div>
              <div style={{ fontWeight: 900, fontSize: fs(13), marginBottom: 2 }}>예방조치문구</div>
              <div style={{ fontSize: fs(10.5), lineHeight: 1.5, paddingLeft: 4, ...breakStyle }}>
                <MsdsInlineEdit value={form.preventPhrases}  onChange={v => sf('preventPhrases', v)}  placeholder="예방 문구" rows={2} bullets />
                <MsdsInlineEdit value={form.responsePhrases} onChange={v => sf('responsePhrases', v)} placeholder="대응 문구" rows={2} bullets />
                <MsdsInlineEdit value={form.storagePhrases}  onChange={v => sf('storagePhrases', v)}  placeholder="저장 문구" rows={1} bullets />
                <MsdsInlineEdit value={form.disposalPhrases} onChange={v => sf('disposalPhrases', v)} placeholder="폐기 문구" rows={1} bullets />
              </div>
            </div>
          </div>
        </div>

        {/* 하단 공급자정보 */}
        <div style={{ fontSize: fs(13), display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <span style={{ fontWeight: 900 }}>공급자정보 :</span>
          <MsdsInlineEdit value={form.companyName}  onChange={v => sf('companyName', v)}  placeholder="업체명"   rows={1} inline />
          <span>,</span>
          <MsdsInlineEdit value={form.companyPhone} onChange={v => sf('companyPhone', v)} placeholder="전화번호" rows={1} inline />
        </div>
      </div>
    );
  };

  /* ══ RENDER ══════════════════════════════════════════════ */
  return (
    <div className="msds-wrap">
      <style>{`
        .msds-wrap { display:grid; grid-template-columns:370px 1fr; height:calc(100vh - 52px); overflow:hidden; }

        /* 왼쪽 */
        .msds-L { background:var(--bg-elev); border-right:1px solid var(--line); overflow-y:auto; padding:18px 16px 40px; }
        .msds-sec-label { font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-3); margin:14px 0 6px; }
        .msds-sec-label:first-child { margin-top:0; }
        .msds-hr { border:none; border-top:1px solid var(--line); margin:12px 0; }
        .msds-itab-bar { display:flex; border:1.5px solid var(--line); border-radius:8px; overflow:hidden; margin-bottom:12px; }
        .msds-itab { flex:1; padding:7px 4px; font-size:12px; font-weight:600; border:none; background:transparent; cursor:pointer; color:var(--fg-3); font-family:inherit; }
        .msds-itab.on { background:var(--primary); color:#fff; }
        .msds-upload-ok { background:#e8f5e9; border:1.5px solid #43a047; border-radius:10px; padding:10px 12px; display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .msds-drop { border:2px dashed var(--line); border-radius:10px; padding:18px 12px; text-align:center; cursor:pointer; transition:all .2s; background:var(--bg-sunk); }
        .msds-drop:hover { border-color: var(--primary); background: color-mix(in oklab, var(--primary) 6%, var(--bg-sunk)); }
        .msds-drop.is-drag-over { border-color: var(--primary); background: color-mix(in oklab, var(--primary) 14%, var(--bg-sunk)); transform: scale(1.01); box-shadow: 0 0 0 4px color-mix(in oklab, var(--primary) 18%, transparent); }
        .msds-drop.is-drag-over * { pointer-events: none; }
        .msds-drop:hover { border-color:var(--primary); background:var(--primary-soft); }
        .msds-inp { width:100%; padding:7px 10px; border:1.5px solid var(--line); border-radius:7px; font-size:13px; font-family:inherit; color:var(--fg); background:var(--bg-elev); }
        .msds-inp:focus { outline:none; border-color:var(--primary); }
        .msds-api-box { margin-top:8px; max-height:180px; overflow-y:auto; border:1.5px solid var(--line); border-radius:7px; background:white; }
        .msds-api-row { padding:8px 10px; cursor:pointer; font-size:12px; border-bottom:1px solid var(--line); transition:background .1s; }
        .msds-api-row:last-child { border-bottom:none; }
        .msds-api-row:hover { background:var(--primary-soft); }
        .msds-chip { font-size:10px; padding:1px 6px; border-radius:10px; background:#e8f5e9; color:#2e7d32; font-weight:600; }
        .msds-chip-o { background:#fff3e0; color:#e65100; }
        .msds-img-panel { background:var(--bg-sunk); border:1.5px solid var(--line); border-radius:9px; padding:9px; margin-top:4px; }
        .msds-img-grid { display:flex; flex-wrap:wrap; gap:4px; }
        .msds-img-item { width:72px; text-align:center; cursor:pointer; border-radius:7px; padding:6px 4px; border:2px solid transparent; position:relative; transition:all .15s; user-select:none; }
        .msds-img-item:hover { background:white; border-color:#ccc; }
        .msds-img-item.sel { background:white; border-color:var(--primary); }
        .msds-img-item.sel::after { content:'✓'; position:absolute; top:2px; right:2px; width:14px; height:14px; background:var(--primary); color:white; border-radius:50%; font-size:9px; display:flex; align-items:center; justify-content:center; line-height:14px; }
        .msds-img-label { font-size:9px; color:var(--fg-3); margin-top:2px; line-height:1.3; }

        /* 오른쪽 */
        .msds-R { background:var(--bg); overflow-y:auto; padding:20px 32px 40px; }
        .msds-print-area { max-width:860px; }
        .msds-R-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .msds-otabs { display:flex; gap:8px; margin-bottom:14px; }
        .msds-otab { padding:6px 16px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1.5px solid var(--line); background:white; color:var(--fg-3); transition:all .2s; font-family:inherit; }
        .msds-otab.on { background:var(--primary); border-color:var(--primary); color:white; }
        .msds-a4w { background:#fff3cd; border:1.5px solid #e0a800; border-radius:8px; padding:9px 13px; margin-bottom:12px; font-size:12px; color:#856404; display:flex; align-items:center; gap:8px; }
        .msds-print-btn { padding:8px 14px; border-radius:7px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:5px; background:white; border:1.5px solid var(--line); color:var(--fg); transition:all .2s; }
        .msds-print-btn:hover { border-color:var(--primary); color:var(--primary); }

        /* 관리요령 카드 — 카드 외곽 border 제거. 제목이 자체적으로 외곽선 역할.
           카드 border + 제목 배경 + 표 td border가 겹치며 제목 부분만 두껍게 보이던 문제 해결 */
        .msds-card { background:white; border:none; border-radius:10px; overflow:hidden; box-shadow:var(--shadow); max-width:860px; }
        .msds-card-title { background:#e8ecf0; color:#111; text-align:center; padding:10px; font-size:15px; font-weight:700; letter-spacing:.05em; border:1px solid #999; border-bottom:none; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        /* 표 외곽 border 보강 — border-collapse 시 우측 바깥선이 얇게 인쇄되는 문제 방지 */
        .msds-ft { width:100%; border-collapse:collapse; border:1px solid #999; }
        .msds-ft td { border:1px solid #999; padding:6px 10px; font-size:12px; vertical-align:top; position:relative; }
        .msds-fl { background:#e8ecf0; font-weight:700; text-align:center; vertical-align:middle !important; white-space:nowrap; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .msds-fh { background:#e8ecf0; color:#111; font-weight:700; font-size:13px; vertical-align:middle !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

        /* 경고표지 용량 선택 */
        .msds-cap-bar { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
        .msds-cap-btn { padding:6px 10px; border:1.5px solid var(--line); border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit; background:white; color:var(--fg-3); line-height:1.4; text-align:center; transition:all .2s; }
        .msds-cap-btn.on { border-color:#e85d2f; background:#e85d2f18; color:#e85d2f; }

        /* 출력 개수 입력 바 */
        .msds-print-count-bar {
          display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
          margin-bottom: 14px; padding: 10px 14px;
          background: var(--bg-elev); border: 1px solid var(--line); border-radius: 8px;
        }
        .msds-pc-input { display: flex; align-items: center; gap: 8px; }
        .msds-pc-input input {
          width: 72px; padding: 5px 10px;
          border: 1.5px solid var(--primary); border-radius: 6px;
          font-size: 14px; font-weight: 700; text-align: center;
          color: var(--primary); background: white;
          font-family: inherit;
        }
        .msds-pc-info {
          font-size: 12px; color: var(--fg-2); margin-left: auto;
          background: var(--primary-soft); padding: 5px 12px;
          border-radius: 16px; font-weight: 500;
        }

        /* 라벨 페이지/그리드 */
        .msds-label-wrap { display: flex; flex-direction: column; gap: 20px; }
        .msds-label-page {
          background: white; padding: 16px;
          border: 1px dashed var(--line); border-radius: 8px;
        }
        .msds-label-page-no {
          text-align: center; font-size: 11px; color: var(--fg-4);
          margin-top: 8px; font-style: italic;
        }
        .msds-label-grid { margin: 0 auto; }
        .msds-label-cell { display: flex; }

        /* 인라인 편집 */
        .msds-inline-wrap { position:relative; min-height:18px; }
        .msds-inline-wrap:hover .msds-edit-btn { opacity:1; }
        .msds-edit-btn { position:absolute; top:0; right:0; opacity:0; background:var(--primary); color:white; border:none; border-radius:4px; padding:2px 6px; font-size:9px; cursor:pointer; transition:opacity .15s; white-space:nowrap; font-family:inherit; z-index:2; }
        .msds-edit-area { width:100%; box-sizing:border-box; border:1.5px solid var(--primary); border-radius:5px; padding:5px 8px; resize:vertical; background:#f5f8ff; outline:none; line-height:1.7; }
        .msds-edit-actions { display:flex; align-items:center; gap:5px; margin-top:4px; }
        .msds-edit-ok { padding:3px 10px; background:var(--primary); color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-family:inherit; }
        .msds-edit-cancel { padding:3px 10px; background:#eee; color:var(--fg); border:none; border-radius:4px; cursor:pointer; font-size:11px; font-family:inherit; }

        /* 인쇄 */
        @media print {
          @page { size: 210mm 297mm; margin: 10mm 12mm; }
          html, body { width: 210mm !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          .msds-print-area, .msds-print-area * { visibility: visible; }
          .msds-print-area { position:fixed; top:0; left:0; width:186mm; box-sizing:border-box; padding:0 !important; margin:0 !important; background:white; }
          .msds-card { box-shadow:none !important; border-radius:0 !important; border:none !important; width:100% !important; }
          .msds-card-title { font-size:12px !important; padding:7px !important; border:1px solid #999 !important; border-bottom:none !important; }
          /* 표 외곽선 보강 — 우측 바깥선 얇게 인쇄 방지 */
          .msds-ft { border:1px solid #999 !important; }
          .msds-ft td { padding:3px 7px !important; font-size:9.5px !important; border:1px solid #999 !important; }
          .msds-fh { font-size:10px !important; }
          .msds-fl { font-size:9.5px !important; }
          .msds-edit-btn { display:none !important; }
          .msds-ph { display:none !important; }
          .msds-inline-wrap { min-height:unset !important; }
          .msds-a4w, .msds-cap-bar, .msds-otabs, .msds-R-hdr,
          .msds-print-count-bar, .msds-sec-label, .msds-label-page-no { display:none !important; }
          /* 페이지마다 새 페이지 */
          .msds-label-page {
            padding: 0 !important; border: none !important; border-radius: 0 !important;
            page-break-after: always; break-after: page;
          }
          .msds-label-page:last-child { page-break-after: auto; break-after: auto; }
          .msds-label-wrap { gap: 0 !important; }
          /* ── 폼텍 라벨지 정밀 배치 ──
             8칸(LS-3107): 99.1×67.7mm ×2×4 → 여백 좌우 5.9mm / 상하 13.1mm
             6칸(PS-2016): 99.1×93.1mm ×2×3 → 여백 좌우 5.9mm / 상하 8.85mm
             폼텍은 라벨 사이 간격 0 — 칸끼리 맞물리게 */
          .msds-label-page.fomtek-8, .msds-label-page.fomtek-6 {
            width: 210mm !important; height: 297mm !important;
            margin: 0 !important; box-sizing: border-box !important;
          }
          .msds-label-page.fomtek-8 { padding: 13.1mm 5.9mm !important; }
          .msds-label-page.fomtek-6 { padding: 8.85mm 5.9mm !important; }
          .msds-label-page.fomtek-8 .msds-label-grid, .msds-label-page.fomtek-6 .msds-label-grid {
            gap: 0 !important; margin: 0 !important;
            justify-content: flex-start !important;
            grid-template-columns: 99.1mm 99.1mm !important;
          }
          .msds-label-page.fomtek-8 .msds-label-grid { grid-auto-rows: 67.7mm !important; }
          .msds-label-page.fomtek-6 .msds-label-grid { grid-auto-rows: 93.1mm !important; }
          .msds-label-page.fomtek-8 .msds-label-cell { width: 99.1mm; height: 67.7mm; overflow: hidden; }
          .msds-label-page.fomtek-6 .msds-label-cell { width: 99.1mm; height: 93.1mm; overflow: hidden; }
        }
      `}</style>

      {/* ══ 왼쪽 패널 ═══════════════════════════════════════ */}
      <div className="msds-L">

        <div className="bcr" onClick={() => onNav({ name: "dashboard" })}>
          <Icon name="arrow-left" size={14} /> 대시보드
        </div>

        <div className="msds-sec-label">MSDS 불러오기</div>
        <div className="msds-itab-bar">
          <button className={`msds-itab${inputTab === 0 ? ' on' : ''}`} onClick={() => setInputTab(0)}>📄 PDF 업로드</button>
          <button className={`msds-itab${inputTab === 1 ? ' on' : ''}`} onClick={() => setInputTab(1)}>🔍 API 검색</button>
        </div>

        {inputTab === 0 && (<>
          {uploadSt === 'done' && (
            <div className="msds-upload-ok">
              <span style={{ fontSize: 18 }}>✅</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2e7d32' }}>{uploadFile}</div>
                <div style={{ fontSize: 11, color: '#388e3c', marginTop: 1 }}>AI 분석 완료 · 서식에서 직접 수정하세요</div>
              </div>
            </div>
          )}
          {uploadSt === 'error' && (
            <div style={{ background: '#fdecea', border: '1.5px solid #e53935', borderRadius: 8, padding: '9px 11px', marginBottom: 10, fontSize: 12, color: '#b71c1c' }}>
              ❌ {uploadErr || '분석 실패. 다시 시도해 주세요.'}
            </div>
          )}
          {uploadSt === 'uploading'
            ? <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--fg-3)', fontSize: 13 }}><div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>AI가 분석 중입니다…</div>
            : <>
                <div
                  className={`msds-drop${isDragOver ? ' is-drag-over' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{isDragOver ? '📥' : '📂'}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                    {isDragOver ? '여기에 놓으세요!' : 'MSDS PDF 업로드'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>클릭 또는 파일 끌어다 놓기</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4 }}>AI가 자동 추출합니다</div>
                </div>
                <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
              </>
          }
        </>)}

        {inputTab === 1 && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input className="msds-inp" style={{ flex: 1 }} placeholder="제품명 또는 물질명…"
                value={apiQuery} onChange={e => setApiQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 11px', whiteSpace: 'nowrap' }}
                onClick={handleSearch} disabled={apiLoading}>{apiLoading ? '…' : '검색'}</button>
            </div>
            {detailLoading && (
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 6 }}>⏳ 상세 정보(유해성·응급조치 등) 불러오는 중…</div>
            )}
            {apiResults.length > 0 && (
              <div className="msds-api-box">
                {apiResults[0]?._error
                  ? <div className="msds-api-row" style={{ color: '#b71c1c', cursor: 'default' }}>❌ {apiResults[0]._error}</div>
                  : apiResults[0]?._empty
                  ? <div className="msds-api-row" style={{ color: 'var(--fg-3)', cursor: 'default' }}>검색 결과가 없습니다.</div>
                  : apiResults.map((item, i) => (
                      <div key={i} className="msds-api-row"
                        onClick={async () => {
                          applyData(item);                    // 제품명·CAS 즉시 반영
                          setApiResults([]); setApiQuery(item.productName || apiQuery);
                          if (!item.chemId) return;
                          setDetailLoading(true);              // 유해성·응급조치 등 상세 절 로드
                          try {
                            const r = await fetch(`/api/msds/detail?chemId=${encodeURIComponent(item.chemId)}`);
                            const dd = await r.json();
                            if (r.ok && !dd.error) applyData({ ...dd, productName: item.productName });
                          } catch (e) { /* 상세 실패해도 제품명·CAS는 유지 */ }
                          finally { setDetailLoading(false); }
                        }}>
                        <div style={{ fontWeight: 600 }}>{item.productName}</div>
                        {item.casNo && <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>CAS: {item.casNo}</div>}
                      </div>
                    ))}
              </div>
            )}
          </>
        )}

        <hr className="msds-hr" />

        <div className="msds-sec-label">그림문자 선택 <span className="msds-chip msds-chip-o">클릭</span></div>
        <div className="msds-img-panel">
          <div className="msds-img-grid">
            {GHS_LIST.map(g => (
              <MsdsGhsItem key={g.id} item={g} selected={ghsSel.includes(g.id)} onToggle={toggleGhs} />
            ))}
          </div>
        </div>

        <hr className="msds-hr" />

        <div className="msds-sec-label">보호구 선택 <span className="msds-chip msds-chip-o">클릭</span></div>
        <div className="msds-img-panel">
          <div className="msds-img-grid">
            {PPE_LIST.map(p => (
              <MsdsPpeItem key={p.id} item={p} selected={ppeSel.includes(p.id)} onToggle={togglePpe} />
            ))}
          </div>
        </div>
      </div>

      {/* ══ 오른쪽 미리보기 ══════════════════════════════════ */}
      <div className="msds-R">
        <div className="msds-R-hdr">
          <div style={{ fontSize: 15, fontWeight: 700 }}>칸에 마우스를 올리면 수정 버튼이 나타납니다!</div>
          <PrintButton onClick={handlePrint} />
        </div>
        <div className="msds-otabs">
          <button className={`msds-otab${previewTab === 0 ? ' on' : ''}`} onClick={() => setPreviewTab(0)}>관리요령</button>
          <button className={`msds-otab${previewTab === 1 ? ' on' : ''}`} onClick={() => setPreviewTab(1)}>경고표지</button>
          <button className={`msds-otab${previewTab === 2 ? ' on' : ''}`} onClick={() => setPreviewTab(2)}>작업환경측정 특수검진 판정{components.length ? ` (${components.length})` : ''}</button>
        </div>

        {/* ── 작업환경측정 특수검진 판정 ── */}
        {previewTab === 2 && (
          <MsdsJudgePanel components={components} setComponents={setComponents}
            judgeRes={judgeRes} judging={judging} runJudge={runJudge}
            product={{ name: form.productName, manufacturer: form.companyName }} />
        )}

        {previewTab === 0 && a4Over && (
          <div className="msds-a4w">
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <div><strong>A4 한 장 초과 예상</strong> — 내용이 길면 인쇄 시 2장이 될 수 있습니다.</div>
          </div>
        )}

        {/* ── 관리요령 ── */}
        {previewTab === 0 && (
          <div className="msds-print-area">
            <div className="msds-card" ref={cardRef}>
              <div className="msds-card-title">유해화학물질  작업공정별  관리요령</div>
              <table className="msds-ft">
                <colgroup>
                  <col style={{ width: 72 }} />
                  <col />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <tbody>
                  {/* 제품명 */}
                  <tr>
                    <td className="msds-fl" style={{ fontSize: 13, letterSpacing: '.1em' }}>제 품 명</td>
                    <td colSpan={2} style={{ fontSize: 22, fontWeight: 900, textAlign: 'center', padding: '10px 16px' }}>
                      <MsdsInlineEdit value={form.productName} onChange={v => sf('productName', v)} placeholder="제품명을 입력하세요" rows={1} center />
                    </td>
                  </tr>
                  {/* 그림문자 헤더 */}
                  <tr>
                    <td className="msds-fh" colSpan={2}>1. 그림문자</td>
                    <td className="msds-fl" style={{ textAlign: 'center' }}>신호어</td>
                  </tr>
                  {/* 그림문자 내용 — 비어 있어도 칸 높이 유지(height=최소높이) */}
                  <tr>
                    <td colSpan={2} style={{ padding: '10px 14px', verticalAlign: 'middle', height: 82 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {selectedGhs.length === 0
                          ? <span className="msds-ph" style={{ color: '#bbb', fontSize: 12 }}>왼쪽에서 그림문자를 선택하세요</span>
                          : selectedGhs.map(g => <GhsPic key={g.id} id={g.id} size={62} />)}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: 900, fontSize: 20, letterSpacing: '.2em', height: 82 }}>
                      <MsdsInlineEdit value={form.signalWord} onChange={v => sf('signalWord', v)} isSelect center placeholder="신호어" />
                    </td>
                  </tr>
                  {/* 유해성 */}
                  <tr><td className="msds-fh" colSpan={3}>2. 유해성·위험성</td></tr>
                  <tr>
                    <td colSpan={3} style={{ padding: '8px 12px', lineHeight: 1.8, fontSize: 12 }}>
                      <MsdsInlineEdit value={form.hazard} onChange={v => sf('hazard', v)} placeholder="유해성·위험성을 입력하세요" rows={3} />
                    </td>
                  </tr>
                  {/* 취급 주의사항 */}
                  <tr><td className="msds-fh" colSpan={3}>3. 취급상의 주의사항</td></tr>
                  <tr>
                    <td className="msds-fl">취급</td>
                    <td colSpan={2} style={{ fontSize: 11.5, lineHeight: 1.8 }}>
                      <MsdsInlineEdit value={form.handling} onChange={v => sf('handling', v)} placeholder="취급 주의사항을 입력하세요" rows={3} />
                    </td>
                  </tr>
                  <tr>
                    <td className="msds-fl">저장</td>
                    <td colSpan={2} style={{ fontSize: 11.5, lineHeight: 1.8 }}>
                      <MsdsInlineEdit value={form.storage} onChange={v => sf('storage', v)} placeholder="저장 주의사항을 입력하세요" rows={2} />
                    </td>
                  </tr>
                  {/* 보호구 */}
                  <tr><td className="msds-fh" colSpan={3}>4. 적절한 보호구</td></tr>
                  <tr>
                    <td colSpan={3} style={{ padding: '12px 16px', height: 96, verticalAlign: 'middle' }}>
                      {selectedPpe.length === 0
                        ? <span className="msds-ph" style={{ color: '#bbb', fontSize: 12 }}>왼쪽에서 보호구를 선택하세요</span>
                        : <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            {selectedPpe.map(p => (
                              <div key={p.id} style={{ textAlign: 'center', width: 64 }}>
                                <PpePic id={p.id} size={56} />
                                <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500 }}>{p.label}</div>
                              </div>
                            ))}
                          </div>}
                    </td>
                  </tr>
                  {/* 응급조치 */}
                  <tr><td className="msds-fh" colSpan={3}>5. 응급조치 요령 및 사고 시 대처방법</td></tr>
                  {EMRG.map(({ k, lb }) => (
                    <tr key={k}>
                      <td className="msds-fl" style={{ fontSize: 11.5 }}>{lb}</td>
                      <td colSpan={2} style={{ fontSize: 11.5, lineHeight: 1.8 }}>
                        <MsdsInlineEdit value={form[k]} onChange={v => sf(k, v)} placeholder="내용을 입력하세요" rows={2} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 경고표지 ── */}
        {previewTab === 1 && (() => {
          const sz = MSDS_CAP[capSize];
          const total = Math.max(1, Math.min(200, parseInt(printCount) || 1));
          const perPage = sz.perPage;
          const cols = sz.cols;
          const pageCount = Math.ceil(total / perPage);
          // 페이지별 그룹 (각 페이지에 perPage개씩)
          const pages = Array.from({ length: pageCount }, (_, p) => {
            const start = p * perPage;
            const end = Math.min(start + perPage, total);
            return Array.from({ length: end - start }, (_, i) => start + i);
          });
          return (
          <div className="msds-print-area">
            <div className="msds-sec-label" style={{ marginBottom: 8 }}>용기 용량 선택</div>
            <div className="msds-cap-bar">
              {Object.entries(MSDS_CAP).map(([key, csz]) => (
                <button key={key} className={`msds-cap-btn${capSize === key ? ' on' : ''}`} onClick={() => setCapSize(key)}>
                  {csz.label}<br /><small>{csz.sub}</small>
                </button>
              ))}
            </div>
            {/* 인쇄 개수 입력 + 안내 */}
            <div className="msds-print-count-bar">
              <div>
                <span style={{ fontSize: 11, color: '#666', background: '#e8ecf2', padding: '3px 10px', borderRadius: 4, fontWeight: 600 }}>
                  📐 {sz.w}mm × {sz.h}mm{sz.tiny ? ' · 간소화 서식' : ''}
                </span>
              </div>
              <div className="msds-pc-input">
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-2)' }}>출력 개수</label>
                <input type="number" min={1} max={200} value={printCount}
                  onChange={e => setPrintCount(e.target.value)}
                  onBlur={e => {
                    // 비어있거나 0 이하면 1로, 200 초과면 200으로 보정
                    const n = parseInt(e.target.value);
                    if (!n || n < 1) setPrintCount('1');
                    else if (n > 200) setPrintCount('200');
                  }} />
                <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>개</span>
              </div>
              <div className="msds-pc-info">
                A4 한 장에 <b style={{ color: 'var(--primary)' }}>{perPage}개</b> 배치 · 총 <b style={{ color: 'var(--primary)' }}>{pageCount}장</b> 출력
              </div>
            </div>
            {/* 페이지별 그리드 렌더 */}
            <div className="msds-label-wrap">
              {pages.map((items, p) => (
                <div key={p} className={`msds-label-page${sz.tiny ? ' fomtek-8' : ' fomtek-6'}`} data-pageno={p + 1}>
                  <div className="msds-label-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, ${sz.w * MM2PX}px)`,
                    gap: '0',   /* 폼텍 라벨지는 칸 간격 없음 (8칸·6칸 공통) */
                    justifyContent: 'center',
                  }}>
                    {items.map(idx => (
                      <div key={idx} className="msds-label-cell">{renderLabel(idx)}</div>
                    ))}
                  </div>
                  {pageCount > 1 && (
                    <div className="msds-label-page-no">— {p + 1} / {pageCount} —</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
};

Object.assign(window, { MsdsGeneratorView });
