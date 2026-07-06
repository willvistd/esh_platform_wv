// 윌앤비전 - 종사자 의견 청취 (네이버폼 기반 구조)

// 제안 내용 7개 카테고리 (네이버폼과 동일)
const FEEDBACK_CATEGORIES = [
  { id: "work-content",    label: "작업내용",      icon: "doc",        color: "#3b82f6" },
  { id: "work-env",        label: "작업환경",      icon: "alert",      color: "#10b981" },
  { id: "safety-mgmt",     label: "안전경영",      icon: "shield",     color: "#f59e0b" },
  { id: "health",          label: "건강관리(보건)", icon: "body",       color: "#06b6d4" },
  { id: "policy",          label: "제도(규정·규칙) 운영", icon: "book",  color: "#8b5cf6" },
  { id: "emotion",         label: "감정·심리",     icon: "user",       color: "#ec4899" },
  { id: "etc",             label: "기타",          icon: "more-horizontal", color: "#94a3b8" },
];

// 종사자 의견 작성 폼 (사용자용)
const WorkerFeedbackForm = ({ onNav, currentUser }) => {
  const [form, setForm] = React.useState({
    privacyAgreed: false,
    hqId: currentUser?.hqId || "",
    siteName: "",
    reporterName: currentUser?.name || "",
    category: "",
    detail: "",
    improvementSuggestion: "",
  });
  const [hqs, setHQs] = React.useState([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);
  const upd = (k, v) => setForm(s => ({ ...s, [k]: v }));

  React.useEffect(() => {
    if (window.WV_API?.getHQs) {
      window.WV_API.getHQs().then(d => setHQs(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!form.privacyAgreed) { setError("개인정보 수집·이용에 동의해주세요."); return; }
    if (!form.hqId) { setError("소속 구분을 선택해주세요."); return; }
    if (!form.siteName.trim()) { setError("부서명 또는 사업장명을 입력해주세요."); return; }
    if (!form.reporterName.trim()) { setError("제보자 성함을 입력해주세요."); return; }
    if (!form.category) { setError("제안 내용 유형을 선택해주세요."); return; }
    if (!form.detail.trim()) { setError("상세 내용을 입력해주세요."); return; }

    setSubmitting(true);
    try {
      const res = await window.WV_API.submitWorkerFeedback({
        ...form,
        isAnonymous: false,
        submitterUserId: currentUser?.id || null,
      });
      if (res && res.success) {
        setDone(true);
      } else {
        setError(res?.error || "제출 실패. 다시 시도해주세요.");
      }
    } catch (e) {
      setError("서버 연결 실패: " + (e.message || ""));
    }
    setSubmitting(false);
  };

  // 제출 완료 화면
  if (done) {
    return (
      <div className="content" style={{ maxWidth: 720 }}>
        <div className="bcr" onClick={() => onNav({ name: "dashboard" })}>
          <Icon name="arrow-left" size={14} /> 대시보드
        </div>
        <div className="wf-done">
          <div className="wf-done-icon"><Icon name="check-circle" size={40} /></div>
          <h2>의견이 정상 접수되었습니다</h2>
          <p>
            안전팀이 검토 후 회신드립니다.<br/>
            소중한 의견 감사합니다. 안전 최우선 문화 정착에 큰 도움이 됩니다.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => {
              setDone(false);
              setForm(s => ({ ...s, category: "", detail: "", improvementSuggestion: "", siteName: "" }));
            }}>또 다른 의견 작성</button>
            <button className="btn btn-primary" onClick={() => onNav({ name: "dashboard" })}>
              <Icon name="home" size={14} /> 대시보드로
            </button>
          </div>
        </div>
        <style>{`
          .wf-done {
            background: var(--bg-elev); border: 1px solid var(--line);
            border-radius: 16px; padding: 48px 40px;
            text-align: center;
            box-shadow: 0 8px 32px -16px rgba(15,23,42,.12);
          }
          .wf-done-icon {
            display: inline-grid; place-items: center;
            width: 84px; height: 84px; border-radius: 50%;
            background: color-mix(in oklab, var(--success) 14%, transparent);
            color: var(--success); margin: 0 auto 20px;
            box-shadow: 0 6px 28px -10px color-mix(in oklab, var(--success) 50%, transparent);
          }
          .wf-done h2 { font-size: 24px; font-weight: 700; margin: 0 0 12px; }
          .wf-done p { color: var(--fg-3); line-height: 1.6; font-size: 14px; margin: 0; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="content" style={{ maxWidth: 820 }}>
      <div className="bcr" onClick={() => onNav({ name: "category", id: "--" })}>
        <Icon name="arrow-left" size={14} /> 종사자 의견 청취
      </div>

      {/* 헤더 카드 */}
      <div className="wf-hero">
        <div className="wf-hero-icon"><Icon name="comment" size={28} /></div>
        <h1>(주)윌앤비전 종사자 의견 청취</h1>
        <p>
          (주)윌앤비전은 안전보건 경영방침에 따라 종사자의 안전보건 관련 의견 청취를 진행하고 있습니다.<br/>
          <span style={{ color: "var(--fg-3)", fontSize: 12 }}>[관련법률 - 중대재해 처벌등에 관한 법률 시행령 제4조 7호]</span><br/>
          귀하의 소중한 제보가 안전 최우선 문화 정착을 위한 초석이 됩니다.
        </p>
        <div className="wf-hero-notice">
          <div>※ 제보 내용은 사업장 안전보건 개선을 목적으로만 활용 예정이며, 제보로 인한 불이익은 금지됩니다.</div>
          <div>※ 개선 기여도가 높은 우수 제보 건은 포상할 수 있습니다.</div>
        </div>
      </div>

      {/* 1. 개인정보 수집 동의 */}
      <section className="wf-section">
        <header className="wf-sec-hd">
          <span className="wf-sec-num">1</span>
          <div>
            <div className="wf-sec-title">개인정보 수집 및 이용 동의 <span className="wf-req">*</span></div>
            <div className="wf-sec-sub">동의를 거부하실 수 있으나 설문 참여가 불가능합니다.</div>
          </div>
        </header>
        <div className="wf-privacy">
          <div className="wf-privacy-row"><span>수집하는 개인정보 항목</span><b>이름, 휴대폰 번호, 이메일 주소</b></div>
          <div className="wf-privacy-row"><span>수집 및 이용 목적</span><b>안전보건 의견 접수 및 결과 안내</b></div>
          <div className="wf-privacy-row"><span>보유 및 이용기간</span><b style={{ color: "var(--danger)" }}>안전보건 의견 접수일로부터 3년</b></div>
        </div>
        <label className="wf-checkbox">
          <input type="checkbox" checked={form.privacyAgreed} onChange={e => upd("privacyAgreed", e.target.checked)} />
          <span className="wf-check-box" />
          <span style={{ fontWeight: 600 }}>개인정보 수집 및 이용에 동의합니다.</span>
        </label>
      </section>

      {/* 2. 소속 구분 */}
      <section className="wf-section">
        <header className="wf-sec-hd">
          <span className="wf-sec-num">2</span>
          <div>
            <div className="wf-sec-title">소속 구분 <span className="wf-req">*</span></div>
          </div>
        </header>
        <select className="field-select" value={form.hqId || ""} onChange={e => upd("hqId", e.target.value)}>
          <option value="">답변을 선택해주세요</option>
          {hqs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </section>

      {/* 3. 부서명/사업장명 */}
      <section className="wf-section">
        <header className="wf-sec-hd">
          <span className="wf-sec-num">3</span>
          <div>
            <div className="wf-sec-title">부서명 또는 사업장명 <span className="wf-req">*</span></div>
          </div>
        </header>
        <input className="field-input" placeholder="참여자의 답변 입력란 (최대 100자)"
          maxLength={100} value={form.siteName} onChange={e => upd("siteName", e.target.value)} />
      </section>

      {/* 4. 제보자 성함 */}
      <section className="wf-section">
        <header className="wf-sec-hd">
          <span className="wf-sec-num">4</span>
          <div>
            <div className="wf-sec-title">제보자 성함 <span className="wf-req">*</span></div>
          </div>
        </header>
        <input className="field-input" placeholder="이름을 입력해주세요"
          value={form.reporterName}
          onChange={e => upd("reporterName", e.target.value)} />
      </section>

      {/* 5. 제안 내용 (카테고리 선택) */}
      <section className="wf-section">
        <header className="wf-sec-hd">
          <span className="wf-sec-num">5</span>
          <div>
            <div className="wf-sec-title">제안 내용 <span className="wf-req">*</span></div>
            <div className="wf-sec-sub">해당하는 유형을 선택해주세요</div>
          </div>
        </header>
        <div className="wf-radio-list">
          {FEEDBACK_CATEGORIES.map(c => (
            <label key={c.id} className={"wf-radio-item" + (form.category === c.id ? " active" : "")}
              style={{ "--rc": c.color }}>
              <input type="radio" name="category" value={c.id}
                checked={form.category === c.id}
                onChange={e => upd("category", e.target.value)} />
              <span className="wf-radio-dot" />
              <span className="wf-radio-ico" style={{ color: form.category === c.id ? c.color : "var(--fg-4)" }}>
                <Icon name={c.icon} size={15} />
              </span>
              <span className="wf-radio-label">{c.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* 6. 상세 내용 */}
      <section className="wf-section">
        <header className="wf-sec-hd">
          <span className="wf-sec-num">6</span>
          <div>
            <div className="wf-sec-title">상세 내용 <span className="wf-req">*</span></div>
            <div className="wf-sec-sub">
              · 사실에 근거한 내용을 구체적으로 작성해 주십시오.<br/>
              · 개인정보 입력을 금지합니다.
            </div>
          </div>
        </header>
        <textarea className="field-textarea" maxLength={2000}
          placeholder="참여자의 답변 입력란 (최대 2000자)"
          style={{ minHeight: 160 }}
          value={form.detail} onChange={e => upd("detail", e.target.value)} />
        <div className="wf-counter">{(form.detail || "").length} / 2000</div>
      </section>

      {/* 7. 개선 의견 (선택) */}
      <section className="wf-section">
        <header className="wf-sec-hd">
          <span className="wf-sec-num">7</span>
          <div>
            <div className="wf-sec-title">개선 의견 <span className="wf-optional">(선택)</span></div>
            <div className="wf-sec-sub">더 나은 근무 환경을 위해 본사에 바라는 점이나, 현재 근무지에서 꼭 개선되었으면 하는 사항을 자유롭게 적어주세요.</div>
          </div>
        </header>
        <textarea className="field-textarea" maxLength={2000}
          placeholder="참여자의 답변 입력란 (최대 2000자)"
          style={{ minHeight: 120 }}
          value={form.improvementSuggestion} onChange={e => upd("improvementSuggestion", e.target.value)} />
        <div className="wf-counter">{(form.improvementSuggestion || "").length} / 2000</div>
      </section>

      {/* 에러 + 제출 */}
      {error && (
        <div className="login-error" style={{ margin: "16px 0", padding: "12px 16px" }}>
          <Icon name="alert" size={14} /> {error}
        </div>
      )}
      <div className="wf-actions">
        <div className="wf-actions-info">
          <Icon name="shield-check" size={13} /> 설문에 참여해 주셔서 감사합니다.
        </div>
        <button className="btn btn-primary wf-submit" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <span className="login-spinner" /> : <><Icon name="check" size={15} /> 제출하기</>}
        </button>
      </div>

      <style>{`
        /* Hero 카드 */
        .wf-hero {
          background: linear-gradient(135deg, var(--bg-elev), color-mix(in oklab, var(--primary) 4%, var(--bg-elev)));
          border: 1px solid var(--line);
          border-radius: 16px; padding: 28px 32px; margin-bottom: 20px;
          box-shadow: 0 4px 20px -10px rgba(15,23,42,.10);
        }
        .wf-hero-icon {
          display: inline-grid; place-items: center;
          width: 56px; height: 56px; border-radius: 14px;
          background: var(--primary-soft); color: var(--primary);
          margin-bottom: 14px;
        }
        .wf-hero h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.012em; margin: 0 0 12px; }
        .wf-hero p { color: var(--fg-2); line-height: 1.65; margin: 0; font-size: 13.5px; }
        .wf-hero-notice {
          margin-top: 14px; padding: 12px 14px;
          background: color-mix(in oklab, var(--warning) 8%, transparent);
          border-left: 3px solid var(--warning);
          border-radius: 6px;
          font-size: 12px; color: var(--fg-2); line-height: 1.6;
        }

        /* 섹션 카드 */
        .wf-section {
          background: var(--bg-elev); border: 1px solid var(--line);
          border-radius: 14px; padding: 24px 28px;
          margin-bottom: 14px;
          box-shadow: 0 1px 3px rgba(15,23,42,.04);
          transition: box-shadow .2s, border-color .2s;
        }
        .wf-section:focus-within {
          border-color: color-mix(in oklab, var(--primary) 28%, var(--line));
          box-shadow: 0 4px 18px -8px color-mix(in oklab, var(--primary) 24%, transparent);
        }
        .wf-sec-hd { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--line-2); }
        .wf-sec-num {
          width: 30px; height: 30px; border-radius: 9px;
          display: grid; place-items: center;
          background: linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 70%, #fff));
          color: #fff; font-weight: 800; font-size: 13px;
          flex-shrink: 0;
          box-shadow: 0 3px 10px -3px color-mix(in oklab, var(--primary) 50%, transparent);
        }
        .wf-sec-title { font-size: 14.5px; font-weight: 700; color: var(--fg); }
        .wf-sec-sub { font-size: 12px; color: var(--fg-3); margin-top: 3px; line-height: 1.5; }
        .wf-req { color: var(--danger); margin-left: 4px; font-weight: 700; }
        .wf-optional { font-size: 11px; color: var(--fg-4); font-weight: 400; margin-left: 4px; }

        /* 개인정보 박스 */
        .wf-privacy {
          background: var(--bg-sunk); border-radius: 10px;
          padding: 12px 16px; margin-bottom: 12px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .wf-privacy-row { display: flex; gap: 12px; font-size: 12.5px; align-items: center; }
        .wf-privacy-row span { color: var(--fg-3); width: 160px; flex-shrink: 0; }
        .wf-privacy-row b { color: var(--fg); font-weight: 600; }

        /* 체크박스 */
        .wf-checkbox {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 12px 14px;
          background: var(--bg-sunk); border: 1.5px solid var(--line);
          border-radius: 10px;
          cursor: pointer; transition: all .15s;
          font-size: 13.5px;
        }
        .wf-checkbox:has(input:checked) {
          border-color: var(--primary);
          background: var(--primary-soft);
          color: var(--primary);
        }
        .wf-checkbox input { display: none; }
        .wf-check-box {
          width: 18px; height: 18px; border-radius: 5px;
          border: 1.5px solid var(--fg-4); background: var(--bg-elev);
          display: grid; place-items: center; flex-shrink: 0;
          transition: all .15s;
        }
        .wf-checkbox:has(input:checked) .wf-check-box {
          background: var(--primary); border-color: var(--primary);
          box-shadow: 0 1px 3px color-mix(in oklab, var(--primary) 30%, transparent);
        }
        .wf-checkbox:has(input:checked) .wf-check-box::after {
          content: "✓"; color: #fff; font-weight: 700; font-size: 13px;
        }

        /* 라디오 리스트 (제안 내용) */
        .wf-radio-list { display: flex; flex-direction: column; gap: 6px; }
        .wf-radio-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          border: 1.5px solid var(--line); border-radius: 10px;
          background: var(--bg-elev); cursor: pointer;
          transition: all .15s;
        }
        .wf-radio-item:hover { background: var(--bg-sunk); }
        .wf-radio-item.active {
          border-color: var(--rc);
          background: color-mix(in oklab, var(--rc) 8%, var(--bg-elev));
        }
        .wf-radio-item input { display: none; }
        .wf-radio-dot {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid var(--fg-4); background: var(--bg-elev);
          flex-shrink: 0; position: relative;
          transition: all .15s;
        }
        .wf-radio-item.active .wf-radio-dot {
          border-color: var(--rc);
        }
        .wf-radio-item.active .wf-radio-dot::after {
          content: ""; position: absolute;
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--rc);
        }
        .wf-radio-ico { display: grid; place-items: center; transition: color .15s; }
        .wf-radio-label { font-size: 13.5px; font-weight: 500; color: var(--fg); }
        .wf-radio-item.active .wf-radio-label { color: var(--rc); font-weight: 700; }

        /* 글자 카운터 */
        .wf-counter {
          text-align: right; font-size: 11px; color: var(--fg-4);
          margin-top: 4px;
        }

        /* 액션 */
        .wf-actions {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          padding: 20px 0 40px;
        }
        .wf-actions-info {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; color: var(--fg-3);
        }
        .wf-actions-info svg { color: var(--success); }
        .wf-submit {
          height: 52px; font-size: 15px; font-weight: 700;
          border-radius: 12px; min-width: 240px;
          box-shadow: 0 8px 24px -10px color-mix(in oklab, var(--primary) 55%, transparent);
        }
      `}</style>
    </div>
  );
};

// 안전팀용 의견 관리 화면
const WorkerFeedbackList = ({ onNav, role }) => {
  const D = window.WV_DATA;
  const can = D.can[role] || D.can["staff"];
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [detail, setDetail] = React.useState(null);

  const load = () => {
    setLoading(true);
    window.WV_API.getWorkerFeedback().then(d => {
      setList(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  React.useEffect(() => { load(); }, []);

  if (!can.approve) {
    return <div className="content"><h2>접근 권한이 없습니다.</h2></div>;
  }

  const filtered = list.filter(f => statusFilter === "all" || f.status === statusFilter);
  const counts = {
    all: list.length,
    new: list.filter(f => f.status === "new").length,
    reviewing: list.filter(f => f.status === "reviewing").length,
    resolved: list.filter(f => f.status === "resolved").length,
  };

  const STATUS_INFO = {
    new:       { label: "신규",   color: "#ef4444" },
    reviewing: { label: "검토중", color: "#f59e0b" },
    resolved:  { label: "조치 완료", color: "#10b981" },
    rejected:  { label: "반려", color: "#94a3b8" },
  };

  const CAT = Object.fromEntries(FEEDBACK_CATEGORIES.map(c => [c.id, c]));

  return (
    <div className="content">
      <div className="content-hd">
        <div>
          <h1 className="content-title">종사자 의견 청취 관리</h1>
          <div className="content-sub">접수된 종사자 의견을 검토하고 회신합니다.</div>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { id: "all", label: "전체", value: counts.all, color: "var(--primary)" },
          { id: "new", label: "신규", value: counts.new, color: "var(--danger)" },
          { id: "reviewing", label: "검토중", value: counts.reviewing, color: "var(--warning)" },
          { id: "resolved", label: "조치 완료", value: counts.resolved, color: "var(--success)" },
        ].map(s => (
          <div key={s.id}
            onClick={() => setStatusFilter(s.id)}
            className="card" style={{
              padding: 16, cursor: "pointer",
              borderColor: statusFilter === s.id ? s.color : "var(--line)",
              borderWidth: 2,
            }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, marginTop: 6 }}>{s.value} <span style={{ fontSize: 12, color: "var(--fg-3)", fontWeight: 400 }}>건</span></div>
          </div>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--fg-3)" }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--fg-3)", background: "var(--bg-elev)", borderRadius: 12, border: "1px dashed var(--line)" }}>
          접수된 의견이 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(f => {
            const cat = CAT[f.category] || { label: f.category, color: "#94a3b8" };
            const stat = STATUS_INFO[f.status] || STATUS_INFO.new;
            return (
              <div key={f.id} className="card"
                onClick={() => setDetail(f)}
                style={{ padding: "16px 20px", cursor: "pointer", borderLeft: `4px solid ${stat.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: stat.color,
                    padding: "3px 9px", borderRadius: 4,
                    background: `color-mix(in oklab, ${stat.color} 12%, transparent)`,
                    border: `1px solid ${stat.color}`,
                  }}>{stat.label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: cat.color,
                    padding: "3px 9px", borderRadius: 4,
                    background: `color-mix(in oklab, ${cat.color} 12%, transparent)`,
                  }}>{cat.label}</span>
                  {f.hqCode && <span className="chip" style={{ fontSize: 11 }}>{f.hqCode}</span>}
                  <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{f.siteName}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
                    👤 {f.reporterName || "—"}
                    {f.createdAt && ` · ${String(f.createdAt).slice(0, 10)}`}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.5,
                  overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {f.detail}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 상세 모달 */}
      {detail && (
        <WorkerFeedbackDetailModal
          feedback={detail}
          onClose={() => setDetail(null)}
          onUpdate={(updated) => {
            setList(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x));
            setDetail({ ...detail, ...updated });
          }}
        />
      )}
    </div>
  );
};

// 의견 상세 + 회신 모달
const WorkerFeedbackDetailModal = ({ feedback, onClose, onUpdate }) => {
  const [response, setResponse] = React.useState(feedback.response || "");
  const [status, setStatus] = React.useState(feedback.status || "new");
  const [saving, setSaving] = React.useState(false);
  const cat = FEEDBACK_CATEGORIES.find(c => c.id === feedback.category) || { label: feedback.category, color: "#94a3b8" };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await window.WV_API.updateWorkerFeedback(feedback.id, { status, response });
      if (res?.success) onUpdate(res.feedback);
      else alert("저장 실패: " + (res?.error || "다시 시도해주세요."));
    } catch (e) { alert("서버 오류: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("이 의견을 영구 삭제하시겠습니까?")) return;
    try {
      const res = await window.WV_API.deleteWorkerFeedback(feedback.id);
      if (res?.success) { alert("삭제됨"); onClose(); window.location.reload(); }
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-hd">
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>💬 의견 상세</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, padding: "3px 9px", borderRadius: 4, background: `color-mix(in oklab, ${cat.color} 12%, transparent)` }}>{cat.label}</span>
            {feedback.hqCode && <span className="chip">{feedback.hqCode} · {feedback.siteName}</span>}
            <span className="meta" style={{ fontSize: 12 }}>
              👤 {feedback.reporterName || "—"}
              {feedback.createdAt && ` · ${String(feedback.createdAt).slice(0, 19).replace("T", " ")}`}
            </span>
          </div>

          <div className="field">
            <label className="field-label">상세 내용</label>
            <div style={{ padding: 14, background: "var(--bg-sunk)", borderRadius: 8, lineHeight: 1.6, whiteSpace: "pre-wrap", fontSize: 13.5 }}>
              {feedback.detail || "—"}
            </div>
          </div>

          {feedback.improvementSuggestion && (
            <div className="field">
              <label className="field-label">개선 의견</label>
              <div style={{ padding: 14, background: "var(--bg-sunk)", borderRadius: 8, lineHeight: 1.6, whiteSpace: "pre-wrap", fontSize: 13.5 }}>
                {feedback.improvementSuggestion}
              </div>
            </div>
          )}

          <div className="field">
            <label className="field-label">처리 상태</label>
            <select className="field-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="new">신규</option>
              <option value="reviewing">검토중</option>
              <option value="resolved">조치 완료</option>
              <option value="rejected">반려</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label">안전팀 회신 / 처리 내용</label>
            <textarea className="field-textarea" value={response} onChange={e => setResponse(e.target.value)}
              placeholder="검토 결과 및 조치 사항을 입력해주세요" style={{ minHeight: 120 }} />
          </div>
        </div>
        <div className="modal-ft" style={{ gap: 8 }}>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            <Icon name="trash" size={12} /> 삭제
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={onClose}>닫기</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="login-spinner" /> : <><Icon name="check" size={14} /> 저장</>}
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { WorkerFeedbackForm, WorkerFeedbackList, WorkerFeedbackDetailModal, FEEDBACK_CATEGORIES });
