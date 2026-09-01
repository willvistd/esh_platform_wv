// ────────────────────────────────────────────────────────────────
//  작업환경측정 · 특수건강진단 대상물질 판정/관리 페이지
//  MSDS 성분을 법정 유해인자 목록과 대조해 규제 대상 여부를 판정.
// ────────────────────────────────────────────────────────────────
const SJ_RESULT_STYLE = {
  TARGET:          { label: "측정 대상",      bg: "#fdeeee", fg: "#b42318", bd: "#f3c0bd" },
  BELOW_THRESHOLD: { label: "기준 미달",      bg: "#fff7e6", fg: "#b25e09", bd: "#f5d199" },
  NOT_LISTED:      { label: "대상 아님",      bg: "#eef2f7", fg: "#475467", bd: "#d5dce6" },
  UNDETERMINED:    { label: "판정 불가",      bg: "#f2eefe", fg: "#6941c6", bd: "#d9ccf7" },
};
const SheBadge = ({ r }) => {
  const on = r === "TARGET";
  return <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
    background: on ? "#eafaf0" : "#eef2f7", color: on ? "#087443" : "#98a2b3",
    border: `1px solid ${on ? "#bce8cf" : "#e0e5ec"}` }}>{on ? "대상" : "—"}</span>;
};
const ResultBadge = ({ r }) => {
  const s = SJ_RESULT_STYLE[r] || SJ_RESULT_STYLE.NOT_LISTED;
  return <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
    background: s.bg, color: s.fg, border: `1px solid ${s.bd}`, whiteSpace: "nowrap" }}>{s.label}</span>;
};

const SubstanceJudgeView = ({ onNav, currentUser }) => {
  const [meta, setMeta] = React.useState(null);
  const [product, setProduct] = React.useState({ name: "", manufacturer: "", revisionDate: "" });
  const [rows, setRows] = React.useState([{ name: "", cas: "", content: "" }]);
  const [bulk, setBulk] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    fetch("/api/substances/meta").then(r => r.json()).then(setMeta).catch(() => {});
  }, []);

  const setRow = (i, k, v) => setRows(rs => rs.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const addRow = () => setRows(rs => [...rs, { name: "", cas: "", content: "" }]);
  const delRow = (i) => setRows(rs => rs.length > 1 ? rs.filter((_, j) => j !== i) : rs);

  // "톨루엔, 108-88-3, 30~40%" 형태 여러 줄 파싱
  const applyBulk = () => {
    const parsed = bulk.split(/\n/).map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split(/[\t,;|]/).map(s => s.trim());
      // CAS 패턴이 있는 칸을 찾아 배치
      const casIdx = parts.findIndex(p => /^\d{2,7}-\d{2}-\d$/.test(p.replace(/\s/g, "")));
      const pctIdx = parts.findIndex((p, k) => k !== casIdx && /[\d.]+\s*%|[~\-<>≤≥]|이상|이하|미만/.test(p));
      return {
        name: parts[0] || "",
        cas: casIdx >= 0 ? parts[casIdx] : "",
        content: pctIdx >= 0 ? parts[pctIdx] : (parts[2] || ""),
      };
    });
    if (parsed.length) { setRows(parsed); setBulk(""); }
  };

  const judge = async () => {
    setBusy(true); setErr(""); setResult(null);
    const components = rows.filter(r => (r.name || r.cas).trim());
    if (!components.length) { setErr("성분을 1개 이상 입력하세요."); setBusy(false); return; }
    try {
      const res = await fetch("/api/substances/judge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ components, product }),
      });
      const d = await res.json();
      if (!res.ok || d.error) { setErr(d.error || "판정 실패"); }
      else setResult(d);
    } catch (e) { setErr("서버 연결 오류"); }
    setBusy(false);
  };

  // ── 화학물질 판정 대장 CSV (성분 단위, 명세 8①) ──
  const exportCsv = () => {
    if (!result) return;
    const H = ["연번","제품명","성분명","CAS No.","함유량","취급부서","취급장소","월 취급량",
      "작업환경측정 대상","특수건강진단 대상","특별관리물질","허가대상","노출기준","판정근거","판정일","데이터 기준일"];
    const q = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const lines = [H.map(q).join(",")];
    result.components.forEach((c, i) => {
      lines.push([
        i + 1, result.product_name || product.name, c.name, c.cas || c.cas_raw || "", c.content_raw,
        "", "", "",  // 사용자 입력 컬럼(취급부서/장소/월취급량)
        (SJ_RESULT_STYLE[c.wem.result] || {}).label || c.wem.result,
        c.she.result === "TARGET" ? "대상" : "—",
        c.flags.includes("특별관리물질") ? "○" : "",
        c.flags.includes("허가대상물질") ? "○" : "",
        c.exposure_limit && c.exposure_limit.twa ? c.exposure_limit.twa : "",
        c.wem.reason, result.judged_at, result.data_baseline,
      ].map(q).join(","));
    });
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `화학물질판정대장_${(product.name || "MSDS").replace(/[^\w가-힣]+/g, "")}_${result.judged_at}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  const inputStyle = { padding: "7px 9px", border: "1px solid #d5dce6", borderRadius: 7, fontSize: 14, width: "100%", boxSizing: "border-box" };
  const th = { textAlign: "left", fontSize: 12, color: "#667085", fontWeight: 700, padding: "8px 10px", borderBottom: "2px solid #e5e9ef", whiteSpace: "nowrap" };
  const td = { padding: "8px 10px", borderBottom: "1px solid #eef1f5", fontSize: 13, verticalAlign: "top" };

  return (
    <div className="content" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: "0 0 4px" }}>작업환경측정 · 특수건강진단 대상물질 판정</h1>
        {meta && <span style={{ fontSize: 12, color: "#98a2b3" }}>법령 데이터 기준일: {meta.기준일} · 등재물질 {meta.건수?.총_CAS물질}종</span>}
      </div>
      <p style={{ color: "#667085", fontSize: 13, marginTop: 0 }}>
        MSDS 성분(성분명·CAS·함유량)을 입력하면 법정 유해인자 목록과 대조해 규제 대상 여부를 판정합니다.
        판정은 로컬 법령 데이터로만 수행됩니다.
      </p>

      {/* 제품 정보 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, margin: "14px 0" }}>
        <div><label style={{ fontSize: 12, color: "#667085" }}>제품명</label>
          <input style={inputStyle} value={product.name} onChange={e => setProduct(p => ({ ...p, name: e.target.value }))} placeholder="예: ○○ 신너" /></div>
        <div><label style={{ fontSize: 12, color: "#667085" }}>제조·수입자</label>
          <input style={inputStyle} value={product.manufacturer} onChange={e => setProduct(p => ({ ...p, manufacturer: e.target.value }))} /></div>
        <div><label style={{ fontSize: 12, color: "#667085" }}>MSDS 개정일</label>
          <input style={inputStyle} value={product.revisionDate} onChange={e => setProduct(p => ({ ...p, revisionDate: e.target.value }))} placeholder="YYYY-MM-DD" /></div>
      </div>

      {/* 성분 입력 표 */}
      <div style={{ overflowX: "auto", border: "1px solid #e5e9ef", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead><tr>
            <th style={{ ...th, width: 40 }}>#</th>
            <th style={th}>성분명</th><th style={{ ...th, width: 150 }}>CAS No.</th>
            <th style={{ ...th, width: 130 }}>함유량</th><th style={{ ...th, width: 44 }}></th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ ...td, color: "#98a2b3" }}>{i + 1}</td>
                <td style={td}><input style={inputStyle} value={r.name} onChange={e => setRow(i, "name", e.target.value)} placeholder="톨루엔" /></td>
                <td style={td}><input style={inputStyle} value={r.cas} onChange={e => setRow(i, "cas", e.target.value)} placeholder="108-88-3" /></td>
                <td style={td}><input style={inputStyle} value={r.content} onChange={e => setRow(i, "content", e.target.value)} placeholder="30~40%" /></td>
                <td style={td}><button className="btn btn-ghost btn-sm" onClick={() => delRow(i)} title="삭제">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={addRow}>+ 성분 추가</button>
        <button className="btn btn-primary" onClick={judge} disabled={busy}>{busy ? "판정 중…" : "판정하기"}</button>
      </div>

      {/* 여러 줄 붙여넣기 */}
      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontSize: 13, color: "#3b82f6" }}>성분 여러 줄 한번에 붙여넣기</summary>
        <p style={{ fontSize: 12, color: "#667085", margin: "6px 0" }}>한 줄에 한 성분씩 <code>성분명, CAS, 함유량</code> (쉼표/탭 구분). 예: <code>톨루엔, 108-88-3, 30~40%</code></p>
        <textarea style={{ ...inputStyle, minHeight: 90, fontFamily: "monospace" }} value={bulk} onChange={e => setBulk(e.target.value)} />
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={applyBulk}>표에 채우기</button>
      </details>

      {err && <div style={{ marginTop: 14, padding: "10px 14px", background: "#fdeeee", color: "#b42318", borderRadius: 8, border: "1px solid #f3c0bd" }}>{err}</div>}

      {/* 결과 */}
      {result && (
        <div style={{ marginTop: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>판정 결과</h2>
            <button className="btn btn-ghost btn-sm" onClick={exportCsv}>📥 판정 대장 CSV</button>
          </div>
          {/* 요약 */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0" }}>
            {[["측정 대상", result.summary.wem_target_count, "#b42318", "#fdeeee"],
              ["특수건진 대상", result.summary.she_target_count, "#087443", "#eafaf0"],
              ["기준 미달", result.summary.wem_below_count, "#b25e09", "#fff7e6"],
              ["판정 불가", result.summary.undetermined_count, "#6941c6", "#f2eefe"],
              ["대상 아님", result.summary.not_listed_count, "#475467", "#eef2f7"]].map(([l, n, fg, bg], k) => (
              <div key={k} style={{ background: bg, color: fg, borderRadius: 10, padding: "10px 16px", minWidth: 92, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{n}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{l}</div>
              </div>
            ))}
          </div>
          {(result.summary.special_substance || result.summary.permit_substance) && (
            <div style={{ padding: "8px 12px", background: "#fef3f2", border: "1px solid #f3c0bd", borderRadius: 8, color: "#b42318", fontSize: 13, marginBottom: 12 }}>
              ⚠ {result.summary.special_substance && "특별관리물질 포함"} {result.summary.permit_substance && "· 허가대상물질 포함"} — 별도 관리·기록 의무가 있습니다.
            </div>
          )}
          {/* 성분별 표 */}
          <div style={{ overflowX: "auto", border: "1px solid #e5e9ef", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead><tr>
                <th style={th}>성분명</th><th style={th}>CAS</th><th style={th}>함유량</th>
                <th style={th}>작업환경측정</th><th style={th}>특수건진</th><th style={th}>구분</th><th style={th}>판정 근거</th>
              </tr></thead>
              <tbody>
                {result.components.map((c, i) => (
                  <tr key={i}>
                    <td style={td}>{c.name || <span style={{ color: "#bbb" }}>—</span>}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{c.cas || c.cas_raw || "—"}</td>
                    <td style={td}>{c.content_raw || "—"}</td>
                    <td style={td}><ResultBadge r={c.wem.result} /></td>
                    <td style={td}><SheBadge r={c.she.result} /></td>
                    <td style={td}>{c.flags.filter(f => f !== "이름매칭(신뢰도 낮음)").map((f, k) => (
                      <span key={k} style={{ display: "inline-block", fontSize: 11, background: "#eef2f7", color: "#475467", borderRadius: 5, padding: "1px 6px", margin: "1px 2px 1px 0" }}>{f}</span>
                    ))}{c.match_method === "keyword" && <span style={{ fontSize: 11, color: "#b25e09" }}>이름매칭</span>}</td>
                    <td style={{ ...td, color: "#667085", fontSize: 12, maxWidth: 260 }}>{c.wem.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 안내 문구 */}
          <ul style={{ fontSize: 12, color: "#667085", marginTop: 14, paddingLeft: 18, lineHeight: 1.7 }}>
            {result.notices.map((n, i) => <li key={i}>{n}</li>)}
            <li>판정일 {result.judged_at} · 법령 데이터 기준일 {result.data_baseline}</li>
          </ul>
        </div>
      )}
    </div>
  );
};
