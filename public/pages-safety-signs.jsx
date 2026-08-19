// 출입문 표지 생성 — React 컴포넌트 (iFrame 없이 앱에 직접 통합)
// 이미지 데이터는 safety-signs-data.js (window.SS_DATA) 에서 로드

const SafetySignsView = ({ onNav }) => {
  const { SIGNS = [], IMG = {}, CAT = {}, CATORDER = [], PRESETS = {} } = window.SS_DATA || {};

  const [items, setItems] = React.useState([]);
  const [per, setPer] = React.useState(2);
  const [info, setInfo] = React.useState({ space: "", jName: "", jTel: "", bName: "", bTel: "", show: true });
  const [presetMsg, setPresetMsg] = React.useState("");
  // 로고 모드: 안전표지 대신 회사 로고를 크게 넣는 표지(예: 휴게실)
  const [logoMode, setLogoMode] = React.useState(false);
  // 표지에 쓸 회사 로고 — 설정(door_sign_logo)에 저장된 URL, 없으면 기본 번들 로고
  const DEFAULT_LOGO = "assets/logo-will-vision2.png";
  const [logoUrl, setLogoUrl] = React.useState(DEFAULT_LOGO);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const logoRef = React.useRef(null);

  React.useEffect(() => {
    fetch("/api/settings/door_sign_logo").then(r => r.json())
      .then(d => { if (d && d.value && d.value.url) setLogoUrl(d.value.url); })
      .catch(() => {});
  }, []);

  const uploadLogo = async (file) => {
    if (!file) return;
    if (!/\.(png|jpe?g|webp|svg)$/i.test(file.name)) { setPresetMsg("로고는 이미지 파일만 가능합니다."); return; }
    setLogoUploading(true); setPresetMsg("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error("업로드 실패");
      setLogoUrl(d.url);
      // 다음에도 쓰도록 설정에 저장
      await fetch("/api/settings/door_sign_logo", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: { url: d.url } }),
      });
    } catch (e) { setPresetMsg("로고 업로드 실패. 다시 시도해주세요."); }
    setLogoUploading(false);
  };

  const { NAME2ID, catIdx, sById, signOrder } = React.useMemo(() => {
    const NAME2ID = {}, catIdx = {}, sById = {}, signOrder = {};
    SIGNS.forEach((s, i) => { NAME2ID[s.name] = s.id; sById[s.id] = s; signOrder[s.id] = i; });
    CATORDER.forEach((c, i) => catIdx[c] = i);
    return { NAME2ID, catIdx, sById, signOrder };
  }, [SIGNS, CATORDER]);

  const PAIR_SETS = [["출입금지", "금연"]];

  const pairGroupOf = (id) => {
    for (const grp of PAIR_SETS) {
      const ids = grp.map(n => NAME2ID[n]).filter(Boolean);
      if (ids.includes(id)) return ids;
    }
    return null;
  };

  const sortArr = (arr) => [...arr].sort((a, b) => {
    const d = (catIdx[sById[a]?.cat] ?? 99) - (catIdx[sById[b]?.cat] ?? 99);
    return d !== 0 ? d : (signOrder[a] ?? 0) - (signOrder[b] ?? 0);
  });

  const enforcePairs = (arr) => {
    const result = [...arr];
    PAIR_SETS.forEach(grp => {
      const ids = grp.map(n => NAME2ID[n]).filter(Boolean);
      if (ids.some(id => result.includes(id)))
        ids.forEach(id => { if (!result.includes(id)) result.push(id); });
    });
    return result;
  };

  const addSign = (id) => {
    if (logoMode) setLogoMode(false);   // 표지를 고르면 로고 모드 해제
    const newItems = sortArr(enforcePairs([...items, id]));
    const needed = newItems.length;
    const curCap = (PRESETS[per]?.c ?? 2) * (PRESETS[per]?.r ?? 1);
    if (curCap < needed) {
      setPer([1, 2, 4, 6, 9].find(k => (PRESETS[k]?.c ?? 0) * (PRESETS[k]?.r ?? 0) >= needed) || 9);
    }
    setItems(newItems);
  };

  const removeOne = (id) => {
    const grp = pairGroupOf(id) || [id];
    setItems(prev => {
      const arr = [...prev];
      grp.forEach(gid => { const i = arr.lastIndexOf(gid); if (i >= 0) arr.splice(i, 1); });
      return arr;
    });
  };

  const removeAt = (idx) => {
    setItems(prev => {
      const id = prev[idx];
      const arr = [...prev]; arr.splice(idx, 1);
      const grp = pairGroupOf(id);
      if (grp) grp.forEach(gid => { if (gid !== id) { const gi = arr.lastIndexOf(gid); if (gi >= 0) arr.splice(gi, 1); } });
      return arr;
    });
  };

  const SPACE_PRESETS = [
    { name: "기계실",     signs: ["출입금지","금연","화기금지","안전모 착용","귀마개 착용","안전화 착용"] },
    { name: "전기실",     signs: ["출입금지","금연","고압전기 경고","안전모 착용","안전화 착용","안전장갑 착용"] },
    { name: "발전기실",   signs: ["출입금지","금연","화기금지","인화성물질 경고","고압전기 경고","위험장소 경고","안전모 착용","귀마개 착용","안전화 착용"] },
    { name: "펌프실",     signs: ["출입금지","금연","미끄럼주의","안전모 착용","귀마개 착용","안전화 착용"] },
    { name: "팬룸",       signs: ["출입금지","금연","화기금지","안전모 착용","귀마개 착용","안전화 착용","안전장갑 착용","끼임주의","위험장소 경고"] },
    { name: "지열기계실", signs: ["출입금지","금연","미끄럼주의","안전모 착용","귀마개 착용","안전화 착용"] },
    { name: "실외기실",   signs: ["출입금지","금연","고온 경고","안전모 착용","귀마개 착용","안전화 착용"] },
    { name: "옥상",       signs: ["출입금지","금연","미끄럼주의","떨어짐주의","안전모 착용","안전화 착용"] },
    { name: "정화조",     signs: ["출입금지","금연","급성독성물질 경고","위험장소 경고","방독마스크 착용","안전화 착용"] },
    { name: "집수정",     signs: ["출입금지","금연","미끄럼주의","빠짐주의","안전모 착용","안전화 착용"] },
    { name: "저수조",     signs: ["출입금지","금연","미끄럼주의","빠짐주의","안전모 착용","안전화 착용"] },
    { name: "승강기탑",   signs: ["출입금지","금연","매달린물체 경고","떨어짐주의","안전모 착용","안전화 착용"] },
    { name: "승강기기계실",signs:["출입금지","금연","고압전기 경고","끼임주의","안전모 착용","안전화 착용"] },
    { name: "기계식주차장",signs:["출입금지","금연","끼임주의","떨어짐주의","안전모 착용","안전화 착용"] },
    { name: "집하장",     signs: ["출입금지","미끄럼주의","허리조심","안전모 착용","안전화 착용","안전장갑 착용"] },
    { name: "자재창고",   signs: ["출입금지","화기금지","낙하물 경고","무너짐주의","안전모 착용","안전화 착용"] },
    { name: "남자 휴게실", logo: true, signs: [] },
    { name: "여자 휴게실", logo: true, signs: [] },
  ];

  const applyPreset = (pre) => {
    // 로고 프리셋(휴게실 등): 표지 대신 회사 로고를 크게 표시
    if (pre.logo) {
      setLogoMode(true);
      setInfo(v => ({ ...v, space: pre.name }));
      setItems([]);
      setPresetMsg("");
      return;
    }
    const ids = pre.signs.map(n => NAME2ID[n]).filter(Boolean);
    setLogoMode(false);
    setInfo(v => ({ ...v, space: pre.name }));
    setPer([1, 2, 4, 6, 9].find(k => k >= ids.length) || 9);
    setItems(sortArr(ids));
    setPresetMsg("");
  };

  const handlePrint = () => {
    let el = document.getElementById("ss-page-rule");
    if (!el) { el = document.createElement("style"); el.id = "ss-page-rule"; document.head.appendChild(el); }
    el.textContent = "@media print{ @page{ size: A3 landscape; margin:0 } }";
    window.print();
  };

  const counts = {};
  items.forEach(id => counts[id] = (counts[id] || 0) + 1);
  const preset = PRESETS[per] || { c: 2, r: 1 };
  const cap = preset.c * preset.r;
  const pages = Math.max(1, Math.ceil(items.length / cap));

  const headerEl = (() => {
    if (!info.show || (!info.space && !info.jName && !info.bName)) return null;
    return (
      <div className="phead">
        <div className="pname">
          <span className="nm">{info.space || " "}</span>
        </div>
        <div className="pmgr">
          <div className="mrow"><span className="mtag j">정</span><span className="mname">{info.jName}</span>{info.jTel && <span className="mtel">{info.jTel}</span>}</div>
          <div className="mrow"><span className="mtag b">부</span><span className="mname">{info.bName}</span>{info.bTel && <span className="mtel">{info.bTel}</span>}</div>
        </div>
      </div>
    );
  })();

  const sheetEl = logoMode ? (
    <div key="logo" className="page">
      {headerEl}
      <div className="plogo">
        <img src={logoUrl} alt="회사 로고" />
      </div>
    </div>
  ) : Array.from({ length: pages }, (_, p) => (
    <div key={p} className="page">
      {headerEl}
      <div className="pgrid" style={{ gridTemplateColumns: `repeat(${preset.c}, 1fr)`, gridTemplateRows: `repeat(${preset.r}, 1fr)` }}>
        {Array.from({ length: cap }, (_, slot) => {
          const idx = p * cap + slot;
          return items[idx] ? (
            <div key={slot} className="cell">
              <img src={IMG[items[idx]]} alt="" />
              <button className="rm" onClick={() => removeAt(idx)}>✕</button>
            </div>
          ) : <div key={slot} className="cell empty" />;
        })}
      </div>
    </div>
  ));

  return (
    <div className="ss-tool" style={{ height: "calc(100vh - 52px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        .ss-tool {
          --ss-ink:#1B2430; --ss-ink2:#3A4757; --ss-line:#D7DCE2; --ss-panel:#EEF1F4;
          --ss-card:#FFFFFF; --ss-muted:#6B7682;
          --ss-yellow:#F7C81F; --ss-red:#CE1C1C;
          font-family:"Pretendard Variable",Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
        }
        /* layout */
        .ss-tool .ss-wrap{display:flex;gap:16px;padding:16px;flex:1;overflow:hidden}
        .ss-tool .ss-gallery{flex:0 0 360px;background:var(--ss-card);border:1px solid var(--ss-line);border-radius:14px;padding:14px;overflow-y:auto}
        .ss-tool .ghead{font-size:13px;color:var(--ss-muted);margin:2px 2px 10px}
        .ss-tool .ghead b{color:var(--ss-ink)}
        .ss-tool .catlabel{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800;letter-spacing:.04em;color:var(--ss-ink2);margin:14px 4px 8px}
        .ss-tool .ss-dot{width:9px;height:9px;border-radius:50%;display:inline-block}
        .ss-tool .ss-dot.ban{background:var(--ss-red)}
        .ss-tool .ss-dot.warn{background:var(--ss-yellow);border:1px solid #C9A200}
        .ss-tool .ss-dot.must{background:#005DAA}
        .ss-tool .ss-dot.info{background:#1E8A4C}
        .ss-tool .grid-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .ss-tool .ss-card{position:relative;border:1.5px solid var(--ss-line);border-radius:10px;background:#fff;padding:7px;cursor:pointer;transition:.12s;overflow:hidden}
        .ss-tool .ss-card:hover{border-color:#A9B2BD;transform:translateY(-1px);box-shadow:0 3px 10px rgba(20,30,45,.08)}
        .ss-tool .ss-card.sel{border-color:var(--ss-yellow);box-shadow:0 0 0 2px var(--ss-yellow) inset}
        .ss-tool .ss-card img{width:100%;display:block;border-radius:5px;aspect-ratio:396/440;object-fit:contain;background:#fff}
        .ss-tool .ss-card .cnm{font-size:11.5px;font-weight:700;text-align:center;margin-top:5px;color:var(--ss-ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        /* right side */
        .ss-tool .ss-right{flex:1;min-width:0;overflow-y:auto;display:flex;flex-direction:column}
        .ss-tool .ss-toolbar{background:var(--ss-card);border:1px solid var(--ss-line);border-radius:12px;padding:11px 14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px;flex-shrink:0}
        .ss-tool .ss-tlabel{font-size:12.5px;color:var(--ss-muted);font-weight:700}
        .ss-tool .ss-seg{display:inline-flex;background:var(--ss-panel);border-radius:9px;padding:3px}
        .ss-tool .ss-seg button{background:transparent;color:var(--ss-ink2);border-radius:6px;padding:7px 12px;font-size:13px;border:none;cursor:pointer;font-family:inherit;font-weight:700;transition:.12s}
        .ss-tool .ss-seg button.on{background:#fff;color:var(--ss-ink);box-shadow:0 1px 3px rgba(20,30,45,.12)}
        .ss-tool .ss-count{margin-left:auto;font-size:12.5px;color:var(--ss-muted)}
        .ss-tool .ss-count b{color:var(--ss-ink)}
        .ss-tool .ss-note{font-size:12px;color:var(--ss-muted);margin:0 2px 12px;line-height:1.5;flex-shrink:0}
        .ss-tool .ss-printwarn{font-size:13px;color:#8a5a00;background:#FFF6DA;border:1px solid #F0D27A;border-radius:8px;padding:10px 14px;margin:0 2px 8px;line-height:1.5;font-weight:600;flex-shrink:0}
        /* infocard */
        .ss-tool .infocard{background:var(--ss-card);border:1px solid var(--ss-line);border-radius:12px;padding:13px 14px;margin-bottom:14px;display:flex;flex-direction:column;gap:10px;flex-shrink:0}
        .ss-tool .icrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .ss-tool .ic-space{flex-direction:column;align-items:stretch;gap:5px}
        .ss-tool .icrow label{font-size:12px;color:var(--ss-muted);font-weight:700}
        .ss-tool .infocard input[type=text]{font-family:inherit;font-size:14px;padding:9px 11px;border:1px solid var(--ss-line);border-radius:8px;flex:1;min-width:108px;color:var(--ss-ink);background:#fff}
        .ss-tool .infocard input[type=text]:focus{outline:none;border-color:var(--ss-ink)}
        .ss-tool .ic-space input{font-size:16.5px;font-weight:700}
        .ss-tool .icmgr{display:flex;flex-direction:column;gap:8px}
        .ss-tool .ictag{flex:0 0 auto;width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px}
        .ss-tool .ictag.j{background:var(--ss-ink)}
        .ss-tool .ictag.b{background:#8A929C}
        .ss-tool .ictoggle{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--ss-ink2);font-weight:600;cursor:pointer}
        .ss-tool .ictoggle input{-webkit-appearance:checkbox;-moz-appearance:checkbox;appearance:checkbox;width:16px;height:16px;accent-color:var(--ss-ink);flex-shrink:0}
        .ss-tool .ic-preset{flex-direction:column;align-items:stretch;gap:6px}
        .ss-tool .presets{display:flex;flex-wrap:wrap;gap:6px}
        .ss-tool .presets button{background:var(--ss-panel);border:1px solid var(--ss-line);color:var(--ss-ink);border-radius:8px;padding:7px 13px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer}
        .ss-tool .presets button:hover{border-color:var(--ss-ink);background:#fff}
        .ss-tool .presetmsg{font-size:11.5px;color:var(--ss-red);font-weight:600;line-height:1.4}
        /* sheet */
        .ss-tool #ss-sheet{display:flex;flex-direction:column;align-items:center;gap:18px}
        .ss-tool .page{width:min(100%,1400px);aspect-ratio:420/297;background:#fff;padding:2.69%;box-shadow:0 6px 22px rgba(20,30,45,.16);border-radius:3px;display:flex;flex-direction:column;gap:2.4%;container-type:size}
        .ss-tool .pgrid{flex:1 1 auto;min-height:0;display:grid;gap:1.5%}
        .ss-tool .plogo{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:4%}
        .ss-tool .plogo img{width:100%;height:100%;object-fit:contain;display:block}
        .ss-tool .cell{display:flex;align-items:center;justify-content:center;position:relative;min-width:0;min-height:0;border-radius:3px}
        .ss-tool .cell img{max-width:100%;max-height:100%;object-fit:contain;display:block}
        .ss-tool .cell.empty{border:1.4px dashed #C4CBD3;background:#FAFBFC}
        .ss-tool .cell.empty::after{content:"＋";color:#C4CBD3;font-size:5cqh;font-weight:700}
        .ss-tool .phead{flex:0 0 18%;display:flex;border:0.5cqh solid var(--ss-ink);border-radius:1.4cqh;overflow:hidden}
        .ss-tool .pname{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;padding:0 3.4%;background:var(--ss-ink);color:#fff;gap:0.6cqh}
.ss-tool .pname .nm{font-size:8.4cqh;font-weight:800;line-height:1.02;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ss-tool .pmgr{flex:0 0 47%;display:flex;flex-direction:column;justify-content:center;gap:2.6cqh;padding:0 3.6%}
        .ss-tool .mrow{display:flex;align-items:center;gap:2.6cqh}
        .ss-tool .mtag{flex:0 0 auto;width:6.4cqh;height:6.4cqh;border-radius:1cqh;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:3.6cqh}
        .ss-tool .mtag.j{background:var(--ss-ink)}
        .ss-tool .mtag.b{background:#8A929C}
        .ss-tool .mname{font-size:4.6cqh;font-weight:800;color:var(--ss-ink);white-space:nowrap}
        .ss-tool .mtel{font-size:3.8cqh;color:#4A5563;white-space:nowrap}
        .ss-tool .rm{position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:10px;background:rgba(27,36,48,.82);color:#fff;font-size:13px;border:none;cursor:pointer;display:none;align-items:center;justify-content:center;line-height:1}
        .ss-tool .cell:hover .rm{display:flex}
        .ss-tool .emptyhint{text-align:center;color:var(--ss-muted);padding:60px 20px;font-size:14px}
        /* print */
        @media print{
          html,body{height:297mm;max-height:297mm;overflow:hidden;margin:0;padding:0;background:#fff}
          body *{visibility:hidden}
          #ss-sheet,#ss-sheet *{visibility:visible}
          #ss-sheet{position:fixed;top:0;left:0;right:0;display:block!important}
          .page{width:420mm!important;height:297mm!important;min-height:297mm!important;max-width:none!important;aspect-ratio:auto!important;padding:11mm!important;gap:8mm!important;box-shadow:none!important;border-radius:0!important;margin:0!important;page-break-after:always;break-after:page}
          .page:last-child{page-break-after:auto}
          .pgrid{gap:8mm!important}
          .cell.empty{border:none!important;background:#fff!important}
          .cell.empty::after{content:""}
          .rm{display:none!important}
        }
      `}</style>

      {/* ── 헤더 ── */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, background: "var(--bg-elev)" }}>
        <button className="btn btn-secondary btn-sm" onClick={() => onNav({ name: "dashboard" })}>
          <Icon name="arrow-left" size={14} /> 대시보드
        </button>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>출입문 표지 생성</h1>
        <span style={{ fontSize: 12, color: "var(--fg-3)" }}>표지를 누르면 A3 시트에 채워집니다 · 100%로 출력</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setItems([])}>전체 비우기</button>
          <PrintButton onClick={handlePrint} />
        </div>
      </div>

      {/* ── 본문 ── */}
      <div className="ss-wrap">
        {/* 갤러리 */}
        <aside className="ss-gallery">
          <div className="ghead">붙일 표지를 누르세요. 누를 때마다 <b>한 칸씩</b> 추가됩니다.</div>
          {CATORDER.map(cat => {
            const list = SIGNS.filter(s => s.cat === cat);
            if (!list.length) return null;
            return (
              <React.Fragment key={cat}>
                <div className="catlabel">
                  <span className={`ss-dot ${cat}`} />
                  {CAT[cat]}
                </div>
                <div className="grid-cards">
                  {list.map(s => (
                    <div key={s.id} className={`ss-card${counts[s.id] ? " sel" : ""}`}
                      onClick={() => addSign(s.id)}>
                      <img src={IMG[s.id]} alt={s.name} />
                      <div className="cnm">{s.name}</div>
                    </div>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </aside>

        {/* 우측 */}
        <div className="ss-right">
          {/* 정보 카드 */}
          <div className="infocard">
            <div className="icrow ic-preset">
              <label>공간 프리셋 — 누르면 표지가 한 번에 들어갑니다</label>
              <div className="presets">
                {SPACE_PRESETS.map(pre => (
                  <button key={pre.name} onClick={() => applyPreset(pre)}>{pre.name}</button>
                ))}
              </div>
            </div>
            {logoMode && (
              <div className="icrow" style={{ gap: 10, alignItems: "center", background: "var(--ss-panel)", borderRadius: 8, padding: "8px 10px" }}>
                <img src={logoUrl} alt="로고" style={{ height: 34, maxWidth: 150, objectFit: "contain", background: "#fff", borderRadius: 4, padding: 2 }} />
                <div style={{ fontSize: 12, color: "var(--ss-muted)", fontWeight: 700 }}>표지에 들어갈 회사 로고</div>
                <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}
                  onClick={() => logoRef.current?.click()} disabled={logoUploading}>
                  {logoUploading ? "업로드 중…" : "로고 변경"}
                </button>
                <input ref={logoRef} type="file" accept="image/*" hidden onChange={e => uploadLogo(e.target.files?.[0])} />
              </div>
            )}
            {presetMsg && <div className="presetmsg">{presetMsg}</div>}
            <div className="icrow ic-space">
              <label>부착 공간 명칭</label>
              <input type="text" placeholder="예: 기계실, 휀룸, 전기실"
                value={info.space} onChange={e => setInfo(v => ({ ...v, space: e.target.value }))} />
            </div>
            <div className="icmgr">
              <div className="icrow">
                <span className="ictag j">정</span>
                <input type="text" placeholder="정 관리책임자 이름" value={info.jName} onChange={e => setInfo(v => ({ ...v, jName: e.target.value }))} />
                <input type="text" placeholder="연락처" value={info.jTel} onChange={e => setInfo(v => ({ ...v, jTel: e.target.value }))} />
              </div>
              <div className="icrow">
                <span className="ictag b">부</span>
                <input type="text" placeholder="부 관리책임자 이름" value={info.bName} onChange={e => setInfo(v => ({ ...v, bName: e.target.value }))} />
                <input type="text" placeholder="연락처" value={info.bTel} onChange={e => setInfo(v => ({ ...v, bTel: e.target.value }))} />
              </div>
            </div>
            <label className="ictoggle">
              <input type="checkbox" checked={info.show} onChange={e => setInfo(v => ({ ...v, show: e.target.checked }))} />
              인쇄 시 상단에 명칭·관리책임자 표시
            </label>
          </div>

          {/* 툴바 */}
          <div className="ss-toolbar">
            <span className="ss-tlabel">한 장당 칸 수</span>
            <div className="ss-seg">
              {[1, 2, 4, 6, 9].map(k => (
                <button key={k} className={per === k ? "on" : ""} onClick={() => setPer(k)}>{k}개</button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setItems([])}>전체 비우기</button>
            <span className="ss-count">표지 <b>{items.length}</b>개 · <b>{pages}</b>장</span>
          </div>

          <div className="ss-printwarn">⚠ 인쇄 시 주의사항 — <b>옵션 → 배경 그래픽 체크 필수</b> (체크 안 하면 색상·테두리가 안 나옵니다)</div>
          <p className="ss-note">인쇄 대화상자에서 <b style={{ color: "var(--ss-red)" }}>실제 크기(100%)</b>로 설정하세요. "페이지에 맞춤"을 쓰면 크기가 줄어듭니다.</p>

          {/* 시트 */}
          <div id="ss-sheet">
            {items.length === 0 && !logoMode && <div className="emptyhint">왼쪽에서 표지를 눌러 추가하세요.</div>}
            {sheetEl}
          </div>
        </div>
      </div>
    </div>
  );
};

window.SafetySignsView = SafetySignsView;
