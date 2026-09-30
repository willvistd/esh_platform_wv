// 윌앤비전 - 산업재해 관리 (통계) · Phase 1: 재해 대장(입력·목록·상세·계산필드·권한·마스킹)
// 첨부(사진·재해조사표 사본)는 그룹웨어에서 관리하므로 여기선 다루지 않음. 통계 데이터만 관리.

// ── 선택값(enum) 정의 ──
const ACC_TYPES = [
  "떨어짐", "넘어짐", "깔림·뒤집힘", "부딪힘", "물체에 맞음", "무너짐", "끼임",
  "절단·베임·찔림", "감전", "폭발·파열", "화재", "불균형 및 무리한 동작",
  "이상온도 접촉", "화학물질 누출·접촉", "산소결핍", "빠짐·익사",
  "사업장 내 교통사고", "사업장 외 교통사고", "체육행사", "폭력행위",
  "동물상해", "업무상 질병", "기타",
];
const SEVERITIES = ["사망", "3일 이상 휴업", "3일 미만 휴업", "응급처치"];
const EMP_TYPES = ["직영", "계약", "도급·협력사"];
const COMP_STATUS = ["미신청(공상처리)", "신청·심사중", "승인", "불승인", "요양중", "치료종결"];

// ── 계산 헬퍼 ──
const accDatePart = (s) => String(s || "").slice(0, 10);      // "YYYY-MM-DD"
const addOneMonth = (ymd) => {
  const d = new Date(ymd + "T00:00:00");
  if (isNaN(d)) return "";
  const m = d.getMonth();
  d.setMonth(m + 1);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) => {
  const d1 = new Date(a + "T00:00:00"), d2 = new Date(b + "T00:00:00");
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.round((d2 - d1) / 86400000);
};
// 재해조사표 준수 계산: 해당없음 / 기한 내 / 기한 초과(+N일) / 미입력
const reportCompliance = (acc) => {
  const required = acc.severity === "사망" || acc.severity === "3일 이상 휴업";
  if (!required) return { key: "na", label: "해당없음", required: false };
  const occ = accDatePart(acc.occurredAt);
  const deadline = occ ? addOneMonth(occ) : "";
  const sub = accDatePart(acc.reportSubmittedDate);
  if (!sub) return { key: "missing", label: "미입력", required: true, deadline };
  const over = daysBetween(deadline, sub);
  if (over !== null && over > 0) return { key: "over", label: `기한 초과(+${over}일)`, required: true, deadline };
  return { key: "in", label: "기한 내", required: true, deadline };
};

const IndustrialAccidentView = ({ onNav, currentUser, role }) => {
  const [list, setList] = React.useState([]);
  const [canWrite, setCanWrite] = React.useState(false);
  const [sites, setSites] = React.useState([]);
  const [hqs, setHqs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState(null);
  const [editing, setEditing] = React.useState(null);   // null | "new" | accidentObj
  // 필터
  const [fHq, setFHq] = React.useState("전체");
  const [fType, setFType] = React.useState("전체");
  const [fSev, setFSev] = React.useState("전체");
  const [fComp, setFComp] = React.useState("전체");

  const reload = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      window.WV_API.getAccidents(),
      window.WV_API.getSites ? window.WV_API.getSites() : Promise.resolve([]),
      window.WV_API.getHQs ? window.WV_API.getHQs() : Promise.resolve([]),
    ]).then(([acc, siteData, hqData]) => {
      setList((acc && acc.accidents) || []);
      setCanWrite(!!(acc && acc.canWrite));
      setSites(Array.isArray(siteData) ? siteData : []);
      setHqs(Array.isArray(hqData) ? hqData : (hqData && hqData.hqs) || []);
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
    if (fComp !== "전체" && reportCompliance(a).label.replace(/\(.*\)/, "") !== fComp) return false;
    if (fHq !== "전체" && hqNameOfSite(a.siteId) !== fHq) return false;
    return true;
  }), [list, fType, fSev, fComp, fHq, siteMap, hqMap]);

  const del = async (a) => {
    if (!window.confirm(`이 재해 기록을 삭제할까요?\n(${siteName(a.siteId)} · ${accDatePart(a.occurredAt)})\n되돌릴 수 없습니다.`)) return;
    try { await window.WV_API.deleteAccident(a.id); setList(prev => prev.filter(x => x.id !== a.id)); }
    catch (e) { alert("삭제 실패: " + (e.message || "")); }
  };

  // ── 색 태그 ──
  const compChip = (a) => {
    const c = reportCompliance(a);
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

      {/* 통계 요약 */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, margin: "14px 0 18px" }}>
          {[
            { label: "전체 재해", value: list.length, color: "var(--primary)" },
            { label: "중대재해", value: list.filter(a => a.isSerious).length, color: "#dc2626" },
            { label: "조사표 기한초과", value: list.filter(a => reportCompliance(a).key === "over").length, color: "#b91c1c" },
            { label: "조사표 미입력", value: list.filter(a => reportCompliance(a).key === "missing").length, color: "#d97706" },
            { label: "조치 미완료", value: list.filter(a => !a.actionCompleted && a.preventionMeasures).length, color: "#7c3aed" },
          ].map(c => (
            <div key={c.label} className="card" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 필터 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <select className="field-input" style={{ width: "auto" }} value={fHq} onChange={e => setFHq(e.target.value)}>
          <option>전체</option>{hqs.map(h => <option key={h.id}>{h.name}</option>)}
        </select>
        <select className="field-input" style={{ width: "auto" }} value={fType} onChange={e => setFType(e.target.value)}>
          <option value="전체">발생형태 전체</option>{ACC_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="field-input" style={{ width: "auto" }} value={fSev} onChange={e => setFSev(e.target.value)}>
          <option value="전체">재해정도 전체</option>{SEVERITIES.map(t => <option key={t}>{t}</option>)}
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
                    <tr onClick={() => setExpandedId(open ? null : a.id)}
                      style={{ cursor: "pointer", background: a.isSerious ? "rgba(220,38,38,0.05)" : (open ? "var(--primary-soft)" : "transparent") }}>
                      <td style={TD}>
                        <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{hqNameOfSite(a.siteId) || "-"}</div>
                        <div style={{ fontWeight: 700 }}>{siteName(a.siteId)}{a.isSerious && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 800, color: "#dc2626" }}>● 중대재해</span>}</div>
                      </td>
                      <td style={{ ...TD, whiteSpace: "nowrap" }}>{accDatePart(a.occurredAt) || "-"}</td>
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
                            <Detail label="발생장소" v={a.location} />
                            <Detail label="고용형태" v={a.employmentType} />
                            <Detail label="기인물·가해물" v={a.agentObject} />
                            <Detail label="작업 내용" v={a.workDescription} />
                            <Detail label="재해 경위" v={a.circumstances} full />
                            <Detail label="휴업일수" v={a.lostDays != null ? `${a.lostDays}일` : ""} />
                            <Detail label="예상 복귀일" v={accDatePart(a.expectedReturnDate)} />
                            <Detail label="재해조사표 제출일" v={accDatePart(a.reportSubmittedDate)} />
                            <Detail label="재발방지대책" v={a.preventionMeasures} full />
                            <Detail label="조치 담당자" v={a.actionOwner} />
                            <Detail label="조치 기한" v={accDatePart(a.actionDueDate)} />
                            <Detail label="조치 완료" v={a.actionCompleted ? `완료 (${accDatePart(a.actionCompletedDate) || "-"})` : "미완료"} />
                            <Detail label="위험성평가 반영" v={a.riskReflected ? "반영함" : "미반영"} />
                            <Detail label="작성자" v={a.createdBy} />
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

const Detail = ({ label, v, full }) => (
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
    occurredDate: accDatePart(initial?.occurredAt) || "",
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
    expectedReturnDate: accDatePart(initial?.expectedReturnDate) || "",
    reportSubmittedDate: accDatePart(initial?.reportSubmittedDate) || "",
    compensationStatus: initial?.compensationStatus || "미신청(공상처리)",
    preventionMeasures: initial?.preventionMeasures || "",
    actionOwner: initial?.actionOwner || "",
    actionDueDate: accDatePart(initial?.actionDueDate) || "",
    actionCompleted: !!initial?.actionCompleted,
    actionCompletedDate: accDatePart(initial?.actionCompletedDate) || "",
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
  const preview = reportCompliance({ severity: f.severity, occurredAt: f.occurredDate, reportSubmittedDate: f.reportSubmittedDate });

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
              <select className="field-input" value={f.employmentType} onChange={e => upd("employmentType", e.target.value)}>{EMP_TYPES.map(t => <option key={t}>{t}</option>)}</select>
            </div>
            <div>
              <label style={L}>발생형태 *</label>
              <select className="field-input" value={f.accidentType} onChange={e => upd("accidentType", e.target.value)}>
                <option value="">— 선택 —</option>{ACC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={half}>
            <div>
              <label style={L}>재해정도 *</label>
              <select className="field-input" value={f.severity} onChange={e => upd("severity", e.target.value)}>
                <option value="">— 선택 —</option>{SEVERITIES.map(t => <option key={t}>{t}</option>)}
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
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-2)", marginBottom: 8 }}>재해조사표 (품의 기준 제출일)</div>
            <div style={half}>
              <div><label style={L}>제출일자</label><input type="date" className="field-input" value={f.reportSubmittedDate} onChange={e => upd("reportSubmittedDate", e.target.value)} /></div>
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8, fontSize: 12.5 }}>
                <span>대상 여부: <b>{preview.required ? "제출 대상" : "해당없음"}</b>
                  {preview.required && preview.deadline && <> · 기한 <b>{preview.deadline}</b> · <b style={{ color: preview.key === "over" ? "#b91c1c" : preview.key === "in" ? "#166534" : "#92400e" }}>{preview.label}</b></>}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label style={L}>산재 처리 상태</label>
            <select className="field-input" value={f.compensationStatus} onChange={e => upd("compensationStatus", e.target.value)}>{COMP_STATUS.map(t => <option key={t}>{t}</option>)}</select>
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

Object.assign(window, { IndustrialAccidentView });
