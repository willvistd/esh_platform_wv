// 윌앤비전 - 산업재해 관리 (통계) · Phase 1: 재해 대장(입력·목록·상세·계산필드·권한·마스킹)
// 첨부(사진·재해조사표 사본)는 그룹웨어에서 관리하므로 여기선 다루지 않음. 통계 데이터만 관리.

// ── 선택값(enum) 정의 ──
const IA_ACC_TYPES = [
  "떨어짐", "넘어짐", "깔림·뒤집힘", "부딪힘", "물체에 맞음", "무너짐", "끼임",
  "절단·베임·찔림", "감전", "폭발·파열", "화재", "불균형 및 무리한 동작",
  "이상온도 접촉", "화학물질 누출·접촉", "산소결핍", "빠짐·익사",
  "사업장 내 교통사고", "사업장 외 교통사고", "체육행사", "폭력행위",
  "동물상해", "업무상 질병", "기타",
];
const IA_SEVERITIES = ["사망", "3일 이상 휴업", "3일 미만 휴업", "응급처치"];
const IA_EMP_TYPES = ["직영", "계약", "도급·협력사"];
const IA_COMP_STATUS = ["미신청(공상처리)", "신청·심사중", "승인", "불승인", "요양중", "치료종결"];
const IA_CATEGORIES = ["업무상 사고", "업무상 질병", "출퇴근재해"];
// 산재요양 '승인' 집계 기준: 승인 + 요양중 + 치료종결(=승인 이후 상태 포함)
const iaIsApproved = (s) => s === "승인" || s === "요양중" || s === "치료종결";

// ── 계산 헬퍼 ──
const iaDatePart = (s) => String(s || "").slice(0, 10);      // "YYYY-MM-DD"
const iaAddOneMonth = (ymd) => {
  const d = new Date(ymd + "T00:00:00");
  if (isNaN(d)) return "";
  const m = d.getMonth();
  d.setMonth(m + 1);
  return d.toISOString().slice(0, 10);
};
const iaDaysBetween = (a, b) => {
  const d1 = new Date(a + "T00:00:00"), d2 = new Date(b + "T00:00:00");
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.round((d2 - d1) / 86400000);
};
// 재해조사표 준수 계산: 해당없음 / 기한 내 / 기한 초과(+N일) / 미입력
const iaReportCompliance = (acc) => {
  const required = acc.severity === "사망" || acc.severity === "3일 이상 휴업";
  if (!required) return { key: "na", label: "해당없음", required: false };
  const occ = iaDatePart(acc.occurredAt);
  const deadline = occ ? iaAddOneMonth(occ) : "";
  const sub = iaDatePart(acc.reportSubmittedDate);
  if (!sub) return { key: "missing", label: "미입력", required: true, deadline };
  const over = iaDaysBetween(deadline, sub);
  if (over !== null && over > 0) return { key: "over", label: `기한 초과(+${over}일)`, required: true, deadline };
  return { key: "in", label: "기한 내", required: true, deadline };
};

const IndustrialAccidentView = ({ onNav, currentUser, role }) => {
  const [list, setList] = React.useState([]);
  const [canWrite, setCanWrite] = React.useState(false);
  const [sites, setSites] = React.useState([]);
  const [hqs, setHqs] = React.useState([]);
  const [headcounts, setHeadcounts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState(null);
  const [editing, setEditing] = React.useState(null);   // null | "new" | accidentObj
  // 필터
  const [fHq, setFHq] = React.useState("전체");
  const [fType, setFType] = React.useState("전체");
  const [fSev, setFSev] = React.useState("전체");
  const [fComp, setFComp] = React.useState("전체");
  const [tab, setTab] = React.useState("list");   // list | dash
  // 대시보드에서 재해 클릭 → 대장 탭으로 이동 + 해당 건 펼침
  const openDetail = (id) => { setFHq("전체"); setFType("전체"); setFSev("전체"); setFComp("전체"); setTab("list"); setExpandedId(id);
    setTimeout(() => { const el = document.getElementById("acc-row-" + id); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60); };

  const reload = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      window.WV_API.getAccidents(),
      window.WV_API.getSites ? window.WV_API.getSites() : Promise.resolve([]),
      window.WV_API.getHQs ? window.WV_API.getHQs() : Promise.resolve([]),
      window.WV_API.getHeadcounts ? window.WV_API.getHeadcounts() : Promise.resolve([]),
    ]).then(([acc, siteData, hqData, hc]) => {
      setList((acc && acc.accidents) || []);
      setCanWrite(!!(acc && acc.canWrite));
      setSites(Array.isArray(siteData) ? siteData : []);
      setHqs(Array.isArray(hqData) ? hqData : (hqData && hqData.hqs) || []);
      setHeadcounts(Array.isArray(hc) ? hc : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  React.useEffect(() => { reload(); }, [reload]);

  const siteMap = React.useMemo(() => {
    const m = {}; sites.forEach(s => { m[String(s.id)] = s; }); return m;
  }, [sites]);
  const hqMap = React.useMemo(() => {
    const m = {}; hqs.forEach(h => { m[String(h.id)] = h; }); return m;
  }, [hqs]);
  const siteName = (id) => (siteMap[String(id)]?.사업장명) || "(사업장 미지정)";
  const hqNameOfSite = (id) => { const s = siteMap[String(id)]; return s ? (hqMap[String(s.hqId)]?.name || "") : ""; };

  const filtered = React.useMemo(() => list.filter(a => {
    if (fType !== "전체" && a.accidentType !== fType) return false;
    if (fSev !== "전체" && a.severity !== fSev) return false;
    if (fComp !== "전체" && iaReportCompliance(a).label.replace(/\(.*\)/, "") !== fComp) return false;
    if (fHq !== "전체" && hqNameOfSite(a.siteId) !== fHq) return false;
    return true;
  }), [list, fType, fSev, fComp, fHq, siteMap, hqMap]);

  const del = async (a) => {
    if (!window.confirm(`이 재해 기록을 삭제할까요?\n(${siteName(a.siteId)} · ${iaDatePart(a.occurredAt)})\n되돌릴 수 없습니다.`)) return;
    try { await window.WV_API.deleteAccident(a.id); setList(prev => prev.filter(x => x.id !== a.id)); }
    catch (e) { alert("삭제 실패: " + (e.message || "")); }
  };

  // ── 색 태그 ──
  const compChip = (a) => {
    const c = iaReportCompliance(a);
    const map = { na: ["#6b7280", "#f3f4f6"], in: ["#166534", "#dcfce7"], over: ["#b91c1c", "#fee2e2"], missing: ["#92400e", "#fef3c7"] };
    const [fg, bg] = map[c.key] || map.na;
    return <span style={{ fontSize: 11, fontWeight: 700, color: fg, background: bg, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>{c.label}</span>;
  };
  const compStatusChip = (v) => {
    if (!v) return <span style={{ color: "var(--fg-4)" }}>-</span>;
    const good = /승인|치료종결/.test(v), warn = /심사중|요양중/.test(v), bad = /불승인/.test(v);
    const [fg, bg] = bad ? ["#b91c1c", "#fee2e2"] : good ? ["#166534", "#dcfce7"] : warn ? ["#92400e", "#fef3c7"] : ["#374151", "#eef2f7"];
    return <span style={{ fontSize: 11, fontWeight: 600, color: fg, background: bg, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>{v}</span>;
  };
  const typeTag = (v) => v ? <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", background: "var(--primary-soft)", padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>{v}</span> : <span style={{ color: "var(--fg-4)" }}>-</span>;

  const TH = { padding: "10px 10px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--fg-2)", borderBottom: "2px solid var(--line)", whiteSpace: "nowrap" };
  const TD = { padding: "10px 10px", fontSize: 13, borderBottom: "1px solid var(--line)", verticalAlign: "middle" };

  return (
    <div className="content" style={{ maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <div>
          <h1 className="content-title">산업재해 관리</h1>
          <p className="meta" style={{ marginTop: 4 }}>
            재해 대장 · 통계용 (증빙 서류는 그룹웨어에서 관리)
            {!canWrite && <span style={{ marginLeft: 8, color: "var(--fg-3)" }}>· 조회 전용(재해자명 마스킹)</span>}
          </p>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            <Icon name="plus" size={14} /> 재해 등록
          </button>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", margin: "14px 0 18px" }}>
        {[["list", "재해 대장"], ["dash", "대시보드"], ["rate", "재해율 분석"]].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: "9px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", background: "none", border: "none",
              color: tab === k ? "var(--primary)" : "var(--fg-3)", borderBottom: "2px solid " + (tab === k ? "var(--primary)" : "transparent"), marginBottom: -1 }}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === "dash" && !loading && (
        <AccidentDashboard list={list} sites={sites} siteMap={siteMap} hqMap={hqMap} hqs={hqs} onOpenDetail={openDetail} />
      )}

      {tab === "rate" && !loading && (
        <AccidentRateView list={list} sites={sites} siteMap={siteMap} hqMap={hqMap} headcounts={headcounts} canWrite={canWrite} onReload={reload} />
      )}

      {/* 통계 요약 (재해 대장 탭) */}
      {tab === "list" && !loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, margin: "0 0 18px" }}>
          {[
            { label: "전체 재해", value: list.length, color: "var(--primary)" },
            { label: "중대재해", value: list.filter(a => a.isSerious).length, color: "#dc2626" },
            { label: "조사표 기한초과", value: list.filter(a => iaReportCompliance(a).key === "over").length, color: "#b91c1c" },
            { label: "조사표 미입력", value: list.filter(a => iaReportCompliance(a).key === "missing").length, color: "#d97706" },
            { label: "조치 미완료", value: list.filter(a => !a.actionCompleted && a.preventionMeasures).length, color: "#7c3aed" },
          ].map(c => (
            <div key={c.label} className="card" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "list" && (<>
      {/* 필터 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <select className="field-input" style={{ width: "auto" }} value={fHq} onChange={e => setFHq(e.target.value)}>
          <option>전체</option>{hqs.map(h => <option key={h.id}>{h.name}</option>)}
        </select>
        <select className="field-input" style={{ width: "auto" }} value={fType} onChange={e => setFType(e.target.value)}>
          <option value="전체">발생형태 전체</option>{IA_ACC_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="field-input" style={{ width: "auto" }} value={fSev} onChange={e => setFSev(e.target.value)}>
          <option value="전체">재해정도 전체</option>{IA_SEVERITIES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="field-input" style={{ width: "auto" }} value={fComp} onChange={e => setFComp(e.target.value)}>
          {["전체", "해당없음", "기한 내", "기한 초과", "미입력"].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--fg-3)" }}><span className="login-spinner" style={{ width: 32, height: 32 }} /> 불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--fg-3)", border: "1px dashed var(--line)" }}>
          <Icon name="alert" size={28} /><br />
          <div style={{ marginTop: 10, fontSize: 14 }}>{list.length === 0 ? "등록된 재해 기록이 없습니다." : "조건에 맞는 재해가 없습니다."}</div>
          {canWrite && list.length === 0 && <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 6 }}>우측 상단 [재해 등록]으로 시작하세요.</div>}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                {["본부 / 사업장", "발생일", "재해자", "발생형태", "재해정도", "조사표", "산재진행", ""].map((h, i) => <th key={i} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const open = expandedId === a.id;
                return (
                  <React.Fragment key={a.id}>
                    <tr id={"acc-row-" + a.id} onClick={() => setExpandedId(open ? null : a.id)}
                      style={{ cursor: "pointer", background: a.isSerious ? "rgba(220,38,38,0.05)" : (open ? "var(--primary-soft)" : "transparent") }}>
                      <td style={TD}>
                        <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{hqNameOfSite(a.siteId) || "-"}{a.category ? " · " + a.category : ""}</div>
                        <div style={{ fontWeight: 700 }}>{siteName(a.siteId)}{a.isSerious && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 800, color: "#dc2626" }}>● 중대재해</span>}</div>
                      </td>
                      <td style={{ ...TD, whiteSpace: "nowrap" }}>{iaDatePart(a.occurredAt) || "-"}</td>
                      <td style={{ ...TD, whiteSpace: "nowrap" }}>{a.victimName || "-"}</td>
                      <td style={TD}>{typeTag(a.accidentType)}</td>
                      <td style={{ ...TD, whiteSpace: "nowrap", fontWeight: 600 }}>{a.severity || "-"}</td>
                      <td style={TD}>{compChip(a)}</td>
                      <td style={TD}>{compStatusChip(a.compensationStatus)}</td>
                      <td style={{ ...TD, textAlign: "right", color: "var(--fg-4)", whiteSpace: "nowrap" }}>{open ? "▲" : "▼"}</td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={8} style={{ padding: "4px 16px 18px", background: "var(--primary-soft)", borderBottom: "1px solid var(--line)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px 24px", fontSize: 13 }}>
                            <IADetail label="재해구분" v={a.category} />
                            <IADetail label="발생장소" v={a.location} />
                            <IADetail label="고용형태" v={a.employmentType} />
                            <IADetail label="기인물·가해물" v={a.agentObject} />
                            <IADetail label="작업 내용" v={a.workDescription} />
                            <IADetail label="재해 경위" v={a.circumstances} full />
                            <IADetail label="휴업일수" v={a.lostDays != null ? `${a.lostDays}일` : ""} />
                            <IADetail label="예상 복귀일" v={iaDatePart(a.expectedReturnDate)} />
                            <IADetail label="재해조사표 제출일(고용노동부)" v={iaDatePart(a.reportSubmittedDate)} />
                            <IADetail label="재발방지대책" v={a.preventionMeasures} full />
                            <IADetail label="조치 담당자" v={a.actionOwner} />
                            <IADetail label="조치 기한" v={iaDatePart(a.actionDueDate)} />
                            <IADetail label="조치 완료" v={a.actionCompleted ? `완료 (${iaDatePart(a.actionCompletedDate) || "-"})` : "미완료"} />
                            <IADetail label="위험성평가 반영" v={a.riskReflected ? "반영함" : "미반영"} />
                            <IADetail label="작성자" v={a.createdBy} />
                          </div>
                          {canWrite && (
                            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                              <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setEditing(a); }}><Icon name="edit" size={13} /> 수정</button>
                              <button className="btn btn-sm" style={{ color: "#b91c1c", border: "1px solid #fecaca", background: "#fff" }} onClick={(e) => { e.stopPropagation(); del(a); }}>삭제</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </>)}

      {editing && (
        <AccidentFormModal
          initial={editing === "new" ? null : editing}
          sites={sites} hqs={hqs} hqMap={hqMap}
          currentUser={currentUser}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
};

const IADetail = ({ label, v, full }) => (
  <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-3)", marginBottom: 2 }}>{label}</div>
    <div style={{ whiteSpace: "pre-wrap", color: v ? "var(--fg)" : "var(--fg-4)" }}>{v || "-"}</div>
  </div>
);

// ── 등록/수정 모달 ──
const AccidentFormModal = ({ initial, sites, hqs, hqMap, currentUser, onClose, onSaved }) => {
  const isEdit = !!initial;
  const [f, setF] = React.useState(() => ({
    siteId: initial?.siteId || "",
    category: initial?.category || "업무상 사고",
    occurredDate: iaDatePart(initial?.occurredAt) || "",
    occurredTime: (initial?.occurredAt || "").slice(11, 16) || "",
    occurredTimeUnknown: !!initial?.occurredTimeUnknown,
    location: initial?.location || "",
    victimName: initial?.victimName || "",
    employmentType: initial?.employmentType || "직영",
    accidentType: initial?.accidentType || "",
    agentObject: initial?.agentObject || "",
    workDescription: initial?.workDescription || "",
    circumstances: initial?.circumstances || "",
    severity: initial?.severity || "",
    isSerious: !!initial?.isSerious,
    lostDays: initial?.lostDays != null ? String(initial.lostDays) : "",
    expectedReturnDate: iaDatePart(initial?.expectedReturnDate) || "",
    reportSubmittedDate: iaDatePart(initial?.reportSubmittedDate) || "",
    compensationStatus: initial?.compensationStatus || "미신청(공상처리)",
    preventionMeasures: initial?.preventionMeasures || "",
    actionOwner: initial?.actionOwner || "",
    actionDueDate: iaDatePart(initial?.actionDueDate) || "",
    actionCompleted: !!initial?.actionCompleted,
    actionCompletedDate: iaDatePart(initial?.actionCompletedDate) || "",
    riskReflected: !!initial?.riskReflected,
  }));
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const sitesSorted = React.useMemo(() => [...sites].sort((a, b) =>
    String((hqMap[String(a.hqId)]?.name) || "").localeCompare(String((hqMap[String(b.hqId)]?.name) || ""), "ko") ||
    String(a.사업장명 || "").localeCompare(String(b.사업장명 || ""), "ko")), [sites, hqMap]);

  const save = async () => {
    if (!f.siteId) { setErr("사업장을 선택해주세요."); return; }
    if (!f.occurredDate) { setErr("발생일을 입력해주세요."); return; }
    if (!f.accidentType) { setErr("발생형태를 선택해주세요."); return; }
    if (!f.severity) { setErr("재해정도를 선택해주세요."); return; }
    setSaving(true); setErr("");
    const occurredAt = f.occurredDate + (!f.occurredTimeUnknown && f.occurredTime ? "T" + f.occurredTime : "");
    const payload = {
      siteId: parseInt(f.siteId) || null,
      category: f.category,
      occurredAt,
      occurredTimeUnknown: f.occurredTimeUnknown,
      location: f.location, victimName: f.victimName, employmentType: f.employmentType,
      accidentType: f.accidentType, agentObject: f.agentObject, workDescription: f.workDescription,
      circumstances: f.circumstances, severity: f.severity, isSerious: f.isSerious,
      lostDays: f.lostDays === "" ? null : (parseInt(f.lostDays) || 0),
      expectedReturnDate: f.expectedReturnDate, reportSubmittedDate: f.reportSubmittedDate,
      compensationStatus: f.compensationStatus, preventionMeasures: f.preventionMeasures,
      actionOwner: f.actionOwner, actionDueDate: f.actionDueDate,
      actionCompleted: f.actionCompleted, actionCompletedDate: f.actionCompleted ? f.actionCompletedDate : "",
      riskReflected: f.riskReflected,
      createdBy: isEdit ? (initial.createdBy || "") : ((window.WV_ACTOR ? window.WV_ACTOR.get(currentUser) : "") || currentUser?.name || ""),
    };
    try {
      if (isEdit) await window.WV_API.updateAccident(initial.id, payload);
      else await window.WV_API.createAccident(payload);
      onSaved();
    } catch (e) { setErr(e.message || "저장 실패"); setSaving(false); }
  };

  // 계산 미리보기
  const preview = iaReportCompliance({ severity: f.severity, occurredAt: f.occurredDate, reportSubmittedDate: f.reportSubmittedDate });

  const L = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--fg-2)", marginBottom: 5 };
  const half = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "40px 16px", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 720, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{isEdit ? "재해 수정" : "재해 등록"}</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: "var(--fg-3)" }}>×</button>
        </div>

        {err && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={L}>사업장 *</label>
            <select className="field-input" value={f.siteId} onChange={e => upd("siteId", e.target.value)}>
              <option value="">— 선택 —</option>
              {sitesSorted.map(s => <option key={s.id} value={s.id}>{(hqMap[String(s.hqId)]?.name ? `[${hqMap[String(s.hqId)].name}] ` : "") + s.사업장명}</option>)}
            </select>
          </div>

          <div>
            <label style={L}>재해구분 *</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {IA_CATEGORIES.map(c => {
                const on = f.category === c;
                return (
                  <button key={c} type="button" onClick={() => upd("category", c)}
                    style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 999,
                      border: on ? "1.5px solid var(--primary)" : "1px solid var(--line)",
                      background: on ? "var(--primary)" : "#fff", color: on ? "#fff" : "var(--fg-2)" }}>{c}</button>
                );
              })}
            </div>
          </div>

          <div style={half}>
            <div>
              <label style={L}>발생일 *</label>
              <input type="date" className="field-input" value={f.occurredDate} onChange={e => upd("occurredDate", e.target.value)} />
            </div>
            <div>
              <label style={L}>발생시각</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="time" className="field-input" style={{ flex: 1 }} value={f.occurredTime} disabled={f.occurredTimeUnknown} onChange={e => upd("occurredTime", e.target.value)} />
                <label style={{ fontSize: 12, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="checkbox" checked={f.occurredTimeUnknown} onChange={e => upd("occurredTimeUnknown", e.target.checked)} /> 미상
                </label>
              </div>
            </div>
          </div>

          <div style={half}>
            <div><label style={L}>발생장소</label><input className="field-input" value={f.location} onChange={e => upd("location", e.target.value)} placeholder="계단, 주차장, 기계실 등" /></div>
            <div><label style={L}>재해자명 <span style={{ color: "var(--fg-4)", fontWeight: 500 }}>(민감정보)</span></label><input className="field-input" value={f.victimName} onChange={e => upd("victimName", e.target.value)} placeholder="실명 또는 이니셜" /></div>
          </div>

          <div style={half}>
            <div>
              <label style={L}>고용형태</label>
              <select className="field-input" value={f.employmentType} onChange={e => upd("employmentType", e.target.value)}>{IA_EMP_TYPES.map(t => <option key={t}>{t}</option>)}</select>
            </div>
            <div>
              <label style={L}>발생형태 *</label>
              <select className="field-input" value={f.accidentType} onChange={e => upd("accidentType", e.target.value)}>
                <option value="">— 선택 —</option>{IA_ACC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={half}>
            <div>
              <label style={L}>재해정도 *</label>
              <select className="field-input" value={f.severity} onChange={e => upd("severity", e.target.value)}>
                <option value="">— 선택 —</option>{IA_SEVERITIES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, paddingBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, color: f.isSerious ? "#dc2626" : "var(--fg-2)" }}>
                <input type="checkbox" checked={f.isSerious} onChange={e => upd("isSerious", e.target.checked)} /> 중대재해
              </label>
            </div>
          </div>

          <div><label style={L}>기인물·가해물</label><input className="field-input" value={f.agentObject} onChange={e => upd("agentObject", e.target.value)} /></div>
          <div><label style={L}>작업 내용</label><textarea className="field-input" rows={2} value={f.workDescription} onChange={e => upd("workDescription", e.target.value)} /></div>
          <div><label style={L}>재해 경위</label><textarea className="field-input" rows={3} value={f.circumstances} onChange={e => upd("circumstances", e.target.value)} /></div>

          <div style={half}>
            <div><label style={L}>휴업일수</label><input type="number" className="field-input" value={f.lostDays} onChange={e => upd("lostDays", e.target.value)} placeholder="일" /></div>
            <div><label style={L}>예상 복귀일</label><input type="date" className="field-input" value={f.expectedReturnDate} onChange={e => upd("expectedReturnDate", e.target.value)} /></div>
          </div>

          {/* 법정 관리 */}
          <div style={{ padding: "12px 14px", background: "var(--primary-soft)", borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-2)", marginBottom: 8 }}>재해조사표 (고용노동부 제출일 기준)</div>
            <div style={half}>
              <div><label style={L}>고용노동부 제출일자</label><input type="date" className="field-input" value={f.reportSubmittedDate} onChange={e => upd("reportSubmittedDate", e.target.value)} /></div>
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8, fontSize: 12.5 }}>
                <span>대상 여부: <b>{preview.required ? "제출 대상" : "해당없음"}</b>
                  {preview.required && preview.deadline && <> · 기한 <b>{preview.deadline}</b> · <b style={{ color: preview.key === "over" ? "#b91c1c" : preview.key === "in" ? "#166534" : "#92400e" }}>{preview.label}</b></>}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label style={L}>산재 처리 상태</label>
            <select className="field-input" value={f.compensationStatus} onChange={e => upd("compensationStatus", e.target.value)}>{IA_COMP_STATUS.map(t => <option key={t}>{t}</option>)}</select>
          </div>

          {/* 사후 조치 */}
          <div><label style={L}>재발방지대책</label><textarea className="field-input" rows={2} value={f.preventionMeasures} onChange={e => upd("preventionMeasures", e.target.value)} /></div>
          <div style={half}>
            <div><label style={L}>조치 담당자</label><input className="field-input" value={f.actionOwner} onChange={e => upd("actionOwner", e.target.value)} /></div>
            <div><label style={L}>조치 기한</label><input type="date" className="field-input" value={f.actionDueDate} onChange={e => upd("actionDueDate", e.target.value)} /></div>
          </div>
          <div style={half}>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={f.actionCompleted} onChange={e => upd("actionCompleted", e.target.checked)} /> 조치 완료
              </label>
            </div>
            <div><label style={L}>완료일</label><input type="date" className="field-input" value={f.actionCompletedDate} disabled={!f.actionCompleted} onChange={e => upd("actionCompletedDate", e.target.value)} /></div>
          </div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={f.riskReflected} onChange={e => upd("riskReflected", e.target.checked)} /> 위험성평가(수시평가) 반영함
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>취소</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "저장 중..." : (isEdit ? "수정 저장" : "등록")}</button>
        </div>
      </div>
    </div>
  );
};

// ───────────────────────── 대시보드 (2단계) ─────────────────────────
const IA_sevColor = (x) => x === "사망" ? "#dc2626" : (x || "").indexOf("3일 이상") >= 0 ? "#d97706" : "#6e6e73";

// 가로 막대 리스트
const IAHBars = ({ data, unit }) => {
  const max = Math.max(...data.map(d => d.v), 1);
  if (!data.length) return <div style={{ color: "var(--fg-4)", fontSize: 12.5, padding: "8px 0" }}>데이터 없음</div>;
  return (
    <div>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, margin: "7px 0", fontSize: 12.5 }}>
          <div style={{ width: 120, textAlign: "right", color: "var(--fg-2)", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={d.l}>{d.l}</div>
          <div style={{ flex: 1, background: "#f0f1f4", borderRadius: 5, height: 18 }}>
            <div style={{ width: (d.v / max * 100) + "%", height: "100%", borderRadius: 5, background: d.color || "var(--primary)" }} />
          </div>
          <div style={{ width: 40, fontWeight: 700, color: "var(--fg-2)" }}>{d.vLabel != null ? d.vLabel : d.v}{unit || ""}</div>
        </div>
      ))}
    </div>
  );
};

const AccidentDashboard = ({ list, sites, siteMap, hqMap, hqs, onOpenDetail }) => {
  const [range, setRange] = React.useState("12");
  const [hover, setHover] = React.useState(null);   // 월 인덱스
  const siteName = (id) => (siteMap[String(id)]?.사업장명) || "(사업장 미지정)";
  const hqOf = (id) => { const s = siteMap[String(id)]; return s ? (hqMap[String(s.hqId)]?.name || "미지정") : "미지정"; };

  // KPI
  const total = list.length;
  const cntCat = (c) => list.filter(a => a.category === c).length;
  const approved = list.filter(a => iaIsApproved(a.compensationStatus)).length;

  // 조치기한 알림 (기한초과·미완료)
  const today = new Date().toISOString().slice(0, 10);
  const actionAlerts = list.filter(a => a.preventionMeasures && !a.actionCompleted)
    .map(a => { const due = iaDatePart(a.actionDueDate); const over = due ? iaDaysBetween(due, today) : null;
      return { a, due, over: (over != null && over > 0) ? over : 0 }; })
    .sort((x, y) => y.over - x.over);

  // 월별 버킷
  const months = React.useMemo(() => {
    const yms = list.map(a => iaDatePart(a.occurredAt).slice(0, 7)).filter(s => s.length === 7);
    const now = new Date(); const curYm = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    let minYm = yms.length ? yms.reduce((a, b) => a < b ? a : b) : curYm;
    const seq = [];
    let [y, m] = minYm.split("-").map(Number);
    const [cy, cm] = curYm.split("-").map(Number);
    let guard = 0;
    while ((y < cy || (y === cy && m <= cm)) && guard++ < 400) {
      const ym = y + "-" + String(m).padStart(2, "0");
      seq.push({ ym, label: (m === 1 || seq.length === 0) ? `'${String(y).slice(2)}.${m}` : String(m),
        items: list.filter(a => iaDatePart(a.occurredAt).slice(0, 7) === ym) });
      m++; if (m > 12) { m = 1; y++; }
    }
    return seq;
  }, [list]);
  const view = range === "all" ? months : months.slice(-parseInt(range));
  const defIdx = (() => { let i = view.length - 1; while (i > 0 && view[i] && view[i].items.length === 0) i--; return i; })();
  const activeIdx = hover != null && view[hover] ? hover : defIdx;
  const activeMonth = view[activeIdx];

  // 집계들
  const byHq = React.useMemo(() => {
    const m = {}; (hqs || []).forEach(h => m[h.name] = 0);
    list.forEach(a => { const n = hqOf(a.siteId); m[n] = (m[n] || 0) + 1; });
    return Object.entries(m).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v }));
  }, [list, siteMap, hqMap, hqs]);
  const byType = React.useMemo(() => {
    const m = {}; list.forEach(a => { if (a.accidentType) m[a.accidentType] = (m[a.accidentType] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([l, v]) => ({ l, v }));
  }, [list]);
  const bySite = React.useMemo(() => {
    const m = {}; list.forEach(a => { const n = siteName(a.siteId); m[n] = (m[n] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l, v]) => ({ l, v }));
  }, [list, siteMap]);
  const byDept = React.useMemo(() => {
    const acc = {};
    list.forEach(a => { const sub = iaDatePart(a.reportSubmittedDate), occ = iaDatePart(a.occurredAt);
      const d = (sub && occ) ? iaDaysBetween(occ, sub) : null;
      if (d != null && d >= 0) { const n = hqOf(a.siteId); (acc[n] = acc[n] || []).push(d); } });
    return Object.entries(acc).map(([l, arr]) => { const avg = Math.round(arr.reduce((s, x) => s + x, 0) / arr.length);
      return { l, v: avg, vLabel: avg + "일", color: avg > 30 ? "#dc2626" : "var(--primary)" }; }).sort((a, b) => b.v - a.v);
  }, [list, siteMap, hqMap]);

  // ── 월별 추이 SVG ──
  const LINE = view.length > 14;
  const W = 760, H = 200, padL = 28, padB = 26, padT = 14, padR = 6;
  const n = view.length || 1;
  const vals = view.map(mo => mo.items.length);
  const max = Math.max(...vals, 1);
  const cw = (W - padL - padR) / n, bw = Math.min(30, cw * 0.5);
  const cx = (i) => padL + cw * i + cw / 2;
  const cy = (v) => H - padB - (H - padT - padB) * (v / max);
  const everyLabel = n <= 14 ? 1 : Math.ceil(n / 14);
  const grid = []; for (let g = 0; g <= max; g++) grid.push(g);
  const linePts = view.map((mo, i) => [cx(i), cy(mo.items.length)]);
  const linePath = linePts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const areaPath = linePts.length ? `M${linePts[0][0].toFixed(1)} ${H - padB} ` + linePts.map(p => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") + ` L${linePts[linePts.length - 1][0].toFixed(1)} ${H - padB} Z` : "";

  const card = { background: "var(--card-bg)", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 18px 14px", marginBottom: 16 };
  const h3 = { margin: "0 0 2px", fontSize: 15, fontWeight: 800 };
  const cs = { fontSize: 12, color: "var(--fg-3)", margin: "0 0 14px" };

  return (
    <div>
      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { l: "전체 재해 수", v: total, c: "var(--primary)" },
          { l: "업무상 사고", v: cntCat("업무상 사고"), c: "var(--fg)" },
          { l: "업무상 질병", v: cntCat("업무상 질병"), c: "var(--fg)" },
          { l: "출퇴근재해", v: cntCat("출퇴근재해"), c: "var(--fg)" },
          { l: "산재요양 승인", v: approved, c: "#16a34a" },
        ].map(k => (
          <div key={k.l} className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 3 }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* 조치기한 알림 */}
      <div style={card}>
        <h3 style={h3}>⚠ 재발방지 조치 — 기한 초과·미완료</h3>
        <p style={cs}>조치기한이 지났거나 완료되지 않은 건만 (클릭 시 상세)</p>
        {actionAlerts.length === 0 ? <div style={{ color: "var(--fg-4)", fontSize: 13 }}>해당 건이 없습니다. 👍</div> :
          actionAlerts.slice(0, 6).map(({ a, due, over }) => (
            <div key={a.id} onClick={() => onOpenDetail(a.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                background: over ? "#fff5f5" : "#fffbeb", border: "1px solid " + (over ? "#fecaca" : "#fde68a"), marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: over ? "#dc2626" : "#d97706", padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
                {over ? `기한초과 +${over}일` : "미완료"}
              </span>
              <div style={{ flex: 1, fontSize: 13 }}><b>{siteName(a.siteId)}</b> · {a.accidentType || "-"} · {a.preventionMeasures ? a.preventionMeasures.split("\n")[0] : "-"}
                <span style={{ fontSize: 11, color: "var(--fg-3)" }}> {a.actionOwner ? `(담당 ${a.actionOwner}` : "("}{due ? ` · 기한 ${due.slice(5)})` : ")"}</span></div>
            </div>
          ))}
      </div>

      {/* 월별 추이 + 날개박스 */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div><h3 style={h3}>월별 재해 건수 추이</h3><p style={cs}>막대/점에 마우스를 올리면 해당 월 재해 목록이 오른쪽에 표시됩니다</p></div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["12", "최근 12개월"], ["24", "최근 24개월"], ["all", "전체"]].map(([r, lbl]) => (
              <button key={r} onClick={() => { setRange(r); setHover(null); }}
                style={{ fontSize: 12, fontWeight: 700, padding: "6px 13px", borderRadius: 999, cursor: "pointer",
                  border: "1px solid " + (range === r ? "var(--primary)" : "var(--line)"), background: range === r ? "var(--primary)" : "#fff", color: range === r ? "#fff" : "var(--fg-2)" }}>{lbl}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
          <svg style={{ flex: 1, minWidth: 0 }} height="200" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
            onMouseLeave={() => setHover(null)}>
            <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#e6e6ea" />
            {grid.map(g => { const y = padT + (H - padT - padB) * (1 - g / max);
              return <g key={g}><line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f0f1f4" /><text x={padL - 6} y={y + 3} fontSize="10" fill="#a1a1a6" textAnchor="end">{g}</text></g>; })}
            {LINE && areaPath && <path d={areaPath} fill="var(--primary)" opacity="0.08" />}
            {LINE && <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
            {view.map((mo, i) => {
              const v = mo.items.length, isAct = i === activeIdx;
              return (
                <g key={i}>
                  {!LINE && <rect x={cx(i) - bw / 2} y={cy(v)} width={bw} height={Math.max(H - padB - cy(v), 0)} rx="4" fill={isAct ? "var(--primary)" : (hover != null ? "#b9ccf0" : "var(--primary)")} style={{ pointerEvents: "none" }} />}
                  {!LINE && v > 0 && <text x={cx(i)} y={cy(v) - 5} fontSize="11" fill="#424248" fontWeight="700" textAnchor="middle" style={{ pointerEvents: "none" }}>{v}</text>}
                  {LINE && <circle cx={cx(i)} cy={cy(v)} r={isAct ? 5 : 2.6} fill="var(--primary)" style={{ pointerEvents: "none" }} />}
                  {i % everyLabel === 0 && <text x={cx(i)} y={H - 8} fontSize="10" fill="#6e6e73" textAnchor="middle" style={{ pointerEvents: "none" }}>{mo.label}</text>}
                  <rect x={padL + cw * i} y={padT} width={cw} height={H - padT - padB} fill="transparent" style={{ cursor: "pointer" }} onMouseEnter={() => setHover(i)} />
                </g>
              );
            })}
          </svg>
          <div style={{ width: 300, flexShrink: 0, border: "1px solid var(--line)", borderRadius: 10, background: "var(--bg-subtle, #fcfcfd)", padding: "12px 14px", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>{activeMonth ? activeMonth.label : "-"} <span style={{ color: "var(--primary)" }}>· 재해 {activeMonth ? activeMonth.items.length : 0}건</span></div>
            <div style={{ overflow: "auto", flex: 1 }}>
              {!activeMonth || activeMonth.items.length === 0 ? (
                <div style={{ color: "var(--fg-4)", fontSize: 12.5, margin: "auto 0", textAlign: "center" }}>이 달은 재해가 없습니다.</div>
              ) : activeMonth.items.map(a => (
                <div key={a.id} onClick={() => onOpenDetail(a.id)} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5 }}>{siteName(a.siteId)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>
                    <span style={{ color: "var(--primary)", fontWeight: 700 }}>{a.accidentType || "-"}</span> · <span style={{ color: IA_sevColor(a.severity), fontWeight: 700 }}>{a.severity || "-"}</span>{a.victimName ? " · " + a.victimName : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 본부별 / 발생형태 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="ia-grid2">
        <div style={card}><h3 style={h3}>본부·법인별 재해 건수</h3><p style={cs}>전체 기간 누적</p><IAHBars data={byHq} /></div>
        <div style={card}><h3 style={h3}>발생형태 Top</h3><p style={cs}>많이 발생한 유형 순</p><IAHBars data={byType} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="ia-grid2">
        <div style={card}><h3 style={h3}>재해 다발 사업장 Top 5</h3><p style={cs}>사업장별 누적 건수</p><IAHBars data={bySite} /></div>
        <div style={card}><h3 style={h3}>부서별 재해조사표 평균 소요일</h3><p style={cs}>발생→고용노동부 제출까지 평균 (30일 초과 빨강)</p><IAHBars data={byDept} /></div>
      </div>
      <style>{`@media(max-width:720px){.ia-grid2{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
};

// ───────────────────────── 재해율 분석 (3단계) ─────────────────────────
const iaYearOf = (a) => parseInt(iaDatePart(a.occurredAt).slice(0, 4)) || 0;
const iaRateFmt = (r) => r == null ? "—" : (r === 0 ? "0%" : r.toFixed(2) + "%");

const AccidentRateView = ({ list, sites, siteMap, hqMap, headcounts, canWrite, onReload }) => {
  const curYear = new Date().getFullYear();
  const [startYear, setStartYear] = React.useState(curYear - 2);
  const [endYear, setEndYear] = React.useState(curYear);
  const [basis, setBasis] = React.useState("off");   // off=공식, all=전체
  const [view, setView] = React.useState("table");    // table | chart
  // 근로자수 로컬 맵(편집 반영)
  const [hc, setHc] = React.useState(() => { const m = {}; (headcounts || []).forEach(r => m[r.siteId + ":" + r.year] = r.workerCount); return m; });
  React.useEffect(() => { const m = {}; (headcounts || []).forEach(r => m[r.siteId + ":" + r.year] = r.workerCount); setHc(m); }, [headcounts]);
  const fileRef = React.useRef(null);

  const siteName = (id) => (siteMap[String(id)]?.사업장명) || "(미지정)";
  const years = []; for (let y = startYear; y <= endYear; y++) years.push(y);
  const rangeStart = startYear + "-01-01", rangeEnd = endYear + "-12-31";
  const getHc = (sid, y) => { const v = hc[sid + ":" + y]; return (v === undefined || v === null || v === "") ? null : Number(v); };

  // 계약구분 판별
  const classify = (s) => {
    const st = iaDatePart(s.startAt), en = iaDatePart(s.expiresAt);
    const hasSt = st.length === 10, hasEn = en.length === 10;
    const overlap = (!hasSt || st <= rangeEnd) && (!hasEn || en >= rangeStart);
    if (!overlap) return "기타";
    const cont = (!hasSt || st <= rangeStart) && (!hasEn || en >= rangeEnd);
    if (cont) return "연속";
    if (hasSt && st > rangeStart && st <= rangeEnd) return "신규";
    if (hasEn && en >= rangeStart && en < rangeEnd) return "종료";
    return "연속";
  };
  const analysisSites = React.useMemo(() => sites.map(s => ({ s, cls: classify(s) })).filter(x => x.cls !== "기타"), [sites, startYear, endYear]);
  const contSites = analysisSites.filter(x => x.cls === "연속").map(x => x.s);

  // 재해자수(연도·기준별)
  const cntBy = (sid, y, b) => list.filter(a => a.siteId === sid && iaYearOf(a) === y && (b === "all" ? true : iaIsApproved(a.compensationStatus))).length;
  const rateOf = (sid, y, b) => { const n = getHc(sid, y); if (!n) return null; return cntBy(sid, y, b) / n * 100; };
  const topTypeOf = (sid) => { const m = {}; list.filter(a => a.siteId === sid).forEach(a => { if (a.accidentType) m[a.accidentType] = (m[a.accidentType] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]).join("·") || "-"; };

  // 평균 재해율(연속, 종료연도)
  const avgRate = (() => { const rs = contSites.map(s => rateOf(s.id, endYear, basis)).filter(r => r != null); return rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null; })();

  // 공식 vs 전체 차이 큰 사업장 (범위 합계 기준)
  const gapSites = React.useMemo(() => analysisSites.map(({ s }) => {
    let hcSum = 0, allN = 0, offN = 0;
    years.forEach(y => { const n = getHc(s.id, y); if (n) { hcSum += n; allN += cntBy(s.id, y, "all"); offN += cntBy(s.id, y, "off"); } });
    const allR = hcSum ? allN / hcSum * 100 : null, offR = hcSum ? offN / hcSum * 100 : null;
    return { s, allN, offN, allR, offR, gap: (allR != null && offR != null) ? (allR - offR) : 0 };
  }).filter(x => x.allN > x.offN && x.gap > 0).sort((a, b) => b.gap - a.gap), [analysisSites, hc, list, startYear, endYear]);

  const saveCell = async (sid, y, val) => {
    setHc(prev => ({ ...prev, [sid + ":" + y]: val === "" ? "" : (parseInt(val) || 0) }));
    try { await window.WV_API.saveHeadcount(sid, y, val === "" ? null : (parseInt(val) || 0)); } catch (e) { alert("근로자수 저장 실패: " + (e.message || "")); }
  };

  // 엑셀 내보내기(연속 사업장 비교)
  const exportXlsx = () => {
    if (typeof XLSX === "undefined") { alert("엑셀 모듈 로드 대기중. 새로고침 후 시도해주세요."); return; }
    const rows = contSites.map((s, i) => { const o = { 연번: i + 1, 사업장: siteName(s.id), 계약: "연속" };
      years.forEach(y => { o[y + " 건수"] = cntBy(s.id, y, basis); const r = rateOf(s.id, y, basis); o[y + " 재해율"] = r == null ? "" : r.toFixed(2) + "%"; });
      o["주요발생형태"] = topTypeOf(s.id); return o; });
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "재해율분석");
    XLSX.writeFile(wb, `재해율분석_${startYear}-${endYear}_${basis === "off" ? "공식" : "전체"}.xlsx`);
  };
  // 근로자수 템플릿 내보내기(현재값 포함, 가로형)
  const exportHcTemplate = () => {
    if (typeof XLSX === "undefined") return;
    const rows = analysisSites.map(({ s }) => { const o = { 사업장명: siteName(s.id) }; years.forEach(y => o[y] = getHc(s.id, y) ?? ""); return o; });
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "근로자수"); XLSX.writeFile(wb, `근로자수_양식_${startYear}-${endYear}.xlsx`);
  };
  // 근로자수 엑셀 업로드(가로형: 사업장명 + 연도열)
  const importHc = async (file) => {
    if (!file || typeof XLSX === "undefined") return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      const byName = {}; sites.forEach(s => byName[String(s.사업장명).replace(/\s/g, "")] = s.id);
      const rows = [];
      json.forEach(r => { const nm = String(r["사업장명"] || r["사업장"] || "").replace(/\s/g, ""); const sid = byName[nm]; if (!sid) return;
        Object.keys(r).forEach(k => { const y = parseInt(k); if (y >= 2000 && y <= 2100 && r[k] !== "") rows.push({ siteId: sid, year: y, workerCount: parseInt(r[k]) || 0 }); }); });
      if (!rows.length) { alert("엑셀에서 매칭되는 사업장·연도 데이터를 찾지 못했습니다. (사업장명이 정확히 일치해야 합니다)"); return; }
      const res = await window.WV_API.bulkHeadcounts(rows);
      alert(`근로자수 ${res.count}건 반영 완료`); onReload && onReload();
    } catch (e) { alert("업로드 오류: " + (e.message || "")); }
  };

  const card = { background: "var(--card-bg)", border: "1px solid var(--line)", borderRadius: 14, padding: 18, marginBottom: 16 };
  const h3 = { margin: "0 0 2px", fontSize: 15, fontWeight: 800 };
  const cs = { fontSize: 12, color: "var(--fg-3)", margin: "0 0 14px" };
  const pill = (on) => ({ fontSize: 12.5, fontWeight: 700, padding: "7px 14px", borderRadius: 999, cursor: "pointer",
    border: "1px solid " + (on ? "var(--primary)" : "var(--line)"), background: on ? "var(--primary)" : "#fff", color: on ? "#fff" : "var(--fg-2)" });
  const yearOpts = []; for (let y = curYear; y >= 2018; y--) yearOpts.push(y);
  const TH = { padding: "9px 8px", fontSize: 11.5, fontWeight: 700, color: "var(--fg-2)", background: "#fafbfc", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap", textAlign: "center" };
  const TD = { padding: "9px 8px", fontSize: 12.5, borderBottom: "1px solid var(--line)", textAlign: "center" };

  // 스몰멀티플 최대값
  let gmax = 0; contSites.forEach(s => years.forEach(y => { const r = rateOf(s.id, y, basis); if (r != null && r > gmax) gmax = r; }));
  gmax = Math.max(gmax, 1) * 1.2;

  return (
    <div>
      {/* 컨트롤 */}
      <div style={card}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-3)", display: "block", marginBottom: 4 }}>분석 시작연도</label>
            <select className="field-input" style={{ width: 110 }} value={startYear} onChange={e => setStartYear(Math.min(+e.target.value, endYear))}>{yearOpts.map(y => <option key={y}>{y}</option>)}</select></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-3)", display: "block", marginBottom: 4 }}>분석 종료연도</label>
            <select className="field-input" style={{ width: 110 }} value={endYear} onChange={e => setEndYear(Math.max(+e.target.value, startYear))}>{yearOpts.map(y => <option key={y}>{y}</option>)}</select></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-3)", display: "block", marginBottom: 4 }}>재해율 기준</label>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={pill(basis === "off")} onClick={() => setBasis("off")}>공식 기준</button>
              <button style={pill(basis === "all")} onClick={() => setBasis("all")}>전체 기준</button>
            </div></div>
          <div style={{ flex: 1 }} />
          <button style={{ ...pill(false), borderColor: "var(--primary)", color: "var(--primary)" }} onClick={exportXlsx}>⬇ 엑셀 내보내기</button>
        </div>
        <div style={{ marginTop: 12, background: "var(--primary-soft)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "var(--fg-2)" }}>
          {basis === "off"
            ? <>📊 <b>공식 기준</b>: 산재 <b>승인·요양중·치료종결</b> 건만 재해율에 반영 (고용노동부 공식 통계와 동일)</>
            : <>📊 <b>전체 기준</b>: 공상처리 포함 <b>모든 재해</b>를 재해율에 반영 (실제 위험 수준 파악용)</>}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { l: "분석대상 사업장", v: analysisSites.length, c: "var(--primary)" },
          { l: "3년 연속 계약", v: contSites.length, c: "#16a34a" },
          { l: "신규", v: analysisSites.filter(x => x.cls === "신규").length, c: "var(--fg)" },
          { l: "종료", v: analysisSites.filter(x => x.cls === "종료").length, c: "var(--fg)" },
          { l: `평균 재해율(${endYear})`, v: iaRateFmt(avgRate), c: "#dc2626" },
        ].map(k => (
          <div key={k.l} className="card" style={{ padding: "13px 15px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 3 }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* 공식 vs 전체 경고 */}
      <div style={card}>
        <h3 style={h3}>⚠ 공식 통계에 안 잡히는 위험 사업장</h3>
        <p style={cs}>공상처리로 공식 재해율엔 빠지지만 실제 재해가 많은 곳 ({startYear}~{endYear} 합계)</p>
        {gapSites.length === 0 ? <div style={{ color: "var(--fg-4)", fontSize: 13 }}>해당 사업장이 없습니다. (근로자수 미입력 시 계산되지 않음)</div> :
          gapSites.slice(0, 5).map(({ s, allR, offR, allN, offN }) => (
            <div key={s.id} style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#9a3412", marginBottom: 8 }}>
              <b>{siteName(s.id)}</b> — 전체 기준 <b style={{ color: "#c2410c" }}>{iaRateFmt(allR)}</b>({allN}건) 이지만 공식 기준은 <b>{iaRateFmt(offR)}</b>({offN}건) · 공상처리 {allN - offN}건 누락
            </div>
          ))}
      </div>

      {/* 연속 사업장 비교 */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div><h3 style={h3}>연속 계약 사업장 — 연도별 재해율</h3><p style={cs}>분석기간 내내 계약 유지된 사업장만 (재해율 = 재해자수 ÷ 근로자수 × 100)</p></div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={pill(view === "table")} onClick={() => setView("table")}>표</button>
            <button style={pill(view === "chart")} onClick={() => setView("chart")}>그래프</button>
          </div>
        </div>
        {contSites.length === 0 ? <div style={{ color: "var(--fg-4)", fontSize: 13 }}>연속 계약 사업장이 없습니다. (사업장의 계약 시작/종료일을 확인하세요)</div> :
          view === "table" ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead><tr><th style={{ ...TH, textAlign: "left" }}>사업장</th>{years.map(y => <th key={y} style={TH} colSpan={2}>{y}</th>)}<th style={TH}>추세</th><th style={TH}>주요형태</th></tr>
                  <tr><th style={TH}></th>{years.map(y => <React.Fragment key={y}><th style={{ ...TH, fontWeight: 500 }}>건수</th><th style={{ ...TH, fontWeight: 500 }}>재해율</th></React.Fragment>)}<th style={TH}></th><th style={TH}></th></tr></thead>
                <tbody>
                  {contSites.map(s => { const r0 = rateOf(s.id, years[0], basis), rN = rateOf(s.id, years[years.length - 1], basis);
                    const trend = (r0 != null && rN != null) ? (rN > r0 ? <span style={{ color: "#dc2626", fontWeight: 800 }}>▲</span> : rN < r0 ? <span style={{ color: "#16a34a", fontWeight: 800 }}>▼</span> : "―") : "―";
                    return (
                      <tr key={s.id}>
                        <td style={{ ...TD, textAlign: "left", fontWeight: 700 }}>{siteName(s.id)}</td>
                        {years.map(y => { const r = rateOf(s.id, y, basis);
                          return <React.Fragment key={y}><td style={TD}>{cntBy(s.id, y, basis)}건</td><td style={{ ...TD, fontWeight: 700, color: r == null ? "var(--fg-4)" : "var(--fg)" }}>{iaRateFmt(r)}</td></React.Fragment>; })}
                        <td style={TD}>{trend}</td><td style={{ ...TD, color: "var(--fg-3)" }}>{topTypeOf(s.id)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {years.some(y => contSites.some(s => getHc(s.id, y) == null)) &&
                <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 8 }}>※ 재해율이 "—"인 칸은 해당 연도 근로자수가 비어있어서예요. 아래에서 입력하면 자동 계산됩니다.</div>}
            </div>
          ) : (
            <div>
              <p style={{ ...cs, marginTop: 2 }}>사업장별로 3년간 재해율 수준을 따로 표시 (막대 높이는 모든 사업장 같은 기준)</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
                {contSites.map(s => {
                  const panelW = 190, H = 120, padB = 22, padT = 20, bw = 34, n = years.length, slot = panelW / n;
                  const r0 = rateOf(s.id, years[0], basis), rN = rateOf(s.id, years[years.length - 1], basis);
                  const trend = (r0 != null && rN != null) ? (rN > r0 ? <span style={{ color: "#dc2626" }}>▲</span> : rN < r0 ? <span style={{ color: "#16a34a" }}>▼</span> : <span style={{ color: "var(--fg-4)" }}>―</span>) : <span style={{ color: "var(--fg-4)" }}>―</span>;
                  return (
                    <div key={s.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 12px 6px" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{siteName(s.id)} {trend}</div>
                      <svg width="100%" height={H} viewBox={`0 0 ${panelW} ${H}`} preserveAspectRatio="xMidYMid meet">
                        <line x1="0" y1={H - padB} x2={panelW} y2={H - padB} stroke="#e6e6ea" />
                        {years.map((y, i) => { const r = rateOf(s.id, y, basis); const h = (H - padT - padB) * ((r || 0) / gmax); const x = slot * i + slot / 2 - bw / 2; const by = H - padB - h;
                          return <g key={y}>
                            <rect x={x} y={by} width={bw} height={Math.max(h, 0)} rx="4" fill="var(--primary)" />
                            <text x={x + bw / 2} y={by - 5} fontSize="10.5" fill="#424248" fontWeight="800" textAnchor="middle">{iaRateFmt(r)}</text>
                            <text x={x + bw / 2} y={H - 7} fontSize="10" fill="#6e6e73" textAnchor="middle">{y}</text>
                          </g>; })}
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>

      {/* 근로자수 입력 */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div><h3 style={h3}>연도별 근로자 수 (재해율 분모)</h3><p style={cs}>산재보험 적용 근로자수 기준 (근로복지공단 토탈서비스에서 확인){!canWrite && " · 조회전용"}</p></div>
          {canWrite && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button style={pill(false)} onClick={exportHcTemplate}>양식 다운로드</button>
              <button style={{ ...pill(false), borderColor: "var(--primary)", color: "var(--primary)" }} onClick={() => fileRef.current && fileRef.current.click()}>엑셀 업로드</button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => { importHc(e.target.files[0]); e.target.value = ""; }} />
            </div>
          )}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", minWidth: 400 }}>
            <thead><tr><th style={{ ...TH, textAlign: "left" }}>사업장</th>{years.map(y => <th key={y} style={TH}>{y}</th>)}</tr></thead>
            <tbody>
              {analysisSites.map(({ s, cls }) => (
                <tr key={s.id}>
                  <td style={{ ...TD, textAlign: "left", whiteSpace: "nowrap" }}>{siteName(s.id)} <span style={{ fontSize: 10, color: "var(--fg-4)" }}>{cls}</span></td>
                  {years.map(y => (
                    <td key={y} style={TD}>
                      {canWrite ? (
                        <input type="number" value={hc[s.id + ":" + y] ?? ""} onChange={e => setHc(prev => ({ ...prev, [s.id + ":" + y]: e.target.value }))}
                          onBlur={e => saveCell(s.id, y, e.target.value)}
                          style={{ width: 64, textAlign: "center", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 4px", fontSize: 12.5, fontFamily: "inherit" }} />
                      ) : (getHc(s.id, y) ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
              {analysisSites.length === 0 && <tr><td style={{ ...TD, color: "var(--fg-4)" }} colSpan={years.length + 1}>분석기간에 해당하는 사업장이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { IndustrialAccidentView });
