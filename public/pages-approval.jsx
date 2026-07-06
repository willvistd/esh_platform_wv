// 윌앤비전 - 결재 기능

// ── 결재 작성 ──
const ApprovalCompose = ({ onNav, currentUser, categories }) => {
  const D = window.WV_DATA;
  const users = D.users || [];
  const approvalCats = (categories || D.categories).filter(c => c.approval);

  const [form, setForm] = React.useState({
    title: "", content: "", categoryId: approvalCats[0]?.id || "",
    preservePeriod: "영구", referrers: "", recipients: "",
  });
  const [lines, setLines] = React.useState([
    { step: 1, type: "기안", userId: currentUser?.id || "", userName: currentUser?.name || "", userDept: currentUser?.dept || "", status: "draft" },
    { step: 2, type: "결재", userId: "", userName: "", userDept: "", status: "pending" },
  ]);
  const [saving, setSaving] = React.useState(false);

  const addLine = () => setLines(prev => [...prev, { step: prev.length + 1, type: "결재", userId: "", userName: "", userDept: "", status: "pending" }]);
  const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i, key, val) => {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      if (key === "userId") {
        const u = users.find(u => String(u.id) === val);
        return { ...l, userId: val, userName: u?.name || "", userDept: u?.dept || "" };
      }
      return { ...l, [key]: val };
    }));
  };

  const submit = async () => {
    if (!form.title) return alert("제목을 입력해주세요.");
    if (lines.filter(l => l.type === "결재" && !l.userId).length > 0) return alert("결재자를 선택해주세요.");
    setSaving(true);
    try {
      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          categoryId: form.categoryId,
          authorId: currentUser?.id || "",
          authorName: currentUser?.name || "",
          authorDept: currentUser?.dept || "",
          preservePeriod: form.preservePeriod,
          approvalLines: lines,
          referrers: form.referrers,
          recipients: form.recipients,
        }),
      });
      onNav({ name: "approval-inbox" });
    } catch(e) { alert("저장 실패"); }
    setSaving(false);
  };

  return (
    <div className="content" style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={() => onNav({ name: "approval-inbox" })}>
          <Icon name="arrow-left" size={14} /> 돌아가기
        </button>
      </div>
      <h1 className="content-title">결재 기안</h1>

      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        {/* 기본 정보 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <div className="field-label">기안부서</div>
            <input className="field-input" value={currentUser?.dept || ""} readOnly />
          </div>
          <div>
            <div className="field-label">기안일</div>
            <input className="field-input" value={new Date().toLocaleDateString("ko-KR")} readOnly />
          </div>
          <div>
            <div className="field-label">기안자</div>
            <input className="field-input" value={currentUser?.name || ""} readOnly />
          </div>
          <div>
            <div className="field-label">보존연한</div>
            <select className="field-select" value={form.preservePeriod} onChange={e => setForm(s => ({ ...s, preservePeriod: e.target.value }))}>
              {["영구", "10년", "5년", "3년", "1년"].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* 카테고리 */}
        <div style={{ marginBottom: 16 }}>
          <div className="field-label">카테고리</div>
          <select className="field-select" value={form.categoryId} onChange={e => setForm(s => ({ ...s, categoryId: e.target.value }))}>
            {approvalCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* 제목 */}
        <div style={{ marginBottom: 16 }}>
          <div className="field-label">제목</div>
          <input className="field-input" value={form.title} onChange={e => setForm(s => ({ ...s, title: e.target.value }))} placeholder="결재 제목을 입력하세요" />
        </div>

        {/* 내용 */}
        <div style={{ marginBottom: 16 }}>
          <div className="field-label">내용</div>
          <textarea className="field-textarea" style={{ minHeight: 200 }} value={form.content}
            onChange={e => setForm(s => ({ ...s, content: e.target.value }))} placeholder="내용을 입력하세요" />
        </div>

        {/* 열람 / 수신 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <div className="field-label">열람 (쉼표로 구분)</div>
            <input className="field-input" value={form.referrers} onChange={e => setForm(s => ({ ...s, referrers: e.target.value }))} placeholder="예: 김혜현, 송병학" />
          </div>
          <div>
            <div className="field-label">수신부서</div>
            <input className="field-input" value={form.recipients} onChange={e => setForm(s => ({ ...s, recipients: e.target.value }))} placeholder="예: 경영지원본부" />
          </div>
        </div>
      </div>

      {/* 결재선 */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>결재선</div>
          <button className="btn btn-secondary btn-sm" onClick={addLine}>
            <Icon name="plus" size={12} /> 결재자 추가
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {lines.map((line, i) => (
            <div key={i} style={{
              border: "1px solid var(--line-2)", borderRadius: 8, padding: 16,
              minWidth: 140, textAlign: "center", position: "relative", background: "var(--bg-2)"
            }}>
              {i > 1 && (
                <button onClick={() => removeLine(i)} style={{
                  position: "absolute", top: 4, right: 4, background: "none", border: "none",
                  cursor: "pointer", color: "var(--fg-3)", fontSize: 14
                }}>✕</button>
              )}
              <select className="field-select" style={{ fontSize: 11, marginBottom: 8 }}
                value={line.type} onChange={e => updateLine(i, "type", e.target.value)}
                disabled={i === 0}>
                <option value="기안">기안</option>
                <option value="결재">결재</option>
                <option value="합의">합의</option>
              </select>
              {i === 0 ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{line.userName}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{line.userDept}</div>
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>기안</div>
                </>
              ) : (
                <select className="field-select" style={{ fontSize: 12 }}
                  value={line.userId} onChange={e => updateLine(i, "userId", e.target.value)}>
                  <option value="">결재자 선택</option>
                  {users.filter(u => ["admin", "safety", "manager"].includes(u.role)).map(u => (
                    <option key={u.id} value={String(u.id)}>{u.name} ({u.dept})</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => onNav({ name: "approval-inbox" })}>취소</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? <span className="login-spinner" /> : <><Icon name="check" size={14} /> 기안하기</>}
        </button>
      </div>
    </div>
  );
};

// ── 결재 상세 ──
const ApprovalDetail = ({ onNav, docId, currentUser }) => {
  const [doc, setDoc] = React.useState(null);
  const [actions, setActions] = React.useState([]);
  const [comment, setComment] = React.useState("");
  const [acting, setActing] = React.useState(false);

  const load = () => {
    fetch(`/api/approvals/${docId}`)
      .then(r => r.json())
      .then(data => {
        setDoc(data.approval);
        setActions(data.actions || []);
      }).catch(() => {});
  };

  React.useEffect(() => { load(); }, [docId]);

  if (!doc) return <div className="content"><p>불러오는 중...</p></div>;

  const lines = JSON.parse(doc.approvalLines || "[]");
  const myLine = lines.find((l, i) => i > 0 && String(l.userId) === String(currentUser?.id));
  const myAction = actions.find(a => String(a.userId) === String(currentUser?.id));
  const canAct = myLine && !myAction && doc.status === "pending";

  const act = async (action) => {
    if (!canAct) return;
    setActing(true);
    try {
      await fetch(`/api/approvals/${docId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id,
          userName: currentUser?.name,
          userDept: currentUser?.dept,
          action, comment,
          step: myLine?.step || 0,
        }),
      });
      load();
      setComment("");
    } catch(e) { alert("처리 실패"); }
    setActing(false);
  };

  const statusColor = { pending: "#f59e0b", approved: "#10b981", rejected: "#ef4444" };
  const statusLabel = { pending: "결재 대기", approved: "결재 완료", rejected: "반려" };

  return (
    <div className="content" style={{ maxWidth: 860 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .approval-doc { box-shadow: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={() => onNav({ name: "approval-inbox" })}>
          <Icon name="arrow-left" size={14} /> 돌아가기
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
          <Icon name="printer" size={13} /> PDF 출력
        </button>
      </div>

      <div className="card approval-doc" style={{ padding: 32 }}>
        {/* 제목 */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>품 의 서</h1>
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>윌앤비전</div>
        </div>

        {/* 결재란 */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              <tr>
                {lines.map((l, i) => (
                  <td key={i} style={{ border: "1px solid #ccc", padding: "6px 16px", textAlign: "center", minWidth: 80 }}>
                    {l.type}
                  </td>
                ))}
              </tr>
              <tr>
                {lines.map((l, i) => {
                  const action = actions.find(a => String(a.userId) === String(l.userId));
                  return (
                    <td key={i} style={{ border: "1px solid #ccc", padding: "16px 16px", textAlign: "center", minWidth: 80, minHeight: 60 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{l.userName}</div>
                      {action && (
                        <div style={{ fontSize: 10, color: action.action === "approve" ? "#10b981" : "#ef4444", marginTop: 4 }}>
                          {action.action === "approve" ? "승인" : "반려"}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                {lines.map((l, i) => {
                  const action = actions.find(a => String(a.userId) === String(l.userId));
                  return (
                    <td key={i} style={{ border: "1px solid #ccc", padding: "4px 8px", textAlign: "center", fontSize: 10, color: "var(--fg-3)" }}>
                      {action ? new Date(action.actedAt).toLocaleDateString("ko-KR") : "-"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* 기본 정보 */}
        <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 20, fontSize: 13 }}>
          <tbody>
            {[
              ["기안부서", doc.authorDept],
              ["기안일", new Date(doc.createdAt).toLocaleDateString("ko-KR")],
              ["기안자", doc.authorName],
              ["보존연한", doc.preservePeriod],
            ].map(([label, value]) => (
              <tr key={label}>
                <td style={{ border: "1px solid #ccc", padding: "6px 12px", background: "var(--bg-2)", fontWeight: 600, width: 100 }}>{label}</td>
                <td style={{ border: "1px solid #ccc", padding: "6px 12px", width: 200 }}>{value}</td>
                <td style={{ border: "1px solid #ccc", padding: "6px 12px" }}></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 열람/수신 */}
        {(doc.referrers || doc.recipients) && (
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 20, fontSize: 13 }}>
            <tbody>
              {doc.referrers && (
                <tr>
                  <td style={{ border: "1px solid #ccc", padding: "6px 12px", background: "var(--bg-2)", fontWeight: 600, width: 100 }}>열람</td>
                  <td style={{ border: "1px solid #ccc", padding: "6px 12px" }}>{doc.referrers}</td>
                </tr>
              )}
              {doc.recipients && (
                <tr>
                  <td style={{ border: "1px solid #ccc", padding: "6px 12px", background: "var(--bg-2)", fontWeight: 600, width: 100 }}>수신부서</td>
                  <td style={{ border: "1px solid #ccc", padding: "6px 12px" }}>{doc.recipients}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* 제목 */}
        <div style={{ border: "1px solid #ccc", padding: "10px 16px", marginBottom: 20, fontWeight: 600, fontSize: 14 }}>
          제목: {doc.title}
        </div>

        {/* 본문 */}
        <div style={{ border: "1px solid #ccc", padding: 20, minHeight: 200, fontSize: 13, lineHeight: 1.8 }}>
          {(doc.content || "").split("\n").map((line, i) => <p key={i} style={{ margin: "4px 0" }}>{line || "\u00A0"}</p>)}
        </div>

        {/* 상태 */}
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>결재 상태:</span>
          <span style={{ color: statusColor[doc.status] || "#666", fontWeight: 700 }}>
            {statusLabel[doc.status] || doc.status}
          </span>
        </div>
      </div>

      {/* 결재 액션 */}
      {canAct && (
        <div className="card no-print" style={{ padding: 24, marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>결재 처리</div>
          <textarea className="field-textarea" style={{ minHeight: 80, marginBottom: 12 }}
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder="의견을 남겨주세요 (선택)" />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={() => act("reject")} disabled={acting}>
              반려
            </button>
            <button className="btn btn-primary" onClick={() => act("approve")} disabled={acting}>
              {acting ? <span className="login-spinner" /> : "승인"}
            </button>
          </div>
        </div>
      )}

      {/* 결재 이력 */}
      {actions.length > 0 && (
        <div className="card no-print" style={{ padding: 24, marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>결재 이력</div>
          {actions.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid var(--line-2)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: a.action === "approve" ? "#10b981" : "#ef4444",
                color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {a.action === "approve" ? "승" : "반"}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.userName} <span style={{ color: "var(--fg-3)", fontWeight: 400 }}>· {a.userDept}</span></div>
                <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{new Date(a.actedAt).toLocaleString("ko-KR")}</div>
                {a.comment && <div style={{ fontSize: 12, marginTop: 4, color: "var(--fg-2)" }}>{a.comment}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 결재함 (목록) ──
const ApprovalInbox = ({ onNav, currentUser, categories }) => {
  const [tab, setTab] = React.useState("mine");
  const [docs, setDocs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/approvals")
      .then(r => r.json())
      .then(data => { setDocs(data.approvals || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const approvalCats = (categories || window.WV_DATA.categories).filter(c => c.approval);

  const mine = docs.filter(d => String(d.authorId) === String(currentUser?.id));
  const pending = docs.filter(d => {
    const lines = JSON.parse(d.approvalLines || "[]");
    return d.status === "pending" && lines.some(l => String(l.userId) === String(currentUser?.id));
  });

  const statusColor = { pending: "#f59e0b", approved: "#10b981", rejected: "#ef4444" };
  const statusLabel = { pending: "대기", approved: "완료", rejected: "반려" };

  const list = tab === "mine" ? mine : tab === "pending" ? pending : docs;

  return (
    <div className="content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 className="content-title">결재함</h1>
          <div className="content-sub">기안 및 결재 현황을 확인할 수 있습니다.</div>
        </div>
        {approvalCats.length > 0 && (
          <button className="btn btn-primary" onClick={() => onNav({ name: "approval-compose" })}>
            <Icon name="plus" size={14} /> 기안하기
          </button>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[
          { id: "mine", label: `내 기안 (${mine.length})` },
          { id: "pending", label: `결재 대기 (${pending.length})` },
          { id: "all", label: `전체 (${docs.length})` },
        ].map(t => (
          <button key={t.id} className={"btn " + (tab === t.id ? "btn-primary" : "btn-ghost")}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--fg-3)" }}>불러오는 중...</div>
      ) : list.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--fg-3)" }}>
          문서가 없습니다.
        </div>
      ) : (
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--line-2)" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--fg-3)", fontSize: 11 }}>제목</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--fg-3)", fontSize: 11 }}>기안자</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--fg-3)", fontSize: 11 }}>기안일</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--fg-3)", fontSize: 11 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map(d => (
                <tr key={d.id} style={{ borderBottom: "1px solid var(--line-2)", cursor: "pointer" }}
                  onClick={() => onNav({ name: "approval-detail", id: d.id })}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{d.title}</td>
                  <td style={{ padding: "12px 16px", color: "var(--fg-2)" }}>{d.authorName}</td>
                  <td style={{ padding: "12px 16px", color: "var(--fg-3)" }}>{new Date(d.createdAt).toLocaleDateString("ko-KR")}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: statusColor[d.status], fontWeight: 600, fontSize: 12 }}>
                      ● {statusLabel[d.status] || d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// 가입 승인 관리 (기존 유지)
const SignupApprovalView = ({ onNav, currentUser }) => {
  const D = window.WV_DATA;
  const role = currentUser?.role || "staff";
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/users")
      .then(r => r.json())
      .then(data => {
        setUsers((data.users || []).filter(u => u.status === "inactive" || !u.status));
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  const approve = async (u) => {
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...u, status: "active" }),
    });
    setUsers(prev => prev.filter(x => x.id !== u.id));
  };

  return (
    <div className="content">
      <h1 className="content-title">가입 승인 관리</h1>
      {loading ? <p>불러오는 중...</p> : users.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--fg-3)" }}>승인 대기 중인 계정이 없습니다.</div>
      ) : users.map(u => (
        <div key={u.id} className="card" style={{ padding: 16, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{u.name}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{u.email} · {u.dept}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => approve(u)}>승인</button>
        </div>
      ))}
    </div>
  );
};

Object.assign(window, { ApprovalInbox, ApprovalCompose, ApprovalDetail, SignupApprovalView });
