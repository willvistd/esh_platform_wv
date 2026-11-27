// 윌앤비전 - 중대재해처벌법 대응 (허브: 대응서류 목록 → 클릭 진입)
//   · '작성 필요'(사업장)와 '본사 제공'을 한눈에. 클릭하면 상세/작성 화면으로 진입.
//   · 각 서류의 이름·설명·주기는 관리자(admin·safety)가 팝업에서 직접 수정 → DB(app_settings) 저장.
//   · 작성 화면(훈련보고서·매뉴얼·예산 등)은 단계별로 추가.

// 대응서류 기본 목록 (설명은 관리자가 수정 가능 → 저장되면 이 기본값 위에 덮어씀)
//   owner: "site"(사업장 작성) | "hq"(본사 제공)
//   route: 작성/보기 화면 route 이름(아직 없으면 ready:false → '준비 중')
const SD_DOCS = [
  { id: "goal-policy",   name: "안전보건 목표 및 경영방침",        owner: "hq",   icon: "shield",     ready: false,
    desc: "전사 안전보건 목표와 경영방침. 본사에서 제공합니다." },
  { id: "dedicated-org", name: "안전보건 전담조직 설치",           owner: "hq",   icon: "users",      ready: false,
    desc: "안전보건 전담조직 구성 자료. 본사에서 제공합니다." },
  { id: "law-check",     name: "안전보건 관계법령 이행여부 점검",   owner: "site", icon: "check-square", ready: false,
    desc: "본사가 제공하는 체크리스트로 사업장이 이행 여부를 점검·작성합니다." },
  { id: "manual",        name: "중대재해 대비·대응 매뉴얼",         owner: "hq",   icon: "book",       ready: false, siteEdit: true,
    desc: "본사 제공 매뉴얼. 조직도·작성자·작성일자·비상연락망만 사업장에서 입력하면 본문에 자동 반영됩니다." },
  { id: "drill-report",  name: "반기 대응훈련 보고서",             owner: "site", icon: "alert",      ready: false, cycle: "반기 1회",
    desc: "시나리오를 고르면 기초 내용이 채워집니다. 사업장은 조직도·훈련날짜·장소·사진(4장)만 입력하면 됩니다." },
  { id: "budget",        name: "산업안전보건비용 예산",            owner: "site", icon: "chart",      ready: false, cycle: "연 1회",
    desc: "사업장 산출내역서를 바탕으로 예산을 작성합니다. 최초 작성 후 집행 실적 증빙을 기록해 두면 좋습니다." },
  { id: "manager-eval",  name: "안전보건관리책임자 등 평가 관리",   owner: "hq",   icon: "doc",        ready: false,
    desc: "안전보건관리책임자 등에 대한 평가 자료. 본사에서 제공합니다." },
];

const SD_SETTINGS_KEY = "serious_disaster_docs";

function SeriousDisasterHub({ onNav, currentUser }) {
  const canEdit = ["admin", "safety"].includes(currentUser && currentUser.role);
  const [over, setOver] = React.useState({});       // { id: {name, desc, cycle} }
  const [sel, setSel] = React.useState(null);        // 상세 팝업 대상 id
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", desc: "", cycle: "" });
  const [saving, setSaving] = React.useState(false);

  // 저장된 수정값 로드
  React.useEffect(() => {
    let alive = true;
    fetch("/api/settings/" + SD_SETTINGS_KEY)
      .then(r => r.json())
      .then(d => { if (alive && d && d.value && typeof d.value === "object") setOver(d.value); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // 기본값 + 수정값 병합
  const docs = SD_DOCS.map(d => ({ ...d, ...(over[d.id] || {}) }));
  const docById = (id) => docs.find(d => d.id === id);
  const current = sel ? docById(sel) : null;

  const siteDocs = docs.filter(d => d.owner === "site");
  const hqDocs = docs.filter(d => d.owner === "hq");

  const openDoc = (d) => { setSel(d.id); setEditing(false); };
  const startEdit = () => { setForm({ name: current.name || "", desc: current.desc || "", cycle: current.cycle || "" }); setEditing(true); };

  const saveEdit = async () => {
    setSaving(true);
    const next = { ...over, [sel]: { name: form.name.trim(), desc: form.desc.trim(), cycle: form.cycle.trim() } };
    try {
      await fetch("/api/settings/" + SD_SETTINGS_KEY, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: next }),
      });
      setOver(next);
      setEditing(false);
    } catch (e) {
      window.alert("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setSaving(false);
  };

  const OwnerBadge = ({ owner }) => (
    owner === "site"
      ? <span style={{ fontSize: 11, fontWeight: 800, color: "#b45309", background: "rgba(245,158,11,0.14)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 999, padding: "2px 9px" }}>작성 필요</span>
      : <span style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 999, padding: "2px 9px" }}>본사 제공</span>
  );

  const Card = ({ d }) => (
    <button
      onClick={() => openDoc(d)}
      style={{
        textAlign: "left", cursor: "pointer", width: "100%",
        background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--r-md)",
        padding: "16px 18px", boxShadow: "var(--shadow)", display: "flex", gap: 14, alignItems: "flex-start",
      }}>
      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center",
        background: d.owner === "site" ? "rgba(245,158,11,0.12)" : "rgba(59,130,246,0.1)",
        color: d.owner === "site" ? "#b45309" : "#1d4ed8" }}>
        <Icon name={d.icon} size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</span>
          <OwnerBadge owner={d.owner} />
          {d.cycle && <span style={{ fontSize: 11, color: "var(--fg-3)", background: "var(--bg-sunk)", border: "1px solid var(--line)", borderRadius: 999, padding: "2px 8px" }}>{d.cycle}</span>}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--fg-3)", lineHeight: 1.5 }}>{d.desc}</div>
      </div>
      <Icon name="chevron-right" size={16} style={{ color: "var(--fg-4)", flexShrink: 0, marginTop: 10 }} />
    </button>
  );

  const Section = ({ title, hint, list }) => (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{title}</h2>
        <span style={{ fontSize: 12, color: "var(--fg-4)" }}>{hint}</span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {list.map(d => <Card key={d.id} d={d} />)}
      </div>
    </div>
  );

  const inp = { width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13.5, background: "var(--bg)", color: "var(--fg-1)", boxSizing: "border-box" };

  return (
    <div className="content" style={{ maxWidth: 820 }}>
      <h1 className="content-title">중대재해처벌법 대응</h1>
      <p className="meta" style={{ marginTop: 4, marginBottom: 22 }}>
        중대재해처벌법 대응 서류를 한 곳에서 관리합니다. <b>작성 필요</b> 서류는 사업장에서 직접 작성하고, <b>본사 제공</b> 서류는 본사 자료를 확인하세요.
        {canEdit && <span style={{ color: "var(--fg-4)" }}> · 서류를 누르면 설명을 수정할 수 있습니다.</span>}
      </p>

      <Section title="사업장에서 작성" hint="사업장이 직접 작성·제출하는 서류" list={siteDocs} />
      <Section title="본사 제공" hint="본사에서 내려주는 자료 (확인·활용)" list={hqDocs} />

      {current && (
        <div onClick={() => setSel(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--bg-elev)", borderRadius: "var(--r-lg, 14px)", maxWidth: 480, width: "100%", padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center",
                background: current.owner === "site" ? "rgba(245,158,11,0.12)" : "rgba(59,130,246,0.1)",
                color: current.owner === "site" ? "#b45309" : "#1d4ed8" }}>
                <Icon name={current.icon} size={20} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>{editing ? "서류 설명 수정" : current.name}</div>
            </div>

            {editing ? (
              <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-3)" }}>서류 이름
                  <input style={{ ...inp, marginTop: 4 }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-3)" }}>주기 (없으면 비워두기)
                  <input style={{ ...inp, marginTop: 4 }} value={form.cycle} onChange={e => setForm(f => ({ ...f, cycle: e.target.value }))} placeholder="예: 반기 1회 / 연 1회" />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-3)" }}>설명
                  <textarea style={{ ...inp, marginTop: 4, minHeight: 96, resize: "vertical", lineHeight: 1.6 }} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
                </label>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  <OwnerBadge owner={current.owner} />
                  {current.cycle && <span style={{ fontSize: 11, color: "var(--fg-3)", background: "var(--bg-sunk)", border: "1px solid var(--line)", borderRadius: 999, padding: "2px 8px" }}>{current.cycle}</span>}
                </div>
                <p style={{ fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.6, margin: "0 0 18px", whiteSpace: "pre-wrap" }}>{current.desc}</p>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div>
                {canEdit && !editing && (
                  <button className="btn btn-secondary" onClick={startEdit}>✎ 설명 수정</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {editing ? (
                  <>
                    <button className="btn btn-secondary" onClick={() => setEditing(false)} disabled={saving}>취소</button>
                    <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-secondary" onClick={() => setSel(null)}>닫기</button>
                    {current.ready && current.route
                      ? <button className="btn btn-primary" onClick={() => { const r = current.route; setSel(null); onNav({ name: r }); }}>
                          {current.owner === "site" ? "작성하기" : "열기"}
                        </button>
                      : <button className="btn btn-primary" disabled style={{ opacity: 0.55, cursor: "default" }}>작성 화면 준비 중</button>}
                  </>
                )}
              </div>
            </div>
            {!editing && !current.ready && (
              <p style={{ fontSize: 11.5, color: "var(--fg-4)", margin: "12px 0 0", textAlign: "right" }}>
                작성·보기 화면은 순차적으로 추가됩니다.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { SeriousDisasterHub });
