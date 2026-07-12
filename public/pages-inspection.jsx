'use strict';
// ── 현장점검 보고서 작성기 ──

const INSP_STYLE = `
.insp-wrap { max-width: 880px; margin: 0 auto; }
.insp-header { padding:12px 20px 2px; }
.insp-header-title { font-size:18px; font-weight:700; color:var(--fg); }
.insp-header-sub { font-size:12px; color:var(--fg-3); margin-top:2px; }
.insp-tab-bar { display:flex; align-items:center; margin-bottom:12px; }
.insp-tab { padding:12px 22px; font-size:13px; font-weight:600; cursor:pointer; border:none;
  background:transparent; color:var(--fg-3); border-bottom:3px solid transparent;
  transition:all .15s; font-family:inherit; }
.insp-tab.active { color:var(--primary); border-bottom-color:var(--primary); }
.insp-tab:hover:not(.active) { color:var(--fg); background:var(--bg); }
.insp-body { padding:4px 0 60px; }

/* 섹션 카드 */
.insp-section { background:var(--bg-elev); border:1px solid var(--line); border-radius:var(--r);
  padding:18px 20px; margin-bottom:14px; }
.insp-section-title { font-size:11px; font-weight:800; color:var(--fg-3); letter-spacing:.6px;
  text-transform:uppercase; margin-bottom:14px; }

/* 기본정보 그리드 */
.insp-meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.insp-field { display:flex; flex-direction:column; gap:4px; }
.insp-field.full { grid-column:1/-1; }
.insp-field label { font-size:11px; font-weight:600; color:var(--fg-3); }
.insp-field input { font-family:inherit; font-size:13px; padding:8px 10px;
  border:1px solid var(--line); border-radius:var(--r-sm); background:var(--bg);
  color:var(--fg); outline:none; }
.insp-field input:focus { border-color:var(--primary); }

/* 대시보드 */
.insp-dashboard { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.insp-dash-badge { display:inline-flex; align-items:center; gap:5px; padding:8px 14px;
  border-radius:var(--r-sm); font-size:13px; font-weight:700; }

/* 아코디언 카드 */
.insp-card { background:#fff; border:1px solid var(--line); border-radius:var(--r);
  margin-bottom:8px; overflow:hidden; transition:border-color .15s, box-shadow .15s; }
.insp-card.open { border-color:var(--primary); box-shadow:0 0 0 3px rgba(30,95,207,.12); }
.insp-card-hdr { display:flex; align-items:center; gap:10px; padding:12px 16px;
  cursor:pointer; user-select:none; transition:background .1s; }
.insp-card-hdr:hover { background:var(--bg-elev); }
.insp-card-num { font-size:11px; font-weight:800; color:var(--fg-3); min-width:50px;
  background:var(--bg-elev); padding:3px 8px; border-radius:100px; text-align:center; }
.insp-card-hdr-title { flex:1; font-size:13px; font-weight:600; color:var(--fg); }
.insp-card-hdr-empty { color:var(--fg-4); font-style:italic; font-weight:400; }
.insp-card-body { padding:4px 20px 20px; border-top:1px solid var(--line); }

/* 사진 업로드 */
.insp-photo-zone { border:2px dashed var(--line); border-radius:var(--r-sm); padding:24px 16px;
  text-align:center; cursor:pointer; color:var(--fg-3); font-size:13px;
  transition:all .15s; margin-top:16px; }
.insp-photo-zone:hover,.insp-photo-zone.drag { border-color:var(--primary); color:var(--primary); background:rgba(30,95,207,.04); }
.insp-photo-preview { width:100%; max-height:300px; object-fit:contain; border-radius:var(--r-sm);
  border:1px solid var(--line); margin-top:10px; display:block; }

/* 위험도 */
.insp-risk-btns { display:flex; gap:8px; }
.insp-risk-btn { padding:6px 18px; border-radius:var(--r-sm); font-size:13px; font-weight:700;
  border:2px solid var(--line); cursor:pointer; font-family:inherit; background:var(--bg);
  color:var(--fg-2); transition:all .12s; }
.insp-risk-badge { display:inline-flex; align-items:center; padding:3px 10px;
  border-radius:100px; font-size:11px; font-weight:800; }

/* 카테고리 */
.insp-cat { margin-top:12px; border:1px solid var(--line); border-radius:var(--r-sm); overflow:hidden; }
.insp-cat-hdr { padding:8px 12px; font-size:12px; font-weight:800;
  display:flex; align-items:center; gap:6px; border-bottom:1px solid var(--line); }
.insp-cat-body { padding:10px 12px; display:flex; flex-direction:column; gap:6px; }
.insp-item-row { display:flex; align-items:center; gap:8px; }
.insp-item-num { font-size:11px; font-weight:700; min-width:18px; text-align:right; flex-shrink:0; }
.insp-item-inp { flex:1; font-family:inherit; font-size:13px; padding:6px 8px;
  border:1px solid var(--line); border-radius:var(--r-sm); background:var(--bg); color:var(--fg); outline:none; }
.insp-item-inp:focus { border-color:var(--primary); }
.insp-item-del { background:none; border:none; cursor:pointer; color:var(--fg-4);
  font-size:16px; padding:0 4px; line-height:1; flex-shrink:0; }
.insp-item-del:hover { color:#C00000; }
.insp-add-row-btn { display:flex; align-items:center; justify-content:center; gap:4px;
  padding:6px 10px; font-size:12px; font-family:inherit; cursor:pointer;
  background:transparent; border:1px dashed var(--line); border-radius:var(--r-sm);
  color:var(--fg-3); width:100%; margin-top:2px; }
.insp-add-row-btn:hover { border-color:var(--primary); color:var(--primary); }

/* 카드 제어 */
.insp-ctrl-btn { background:none; border:1px solid var(--line); border-radius:var(--r-sm);
  cursor:pointer; padding:3px 8px; font-size:12px; color:var(--fg-2); font-family:inherit; }
.insp-ctrl-btn:hover { border-color:var(--primary); color:var(--primary); }
.insp-ctrl-btn.del:hover { border-color:#C00000; color:#C00000; }

/* ── 미리보기 / 인쇄 ── */
.insp-preview { background:#fff; padding:40px 48px; border:1px solid var(--line); border-radius:var(--r); }
.insp-prev-report-title { text-align:center; font-size:22px; font-weight:900; margin-bottom:4px; }
.insp-prev-report-sub { text-align:center; font-size:13px; color:#666; margin-bottom:30px; }
.insp-prev-sec-label { font-size:14px; font-weight:800; margin:24px 0 8px; padding-left:4px;
  border-left:4px solid #1F4E79; }
.insp-prev-tbl { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px; }
.insp-prev-tbl th { background:#1F4E79; color:#fff; font-weight:700; text-align:center;
  padding:9px 10px; border:1px solid #1F4E79; }
.insp-prev-tbl td { border:1px solid #333; padding:8px 12px; vertical-align:middle; }
.insp-prev-tbl .lbl { background:#EEF1F4; font-weight:700; text-align:center;
  white-space:nowrap; width:90px; }
.insp-finding-hdr { display:flex; align-items:center; gap:10px; margin:20px 0 10px;
  padding-bottom:8px; border-bottom:2px solid #1F4E79; }
.insp-finding-hdr h3 { font-size:14px; font-weight:800; margin:0; }
.insp-prev-photo { max-width:100%; max-height:280px; object-fit:contain; border:1px solid #ddd;
  border-radius:4px; margin-bottom:12px; display:block; }
.insp-sign-row { display:flex; justify-content:flex-end; gap:48px; margin-top:36px; }
.insp-sign-box { display:flex; flex-direction:column; align-items:center; gap:22px; }
.insp-sign-line { border-top:1px solid #333; width:120px; padding-top:6px;
  text-align:center; font-size:11px; color:#666; }

@keyframes ai-shimmer {
  0% { background-position:200% 0; }
  100% { background-position:-200% 0; }
}
@keyframes ai-spin {
  from { transform:rotate(0deg); }
  to { transform:rotate(360deg); }
}

/* 반응형 */
@media (max-width:600px) {
  .insp-meta-grid { grid-template-columns:1fr; }
  .insp-field.full { grid-column:1; }
  .insp-preview { padding:20px 16px; }
  .insp-header { padding:16px 16px 4px; }
}

@media print {
  .insp-no-print { display:none !important; }
  .insp-tab-bar { display:none !important; }
  .insp-header { display:none !important; }
  .content { max-width:100% !important; padding:0 !important; }
  .sidebar,.topbar { display:none !important; }
  .app { display:block !important; }
  .insp-preview { border:none !important; padding:0 !important; border-radius:0 !important; }
  .insp-body { padding:0 !important; }
  .insp-wrap { max-width:100% !important; }
  .insp-finding-hdr { page-break-after:avoid; }
  .insp-prev-sec-label { page-break-after:avoid; }
}
`;

const RISK_COLORS = { 높음: '#C00000', 중간: '#BF8F00', 낮음: '#2E7D32' };
const RISK_BG    = { 높음: '#FDECEA', 중간: '#FFFDE7', 낮음: '#E8F5E9' };

const CAT_META = [
  { key: '문제점',   label: '⚠️ 문제점',        color: '#C00000', bg: '#FFF5F5', border: '#FCA5A5' },
  { key: '보완사항', label: '🔧 보완사항',      color: '#1565C0', bg: '#EFF6FF', border: '#93C5FD' },
  { key: '구매조치', label: '🛒 구매/조치 필요', color: '#6A1B9A', bg: '#FAF5FF', border: '#C4B5FD' },
  { key: '요청사항', label: '📋 요청사항',      color: '#00695C', bg: '#F0FDFA', border: '#6EE7D4' },
];

let _uid = Date.now();
const uid = () => `id${++_uid}`;

const blankCard = () => ({
  id: uid(), title: '', photo: null, risk: '',
  문제점: [], 보완사항: [], 구매조치: [], 요청사항: [],
});
const blankItem = (text = '') => ({ id: uid(), text });

/* ── 위험도 배지 ── */
function RiskBadge({ risk, small }) {
  if (!risk) return null;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      padding: small ? '2px 8px' : '3px 10px',
      borderRadius:100, fontSize: small ? 10 : 11, fontWeight:800,
      background:RISK_BG[risk], color:RISK_COLORS[risk],
      border:`1.5px solid ${RISK_COLORS[risk]}`,
    }}>{risk}</span>
  );
}

/* ── 사진 업로드 존 ── */
function PhotoZone({ photo, onPhoto }) {
  const [drag, setDrag] = React.useState(false);
  const ref = React.useRef();
  const read = f => {
    if (!f || !f.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = e => onPhoto(e.target.result);
    r.readAsDataURL(f);
  };
  if (photo) return (
    <div style={{ position:'relative', marginTop:16 }}>
      <img src={photo} alt="점검 사진" className="insp-photo-preview" />
      <button onClick={() => onPhoto(null)} style={{
        position:'absolute', top:14, right:6, background:'#C00000', color:'#fff',
        border:'none', borderRadius:'50%', width:24, height:24, cursor:'pointer',
        fontSize:14, display:'flex', alignItems:'center', justifyContent:'center',
      }}>✕</button>
    </div>
  );
  return (
    <div>
      <div className={`insp-photo-zone${drag ? ' drag' : ''}`}
        onClick={() => ref.current.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); read(e.dataTransfer.files[0]); }}>
        📷 클릭하거나 사진을 드래그하여 첨부
        <div style={{ fontSize:11, marginTop:4, opacity:.7 }}>JPG · PNG · HEIC 등 이미지 파일</div>
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display:'none' }}
        onChange={e => read(e.target.files[0])} />
    </div>
  );
}

/* ── 카테고리 항목 입력 ── */
function CategorySection({ cat, items, onChange }) {
  const add = () => onChange([...items, blankItem()]);
  const del = id => onChange(items.filter(it => it.id !== id));
  const upd = (id, text) => onChange(items.map(it => it.id === id ? { ...it, text } : it));
  return (
    <div className="insp-cat">
      <div className="insp-cat-hdr" style={{ background:cat.bg, borderBottomColor:cat.border }}>
        <span style={{ color:cat.color }}>{cat.label}</span>
        <span style={{ marginLeft:'auto', fontSize:11, color:'var(--fg-3)', fontWeight:500 }}>
          {items.filter(it=>it.text).length}건
        </span>
      </div>
      <div className="insp-cat-body">
        {items.map((it, idx) => (
          <div key={it.id} className="insp-item-row">
            <span className="insp-item-num" style={{ color:cat.color }}>{idx+1}.</span>
            <input className="insp-item-inp" value={it.text}
              onChange={e => upd(it.id, e.target.value)}
              placeholder={`${cat.label.replace(/[⚠️🔧🛒📋]\s*/,'')} 내용`}
            />
            <button className="insp-item-del" onClick={() => del(it.id)} title="삭제">×</button>
          </div>
        ))}
        <button className="insp-add-row-btn" onClick={add}>＋ 항목 추가</button>
      </div>
    </div>
  );
}

/* ── 점검 카드 (아코디언) ── */
function InspCard({ card, idx, total, isOpen, onToggle, onUpdate, onDelete, onMoveUp, onMoveDown }) {
  const [analyzing, setAnalyzing] = React.useState(false);
  const [aiError, setAiError] = React.useState('');
  const upd = (k, v) => onUpdate({ ...card, [k]: v });
  const itemCount = CAT_META.reduce((s, c) => s + (card[c.key]||[]).filter(it=>it.text).length, 0);

  const runAI = async () => {
    if (!card.photo) return;
    setAnalyzing(true);
    setAiError('');
    try {
      // data:image/jpeg;base64,xxxx → mimeType + base64 분리
      const match = card.photo.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error('이미지 형식을 인식할 수 없습니다.');
      const [, mimeType, imageBase64] = match;

      const res = await fetch('/api/inspection/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `서버 오류 (${res.status})`);
      }
      const data = await res.json();

      // 기존 내용이 있으면 덮어쓸지 확인
      const hasExisting = card.title || CAT_META.some(c => (card[c.key]||[]).some(it => it.text));
      if (hasExisting && !window.confirm('기존 입력 내용에 AI 분석 결과를 추가하시겠습니까?\n(취소 시 기존 내용 유지, 확인 시 내용 추가)')) {
        return;
      }

      const merged = { ...card };
      if (data.title && !card.title) merged.title = data.title;
      if (data.risk && ['높음','중간','낮음'].includes(data.risk)) merged.risk = data.risk;

      CAT_META.forEach(cat => {
        const aiItems = (data[cat.key] || []).filter(Boolean);
        const existing = card[cat.key] || [];
        const existingTexts = new Set(existing.map(it => it.text));
        const newItems = aiItems
          .filter(t => !existingTexts.has(t))
          .map(t => blankItem(t));
        merged[cat.key] = [...existing.filter(it => it.text), ...newItems];
        if (merged[cat.key].length === 0) merged[cat.key] = [blankItem()];
      });

      onUpdate(merged);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className={`insp-card${isOpen ? ' open' : ''}`}>
      {/* 헤더 */}
      <div className="insp-card-hdr" onClick={onToggle}>
        <span className="insp-card-num">사진 {idx+1}</span>
        <span className="insp-card-hdr-title">
          {card.title || <span className="insp-card-hdr-empty">제목 없음</span>}
        </span>
        {card.photo && <span style={{ fontSize:14 }} title="사진 첨부됨">📷</span>}
        {itemCount > 0 && <span style={{ fontSize:11, color:'var(--fg-3)' }}>{itemCount}건</span>}
        <RiskBadge risk={card.risk} small />
        {/* 카드 제어 (이벤트 버블링 차단) */}
        <div style={{ display:'flex', gap:4 }} onClick={e => e.stopPropagation()}>
          {idx > 0 && <button className="insp-ctrl-btn" onClick={onMoveUp}>↑</button>}
          {idx < total-1 && <button className="insp-ctrl-btn" onClick={onMoveDown}>↓</button>}
          <button className="insp-ctrl-btn del" onClick={onDelete}>✕</button>
        </div>
        <span style={{ color:'var(--fg-4)', fontSize:11 }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {/* 본문 */}
      {isOpen && (
        <div className="insp-card-body">
          {/* 사진 */}
          <PhotoZone photo={card.photo} onPhoto={v => { upd('photo', v); setAiError(''); }} />

          {/* AI 분석 버튼 — 사진 있을 때만 표시 */}
          {card.photo && (
            <div style={{ marginTop:10 }}>
              <button onClick={runAI} disabled={analyzing} style={{
                width:'100%', padding:'10px', fontFamily:'inherit', fontSize:13, fontWeight:700,
                border:'none', borderRadius:'var(--r-sm)', cursor: analyzing ? 'default' : 'pointer',
                background: analyzing
                  ? 'linear-gradient(90deg,#4A6FA5 0%,#2A5298 50%,#4A6FA5 100%)'
                  : 'linear-gradient(135deg,#1A365D 0%,#2A5298 100%)',
                backgroundSize: analyzing ? '200% 100%' : '100% 100%',
                animation: analyzing ? 'ai-shimmer 1.4s linear infinite' : 'none',
                color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
                {analyzing
                  ? <><span style={{ display:'inline-block', animation:'ai-spin 1s linear infinite' }}>⟳</span> AI가 사진을 분석하는 중...</>
                  : <>✨ AI로 자동 분석</>}
              </button>
              {aiError && (
                <div style={{ marginTop:6, padding:'8px 10px', background:'#FFF5F5',
                  border:'1px solid #FCA5A5', borderRadius:'var(--r-sm)', fontSize:12, color:'#C00000' }}>
                  ⚠ {aiError}
                </div>
              )}
            </div>
          )}

          {/* 제목 */}
          <div style={{ marginTop:14 }}>
            <div className="insp-field">
              <label>점검 구역 / 제목</label>
              <input value={card.title} onChange={e => upd('title', e.target.value)}
                placeholder="예: 화학물질 보관구역, 도장 조색실" />
            </div>
          </div>

          {/* 위험도 */}
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--fg-3)', marginBottom:6 }}>위험도 선택</div>
            <div className="insp-risk-btns">
              {['높음','중간','낮음'].map(r => {
                const on = card.risk === r;
                return (
                  <button key={r} className="insp-risk-btn"
                    onClick={() => upd('risk', on ? '' : r)}
                    style={{
                      background: on ? RISK_BG[r] : 'var(--bg)',
                      color: on ? RISK_COLORS[r] : 'var(--fg-3)',
                      borderColor: on ? RISK_COLORS[r] : 'var(--line)',
                    }}>{r}</button>
                );
              })}
            </div>
          </div>

          {/* 4개 카테고리 */}
          {CAT_META.map(cat => (
            <CategorySection key={cat.key} cat={cat}
              items={card[cat.key] || []}
              onChange={items => upd(cat.key, items)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 총괄표 미리보기 ── */
function InspPreview({ meta, cards }) {
  const active = cards.filter(c =>
    c.title || c.photo || CAT_META.some(ct => (c[ct.key]||[]).some(it => it.text))
  );
  return (
    <div className="insp-preview">
      {/* 제목 */}
      <div className="insp-prev-report-title">
        {meta.점검장소 || '○○ 사업장'} 현장점검 결과 보고서
      </div>
      <div className="insp-prev-report-sub">{meta.점검구분}</div>

      {/* 기본정보 */}
      <div className="insp-prev-sec-label">기본 정보</div>
      <table className="insp-prev-tbl">
        <tbody>
          <tr>
            <td className="lbl">점검일자</td><td>{meta.점검일자}</td>
            <td className="lbl">점검장소</td><td>{meta.점검장소 || '-'}</td>
          </tr>
          <tr>
            <td className="lbl">점검자</td><td>{meta.점검자 || '-'}</td>
            <td className="lbl">점검구분</td><td>{meta.점검구분 || '-'}</td>
          </tr>
          <tr>
            <td className="lbl">점검목적</td>
            <td colSpan={3}>{meta.점검목적 || '-'}</td>
          </tr>
        </tbody>
      </table>

      {/* 총괄표 */}
      <div className="insp-prev-sec-label">점검 결과 총괄</div>
      <table className="insp-prev-tbl">
        <thead>
          <tr>
            <th style={{ width:44 }}>No.</th>
            <th style={{ width:'25%' }}>점검 구역</th>
            <th>주요 문제점</th>
            <th style={{ width:60 }}>위험도</th>
          </tr>
        </thead>
        <tbody>
          {active.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign:'center', color:'#999', padding:20 }}>
              작성된 항목이 없습니다
            </td></tr>
          ) : active.map((c, i) => {
            const issues = (c.문제점||[]).filter(it=>it.text);
            return (
              <tr key={c.id}>
                <td style={{ textAlign:'center', fontWeight:700 }}>{i+1}</td>
                <td style={{ fontWeight:600 }}>{c.title || '-'}</td>
                <td style={{ fontSize:12, lineHeight:1.8 }}>
                  {issues.length ? issues.map((it,ii) => <div key={ii}>• {it.text}</div>) : '-'}
                </td>
                <td style={{
                  textAlign:'center', fontWeight:800,
                  color: c.risk ? RISK_COLORS[c.risk] : '#999',
                  background: c.risk ? RISK_BG[c.risk] : 'transparent',
                }}>{c.risk || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 세부 점검 내용 */}
      <div className="insp-prev-sec-label">세부 점검 내용</div>
      {active.map((c, i) => {
        const hasCat = CAT_META.some(ct => (c[ct.key]||[]).some(it=>it.text));
        return (
          <div key={c.id} style={{ marginBottom:28, pageBreakInside:'avoid' }}>
            <div className="insp-finding-hdr">
              <h3>사진 {i+1}. {c.title || '(제목 없음)'}</h3>
              <RiskBadge risk={c.risk} />
            </div>
            {c.photo && <img src={c.photo} alt={c.title} className="insp-prev-photo" />}
            {hasCat && (
              <table className="insp-prev-tbl">
                <thead>
                  <tr>
                    <th style={{ width:110 }}>구분</th>
                    <th>내용</th>
                  </tr>
                </thead>
                <tbody>
                  {CAT_META.map(cat => {
                    const items = (c[cat.key]||[]).filter(it=>it.text);
                    if (!items.length) return null;
                    return (
                      <tr key={cat.key}>
                        <td className="lbl" style={{ color:cat.color, background:cat.bg, fontSize:12 }}>
                          {cat.label}
                        </td>
                        <td>
                          {items.map((it,ii) => (
                            <div key={ii} style={{ lineHeight:1.8, fontSize:13 }}>{ii+1}. {it.text}</div>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      {/* 서명란 */}
      <div className="insp-sign-row">
        <div className="insp-sign-box">
          <div style={{ fontWeight:700, fontSize:13 }}>작성자: {meta.점검자 || '　　　'}</div>
          <div className="insp-sign-line">서 명</div>
        </div>
        <div className="insp-sign-box">
          <div style={{ fontWeight:700, fontSize:13 }}>작성일: {meta.점검일자}</div>
          <div className="insp-sign-line">확 인</div>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 컴포넌트 ── */
function FieldInspectionView({ onNav, currentUser }) {
  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = React.useState('write');
  const [meta, setMeta] = React.useState({
    점검일자: today,
    점검장소: '',
    점검자: currentUser?.name || '',
    점검구분: '상반기 현장점검',
    점검목적: '작업장 내 위험요인 사전 발굴 및 개선 지원',
  });
  const initCard = React.useMemo(() => blankCard(), []);
  const [cards, setCards] = React.useState([initCard]);
  const [openId, setOpenId] = React.useState(initCard.id);

  const updMeta = (k, v) => setMeta(p => ({ ...p, [k]: v }));

  const riskCount = React.useMemo(() => {
    const c = { 높음:0, 중간:0, 낮음:0 };
    cards.forEach(card => { if (card.risk) c[card.risk]++; });
    return c;
  }, [cards]);

  const activeCount = cards.filter(c =>
    c.title || c.photo || CAT_META.some(ct => (c[ct.key]||[]).some(it=>it.text))
  ).length;

  const addCard = () => {
    const c = blankCard();
    setCards(prev => [...prev, c]);
    setOpenId(c.id);
    setTimeout(() => {
      document.querySelector('.insp-card.open')?.scrollIntoView({ behavior:'smooth', block:'start' });
    }, 100);
  };

  const updateCard = updated => setCards(prev => prev.map(c => c.id === updated.id ? updated : c));

  const deleteCard = id => {
    if (cards.length === 1) { alert('최소 1개의 항목이 필요합니다.'); return; }
    if (!window.confirm('이 항목을 삭제하시겠습니까?')) return;
    setCards(prev => {
      const next = prev.filter(c => c.id !== id);
      if (openId === id) setOpenId(next[0]?.id || null);
      return next;
    });
  };

  const moveCard = (idx, dir) => {
    setCards(prev => {
      const arr = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= arr.length) return arr;
      [arr[idx], arr[t]] = [arr[t], arr[idx]];
      return arr;
    });
  };

  const handleSave = () => {
    try {
      // 사진 base64는 용량이 크므로 별도 키로 분리 저장
      const photoMap = {};
      const cardsNoPhoto = cards.map(c => {
        if (c.photo) photoMap[c.id] = c.photo;
        return { ...c, photo: c.photo ? '__saved__' : null };
      });
      localStorage.setItem('wv_insp_meta', JSON.stringify(meta));
      localStorage.setItem('wv_insp_cards', JSON.stringify(cardsNoPhoto));
      localStorage.setItem('wv_insp_photos', JSON.stringify(photoMap));
      alert('임시 저장 완료');
    } catch(e) { alert('저장 실패: ' + e.message); }
  };

  const handleLoad = () => {
    try {
      const m = localStorage.getItem('wv_insp_meta');
      const cs = localStorage.getItem('wv_insp_cards');
      if (!m || !cs) { alert('저장된 초안이 없습니다.'); return; }
      const photoMap = JSON.parse(localStorage.getItem('wv_insp_photos') || '{}');
      const parsed = JSON.parse(cs).map(c => ({
        ...c, photo: c.photo === '__saved__' ? (photoMap[c.id] || null) : null,
      }));
      setMeta(JSON.parse(m));
      setCards(parsed);
      setOpenId(parsed[0]?.id || null);
      alert('불러오기 완료');
    } catch(e) { alert('불러오기 실패: ' + e.message); }
  };

  const handleNew = () => {
    if (!window.confirm('현재 작성 내용이 초기화됩니다. 계속하시겠습니까?')) return;
    const c = blankCard();
    setMeta({ 점검일자:today, 점검장소:'', 점검자: currentUser?.name||'',
      점검구분:'상반기 현장점검', 점검목적:'작업장 내 위험요인 사전 발굴 및 개선 지원' });
    setCards([c]);
    setOpenId(c.id);
    setTab('write');
  };

  return (
    <div className="content" style={{ maxWidth: 900 }}>
      <style>{INSP_STYLE}</style>

      {/* 헤더 — 위험성평가 표준 패턴 */}
      <div className="content-hd insp-no-print">
        <div>
          <h1 className="content-title">현장점검 보고서</h1>
          <div className="content-sub">사업장 현장점검 결과 기록 및 보고서 자동 생성</div>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button onClick={handleNew}
              style={{ fontFamily:'inherit', fontSize:12, padding:'6px 12px',
                border:'1px solid var(--line)', background:'var(--bg-elev)',
                color:'var(--fg-2)', borderRadius:'var(--r-sm)', cursor:'pointer' }}>
              새 보고서
            </button>
            <button onClick={handleLoad}
              style={{ fontFamily:'inherit', fontSize:12, padding:'6px 12px',
                border:'1px solid var(--line)', background:'var(--bg-elev)',
                color:'var(--fg-2)', borderRadius:'var(--r-sm)', cursor:'pointer' }}>
              불러오기
            </button>
            <button onClick={handleSave}
              style={{ fontFamily:'inherit', fontSize:12, padding:'6px 14px',
                border:'none', background:'var(--primary)',
                color:'#fff', borderRadius:'var(--r-sm)', cursor:'pointer', fontWeight:700 }}>
              임시저장
            </button>
          </div>
      </div>

      {/* 탭바 */}
      <div className="insp-tab-bar insp-no-print">
        <button className={`insp-tab${tab==='write' ? ' active' : ''}`} onClick={() => setTab('write')}>
          ✏️ 작성
        </button>
        <button className={`insp-tab${tab==='preview' ? ' active' : ''}`} onClick={() => setTab('preview')}>
          📄 총괄표 미리보기{activeCount > 0 ? ` (${activeCount}건)` : ''}
        </button>
        {tab === 'preview' && (
          <PrintButton style={{ marginLeft:'auto', marginRight:16 }} />
        )}
      </div>

      {/* 본문 */}
      <div className="insp-body">
        {tab === 'write' ? (
          <>
            {/* 기본정보 */}
            <div className="insp-section">
              <div className="insp-section-title">점검 기본정보</div>
              <div className="insp-meta-grid">
                <div className="insp-field">
                  <label>점검일자</label>
                  <KDate value={meta.점검일자} onChange={e => updMeta('점검일자', e.target.value)} />
                </div>
                <div className="insp-field">
                  <label>점검장소</label>
                  <input value={meta.점검장소} onChange={e => updMeta('점검장소', e.target.value)}
                    placeholder="사업장명 입력" />
                </div>
                <div className="insp-field">
                  <label>점검자</label>
                  <input value={meta.점검자} onChange={e => updMeta('점검자', e.target.value)}
                    placeholder="성명" />
                </div>
                <div className="insp-field">
                  <label>점검구분</label>
                  <input value={meta.점검구분} onChange={e => updMeta('점검구분', e.target.value)} />
                </div>
                <div className="insp-field full">
                  <label>점검목적</label>
                  <input value={meta.점검목적} onChange={e => updMeta('점검목적', e.target.value)} />
                </div>
              </div>
            </div>

            {/* 위험도 대시보드 */}
            <div className="insp-section">
              <div className="insp-section-title">위험도 현황</div>
              <div className="insp-dashboard">
                <div className="insp-dash-badge" style={{ background:'var(--bg)', border:'1px solid var(--line)', color:'var(--fg)' }}>
                  📋 총 {cards.length}장 작성 중
                </div>
                {['높음','중간','낮음'].map(r => (
                  <div key={r} className="insp-dash-badge" style={{
                    background:RISK_BG[r], color:RISK_COLORS[r],
                    border:`1.5px solid ${RISK_COLORS[r]}`,
                  }}>
                    {r}&nbsp;<strong>{riskCount[r]}건</strong>
                  </div>
                ))}
                {activeCount > 0 && (
                  <span style={{ fontSize:12, color:'var(--fg-3)', marginLeft:'auto' }}>
                    총괄표 반영: {activeCount}건
                  </span>
                )}
              </div>
            </div>

            {/* 점검 카드 목록 */}
            {cards.map((c, i) => (
              <InspCard key={c.id} card={c} idx={i} total={cards.length}
                isOpen={openId === c.id}
                onToggle={() => setOpenId(openId === c.id ? null : c.id)}
                onUpdate={updateCard}
                onDelete={() => deleteCard(c.id)}
                onMoveUp={() => moveCard(i, -1)}
                onMoveDown={() => moveCard(i, 1)}
              />
            ))}

            {/* 카드 추가 */}
            <button onClick={addCard} style={{
              width:'100%', padding:'13px', marginTop:4,
              border:'2px dashed var(--primary)', borderRadius:'var(--r)',
              background:'rgba(30,95,207,.04)', color:'var(--primary)',
              fontFamily:'inherit', fontSize:14, fontWeight:700, cursor:'pointer',
            }}>
              ＋ 점검 사진 추가
            </button>
          </>
        ) : (
          <InspPreview meta={meta} cards={cards} />
        )}
      </div>
    </div>
  );
}

Object.assign(window, { FieldInspectionView });
