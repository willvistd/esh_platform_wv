// 안전보건 조직도 — 폼 입력으로 자동 생성 + 드래그로 직접 조정 가능.
// 표준 배치: 중앙=대표→책임자→관리감독자→근로자, 왼쪽 가지=산업안전보건위원회, 오른쪽 가지=관리자 조직(전담팀·안전/보건관리자·산업보건의).

const OC_W = 156, OC_H = 58, OC_CW = 1000, OC_CH = 520, OC_SNAP = 9;
function ocEsc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function ocFormHQ() {
  return { orgName: "", hasChong: false, hasWiwon: true, hasJeondam: false, hasSafety: true, hasHealth: true, hasDoctor: false, hasWorkers: true,
    names: { ceo: "", chong: "", chaegim: "", safety: "", health: "", doctor: "", jeondam: ["", ""] }, managers: [{ dept: "", name: "" }], _pos: {} };
}
function ocFormSite() {
  return { orgName: "", hasWiwon: true, hasJeondam: false, hasWorkers: true,
    names: { chaegim: "", sojang: "", jeondam: ["", ""] }, managers: [{ dept: "", name: "" }], _pos: {} };
}

// 중앙(수직) 연결: 부모 아래 → 자식 위
function ocElbow(p, c) {
  const pcx = p.x + OC_W / 2, pby = p.y + OC_H, ccx = c.x + OC_W / 2, cty = c.y, midY = (pby + cty) / 2;
  return `M ${pcx} ${pby} L ${pcx} ${midY} L ${ccx} ${midY} L ${ccx} ${cty}`;
}
// 옆가지 연결: 부모 옆면 → 자식 옆면 (좌/우)
function ocSideElbow(p, c, dir) {
  const py = p.y + OC_H / 2, cy = c.y + OC_H / 2;
  if (dir === "left") { const px = p.x, cxr = c.x + OC_W, mx = (px + cxr) / 2; return `M ${px} ${py} L ${mx} ${py} L ${mx} ${cy} L ${cxr} ${cy}`; }
  const px = p.x + OC_W, cxl = c.x, mx = (px + cxl) / 2; return `M ${px} ${py} L ${mx} ${py} L ${mx} ${cy} L ${cxl} ${cy}`;
}
function ocConn(p, c) { return c.side ? ocSideElbow(p, c, c.side) : ocElbow(p, c); }
function ocBounds(chart) {
  let w = OC_CW, h = OC_CH;
  (chart.boxes || []).forEach(b => { w = Math.max(w, b.x + OC_W + 40); h = Math.max(h, b.y + OC_H + 30); });
  return { w, h };
}

// 폼 → 조직도 자동 생성 (표준 배치)
function ocGenerate(form, mode) {
  const rowH = OC_H + 54, colStep = OC_W + 30, stackGap = OC_H + 22;
  const managers = form.managers || [];
  const Nmgr = Math.max(managers.length, 1);
  // 옆가지(위원회/관리자조직)가 관리감독자 행과 절대 안 겹치도록 간격을 동적으로
  const sideGap = Math.max(232, (Nmgr - 1) * colStep / 2 + OC_W + 50);
  const cw = Math.max(OC_CW, 2 * sideGap + 3 * OC_W);
  const cx = cw / 2, lx = cx - OC_W / 2, leftX = lx - sideGap, rightX = lx + sideGap;
  const boxes = [];
  const add = (id, role, name, x, y, color, parent, side) => boxes.push({ id, role, name: name || "", x: Math.round(x), y: Math.round(y), color, parent: parent || null, side: side || undefined });

  let y = 24, topId, chaegimId = "chaegim";
  if (mode === "hq") {
    add("ceo", "대표이사 (사업주)", form.names.ceo, lx, y, "accent", null); topId = "ceo"; y += rowH;
    if (form.hasChong) { add("chong", "안전보건총괄책임자", form.names.chong, lx, y, "primary", "ceo"); topId = "chong"; y += rowH; }
    add(chaegimId, "안전보건관리책임자", form.names.chaegim, lx, y, "chaegim", topId);
  } else {
    add(chaegimId, "안전보건관리책임자", form.names.chaegim, lx, y, "chaegim", null);
  }
  const chaegimY = y;

  // 왼쪽 가지: 산업안전보건위원회
  if (form.hasWiwon) add("wiwon", "산업안전보건위원회", "", leftX, chaegimY, "primary", chaegimId, "left");

  // 오른쪽 가지: 관리자 조직 (전담팀 → 안전/보건관리자 → 산업보건의 세로)
  let ry = chaegimY, rParent = chaegimId, firstRight = true;
  const placeRight = (id, role, name) => {
    add(id, role, name, rightX, ry, "primary", rParent, firstRight ? "right" : undefined);
    rParent = id; ry += stackGap; firstRight = false;
  };
  const jeondamLabel = Array.isArray(form.names.jeondam)
    ? form.names.jeondam.filter(n => n).join(" · ")
    : (form.names.jeondam || "");
  if (mode === "hq") {
    if (form.hasJeondam) placeRight("jeondam", "안전보건전담팀", jeondamLabel);
    if (form.hasSafety) placeRight("safety", "안전관리자", form.names.safety);
    if (form.hasHealth) placeRight("health", "보건관리자", form.names.health);
    if (form.hasDoctor) placeRight("doctor", "산업보건의", form.names.doctor);
  } else {
    if (form.hasJeondam) placeRight("jeondam", "안전보건전담팀", jeondamLabel);
  }

  // 중앙 라인 계속: (사업장: 소장) → 관리감독자 → 근로자
  y = chaegimY + rowH;
  let mgrParent = chaegimId;
  if (mode === "site") { add("sojang", "관리감독자", form.names.sojang, lx, y, "primary", chaegimId); mgrParent = "sojang"; y += rowH; }

  const mCx = cx - (Nmgr - 1) * colStep / 2, mgrIds = [];
  for (let i = 0; i < Nmgr; i++) {
    const m = managers[i] || {}, id = "mgr" + i; mgrIds.push(id);
    add(id, "관리감독자" + (m.dept ? " (" + m.dept + ")" : ""), m.name, mCx + i * colStep - OC_W / 2, y, "unit", mgrParent);
  }
  y += rowH;
  if (form.hasWorkers) {
    // 관리감독자(부서)마다 그 아래에 근로자 박스 하나씩 (직선 연결)
    for (let i = 0; i < Nmgr; i++) add("workers" + i, "근로자", "", mCx + i * colStep - OC_W / 2, y, "plain", mgrIds[i]);
  }
  const title = (mode === "hq" && form.orgName) ? (form.orgName + " 안전보건조직도") : "안전보건조직도";
  const sub = (mode === "site" && form.orgName) ? ("사업장명: " + form.orgName) : "";
  return { title, sub, boxes };
}

function ocApplyPos(chart, pos) {
  if (!pos) return chart;
  return { ...chart, boxes: chart.boxes.map(b => pos[b.id] ? { ...b, x: pos[b.id].x, y: pos[b.id].y } : b) };
}
// 겹침 해소 — 방금 옮긴 박스(fixedId)는 고정, 겹치는 나머지를 밀어내 간격 확보
function ocSeparate(boxes, fixedId, gap) {
  gap = gap || 20;
  const arr = boxes.map(b => ({ ...b }));
  const needX = OC_W + gap, needY = OC_H + gap;
  for (let it = 0; it < 80; it++) {
    let any = false;
    for (let i = 0; i < arr.length; i++) for (let k = i + 1; k < arr.length; k++) {
      const a = arr[i], b = arr[k];
      const dx = (b.x + OC_W / 2) - (a.x + OC_W / 2), dy = (b.y + OC_H / 2) - (a.y + OC_H / 2);
      const px = needX - Math.abs(dx), py = needY - Math.abs(dy);
      if (px > 0 && py > 0) {
        any = true;
        if (px <= py) {
          const dir = dx === 0 ? 1 : (dx > 0 ? 1 : -1);
          if (a.id === fixedId) b.x += dir * px; else if (b.id === fixedId) a.x -= dir * px; else { a.x -= dir * px / 2; b.x += dir * px / 2; }
        } else {
          const dir = dy === 0 ? 1 : (dy > 0 ? 1 : -1);
          if (a.id === fixedId) b.y += dir * py; else if (b.id === fixedId) a.y -= dir * py; else { a.y -= dir * py / 2; b.y += dir * py / 2; }
        }
      }
    }
    if (!any) break;
  }
  arr.forEach(b => { b.x = Math.max(0, Math.round(b.x)); b.y = Math.max(0, Math.round(b.y)); });
  return arr;
}

function ocPrint(chart) {
  const w = window.open("", "_blank");
  if (!w) { alert("팝업이 차단되어 PDF 창을 못 열었어요. 팝업 허용 후 다시 시도해주세요."); return; }
  const bd = ocBounds(chart);
  const boxes = chart.boxes.map(b => `<div class="oc-box ${b.color}" style="left:${b.x}px;top:${b.y}px;"><div class="role">${ocEsc(b.role || "")}</div>${b.name ? `<div class="nm">${ocEsc(b.name)}</div>` : ""}</div>`).join("");
  const lines = chart.boxes.filter(b => b.parent).map(b => { const p = chart.boxes.find(z => z.id === b.parent); return p ? `<path d="${ocConn(p, b)}"/>` : ""; }).join("");
  const doc =
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>안전보건 조직도</title><style>' +
    'body{margin:0;background:#fff;font-family:"Pretendard Variable",Pretendard,-apple-system,"Malgun Gothic",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
    '.oc-sheet{width:' + bd.w + 'px;margin:0 auto;}.oc-title{text-align:center;font-size:23px;font-weight:800;color:#1d1d1f;padding:18px 12px 2px;}' +
    '.oc-sub{text-align:center;font-size:14px;color:#424248;padding-bottom:6px;}.oc-canvas{position:relative;width:' + bd.w + 'px;height:' + bd.h + 'px;}' +
    '.oc-svg{position:absolute;inset:0;width:' + bd.w + 'px;height:' + bd.h + 'px;overflow:visible;}.oc-svg path{stroke:#9aa3ad;stroke-width:1.5;fill:none;}' +
    '.oc-box{position:absolute;width:' + OC_W + 'px;min-height:' + OC_H + 'px;border-radius:12px;padding:8px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border:1px solid transparent;}' +
    '.oc-box .role{font-size:13px;font-weight:700;line-height:1.25;}.oc-box .nm{font-size:12px;margin-top:1px;}' +
    '.oc-box.accent{background:#e8307a;color:#fff;}.oc-box.chaegim{background:#1e5fcf;color:#fff;}.oc-box.primary{background:#1e5fcf;color:#fff;}.oc-box.unit{background:#e9effb;color:#1e5fcf;border-color:#c5d6f3;}.oc-box.plain{background:#fff;color:#1d1d1f;border-color:#d6d6da;}' +
    '@page{size:A4 landscape;margin:8mm;}</style></head><body><div class="oc-sheet">' +
    '<div class="oc-title">' + ocEsc(chart.title || "") + '</div>' + (chart.sub ? '<div class="oc-sub">' + ocEsc(chart.sub) + '</div>' : '') +
    '<div class="oc-canvas"><svg class="oc-svg">' + lines + '</svg>' + boxes + '</div></div>' +
    '<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print();},250);};</scr' + 'ipt></body></html>';
  w.document.open(); w.document.write(doc); w.document.close();
}

const OrgChartView = ({ onNav, currentUser }) => {
  const [mode, setMode] = React.useState("hq");
  const [forms, setForms] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const formsRef = React.useRef(null);
  const saveTimer = React.useRef(null);

  React.useEffect(() => {
    let alive = true;
    const normJeondam = (f) => {
      if (!f || !f.names) return f;
      if (!Array.isArray(f.names.jeondam)) {
        const v = f.names.jeondam || "";
        return { ...f, names: { ...f.names, jeondam: v ? [v, ""] : ["", ""] } };
      }
      if (f.names.jeondam.length < 2) return { ...f, names: { ...f.names, jeondam: [...f.names.jeondam, ""] } };
      return f;
    };
    window.WV_API.getOrgCharts().then(data => {
      if (!alive) return;
      const hq = normJeondam((data && data.hq && Array.isArray(data.hq.managers)) ? data.hq : ocFormHQ());
      const site = normJeondam((data && data.site && Array.isArray(data.site.managers)) ? data.site : ocFormSite());
      setForms({ hq, site });
    }).catch(() => { if (alive) setForms({ hq: ocFormHQ(), site: ocFormSite() }); });
    return () => { alive = false; clearTimeout(saveTimer.current); };
  }, []);
  React.useEffect(() => { formsRef.current = forms; }, [forms]);

  const scheduleSave = (scope, form) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { setSaving(true); window.WV_API.saveOrgChart(scope, form).catch(() => {}).finally(() => setSaving(false)); }, 700);
  };

  if (!forms) return <div className="meta" style={{ padding: 40 }}>불러오는 중…</div>;

  const form = forms[mode];
  const chart = ocGenerate(form, mode); // 항상 자동 정렬 — 일직선·겹침없음 보장
  const bounds = ocBounds(chart);

  const update = (patch) => { const next = { ...form, ...patch }; setForms(prev => ({ ...prev, [mode]: next })); scheduleSave(mode, next); };
  const setName = (k, v) => update({ names: { ...form.names, [k]: v } });
  const setMgr = (i, k, v) => update({ managers: form.managers.map((m, j) => j === i ? { ...m, [k]: v } : m) });
  const addMgr = () => { if (form.managers.length < 12) update({ managers: [...form.managers, { dept: "", name: "" }] }); };
  const delMgr = (i) => update({ managers: form.managers.filter((_, j) => j !== i) });
  const resetPos = () => update({ _pos: {} });

  const onBoxDown = (e, b) => {
    if (e.button !== 0) return;
    const sx0 = e.clientX, sy0 = e.clientY, ox = b.x, oy = b.y;
    const others = chart.boxes.filter(z => z.id !== b.id);
    let moved = false;
    const mm = (ev) => {
      moved = true;
      let nx = ox + ev.clientX - sx0, ny = oy + ev.clientY - sy0; const myc = nx + OC_W / 2;
      for (const o of others) { const oc = o.x + OC_W / 2; if (Math.abs(myc - oc) <= OC_SNAP) { nx = oc - OC_W / 2; break; } }
      for (const o of others) { if (Math.abs(ny - o.y) <= OC_SNAP) { ny = o.y; break; } }
      nx = Math.max(0, Math.round(nx)); ny = Math.max(0, Math.round(ny));
      setForms(prev => { const f = prev[mode]; return { ...prev, [mode]: { ...f, _pos: { ...(f._pos || {}), [b.id]: { x: nx, y: ny } } } }; });
    };
    const mu = () => {
      document.removeEventListener("mousemove", mm); document.removeEventListener("mouseup", mu);
      if (!moved || !formsRef.current) return;
      const latest = formsRef.current[mode];
      const cur = ocApplyPos(ocGenerate(latest, mode), latest._pos);
      const sep = ocSeparate(cur.boxes, b.id);           // 옮긴 박스 고정, 나머지 밀어내 겹침 해소
      const pos = {}; sep.forEach(z => pos[z.id] = { x: z.x, y: z.y });
      const next = { ...latest, _pos: pos };
      setForms(prev => ({ ...prev, [mode]: next }));
      scheduleSave(mode, next);
    };
    document.addEventListener("mousemove", mm); document.addEventListener("mouseup", mu);
    e.preventDefault();
  };

  // 주의: 아래는 컴포넌트(<X/>)가 아니라 인라인 함수다. 컴포넌트로 만들면 매 렌더마다 재생성돼서 입력 포커스가 빠진다.
  const toggle = (k, label) => (
    <label key={"t" + k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "5px 0", cursor: "pointer" }}>
      <input type="checkbox" checked={!!form[k]} onChange={e => update({ [k]: e.target.checked })}
        style={{ width: 16, height: 16, flexShrink: 0, margin: 0, accentColor: "var(--primary)", appearance: "auto", WebkitAppearance: "checkbox", MozAppearance: "checkbox" }} />{label}
    </label>
  );
  const nameRow = (k, label) => (
    <div key={"n" + k} style={{ display: "grid", gridTemplateColumns: "94px 1fr", alignItems: "center", gap: 8, margin: "6px 0" }}>
      <span style={{ fontSize: 12.5, color: "var(--fg-2)" }}>{label}</span>
      <input className="field-input" value={form.names[k] || ""} onChange={e => setName(k, e.target.value)} placeholder="이름 (선택)" style={{ padding: "7px 10px" }} />
    </div>
  );
  const secLabel = (t) => (<div key={"s" + t} style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg-3)", margin: "16px 0 6px", paddingBottom: 4, borderBottom: "1px solid var(--line-2)" }}>{t}</div>);
  // 토글 아래 이름칸 — 라벨 없이 입력칸만 (살짝 들여쓰기)
  const subName = (k) => (
    <input key={"sn" + k} className="field-input" value={form.names[k] || ""} onChange={e => setName(k, e.target.value)} placeholder="이름 (선택)"
      style={{ padding: "7px 10px", width: "calc(100% - 26px)", margin: "0 0 6px 26px" }} />
  );
  const modeBtn = (m, label) => (
    <button key={m} onClick={() => setMode(m)} style={{ padding: "0 14px", height: 30, fontSize: 12.5, border: "1px solid var(--line)",
      background: mode === m ? "var(--primary)" : "var(--bg-elev)", color: mode === m ? "var(--primary-fg)" : "var(--fg-2)",
      borderRadius: m === "hq" ? "var(--r-md) 0 0 var(--r-md)" : "0 var(--r-md) var(--r-md) 0", borderLeft: m === "site" ? "none" : "1px solid var(--line)" }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)" }}>
      <style>{`
        .oc-box{position:absolute;width:${OC_W}px;min-height:${OC_H}px;border-radius:var(--r-md);padding:8px;box-sizing:border-box;
                display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;box-shadow:var(--shadow);border:1px solid transparent;}
        .oc-box .role{font-size:13px;font-weight:700;line-height:1.25;}
        .oc-box .nm{font-size:12px;font-weight:500;line-height:1.25;margin-top:1px;opacity:.92;}
        .oc-box.accent{background:var(--urgent);color:#fff;}
        .oc-box.chaegim{background:var(--primary);color:var(--primary-fg);}
        .oc-box.primary{background:var(--primary);color:var(--primary-fg);}
        .oc-box.unit{background:var(--primary-soft);color:var(--primary);border-color:var(--primary-soft-2);}
        .oc-box.plain{background:var(--bg-elev);color:var(--fg);border-color:var(--line);}
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderBottom: "1px solid var(--line)", background: "var(--bg-elev)", flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onNav({ name: "dashboard" })}><Icon name="arrow-left" size={14} /> 대시보드</button>
        <h1 style={{ margin: "0 6px 0 0", fontSize: 16, fontWeight: 700 }}>안전보건 조직도</h1>
        <span style={{ display: "inline-flex" }}>{modeBtn("hq", "본사용")}{modeBtn("site", "사업장용")}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="meta" style={{ fontSize: 11.5 }}>{saving ? "저장 중…" : "자동 저장됨"}</span>
          <PrintButton onClick={() => ocPrint(chart)} />
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ width: 340, flexShrink: 0, background: "var(--bg-sunk)", borderRight: "1px solid var(--line)", padding: "14px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* ① 기본 정보 */}
          <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ background: "var(--primary)", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>1</span>
              기본 정보
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="field-label">{mode === "hq" ? "회사명" : "사업장명"}</label>
              <input className="field-input" value={form.orgName} onChange={e => update({ orgName: e.target.value })} placeholder={mode === "hq" ? "예: (주)○○" : "예: SK-C타워"} />
            </div>
          </div>

          {/* ② 직책별 이름 */}
          <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ background: "var(--primary)", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>2</span>
              직책별 이름 <span style={{ fontWeight: 400, color: "var(--fg-3)", fontSize: 11 }}>(선택)</span>
            </div>
            {mode === "hq" && nameRow("ceo", "대표이사")}
            {nameRow("chaegim", "안전보건관리책임자")}
            {mode === "site" && nameRow("sojang", "사업장 소장")}
          </div>

          {/* ③ 포함 직책 */}
          <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ background: "var(--primary)", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>3</span>
              포함할 직책 선택
            </div>
            {mode === "hq" && toggle("hasChong", "안전보건총괄책임자 (도급)")}
            {mode === "hq" && form.hasChong && subName("chong")}
            {toggle("hasWiwon", "산업안전보건위원회")}
            <div style={{ height: 6 }} />
            {toggle("hasJeondam", "안전보건전담팀")}
            {form.hasJeondam && (form.names.jeondam || ["", ""]).map((n, i) => (
              <div key={"jd" + i} style={{ display: "flex", gap: 6, alignItems: "center", margin: "4px 0 0 26px" }}>
                <input className="field-input" value={n} onChange={e => { const arr = [...form.names.jeondam]; arr[i] = e.target.value; setName("jeondam", arr); }}
                  placeholder={"담당자 " + (i + 1) + " 이름"} style={{ padding: "7px 10px", flex: 1 }} />
                {form.names.jeondam.length > 2 && <button className="btn btn-ghost btn-sm" onClick={() => setName("jeondam", form.names.jeondam.filter((_, j) => j !== i))}
                  style={{ color: "var(--danger)", flexShrink: 0, padding: "0 8px" }}><Icon name="x" size={13} /></button>}
              </div>
            ))}
            {form.hasJeondam && <button className="btn btn-ghost btn-sm" onClick={() => setName("jeondam", [...form.names.jeondam, ""])}
              style={{ margin: "6px 0 2px 26px", fontSize: 12 }}><Icon name="plus" size={12} /> 이름 추가</button>}
            {mode === "hq" && <React.Fragment>
              <div style={{ height: 6 }} />
              {toggle("hasSafety", "안전관리자")}
              {form.hasSafety && subName("safety")}
              {toggle("hasHealth", "보건관리자")}
              {form.hasHealth && subName("health")}
              {toggle("hasDoctor", "산업보건의")}
              {form.hasDoctor && subName("doctor")}
            </React.Fragment>}
            <div style={{ height: 6 }} />
            {toggle("hasWorkers", "근로자")}
          </div>

          {/* ④ 관리감독자 */}
          <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ background: "var(--primary)", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>4</span>
              관리감독자 (부서별) <span style={{ fontWeight: 400, color: "var(--fg-3)", fontSize: 11 }}>최대 12</span>
            </div>
            {form.managers.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <input className="field-input" value={m.dept} onChange={e => setMgr(i, "dept", e.target.value)} placeholder="부서명" style={{ padding: "7px 9px" }} />
                <input className="field-input" value={m.name} onChange={e => setMgr(i, "name", e.target.value)} placeholder="이름" style={{ padding: "7px 9px", width: 70 }} />
                <button className="btn btn-ghost btn-sm" onClick={() => delMgr(i)} title="삭제" style={{ flexShrink: 0, color: "var(--danger)", padding: "0 8px" }}><Icon name="x" size={14} /></button>
              </div>
            ))}
            {form.managers.length < 12 && <button className="btn btn-secondary btn-sm" onClick={addMgr} style={{ marginTop: 2 }}><Icon name="plus" size={13} /> 부서 추가</button>}
          </div>

          <div className="meta" style={{ fontSize: 11, textAlign: "center", lineHeight: 1.6, paddingBottom: 4 }}>변경하면 <b>자동 저장</b>돼요. 본사용·사업장용은 각각 따로 저장됩니다.</div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 26, display: "flex", justifyContent: "center", alignItems: "flex-start", background: "var(--bg-sunk)" }}>
          <div className="card" style={{ width: bounds.w, flexShrink: 0, padding: "0 0 10px" }}>
            <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: "var(--fg)", padding: "16px 12px 2px" }}>{chart.title}</div>
            {chart.sub ? <div style={{ textAlign: "center", fontSize: 14, color: "var(--fg-2)", paddingBottom: 4 }}>{chart.sub}</div> : null}
            <div style={{ position: "relative", width: bounds.w, height: bounds.h }}>
              <svg style={{ position: "absolute", inset: 0, width: bounds.w, height: bounds.h, overflow: "visible", pointerEvents: "none" }}>
                {chart.boxes.filter(b => b.parent).map(b => { const p = chart.boxes.find(z => z.id === b.parent); return p ? <path key={b.id} d={ocConn(p, b)} stroke="var(--fg-4)" strokeWidth="1.5" fill="none" /> : null; })}
              </svg>
              {chart.boxes.map(b => (
                <div key={b.id} className={"oc-box " + b.color} style={{ left: b.x, top: b.y }}>
                  <div className="role">{b.role}</div>{b.name ? <div className="nm">{b.name}</div> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.OrgChartView = OrgChartView;
