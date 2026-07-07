// 윌앤비전 - 제출 현황 / 카테고리 관리 / 사용자 권한 관리

// ─── 이행항목 마스터 (하드코딩 → 추후 마스터 관리 페이지에서 편집 가능)
const COMPLIANCE_ITEMS = [
  { key: "risk-regular",          label: "위험성평가",        sub: "정기",   cycle: "분기/연 1회",    color: "#3b82f6", icon: "alert" },
  { key: "edu-onboarding",        label: "안전보건교육",       sub: "채용시", cycle: "채용 당일 (필수)", note: "교육일자는 반드시 채용 당일", color: "#8b5cf6", icon: "graduation" },
  { key: "edu-regular",           label: "안전보건교육",       sub: "정기",   cycle: "매월 2시간",      color: "#10b981", icon: "graduation" },
  { key: "edu-special",           label: "안전보건교육",       sub: "특별",   cycle: "취급 전 필수",    note: "특별교육 공통내용 교육 시 채용시 교육 갈음 가능", color: "#06b6d4", icon: "graduation" },
  { key: "disaster-drill-report", label: "중대재해 훈련 보고서", sub: "",      cycle: "분기 1회",       color: "#f59e0b", icon: "shield" },
  { key: "supervisor-log",        label: "관리감독자 업무일지",  sub: "",      cycle: "주간",          color: "#ef4444", icon: "doc" },
];

// 이행 현재 기간 (UI 표시용)
const CURRENT_PERIOD = "2026년 1분기";

// 매트릭스용 mock 데이터 — 빈 상태로 시작 (사용자가 직접 제출해서 채우면 됨)
// key: `${siteId}__${itemKey}` → status: "submitted" | "in-progress" | "missing"
const COMPLIANCE_MOCK = {};

// ─── 이행사항 제출 현황 (리디자인)
const SubmissionsView = ({ onNav, role, currentUser }) => {
  const D = window.WV_DATA;
  const can = D.can[role] || D.can["staff"];
  const [status, setStatus] = React.useState("all");
  const [search, setSearch] = React.useState("");

  // 매트릭스용 사이트/본부 로드
  const [sites, setSites] = React.useState([]);
  const [hqs, setHQs] = React.useState([]);
  const [compliance, setCompliance] = React.useState(COMPLIANCE_MOCK);   // 매트릭스 데이터
  const [showSubmitModal, setShowSubmitModal] = React.useState(false);
  const [matrixHQFilter, setMatrixHQFilter] = React.useState("전체");

  // 백엔드에서 제출 내역 로드 → compliance state로 매핑
  const loadCompliance = React.useCallback(() => {
    if (!window.WV_API?.getComplianceSubmissions) return;
    window.WV_API.getComplianceSubmissions(CURRENT_PERIOD).then(subs => {
      const map = {};
      (subs || []).forEach(s => {
        const key = `${s.siteId}__${s.itemKey}`;
        map[key] = {
          id: s.id,
          status: s.status || "submitted",
          submittedAt: (s.submittedAt || s.createdAt || "").slice(0, 10),
          submitter: s.submitterName || "—",
          file: s.fileName || "",
          fileUrl: s.fileUrl || "",
          note: s.note || "",
        };
      });
      setCompliance(map);
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (window.WV_API?.getSites) {
      window.WV_API.getSites().then(data => setSites(Array.isArray(data) ? data : [])).catch(() => {});
    }
    if (window.WV_API?.getHQs) {
      window.WV_API.getHQs().then(data => setHQs(Array.isArray(data) ? data : [])).catch(() => {});
    }
    loadCompliance();
  }, [loadCompliance]);

  // ⚡ 권한 필터링 — 본인 본부의 사업장/본부만 보이도록
  const accessibleSites = React.useMemo(
    () => window.WV_PERMS?.filterSitesForUser(sites, currentUser, hqs) || sites,
    [sites, currentUser, hqs]
  );
  const accessibleHQs = React.useMemo(
    () => window.WV_PERMS?.filterHQsForUser(hqs, currentUser) || hqs,
    [hqs, currentUser]
  );
  const isCrossHQ = window.WV_PERMS?.isCrossHQ(currentUser);

  // mock data 안전 fallback
  const allSubs = D.submissions || [];
  const allPosts = D.posts || [];

  // 새 제출 / 수정 처리 — 백엔드 저장
  const handleNewSubmission = async (data) => {
    try {
      const res = await window.WV_API.submitCompliance({
        siteId: parseInt(data.siteId),
        itemKey: data.itemKey,
        itemLabel: data.itemLabel,
        period: CURRENT_PERIOD,
        submitterUserId: currentUser?.id || null,
        submitterName: currentUser?.name || "—",
        fileName: data.fileName || "",
        fileUrl: data.fileUrl || "",
        note: data.note || "",
        status: "submitted",
      });
      if (res?.success) {
        await loadCompliance();   // 백엔드에서 다시 불러와 모든 사용자 데이터 동기화
        setShowSubmitModal(false);
      } else {
        alert("제출 실패: " + (res?.error || "다시 시도해주세요."));
      }
    } catch (e) {
      alert("서버 연결 실패: " + e.message);
    }
  };

  // 제출 삭제
  const handleDeleteSubmission = async (cellKey) => {
    if (!window.confirm("이 제출 내역을 삭제하시겠습니까?")) return;
    const cell = compliance[cellKey];
    if (!cell?.id) {
      // 백엔드 id가 없으면 (로컬 임시) 그냥 상태에서만 제거
      setCompliance(prev => {
        const next = { ...prev };
        delete next[cellKey];
        return next;
      });
      setShowSubmitModal(false);
      return;
    }
    try {
      const res = await window.WV_API.deleteCompliance(cell.id);
      if (res?.success) {
        await loadCompliance();
        setShowSubmitModal(false);
      } else {
        alert("삭제 실패: " + (res?.error || "다시 시도해주세요."));
      }
    } catch (e) {
      alert("서버 오류: " + e.message);
    }
  };

  // 매트릭스 통계 — 접근 가능한 사업장 기준
  const accessibleSiteIds = new Set(accessibleSites.map(s => String(s.id)));
  const accessibleCompliance = Object.fromEntries(
    Object.entries(compliance).filter(([k]) => accessibleSiteIds.has(k.split("__")[0]))
  );
  const totalCells = accessibleSites.length * COMPLIANCE_ITEMS.length;
  const submittedCells = Object.values(accessibleCompliance).filter(c => c.status === "submitted").length;
  const inProgressCells = Object.values(accessibleCompliance).filter(c => c.status === "in-progress").length;
  const complianceRate = totalCells > 0 ? Math.round((submittedCells / totalCells) * 100) : 0;

  // 자료별 진행률 (post.submissions 있는 것만)
  const postSubmissions = allPosts.filter(p => p.submissions).map(p => ({
    post: p,
    rate: p.submissions.target > 0 ? p.submissions.received / p.submissions.target : 0,
    received: p.submissions.received,
    target: p.submissions.target,
    days: p.dueAt ? Math.round((new Date(p.dueAt) - D.today) / 86400000) : null,
  })).sort((a, b) => (a.days == null ? 999 : a.days) - (b.days == null ? 999 : b.days));

  // 카운트
  const counts = {
    all: allSubs.length,
    pending: allSubs.filter(s => s.status === "pending").length,
    approved: allSubs.filter(s => s.status === "approved").length,
    rejected: allSubs.filter(s => s.status === "rejected").length,
  };

  // 평균 진행률
  const avgRate = postSubmissions.length > 0
    ? Math.round(postSubmissions.reduce((sum, p) => sum + p.rate, 0) / postSubmissions.length * 100)
    : 0;

  // 필터 적용
  let subs = allSubs;
  if (status !== "all") subs = subs.filter(s => s.status === status);
  if (search) {
    const q = search.toLowerCase();
    subs = subs.filter(s =>
      (s.submitter || "").toLowerCase().includes(q) ||
      (s.dept || "").toLowerCase().includes(q) ||
      (s.postTitle || "").toLowerCase().includes(q) ||
      (s.file || "").toLowerCase().includes(q)
    );
  }

  const handleApprove = (s) => {
    if (window.confirm(`[${s.submitter}] ${s.postTitle} 제출을 승인하시겠습니까?`)) {
      alert("승인되었습니다. (mock — 백엔드 연동 필요)");
    }
  };
  const handleReject = (s) => {
    const reason = window.prompt(`[${s.submitter}] 제출 반려 사유를 입력해주세요:`);
    if (reason) alert(`반려되었습니다.\n사유: ${reason} (mock — 백엔드 연동 필요)`);
  };

  return (
    <div className="content">
      <div className="content-hd">
        <div>
          <h1 className="content-title">{can.approve ? "이행사항 제출 현황" : "이행사항 제출"}</h1>
          <div className="content-sub">
            {CURRENT_PERIOD} · {can.approve
              ? "자료를 업로드하고 사업장별 이행 현황을 확인합니다."
              : "이행 자료를 업로드하고 본인 제출 내역을 확인합니다."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary"
            onClick={() => alert("CSV 내보내기 (개발 예정)")}>
            <Icon name="download" size={14} /> CSV 내보내기
          </button>
          {can.approve && (
            <button className="btn btn-secondary"
              onClick={() => alert(`미제출자에게 알림 발송\n대상: ${counts.pending}명 (mock)`)}>
              <Icon name="bell" size={14} /> 미제출자 알림 발송
            </button>
          )}
          {/* 핵심 액션: 새 제출하기 */}
          <button className="btn btn-primary"
            onClick={() => setShowSubmitModal(true)}
            style={{ fontWeight: 700 }}>
            <Icon name="upload" size={14} /> 새 제출하기
          </button>
        </div>
      </div>

      {/* ── KPI 카드 5장 ── */}
      <div className="subs-kpi">
        <div className="subs-kpi-card">
          <div className="subs-kpi-ico" style={{ background: "color-mix(in oklab, var(--primary) 14%, transparent)", color: "var(--primary)" }}>
            <Icon name="inbox" size={20} />
          </div>
          <div>
            <div className="subs-kpi-label">전체 제출</div>
            <div className="subs-kpi-value">{counts.all}<span className="subs-kpi-unit">건</span></div>
          </div>
        </div>
        <div className="subs-kpi-card">
          <div className="subs-kpi-ico" style={{ background: "color-mix(in oklab, var(--warning) 14%, transparent)", color: "var(--warning)" }}>
            <Icon name="clock" size={20} />
          </div>
          <div>
            <div className="subs-kpi-label">검토 대기</div>
            <div className="subs-kpi-value">{counts.pending}<span className="subs-kpi-unit">건</span></div>
          </div>
        </div>
        <div className="subs-kpi-card">
          <div className="subs-kpi-ico" style={{ background: "color-mix(in oklab, var(--success) 14%, transparent)", color: "var(--success)" }}>
            <Icon name="check-circle" size={20} />
          </div>
          <div>
            <div className="subs-kpi-label">승인</div>
            <div className="subs-kpi-value">{counts.approved}<span className="subs-kpi-unit">건</span></div>
          </div>
        </div>
        <div className="subs-kpi-card">
          <div className="subs-kpi-ico" style={{ background: "color-mix(in oklab, var(--danger) 14%, transparent)", color: "var(--danger)" }}>
            <Icon name="x-circle" size={20} />
          </div>
          <div>
            <div className="subs-kpi-label">반려</div>
            <div className="subs-kpi-value">{counts.rejected}<span className="subs-kpi-unit">건</span></div>
          </div>
        </div>
        <div className="subs-kpi-card subs-kpi-card-wide">
          <div className="subs-kpi-ico" style={{ background: "color-mix(in oklab, var(--primary) 14%, transparent)", color: "var(--primary)" }}>
            <Icon name="chart" size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="subs-kpi-label">평균 제출 진행률</div>
            <div className="subs-kpi-value">{avgRate}<span className="subs-kpi-unit">%</span></div>
            <div className="subs-kpi-bar"><div style={{ width: `${avgRate}%`, background: avgRate >= 80 ? "var(--success)" : avgRate >= 50 ? "var(--primary)" : "var(--warning)" }} /></div>
          </div>
        </div>
      </div>

      {/* ── 사업장 × 이행항목 매트릭스 ── */}
      <SectionHd
        title={isCrossHQ ? "사업장 × 이행항목 매트릭스" : `${accessibleHQs[0]?.name || "내 본부"} 사업장 매트릭스`}
        sub={`${CURRENT_PERIOD} · 전체 ${totalCells}건 중 ${submittedCells}건 제출 (${complianceRate}%)${!isCrossHQ ? " · 본인 본부 사업장만 표시" : ""}`}
        action={
          isCrossHQ && accessibleHQs.length > 1 ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select className="field-select" style={{ width: 180, height: 32, padding: "0 10px" }}
                value={matrixHQFilter} onChange={e => setMatrixHQFilter(e.target.value)}>
                <option value="전체">전체 본부</option>
                {accessibleHQs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          ) : null
        }
      />
      <ComplianceMatrix
        sites={accessibleSites}
        hqs={accessibleHQs}
        compliance={compliance}
        hqFilter={isCrossHQ ? matrixHQFilter : "전체"}
        onCellClick={(site, item, cellData) => {
          // 항상 모달 — 기존 데이터 있으면 수정 모드, 없으면 새 제출
          setShowSubmitModal({
            presetSite: site,
            presetItem: item,
            existing: cellData,   // 기존 제출 내역 (있을 시 미리 채움)
            cellKey: `${site.id}__${item.key}`,
          });
        }}
      />

      {/* ── 자료별 진행률 카드 ── */}
      <SectionHd title="자료별 제출 진행률" sub="제출 대상 자료의 부서·인원 진행률 (마감 임박 순)" />
      {postSubmissions.length === 0 ? (
        <div className="card subs-empty">
          <Icon name="inbox" size={28} /><br />
          제출 대상 자료가 없습니다.
        </div>
      ) : (
        <div className="subs-prog-grid">
          {postSubmissions.map(({ post, rate, received, target, days }) => {
            const pct = Math.round(rate * 100);
            const cat = D.categories.find(c => c.id === post.categoryId);
            const urgent = days != null && days <= 3;
            const overdue = days != null && days < 0;
            const tone = pct >= 90 ? "success" : pct >= 50 ? "primary" : "warning";
            return (
              <div key={post.id} className="subs-prog-card" onClick={() => onNav({ name: "post", id: post.id })}>
                <div className="subs-prog-hd">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {cat && <span className="subs-prog-cat">{cat.name}</span>}
                    <div className="subs-prog-title">{post.title}</div>
                  </div>
                  {days != null && (
                    <span className={`subs-prog-due ${overdue ? "overdue" : urgent ? "urgent" : ""}`}>
                      {overdue ? `D+${Math.abs(days)}` : `D-${days}`}
                    </span>
                  )}
                </div>
                <div className="subs-prog-meter">
                  <div className="subs-prog-bar"><div style={{ width: `${pct}%`, background: `var(--${tone})` }} /></div>
                  <div className="subs-prog-count">
                    <b>{received}</b><span style={{ color: "var(--fg-4)" }}>/{target}</span>
                    <span className="subs-prog-pct" style={{ color: `var(--${tone})` }}>· {pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 개별 제출 내역 ── */}
      <SectionHd
        title="개별 제출 내역"
        sub={`총 ${counts.all}건 중 ${subs.length}건 표시`}
        action={
          <div className="filter-group">
            {[
              { id: "all", label: "전체", c: counts.all },
              { id: "pending", label: "검토중", c: counts.pending, tone: "warning" },
              { id: "approved", label: "승인", c: counts.approved, tone: "success" },
              { id: "rejected", label: "반려", c: counts.rejected, tone: "danger" },
            ].map(f => (
              <button key={f.id}
                className={"subs-pill" + (status === f.id ? " active" : "")}
                data-tone={f.tone}
                onClick={() => setStatus(f.id)}>
                {f.label} <span className="subs-pill-c">{f.c}</span>
              </button>
            ))}
          </div>
        }
      />

      {/* 검색 */}
      <div style={{ marginBottom: 12 }}>
        <div className="subs-search">
          <Icon name="search" size={14} />
          <input type="text" placeholder="제출자, 부서, 자료명, 파일명 검색..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button className="subs-search-clear" onClick={() => setSearch("")}>
              <Icon name="x" size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="sub-list-hd">
          <div>제출자</div>
          <div>자료</div>
          <div>파일</div>
          <div>제출일</div>
          <div>상태</div>
          <div style={{ textAlign: "right" }}>액션</div>
        </div>
        {subs.length === 0 ? (
          <div className="subs-empty" style={{ borderTop: "1px solid var(--line-2)" }}>
            <Icon name="search" size={28} /><br />
            조건에 맞는 제출 내역이 없습니다.
          </div>
        ) : (
          subs.map(s => (
            <div key={s.id} className="sub-list-row">
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div className="activity-avatar" style={{ flexShrink: 0 }}>{s.submitter[0]}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.submitter}</div>
                    <div className="meta">{s.dept}</div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)" }}>{s.postTitle}</div>
              <div className="subs-file">
                <span className="subs-file-name"><Icon name="paperclip" size={12} /> {s.file}</span>
                {s.reason && <div className="subs-reject-reason">⚠ 반려 사유: {s.reason}</div>}
              </div>
              <div className="meta" style={{ fontSize: 12 }}>{s.submittedAt}</div>
              <div><StatusChip status={s.status} /></div>
              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                {can.approve && s.status === "pending" && (
                  <>
                    <button className="btn btn-sm" style={{ background: "var(--success)", color: "#fff" }}
                      onClick={() => handleApprove(s)}>
                      <Icon name="check" size={12} /> 승인
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(s)}>
                      <Icon name="x" size={12} /> 반려
                    </button>
                  </>
                )}
                <button className="btn btn-ghost btn-sm" title="파일 다운로드"
                  onClick={() => alert(`${s.file} 다운로드 (mock)`)}>
                  <Icon name="download" size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        /* ── KPI 카드 ── */
        .subs-kpi {
          display: grid; grid-template-columns: repeat(4, 1fr) 1.4fr;
          gap: 12px; margin-bottom: 24px;
        }
        @media (max-width: 1200px) { .subs-kpi { grid-template-columns: repeat(2, 1fr); } .subs-kpi-card-wide { grid-column: span 2; } }
        @media (max-width: 600px)  { .subs-kpi { grid-template-columns: 1fr; } .subs-kpi-card-wide { grid-column: span 1; } }
        .subs-kpi-card {
          display: flex; align-items: center; gap: 14px;
          background: var(--bg-elev);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 16px 18px;
          box-shadow: 0 1px 3px rgba(15,23,42,.03);
          transition: transform .15s, box-shadow .2s;
        }
        .subs-kpi-card:hover { transform: translateY(-1px); box-shadow: 0 6px 20px -10px rgba(15,23,42,.10); }
        .subs-kpi-ico {
          width: 44px; height: 44px; border-radius: 12px;
          display: grid; place-items: center;
          flex-shrink: 0;
        }
        .subs-kpi-label { font-size: 12px; color: var(--fg-3); font-weight: 600; margin-bottom: 2px; }
        .subs-kpi-value { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; color: var(--fg); line-height: 1.15; }
        .subs-kpi-unit { font-size: 13px; color: var(--fg-3); margin-left: 4px; font-weight: 500; }
        .subs-kpi-bar {
          height: 6px; background: var(--bg-sunk); border-radius: 4px;
          margin-top: 8px; overflow: hidden;
        }
        .subs-kpi-bar > div { height: 100%; border-radius: 4px; transition: width .4s ease; }

        /* ── 자료별 진행률 카드 그리드 ── */
        .subs-prog-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 12px; margin-bottom: 28px;
        }
        .subs-prog-card {
          background: var(--bg-elev); border: 1px solid var(--line);
          border-radius: 12px; padding: 16px 18px;
          cursor: pointer; transition: all .15s;
        }
        .subs-prog-card:hover {
          border-color: color-mix(in oklab, var(--primary) 40%, var(--line));
          box-shadow: 0 6px 20px -10px color-mix(in oklab, var(--primary) 30%, transparent);
          transform: translateY(-1px);
        }
        .subs-prog-hd { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
        .subs-prog-cat {
          display: inline-block; font-size: 10.5px; font-weight: 700;
          color: var(--primary); padding: 2px 8px;
          background: var(--primary-soft); border-radius: 4px;
          letter-spacing: 0.04em; text-transform: uppercase;
          margin-bottom: 6px;
        }
        .subs-prog-title { font-weight: 600; font-size: 14px; color: var(--fg); line-height: 1.4; }
        .subs-prog-due {
          flex-shrink: 0; font-size: 11.5px; font-weight: 700;
          padding: 3px 9px; border-radius: 999px;
          background: var(--bg-sunk); color: var(--fg-3);
          border: 1px solid var(--line);
        }
        .subs-prog-due.urgent { background: color-mix(in oklab, var(--warning) 14%, transparent); color: var(--warning); border-color: color-mix(in oklab, var(--warning) 30%, transparent); }
        .subs-prog-due.overdue { background: color-mix(in oklab, var(--danger) 14%, transparent); color: var(--danger); border-color: color-mix(in oklab, var(--danger) 30%, transparent); }
        .subs-prog-meter { display: flex; flex-direction: column; gap: 6px; }
        .subs-prog-bar {
          height: 8px; background: var(--bg-sunk);
          border-radius: 4px; overflow: hidden;
        }
        .subs-prog-bar > div { height: 100%; border-radius: 4px; transition: width .4s ease; }
        .subs-prog-count {
          font-size: 12.5px; color: var(--fg-2);
          display: flex; align-items: baseline; gap: 4px;
        }
        .subs-prog-count b { font-size: 15px; font-weight: 700; color: var(--fg); }
        .subs-prog-pct { font-weight: 700; margin-left: auto; font-size: 13px; }

        /* ── 필터 pill 그룹 ── */
        .filter-group { display: inline-flex; gap: 6px; flex-wrap: wrap; }
        .subs-pill {
          display: inline-flex; align-items: center; gap: 6px;
          height: 30px; padding: 0 12px;
          font-size: 12.5px; font-weight: 600;
          color: var(--fg-3);
          background: var(--bg-elev);
          border: 1px solid var(--line); border-radius: 999px;
          cursor: pointer; transition: all .15s;
        }
        .subs-pill:hover { color: var(--fg); border-color: var(--fg-4); }
        .subs-pill.active { color: var(--primary); background: var(--primary-soft); border-color: var(--primary-soft-2); }
        .subs-pill.active[data-tone="warning"] { color: var(--warning); background: color-mix(in oklab, var(--warning) 12%, transparent); border-color: color-mix(in oklab, var(--warning) 28%, transparent); }
        .subs-pill.active[data-tone="success"] { color: var(--success); background: color-mix(in oklab, var(--success) 12%, transparent); border-color: color-mix(in oklab, var(--success) 28%, transparent); }
        .subs-pill.active[data-tone="danger"]  { color: var(--danger);  background: color-mix(in oklab, var(--danger) 12%, transparent);  border-color: color-mix(in oklab, var(--danger) 28%, transparent); }
        .subs-pill-c {
          display: inline-grid; place-items: center;
          min-width: 18px; height: 18px; padding: 0 5px;
          background: var(--bg-sunk); color: var(--fg-3);
          font-size: 11px; font-weight: 700;
          border-radius: 999px;
        }
        .subs-pill.active .subs-pill-c { background: rgba(255,255,255,.7); color: inherit; }

        /* ── 검색 ── */
        .subs-search {
          display: flex; align-items: center; gap: 10px;
          background: var(--bg-elev); border: 1px solid var(--line);
          border-radius: 10px; padding: 0 14px; height: 40px;
          color: var(--fg-3); transition: all .15s;
        }
        .subs-search:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 12%, transparent);
          color: var(--primary);
        }
        .subs-search input { flex: 1; background: transparent; border: 0; outline: none; font-size: 13.5px; color: var(--fg); }
        .subs-search-clear {
          display: grid; place-items: center;
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--bg-sunk); color: var(--fg-3);
          border: 0; cursor: pointer;
        }
        .subs-search-clear:hover { background: var(--danger); color: #fff; }

        /* ── 개별 제출 테이블 ── */
        .sub-list-hd, .sub-list-row {
          display: grid;
          grid-template-columns: 200px 1.2fr 1.4fr 110px 110px 200px;
          gap: 16px; align-items: center;
          padding: 14px 18px;
          font-size: 13px;
        }
        @media (max-width: 1100px) {
          .sub-list-hd, .sub-list-row { grid-template-columns: 180px 1fr 100px 180px; }
          .sub-list-hd > div:nth-child(3), .sub-list-row > div:nth-child(3),
          .sub-list-hd > div:nth-child(5), .sub-list-row > div:nth-child(5) { display: none; }
        }
        .sub-list-hd {
          color: var(--fg-4); font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em;
          background: var(--bg-sunk); border-bottom: 1px solid var(--line);
        }
        [data-mood="technical"] .sub-list-hd { font-family: var(--font-mono); }
        .sub-list-row { border-bottom: 1px solid var(--line-2); transition: background .12s; }
        .sub-list-row:last-child { border-bottom: 0; }
        .sub-list-row:hover { background: var(--bg-sunk); }

        .subs-file { font-size: 12px; color: var(--fg-3); min-width: 0; }
        .subs-file-name {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 9px; background: var(--bg-sunk); border-radius: 6px;
          font-family: var(--font-mono, monospace); font-size: 11.5px;
          color: var(--fg-2); max-width: 100%;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .subs-reject-reason {
          color: var(--danger); margin-top: 6px; font-size: 11.5px;
          padding: 4px 8px; background: color-mix(in oklab, var(--danger) 8%, transparent);
          border-radius: 6px; font-weight: 500;
        }

        .subs-empty {
          padding: 48px 24px; text-align: center; color: var(--fg-3);
          background: var(--bg-elev); border-radius: 12px;
          font-size: 14px;
        }
        .subs-empty svg { color: var(--fg-4); margin-bottom: 12px; }

        /* ── 매트릭스 ── */
        .cmx-wrap {
          background: var(--bg-elev); border: 1px solid var(--line);
          border-radius: 12px; overflow: auto;
          margin-bottom: 28px;
        }
        .cmx {
          display: grid;
          font-size: 12.5px;
          min-width: 720px;
        }
        .cmx-row { display: contents; }
        .cmx-cell, .cmx-th, .cmx-row-hd {
          padding: 12px 14px;
          border-right: 1px solid var(--line-2);
          border-bottom: 1px solid var(--line-2);
          display: flex; align-items: center; gap: 8px;
        }
        .cmx-th {
          background: var(--bg-sunk); color: var(--fg-3);
          font-weight: 700; font-size: 11px;
          text-transform: uppercase; letter-spacing: 0.04em;
          position: sticky; top: 0; z-index: 2;
          flex-direction: column; align-items: flex-start; gap: 2px;
          padding: 12px 14px;
        }
        .cmx-th-main { color: var(--fg); font-size: 12.5px; font-weight: 700; text-transform: none; letter-spacing: 0; }
        .cmx-th-sub { font-size: 10px; color: var(--fg-4); font-weight: 500; text-transform: none; letter-spacing: 0; }
        .cmx-row-hd {
          background: var(--bg-sunk); font-weight: 700;
          position: sticky; left: 0; z-index: 1;
          color: var(--fg);
          flex-direction: column; align-items: flex-start; gap: 2px;
        }
        .cmx-row-hd .cmx-hq-chip {
          font-size: 9.5px; padding: 1px 6px; border-radius: 3px;
          color: var(--fg-3); background: transparent;
          border: 1px solid var(--line); letter-spacing: 0.04em;
          font-weight: 700;
        }
        .cmx-cell {
          cursor: pointer; transition: background .15s;
          font-weight: 700; font-size: 14px;
          justify-content: center; align-items: center;
          min-height: 56px;
          background: var(--bg-elev);
        }
        .cmx-cell:hover { background: var(--bg-sunk); }
        /* 셀 배경색은 모두 동일 — 안의 ● 원만 컬러로 상태 구분 */
        .cmx-cell.submitted   { color: var(--success); }
        .cmx-cell.in-progress { color: var(--warning); }
        .cmx-cell.missing     { color: var(--danger); }
        .cmx-empty {
          padding: 60px 24px; text-align: center; color: var(--fg-3);
          grid-column: 1 / -1;
        }
        .cmx-legend {
          display: flex; gap: 14px; padding: 10px 16px;
          background: var(--bg-sunk); border-top: 1px solid var(--line);
          font-size: 11.5px; color: var(--fg-3);
          flex-wrap: wrap;
        }
        .cmx-legend-item { display: inline-flex; align-items: center; gap: 6px; }
        .cmx-legend-dot { width: 10px; height: 10px; border-radius: 3px; }

        /* ── 새 제출 모달 ── */
        .nsub-grid { display: grid; gap: 12px; }
        .nsub-item-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
        }
        @media (max-width: 600px) { .nsub-item-grid { grid-template-columns: 1fr; } }
        .nsub-item-chip {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px;
          background: var(--bg-elev);
          border: 1.5px solid var(--line); border-radius: 10px;
          cursor: pointer; transition: all .15s;
          text-align: left;
        }
        .nsub-item-chip:hover { border-color: var(--chip-c); background: color-mix(in oklab, var(--chip-c) 4%, var(--bg-elev)); }
        .nsub-item-chip.active {
          border-color: var(--chip-c);
          background: color-mix(in oklab, var(--chip-c) 10%, var(--bg-elev));
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--chip-c) 14%, transparent);
        }
        .nsub-item-ico {
          width: 32px; height: 32px; border-radius: 8px;
          display: grid; place-items: center;
          background: color-mix(in oklab, var(--chip-c) 14%, transparent);
          color: var(--chip-c); flex-shrink: 0;
        }
        .nsub-item-label { font-weight: 700; font-size: 13px; color: var(--fg); }
        .nsub-item-sub { font-size: 11px; color: var(--fg-3); margin-top: 1px; }

        .nsub-file-drop {
          padding: 24px; text-align: center;
          background: var(--bg-sunk); border: 2px dashed var(--line);
          border-radius: 10px;
          color: var(--fg-3); cursor: pointer;
          transition: all .15s;
        }
        .nsub-file-drop:hover { border-color: var(--primary); color: var(--primary); background: color-mix(in oklab, var(--primary) 4%, var(--bg-sunk)); }
        .nsub-file-name {
          padding: 12px 14px;
          background: color-mix(in oklab, var(--success) 8%, transparent);
          border: 1px solid color-mix(in oklab, var(--success) 25%, transparent);
          color: var(--success); font-weight: 600;
          border-radius: 10px;
          display: flex; align-items: center; gap: 8px;
        }
        .nsub-file-name button { color: var(--danger); background: transparent; border: 0; cursor: pointer; margin-left: auto; }
      `}</style>

      {/* ── 새 제출 / 수정 모달 ── */}
      {showSubmitModal && (
        <NewSubmissionModal
          sites={accessibleSites}
          hqs={accessibleHQs}
          currentUser={currentUser}
          preset={typeof showSubmitModal === "object" ? showSubmitModal : null}
          onClose={() => setShowSubmitModal(false)}
          onSubmit={handleNewSubmission}
          onDelete={handleDeleteSubmission}
        />
      )}
    </div>
  );
};

// ─── 사업장 × 이행항목 매트릭스
const ComplianceMatrix = ({ sites, hqs, compliance, hqFilter, onCellClick }) => {
  const filteredSites = sites.filter(s => hqFilter === "전체" || String(s.hqId) === String(hqFilter));
  if (filteredSites.length === 0) {
    return (
      <div className="cmx-wrap">
        <div className="cmx-empty">
          📭 등록된 사업장이 없습니다.<br/>
          <span style={{ fontSize: 12 }}>사업장 관리에서 먼저 사업장을 등록해 주세요.</span>
        </div>
      </div>
    );
  }

  const colCount = COMPLIANCE_ITEMS.length + 1;
  const gridCols = `220px repeat(${COMPLIANCE_ITEMS.length}, minmax(120px, 1fr))`;

  return (
    <div className="cmx-wrap">
      <div className="cmx" style={{ gridTemplateColumns: gridCols }}>
        {/* 헤더 row */}
        <div className="cmx-th">
          <span className="cmx-th-main">사업장</span>
          <span className="cmx-th-sub">전체 {filteredSites.length}개</span>
        </div>
        {COMPLIANCE_ITEMS.map(item => (
          <div key={item.key} className="cmx-th">
            <span className="cmx-th-main" style={{ color: item.color }}>
              {item.label}{item.sub && <span style={{ fontSize: 10.5, marginLeft: 4, opacity: .8 }}>({item.sub})</span>}
            </span>
            <span className="cmx-th-sub">{item.cycle}</span>
          </div>
        ))}

        {/* 데이터 row */}
        {filteredSites.map(site => {
          const hq = hqs.find(h => String(h.id) === String(site.hqId));
          return (
            <React.Fragment key={site.id}>
              <div className="cmx-row-hd">
                {hq && <span className="cmx-hq-chip" style={{ color: hq.code ? "#3b82f6" : "var(--fg-3)" }}>{hq.code || hq.name}</span>}
                <span style={{ fontSize: 13 }}>{site.사업장명}</span>
              </div>
              {COMPLIANCE_ITEMS.map(item => {
                const cellKey = `${site.id}__${item.key}`;
                const cell = compliance[cellKey];
                const status = cell?.status || "missing";
                return (
                  <div key={item.key}
                    className={`cmx-cell ${status}`}
                    onClick={() => onCellClick(site, item, cell)}
                    title={
                      status === "submitted" ? `제출 완료 · ${cell.submitter} · ${cell.submittedAt}`
                      : status === "in-progress" ? `진행 중 · ${cell.submitter || ""}`
                      : "미제출 — 클릭하여 제출"
                    }>
                    {status === "submitted" && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 20 }}>●</span>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.04 }}>완료</span>
                      </span>
                    )}
                    {status === "in-progress" && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 20 }}>◐</span>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.04 }}>진행 중</span>
                      </span>
                    )}
                    {status === "missing" && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 20 }}>○</span>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.04 }}>미제출</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
      <div className="cmx-legend">
        <span className="cmx-legend-item"><span className="cmx-legend-dot" style={{ background: "var(--success)" }} /> 제출 완료</span>
        <span className="cmx-legend-item"><span className="cmx-legend-dot" style={{ background: "var(--warning)" }} /> 진행 중</span>
        <span className="cmx-legend-item"><span className="cmx-legend-dot" style={{ background: "var(--fg-4)" }} /> 미제출</span>
        <span style={{ marginLeft: "auto", color: "var(--fg-4)", fontSize: 11 }}>* 셀 클릭으로 상세 보기 또는 제출</span>
      </div>
    </div>
  );
};

// ─── 새 제출 / 수정 모달 (existing 있으면 수정 모드)
const NewSubmissionModal = ({ sites, hqs, currentUser, preset, onClose, onSubmit, onDelete }) => {
  const existing = preset?.existing;
  const isEdit = !!(existing && existing.status === "submitted");
  const [siteId, setSiteId] = React.useState(preset?.presetSite?.id || "");
  const [itemKey, setItemKey] = React.useState(preset?.presetItem?.key || "");
  const [file, setFile] = React.useState(null);
  const [note, setNote] = React.useState(existing?.note || "");
  const [error, setError] = React.useState("");

  // 현재 사용자의 본부에 속한 사업장 우선 (UI 추천)
  const userHQ = currentUser?.hqId;
  const orderedSites = React.useMemo(() => {
    if (!userHQ) return sites;
    const mine = sites.filter(s => String(s.hqId) === String(userHQ));
    const others = sites.filter(s => String(s.hqId) !== String(userHQ));
    return [...mine, ...others];
  }, [sites, userHQ]);

  const handleFilePick = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const [uploading, setUploading] = React.useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!itemKey) { setError("이행 항목을 선택해주세요."); return; }
    if (!siteId)  { setError("사업장을 선택해주세요."); return; }
    const site = sites.find(s => String(s.id) === String(siteId));
    const item = COMPLIANCE_ITEMS.find(i => i.key === itemKey);

    // 새 파일이 있으면 먼저 업로드 → URL 받기
    let fileUrl = existing?.fileUrl || "";
    let fileName = existing?.file || "";
    if (file) {
      setUploading(true);
      try {
        const up = await window.WV_API.uploadFile(file);
        if (up && up.url) {
          fileUrl = up.url;
          fileName = up.name || file.name;
        } else {
          setError("파일 업로드 실패: " + (up?.error || "다시 시도해주세요."));
          setUploading(false);
          return;
        }
      } catch (e) {
        setError("파일 업로드 오류: " + e.message);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onSubmit({
      itemKey, itemLabel: `${item.label}${item.sub ? ` (${item.sub})` : ""}`,
      siteId, siteName: site?.사업장명 || "—",
      fileName, fileUrl,
      note,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-hd">
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isEdit ? "✏️ 제출 내역 수정" : "📤 새 이행사항 제출"}
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd nsub-grid">
          {/* 기존 제출 정보 표시 (수정 모드) */}
          {isEdit && (
            <div style={{
              padding: "14px 16px",
              background: "color-mix(in oklab, var(--success) 8%, transparent)",
              border: "1px solid color-mix(in oklab, var(--success) 25%, transparent)",
              borderRadius: 10, fontSize: 12.5,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ fontWeight: 700, color: "var(--success)", fontSize: 13 }}>
                <Icon name="check-circle" size={13} /> 이미 제출된 항목
              </div>
              <div style={{ color: "var(--fg-2)", lineHeight: 1.7 }}>
                <b>제출자:</b> {existing.submitter}  <b style={{ marginLeft: 10 }}>제출일:</b> {existing.submittedAt}
              </div>
              {/* 파일 다운로드/미리보기 */}
              {existing.fileUrl ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>📎 파일:</span>
                  <a href={existing.fileUrl} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 6,
                      background: "var(--bg-elev)", border: "1px solid var(--success)",
                      color: "var(--success)", fontWeight: 600, fontSize: 12,
                      textDecoration: "none", maxWidth: 360,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                    <Icon name="external-link" size={12} /> {existing.file}
                  </a>
                  <a href={existing.fileUrl} download={existing.file}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "5px 10px", borderRadius: 6,
                      background: "var(--success)", color: "#fff",
                      fontWeight: 600, fontSize: 12, textDecoration: "none",
                    }}>
                    <Icon name="download" size={12} /> 다운로드
                  </a>
                </div>
              ) : (
                <div style={{ color: "var(--fg-3)", fontSize: 12 }}>
                  📎 <span style={{ fontFamily: "monospace" }}>{existing.file}</span>
                  <span style={{ color: "var(--warning)", marginLeft: 8 }}>⚠ 파일 미업로드 (파일명만 저장됨)</span>
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--fg-3)" }}>
                💡 새 파일을 선택해서 저장하면 기존 파일이 대체됩니다.
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: "var(--danger)", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 6 }}>
              {error}
            </div>
          )}

          {/* 이행 항목 선택 (칩 그리드) */}
          <div className="field">
            <label className="field-label">제출할 이행 항목 *</label>
            <div className="nsub-item-grid">
              {COMPLIANCE_ITEMS.map(item => (
                <button key={item.key} type="button"
                  className={`nsub-item-chip ${itemKey === item.key ? "active" : ""}`}
                  style={{ "--chip-c": item.color }}
                  onClick={() => setItemKey(item.key)}>
                  <div className="nsub-item-ico"><Icon name={item.icon} size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nsub-item-label">{item.label}{item.sub && ` (${item.sub})`}</div>
                    <div className="nsub-item-sub">{item.cycle}</div>
                    {item.note && (
                      <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 3, lineHeight: 1.35 }}>
                        💡 {item.note}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 사업장 선택 */}
          <div className="field">
            <label className="field-label">사업장 *</label>
            <select className="field-select" value={siteId} onChange={e => setSiteId(e.target.value)}>
              <option value="">— 사업장 선택 —</option>
              {orderedSites.map(s => {
                const hq = hqs.find(h => String(h.id) === String(s.hqId));
                return (
                  <option key={s.id} value={s.id}>
                    {hq ? `[${hq.code || hq.name}] ` : ""}{s.사업장명}
                  </option>
                );
              })}
            </select>
            {userHQ && (
              <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 4 }}>
                💡 본인 본부의 사업장이 상단에 우선 표시됩니다.
              </div>
            )}
          </div>

          {/* 기간 (현재는 고정) */}
          <div className="field">
            <label className="field-label">기간</label>
            <input className="field-input" value={CURRENT_PERIOD} readOnly
              style={{ background: "var(--bg-sunk)", color: "var(--fg-3)" }} />
          </div>

          {/* 파일 업로드 */}
          <div className="field">
            <label className="field-label">제출 파일</label>
            {file ? (
              <div className="nsub-file-name">
                <Icon name="file" size={14} /> {file.name}
                <button type="button" onClick={() => setFile(null)} title="제거">
                  <Icon name="x" size={13} />
                </button>
              </div>
            ) : (
              <label className="nsub-file-drop">
                <Icon name="upload" size={20} /><br/>
                <span style={{ fontWeight: 600 }}>클릭하여 파일 선택</span>
                <div style={{ fontSize: 11, marginTop: 4 }}>또는 끌어다 놓기 (PDF, XLSX, 사진 등)</div>
                <input type="file" onChange={handleFilePick} style={{ display: "none" }} />
              </label>
            )}
          </div>

          {/* 비고 */}
          <div className="field">
            <label className="field-label">비고 (선택)</label>
            <textarea className="field-textarea" value={note} onChange={e => setNote(e.target.value)}
              placeholder="제출 관련 메모를 입력해주세요" style={{ minHeight: 70 }} />
          </div>
        </div>
        <div className="modal-ft" style={{ gap: 8 }}>
          {isEdit && onDelete && (
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(preset.cellKey)}>
              <Icon name="trash" size={12} /> 제출 삭제
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading}>
            {uploading ? <><span className="login-spinner" /> 파일 업로드 중...</> : <><Icon name="check" size={14} /> {isEdit ? "수정 저장" : "제출하기"}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── 하위메뉴 인라인 에디터 — 이름/순서/표시/추가/삭제 (리스트 기반) ───
const CategorySubmenuInline = ({ cat, list, cats, onChange, onSave, saving, msg }) => {
  const TOOLS = window.WV_SUBMENUS || [];
  const [addVal, setAddVal] = React.useState("board:");
  const btn = { width: 22, height: 22, border: "1px solid var(--line)", borderRadius: 4, background: "var(--bg)", cursor: "pointer", fontSize: 11, color: "var(--fg-2)", padding: 0 };
  const upd = (i, patch) => onChange(list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const del = (i) => onChange(list.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir; if (j < 0 || j >= list.length) return;
    const arr = [...list]; [arr[i], arr[j]] = [arr[j], arr[i]]; onChange(arr);
  };
  const add = () => {
    const sep = addVal.indexOf(":");
    const kind = addVal.slice(0, sep), ref = addVal.slice(sep + 1);
    let item;
    if (kind === "tool") {
      const t = TOOLS.find((x) => x.key === ref); if (!t) return;
      item = { uid: window.WV_SUB.newUid(), kind: "tool", toolKey: t.key, label: t.defaultLabel, enabled: true };
    } else {
      const cName = ref ? (cats.find((x) => x.id === ref)?.name || "게시판") + " 게시판" : "게시판 보기";
      item = { uid: window.WV_SUB.newUid(), kind: "board", targetCat: ref || undefined, label: cName, enabled: true };
    }
    onChange([...list, item]);
  };
  const phOf = (it) => (it.kind === "tool" ? (TOOLS.find((x) => x.key === it.toolKey)?.defaultLabel || "") : "게시판 보기");
  return (
    <div style={{ padding: "10px 18px 14px 58px", background: "var(--bg-sunk)", borderBottom: "1px solid var(--line-2)" }}>
      <div style={{ fontSize: 11, color: "var(--fg-4)", marginBottom: 8 }}>하위메뉴 (사이드바 날개) — 이름·순서·표시·추가</div>
      {list.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--fg-3)", padding: "2px 0 8px" }}>
          하위메뉴가 없습니다. 아래에서 추가하세요. (없으면 카테고리 클릭 시 게시판으로 바로 진입)
        </div>
      )}
      {list.map((it, i) => {
        const enabled = it.enabled !== false;
        return (
          <div key={it.uid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", opacity: enabled ? 1 : 0.5 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button style={btn} onClick={() => move(i, -1)} disabled={i === 0} title="위로">▲</button>
              <button style={btn} onClick={() => move(i, 1)} disabled={i === list.length - 1} title="아래로">▼</button>
            </div>
            <span style={{ fontSize: 10, color: "var(--fg-4)", width: 34, textAlign: "center", flexShrink: 0 }}>{it.kind === "tool" ? "기능" : "게시판"}</span>
            <input value={it.label || ""} onChange={(e) => upd(i, { label: e.target.value })} placeholder={phOf(it)}
              style={{ flex: 1, fontFamily: "inherit", fontSize: 13, padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", color: "var(--fg)", outline: "none" }} />
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--fg-2)", cursor: "pointer", whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={enabled} onChange={(e) => upd(i, { enabled: e.target.checked })} /> 표시
            </label>
            <button style={{ ...btn, width: 26, height: 26, color: "#dc2626", borderColor: "#fca5a5" }} onClick={() => del(i)} title="삭제">✕</button>
          </div>
        );
      })}
      {/* 추가 + 저장 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <select value={addVal} onChange={(e) => setAddVal(e.target.value)}
          style={{ fontFamily: "inherit", fontSize: 12, padding: "7px 8px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", color: "var(--fg)" }}>
          <optgroup label="게시판 링크">
            <option value="board:">이 카테고리 게시판</option>
            {cats.filter((x) => x.id !== cat.id).map((x) => <option key={x.id} value={"board:" + x.id}>{x.name} 게시판</option>)}
          </optgroup>
          <optgroup label="기능 페이지">
            {TOOLS.map((t) => <option key={t.key} value={"tool:" + t.key}>{t.defaultLabel}</option>)}
          </optgroup>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={add}><Icon name="plus" size={12} /> 항목 추가</button>
        <div style={{ flex: 1 }} />
        {msg && <span style={{ fontSize: 11, color: msg.startsWith("저장 완료") ? "#166534" : "#dc2626" }}>{msg}</span>}
        <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
          {saving ? <span className="login-spinner" /> : <><Icon name="check" size={12} /> 저장</>}
        </button>
      </div>
    </div>
  );
};

// ─── 카테고리 관리 (관리자)
const ManageCategoriesView = ({ onNav, onCategoryUpdate }) => {
  const D = window.WV_DATA;
  const [cats, setCats] = React.useState(D.categories);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", desc: "", type: "board", icon: "doc", approval: false });
  const reset = () => { setForm({ name: "", desc: "", type: "board", icon: "doc", approval: false }); setEditing(null); };

  // ── 하위메뉴(사이드바 날개) 인라인 관리 — { 카테고리id: [항목...] } ──
  const [subCfg, setSubCfg] = React.useState({});
  const [subSaving, setSubSaving] = React.useState(false);
  const [subMsg, setSubMsg] = React.useState("");
  const [expandedCat, setExpandedCat] = React.useState(null);
  React.useEffect(() => {
    fetch("/api/settings/submenus").then((r) => r.json())
      .then((d) => { if (d && d.value) setSubCfg(d.value); }).catch(() => {});
  }, []);
  const subListFor = (c) => (Array.isArray(subCfg[c.id]) ? subCfg[c.id] : window.WV_SUB.defaultList(c));
  const setSubList = (catId, newList) => { setSubMsg(""); setSubCfg((p) => ({ ...p, [catId]: newList })); };
  const saveSubs = async () => {
    setSubSaving(true); setSubMsg("");
    try {
      const res = await fetch("/api/settings/submenus", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: subCfg }) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      setSubMsg("저장 완료 · F5하면 사이드바에 반영");
    } catch (e) { setSubMsg("저장 실패: " + e.message); }
    setSubSaving(false);
  };

  // ── 드래그앤드롭 정렬 ──
  const [dragIndex, setDragIndex] = React.useState(null);
  const [dragOverIndex, setDragOverIndex] = React.useState(null);
  const [reorderSaving, setReorderSaving] = React.useState(false);

  const handleDragStart = (i) => (e) => {
    setDragIndex(i);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (i) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== i) setDragOverIndex(i);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };
  const handleDrop = (i) => async (e) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) { handleDragEnd(); return; }
    const next = [...cats];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    setCats(next);
    // data.js와 사이드바에도 반영
    D.categories.splice(0, D.categories.length, ...next);
    if (onCategoryUpdate) onCategoryUpdate([...next]);
    handleDragEnd();
    // 백엔드에 순서 저장
    setReorderSaving(true);
    try {
      await window.WV_API.reorderCategories(next.map(c => c.id));
    } catch (err) {
      alert("순서 저장 실패: " + (err.message || err));
    }
    setReorderSaving(false);
  };

  React.useEffect(() => {
    window.WV_API.getCategories().then(data => {
      if (data && data.length > 0) {
        setCats(data);
        // data.js도 업데이트해서 사이드바에 반영
        D.categories.splice(0, D.categories.length, ...data);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const add = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      // 영문 슬러그 + 타임스탬프로 항상 고유 ID 보장 (한글 이름이면 cat-타임스탬프)
      const slugBase = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const autoId = slugBase ? `${slugBase}-${Date.now().toString().slice(-6)}` : "cat-" + Date.now();
      const newCat = {
        id: autoId,
        name: form.name,
        desc: form.desc,
        type: form.type,
        icon: form.icon || "doc",
        approval: form.approval || false,
      };
      const result = await window.WV_API.addCategory(newCat);
      const savedCat = result?.category ? { ...newCat, ...result.category } : newCat;
      const newCats = [...cats, savedCat];
      setCats(newCats);
      D.categories.push(savedCat);
      if (onCategoryUpdate) onCategoryUpdate([...D.categories]);
      reset(); setAdding(false);
    } catch(e) { alert("저장 실패. 다시 시도해주세요."); }
    setSaving(false);
  };

  const remove = async (cat) => {
    if (!confirm(`"${cat.name}" 카테고리를 삭제할까요?`)) return;
    await window.WV_API.deleteCategory(cat.id);
    setCats(prev => prev.filter(c => c.id !== cat.id));
    const idx = D.categories.findIndex(c => c.id === cat.id);
    if (idx > -1) D.categories.splice(idx, 1);
    if (onCategoryUpdate) onCategoryUpdate([...D.categories]);
  };

  const updateCat = async () => {
    if (!form.name || !editing) return;
    setSaving(true);
    try {
      const updated = { ...editing, name: form.name, desc: form.desc, type: form.type, icon: form.icon, approval: form.approval || false };
      await window.WV_API.updateCategory(editing.id, updated);
      setCats(prev => prev.map(c => c.id === editing.id ? updated : c));
      const idx = D.categories.findIndex(c => c.id === editing.id);
      if (idx > -1) D.categories[idx] = updated;
      reset(); setAdding(false);
    } catch(e) { alert("수정 실패. 다시 시도해주세요."); }
    setSaving(false);
  };

  const startEdit = (cat) => {
    setForm({ name: cat.name, desc: cat.desc || "", type: cat.type || "board", icon: cat.icon || "doc", approval: cat.approval || false });
    setEditing(cat);
    setAdding(true);
  };

  return (
    <div className="content">
      <div className="content-hd">
        <div>
          <h1 className="content-title">카테고리 관리</h1>
          <div className="content-sub">관리자가 직접 카테고리를 추가·수정·삭제할 수 있습니다.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> 카테고리 추가</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* 드래그 안내 + 저장 상태 */}
        <div style={{
          padding: "8px 16px", fontSize: 12, color: "var(--fg-3)",
          borderBottom: "1px solid var(--line)", background: "var(--bg-sunk)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>💡 좌측 핸들(<span style={{ fontFamily: "monospace" }}>⋮⋮</span>)을 잡아 끌어 순서를 변경하세요. 변경 즉시 자동 저장됩니다.</span>
          {reorderSaving && <span style={{ color: "var(--primary)" }}>저장 중…</span>}
        </div>
        <div className="cat-mng-hd">
          <div>이름</div>
          <div>설명</div>
          <div>자료 수</div>
          <div>액션</div>
        </div>
        {cats.map((c, i) => {
          const isDragging = dragIndex === i;
          const isDropTarget = dragOverIndex === i && dragIndex !== null && dragIndex !== i;
          const subCount = subListFor(c).length;
          const expanded = expandedCat === c.id;
          return (
            <React.Fragment key={c.id}>
            <div
              className="cat-mng-row"
              draggable
              onDragStart={handleDragStart(i)}
              onDragOver={handleDragOver(i)}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={handleDrop(i)}
              onDragEnd={handleDragEnd}
              style={{
                opacity: isDragging ? 0.4 : 1,
                borderTop: isDropTarget && i < (dragIndex ?? 0) ? "3px solid var(--primary)" : undefined,
                borderBottom: isDropTarget && i > (dragIndex ?? 0) ? "3px solid var(--primary)" : undefined,
                cursor: "grab",
                transition: "opacity 0.15s",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {/* 드래그 핸들 */}
                <span
                  style={{
                    cursor: "grab", color: "var(--fg-3)", fontFamily: "monospace",
                    fontSize: 14, fontWeight: 700, userSelect: "none",
                    padding: "0 4px",
                  }}
                  title="드래그하여 순서 변경"
                >⋮⋮</span>
                <div className="cat-card-icon" style={{ width: 30, height: 30 }}>
                  <Icon name={CAT_ICON[c.id] || c.icon} size={14} />
                </div>
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{c.name}</div>
              </div>
              <div className="meta" style={{whiteSpace: "normal", lineHeight: 1.4}}>{c.desc}</div>
              <div className="mono" style={{ color: "var(--fg-2)" }}>{c.count}</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn btn-ghost btn-sm" title="하위메뉴 편집"
                  onClick={(e) => { e.stopPropagation(); setExpandedCat(expanded ? null : c.id); }}
                  style={{ color: expanded ? "var(--primary)" : undefined }}>
                  <Icon name={expanded ? "chevron-down" : "chevron-right"} size={12} /> 하위 {subCount}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}><Icon name="edit" size={12} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(c)}><Icon name="trash" size={12} /></button>
                <button className="btn btn-ghost btn-sm"><Icon name="more-horizontal" size={12} /></button>
              </div>
            </div>
            {expanded && (
              <CategorySubmenuInline cat={c} list={subListFor(c)} cats={cats}
                onChange={(newList) => setSubList(c.id, newList)}
                onSave={saveSubs} saving={subSaving} msg={subMsg} />
            )}
            </React.Fragment>
          );
        })}
      </div>

      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-hd">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>새 카테고리</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="modal-bd">
              <div className="field">
                <label className="field-label">이름 *</label>
                <input className="field-input" value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))} placeholder="예: 화학물질관리" />
              </div>
              <div className="field">
                <label className="field-label">설명</label>
                <textarea className="field-textarea" style={{ minHeight: 80 }} value={form.desc} onChange={e => setForm(s => ({ ...s, desc: e.target.value }))} placeholder="이 카테고리에 어떤 자료가 등록되는지 안내합니다." />
              </div>
              {/* 유형 선택 — 화면 동작 방식 결정 */}
              <div className="field">
                <label className="field-label">유형 *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { id: "board",      name: "게시판형",   desc: "글·첨부파일 게시 (공지·서류)" },
                    { id: "library",    name: "자료실형",   desc: "썸네일 카드 + 다운로드 (표지·포스터)" },
                    { id: "form",       name: "양식생성형", desc: "전용 입력 양식 (교육·평가)" },
                    { id: "board-form", name: "게시판+양식", desc: "게시판 + 양식 혼합 (MSDS)" },
                  ].map(t => (
                    <div key={t.id} className={"type-card" + (form.type === t.id ? " active" : "")}
                      onClick={() => setForm(s => ({ ...s, type: t.id }))}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.3 }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="field-label">아이콘</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["doc","book","graduation","alert","flask","body","sign","image","shield","flag","bookmark","star"].map(ic => (
                    <button key={ic} className={"icon-pick" + (form.icon === ic ? " active" : "")} onClick={() => setForm(s => ({ ...s, icon: ic }))}>
                      <Icon name={ic} size={16} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn btn-secondary" onClick={() => { setAdding(false); reset(); }}>취소</button>
              <button className="btn btn-primary" onClick={editing ? updateCat : add} disabled={saving}>
                {saving ? <span className="login-spinner" /> : <><Icon name="check" size={14} /> {editing ? "수정" : "추가"}</>}
              </button>
            </div>

            <style>{`
              .type-card {
                border: 1px solid var(--line);
                background: var(--bg-elev);
                border-radius: var(--r-md);
                padding: 10px 12px; cursor: pointer;
                display: flex; flex-direction: column; gap: 2px;
              }
              .type-card:hover { background: var(--bg-sunk); }
              .type-card.active { border-color: var(--primary); background: var(--primary-soft); }
              .icon-pick {
                width: 34px; height: 34px;
                border: 1px solid var(--line);
                background: var(--bg-elev);
                border-radius: var(--r-md);
                display: grid; place-items: center;
                color: var(--fg-3);
              }
              .icon-pick.active { background: var(--primary); color: var(--primary-fg); border-color: var(--primary); }
            `}</style>
          </div>
        </div>
      )}

      <style>{`
        .cat-mng-hd, .cat-mng-row {
          display: grid;
          grid-template-columns: 240px 1.5fr 80px 110px;
          gap: 16px; align-items: center;
          padding: 14px 18px;
          font-size: 13px;
        }
        @media (max-width: 900px) {
          .cat-mng-hd, .cat-mng-row { grid-template-columns: 200px 1fr 90px; }
          .cat-mng-row > div:nth-child(3), .cat-mng-hd > div:nth-child(3) { display: none; }
        }
        .cat-mng-hd {
          background: var(--bg-sunk); color: var(--fg-4);
          font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
          border-bottom: 1px solid var(--line);
        }
        [data-mood="technical"] .cat-mng-hd { font-family: var(--font-mono); }
        .cat-mng-row { border-bottom: 1px solid var(--line-2); }
        .cat-mng-row:last-child { border-bottom: 0; }
        .cat-mng-row:hover { background: var(--bg-sunk); }
      `}</style>
    </div>
  );
};

// ─── 사용자 권한 관리 (관리자) — 전체 계정 목록 + 필터 + 휴면/만료/연장
const ManageUsersView = ({ currentUser }) => {
  const D = window.WV_DATA;
  const today = D.today;
  const role = currentUser?.role || "staff";
  const userSiteIds = String(currentUser?.siteIds || "").split(",").map(s => s.trim()).filter(Boolean);

  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  const [permEdit, setPermEdit] = React.useState(null);
  const [editing, setEditing] = React.useState(null);  // 전체 정보 편집 모달용
  const [resetResult, setResetResult] = React.useState(null);   // {name, email, newPassword}
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [tab, setTab] = React.useState("accounts");

  // 사용자 삭제 — 확인 후 백엔드 호출
  const handleDeleteUser = async (u) => {
    if (!u) return;
    if (String(currentUser?.id) === String(u.id)) {
      alert("본인 계정은 삭제할 수 없습니다.");
      return;
    }
    const ok = window.confirm(`정말로 [${u.name || u.email}] 계정을 영구 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
    if (!ok) return;
    try {
      const result = await window.WV_API.deleteUser(u.id);
      if (result && result.success) {
        setUsers(us => us.filter(x => x.id !== u.id));
        setDetail(null);
        alert("계정이 삭제되었습니다.");
      } else {
        alert("삭제 실패: " + (result?.error || "다시 시도해주세요."));
      }
    } catch (e) {
      alert("서버 연결 실패: " + (e.message || ""));
    }
  };

  // 임시 비밀번호 재발급
  const handleResetPassword = async (u) => {
    if (!u) return;
    const ok = window.confirm(`[${u.name || u.email}] 계정의 임시 비밀번호를 새로 발급하시겠습니까?\n\n발급 즉시 기존 비밀번호는 사용할 수 없습니다.`);
    if (!ok) return;
    try {
      const result = await window.WV_API.resetUserPassword(u.id);
      if (result && result.success && result.newPassword) {
        setResetResult({
          name: u.name || u.email,
          email: u.email,
          newPassword: result.newPassword,
        });
      } else {
        alert("재발급 실패: " + (result?.error || "다시 시도해주세요."));
      }
    } catch (e) {
      alert("서버 연결 실패: " + (e.message || ""));
    }
  };

  React.useEffect(() => {
    window.WV_API.getUsers().then(data => {
      // 권한별 필터링
      let filtered = data;
      if (role === "manager") {
        // 팀장: 본인 담당 사업장 계정만
        filtered = data.filter(u =>
          ["site_manager", "site_staff"].includes(u.role) &&
          userSiteIds.some(sid => String(u.siteIds || "").split(",").map(s => s.trim()).includes(sid))
        );
      } else if (role === "staff") {
        // 팀원: 본인 담당 사업장 site_manager, site_staff만
        filtered = data.filter(u =>
          ["site_manager", "site_staff"].includes(u.role) &&
          userSiteIds.some(sid => String(u.siteIds || "").split(",").map(s => s.trim()).includes(sid))
        );
      } else if (role === "site_manager") {
        // 현장관리자: 본인 사업장 site_staff만
        filtered = data.filter(u =>
          u.role === "site_staff" &&
          userSiteIds.some(sid => String(u.siteIds || "").split(",").map(s => s.trim()).includes(sid))
        );
      }
      setUsers(filtered);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const counts = D.roles.map(r => ({
    ...r,
    n: users.filter(u => u.role === r.id).length,
  }));

  const isExpiringSoon = (u) => {
    if (!u.expiresAt) return false;
    const days = Math.round((new Date(u.expiresAt) - new Date()) / 86400000);
    return days >= 0 && days <= 30;
  };

  const isExpired = (u) => {
    if (!u.expiresAt) return false;
    return new Date(u.expiresAt) < new Date();
  };
  

  const filtered = users.filter(u => {
    if (typeFilter !== "all" && u.userType !== typeFilter) return false;
    if (statusFilter === "expiring") {
      if (!isExpiringSoon(u)) return false;
    } else if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (search && !u.name.includes(search) && !u.dept.includes(search) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const setRole = (id, role) => setUsers(us => us.map(u => u.id === id ? { ...u, role } : u));
  const setStatus = (id, status) => setUsers(us => us.map(u => u.id === id ? { ...u, status } : u));
  const extendExpiry = (id, days = 365) => setUsers(us => us.map(u => {
    if (u.id !== id) return u;
    const base = u.expiresAt && new Date(u.expiresAt) > today ? new Date(u.expiresAt) : new Date(today);
    base.setDate(base.getDate() + days);
    return { ...u, expiresAt: D.fmt(base) };
  }));

  const statusCounts = {
    all: users.length,
    active: users.filter(u => u.status === "active").length,
    dormant: users.filter(u => u.status === "dormant").length,
    inactive: users.filter(u => u.status === "inactive").length,
    expiring: users.filter(isExpiringSoon).length,
  };

  if (loading) return (
    <div className="content" style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300 }}>
      <span className="login-spinner" style={{ width:32, height:32 }} /> &nbsp; 계정 목록 불러오는 중...
    </div>
  );

  return (
    <div className="content">
      <div className="content-hd">
        <div>
          <h1 className="content-title">계정 목록 관리</h1>
          <div className="content-sub">전체 임직원 계정을 관리합니다. 휴면 해제, 권한 변경, 강제 비활성화가 가능합니다.</div>
        </div>
        <div style={{display: "flex", gap: 8}}>
          <button className="btn btn-secondary"><Icon name="download" size={14} /> 계정 목록 내보내기</button>
          <button className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="user-plus" size={14} /> 사용자 초대</button>
        </div>
      </div>

      {/* Role summary */}
      <div className="role-summary">
        {counts.map(r => (
          <div key={r.id} className="role-stat">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="role-dot" style={{ background: r.color }} />
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</span>
            </div>
            <div className="meta" style={{ marginTop: 4 }}>{r.desc}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, letterSpacing: "-0.01em" }}>
              {r.n} <span style={{ fontSize: 12, fontWeight: 400, color: "var(--fg-3)" }}>명</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tab toggle */}
      <div className="account-tabs">
        <button className={tab === "accounts" ? "active" : ""} onClick={() => setTab("accounts")}>
          <Icon name="users" size={14} /> 계정 목록
        </button>
        <button className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>
          <Icon name="user-plus" size={14} /> 🔔 가입 대기
          {users.filter(u => u.status === "pending").length > 0 && (
            <span style={{
              marginLeft: 6, padding: "1px 7px", borderRadius: 999,
              background: "var(--danger)", color: "#fff", fontSize: 11, fontWeight: 700,
            }}>
              {users.filter(u => u.status === "pending").length}
            </span>
          )}
        </button>
        <button className={tab === "matrix" ? "active" : ""} onClick={() => setTab("matrix")}>
          <Icon name="shield" size={14} /> 권한 매트릭스
        </button>
      </div>

      {tab === "accounts" && (
        <>
          {/* Filters */}
          <div className="account-filters">
            <div className="filter-group">
              {[
                { id: "all", label: `전체 ${statusCounts.all}` },
                { id: "active", label: `활성 ${statusCounts.active}`, dot: "var(--success)" },
                { id: "dormant", label: `휴면 ${statusCounts.dormant}`, dot: "var(--warning)" },
                { id: "inactive", label: `비활성 ${statusCounts.inactive}`, dot: "var(--danger)" },
                { id: "expiring", label: `만료 임박 ${statusCounts.expiring}`, dot: "var(--urgent)" },
              ].map(f => (
                <button key={f.id} className={"filter-btn" + (statusFilter === f.id ? " active" : "")}
                  onClick={() => setStatusFilter(f.id)}>
                  {f.dot && <span className="filter-dot" style={{background: f.dot}} />}
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{flex: 1}} />
            <div className="filter-group">
              {[
                { id: "all", label: "모든 유형" },
                { id: "internal", label: "사내 직원" },
              ].map(f => (
                <button key={f.id} className={"filter-btn" + (typeFilter === f.id ? " active" : "")}
                  onClick={() => setTypeFilter(f.id)}>{f.label}</button>
              ))}
            </div>
            <div className="tb-search" style={{maxWidth: 240}}>
              <Icon name="search" size={14} />
              <input placeholder="이름, 부서, 아이디" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Account table */}
          <div className="card" style={{padding: 0, overflow: "hidden"}}>
            <div className="acct-hd">
              <div>임직원</div>
              <div>유형</div>
              <div>부서 / 소속</div>
              <div>아이디</div>
              <div>최근 접속</div>
              <div>유효기간</div>
              <div>상태</div>
              <div>권한</div>
              <div></div>
            </div>
            {filtered.length === 0 && (
              <div style={{padding: 60, textAlign: "center", color: "var(--fg-3)"}}>
                해당 조건의 계정이 없습니다.
              </div>
            )}
            {filtered.map(u => {
              const expDays = u.expiresAt ? Math.round((new Date(u.expiresAt) - today) / 86400000) : null;
              const expSoon = isExpiringSoon(u);
              const expired = isExpired(u);
              return (
                <div key={u.id} className="acct-row" onClick={() => setDetail(u)}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div className="activity-avatar" style={{ width: 32, height: 32, background: D.roles.find(r => r.id === u.role)?.color || "#94a3b8", color: "#fff" }}>{(u.name || u.email || "?").charAt(0)}</div>
                    <div>
                      <div style={{fontWeight: 500, fontSize: 13.5}}>{u.name || "(이름 없음)"}</div>
                      <div className="meta">{u.position || ""}</div>
                    </div>
                  </div>
                  <div>
                    <span className="chip"><Icon name="user" size={11} /> 사내직원</span>
                  </div>
                  <div style={{fontSize: 12.5, color: "var(--fg-2)"}}>{u.dept}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{u.email}</div>
                  <div className="meta">{u.lastLoginAt || "—"}</div>
                  <div><span className="meta">—</span></div>
                  <div>
                    {u.status === "active"   && <span className="chip chip-success"><span className="chip-dot" /> 활성</span>}
                    {u.status === "dormant"  && <span className="chip chip-warning"><span className="chip-dot" /> 휴면</span>}
                    {u.status === "inactive" && <span className="chip chip-rejected"><span className="chip-dot" /> 비활성</span>}
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <select className="field-select" style={{ padding: "6px 8px", fontSize: 12, height: "auto" }}
                      value={u.role} onChange={e => setRole(u.id, e.target.value)}>
                      {D.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div onClick={e => e.stopPropagation()} style={{display: "flex", gap: 4, justifyContent: "flex-end"}}>
                    <button className="btn btn-secondary btn-sm" title="권한 편집"
                      onClick={() => setPermEdit(u)}>
                      <Icon name="shield" size={12} /> 권한 편집
                    </button>
                    <button className="btn btn-ghost btn-sm" title="상세" onClick={() => setDetail(u)}>
                      <Icon name="more-horizontal" size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "pending" && (
        <>
          <SectionHd title="가입 대기 목록" sub="사용자가 회원가입을 신청한 계정들입니다. 검토 후 승인 또는 거부해 주세요." />
          {(() => {
            const pendingUsers = users.filter(u => u.status === "pending");
            if (pendingUsers.length === 0) {
              return (
                <div className="card" style={{ padding: 60, textAlign: "center", color: "var(--fg-3)" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>대기 중인 가입 신청이 없습니다</div>
                  <div style={{ fontSize: 12 }}>새 신청이 들어오면 여기에 표시됩니다.</div>
                </div>
              );
            }
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pendingUsers.map(u => (
                  <div key={u.id} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, borderLeft: "4px solid var(--warning)" }}>
                    <div className="activity-avatar" style={{
                      width: 48, height: 48,
                      background: "var(--warning)", color: "#fff", fontSize: 18, fontWeight: 600,
                      display: "grid", placeItems: "center", borderRadius: "50%",
                    }}>{(u.name || u.email || "?").charAt(0)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{u.name}</div>
                        <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--fg-3)", padding: "2px 8px", background: "var(--bg-sunk)", borderRadius: 4 }}>{u.email}</span>
                        <span className="chip chip-warning"><span className="chip-dot" /> 승인 대기</span>
                      </div>
                      <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--fg-3)", flexWrap: "wrap" }}>
                        {u.dept && <span><Icon name="users" size={11} /> {u.dept}</span>}
                        {u.phone && <span><Icon name="phone" size={11} /> {u.phone}</span>}
                        {u.position && <span>· {u.position}</span>}
                        {u.requestedAt && <span>· 신청일 {new Date(u.requestedAt).toLocaleDateString("ko-KR")}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-sm"
                        style={{ background: "var(--success)", color: "#fff" }}
                        onClick={async () => {
                          if (!window.confirm(`[${u.name}] (${u.email}) 의 가입을 승인하시겠습니까?\n승인 시 즉시 로그인 가능합니다.`)) return;
                          try {
                            const res = await window.WV_API.approveUser(u.id);
                            if (res?.success) {
                              setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: "active" } : x));
                              alert(`${u.name}님의 가입을 승인했습니다.`);
                            } else {
                              alert("승인 실패: " + (res?.error || "다시 시도해주세요."));
                            }
                          } catch (e) { alert("서버 오류: " + e.message); }
                        }}>
                        <Icon name="check" size={12} /> ✅ 승인
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={async () => {
                          if (!window.confirm(`[${u.name}] (${u.email}) 의 가입 신청을 거부하시겠습니까?\n계정이 영구 삭제되며, 사용자는 다시 신청해야 합니다.`)) return;
                          try {
                            const res = await window.WV_API.rejectUser(u.id);
                            if (res?.success) {
                              setUsers(prev => prev.filter(x => x.id !== u.id));
                              alert(`${u.name}님의 가입 신청을 거부했습니다.`);
                            } else {
                              alert("거부 실패: " + (res?.error || "다시 시도해주세요."));
                            }
                          } catch (e) { alert("서버 오류: " + e.message); }
                        }}>
                        <Icon name="x" size={12} /> ❌ 거부
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {tab === "matrix" && (
        <>
          <SectionHd title="역할별 권한 매트릭스" sub="역할에 부여된 액션을 한눈에 확인합니다." />
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="perm-hd">
              <div>권한 / 역할</div>
              {D.roles.map(r => <div key={r.id} style={{ textAlign: "center" }}>{r.name}</div>)}
            </div>
            {[
              { key: "upload",          label: "자료 업로드" },
              { key: "submit",          label: "이행 양식 제출" },
              { key: "comment",         label: "댓글 작성" },
              { key: "approve",         label: "제출 승인/반려" },
              { key: "manageCategory",  label: "카테고리 관리" },
              { key: "manageUser",      label: "사용자 관리" },
            ].map(p => (
              <div key={p.key} className="perm-row">
                <div style={{ fontWeight: 500, fontSize: 13 }}>{p.label}</div>
                {D.roles.map(r => (
                  <div key={r.id} style={{ textAlign: "center" }}>
                    {D.can[r.id][p.key]
                      ? <span style={{ color: "var(--success)", display: "inline-flex" }}><Icon name="check-circle" size={16} /></span>
                      : <span style={{ color: "var(--fg-4)", display: "inline-flex" }}><Icon name="x" size={14} /></span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {detail && (
        <AccountDetailModal
          user={detail}
          currentUserId={currentUser?.id}
          onClose={() => setDetail(null)}
          onSetStatus={(s) => { setStatus(detail.id, s); setDetail({...detail, status: s}); }}
          onExtend={(days) => { extendExpiry(detail.id, days); setDetail(null); }}
          onEditPerm={() => { setPermEdit(detail); setDetail(null); }}
          onEditAll={() => { setEditing(detail); setDetail(null); }}
          onDelete={() => handleDeleteUser(detail)}
          onResetPassword={() => handleResetPassword(detail)}
        />
      )}

      {/* 임시 비밀번호 재발급 결과 모달 */}
      {resetResult && (
        <div className="modal-overlay" onClick={() => setResetResult(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-hd">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🔑 임시 비밀번호 발급 완료</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setResetResult(null)}><Icon name="x" size={14} /></button>
            </div>
            <div className="modal-bd" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
                <b>{resetResult.name}</b> ({resetResult.email}) 계정의 새 비밀번호가 발급되었습니다.<br/>
                아래 비밀번호를 사용자에게 직접 전달해 주세요.
              </div>
              <div style={{
                padding: "18px 20px",
                background: "#f0fdf4",
                border: "2px dashed #16a34a",
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: 22,
                fontWeight: 700,
                color: "#15803d",
                textAlign: "center",
                letterSpacing: 2,
                userSelect: "all",
              }}>
                {resetResult.newPassword}
              </div>
              <div style={{
                fontSize: 12,
                color: "#92400e",
                background: "#fef3c7",
                padding: "10px 12px",
                borderRadius: 6,
                lineHeight: 1.5,
              }}>
                ⚠️ 이 비밀번호는 한 번만 표시됩니다. 창을 닫기 전에 안전한 곳에 복사해 두세요.<br/>
                사용자에게는 로그인 후 즉시 비밀번호를 변경하도록 안내하세요.
              </div>
            </div>
            <div className="modal-ft" style={{ gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(resetResult.newPassword);
                  alert("비밀번호가 클립보드에 복사되었습니다.");
                }}
              >
                <Icon name="copy" size={14} /> 비밀번호 복사
              </button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={() => setResetResult(null)}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit All Modal (관리자 전체 정보 편집) */}
      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSave={(updated) => {
            setUsers(us => us.map(u => u.id === updated.id ? { ...u, ...updated } : u));
            setEditing(null);
          }}
        />
      )}

      {/* Permission Edit Modal */}
      {permEdit && (
        <AccountPermissionModal
          user={permEdit}
          onClose={() => setPermEdit(null)}
          onSave={({ role, menuOverrides }) => {
            setUsers(us => us.map(u => u.id === permEdit.id ? { ...u, role, menuOverrides } : u));
            setPermEdit(null);
          }}
        />
      )}

      {/* Invite Modal */}
      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-hd">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>계정 추가</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="modal-bd">
              <InviteForm onSave={(newUser) => {
                setUsers(us => [...us, newUser]);
                setAdding(false);
              }} onCancel={() => setAdding(false)} roles={D.roles} depts={D.depts} currentUser={currentUser} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .role-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        @media (max-width: 800px) { .role-summary { grid-template-columns: repeat(2, 1fr); } }
        .role-stat { background: var(--bg-elev); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 16px 18px; }
        .role-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

        .account-tabs {
          display: inline-flex; padding: 4px;
          background: var(--bg-sunk); border-radius: var(--r-md);
          margin-bottom: 18px;
        }
        .account-tabs button {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 16px;
          background: transparent; border: 0;
          border-radius: calc(var(--r-md) - 2px);
          font-size: 13px; color: var(--fg-3);
          font-weight: 500; cursor: pointer; white-space: nowrap;
        }
        .account-tabs button.active { background: var(--bg-elev); color: var(--fg); box-shadow: var(--shadow); font-weight: 600; }

        .account-filters {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 0; flex-wrap: wrap;
          border-bottom: 1px solid var(--line);
          margin-bottom: 14px;
        }
        .filter-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

        .acct-hd, .acct-row {
          display: grid;
          grid-template-columns: 160px 110px 1fr 200px 110px 150px 90px 110px 40px;
          gap: 12px; align-items: center;
          padding: 12px 18px;
          font-size: 13px;
        }
        @media (max-width: 1400px) {
          .acct-hd, .acct-row { grid-template-columns: 160px 100px 1fr 110px 90px 40px; }
          .acct-row > div:nth-child(4), .acct-hd > div:nth-child(4),
          .acct-row > div:nth-child(5), .acct-hd > div:nth-child(5),
          .acct-row > div:nth-child(6), .acct-hd > div:nth-child(6) { display: none; }
        }
        .acct-hd {
          background: var(--bg-sunk); color: var(--fg-4);
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.04em;
          border-bottom: 1px solid var(--line);
        }
        [data-mood="technical"] .acct-hd { font-family: var(--font-mono); }
        .acct-row { border-bottom: 1px solid var(--line-2); cursor: pointer; }
        .acct-row:last-child { border-bottom: 0; }
        .acct-row:hover { background: var(--bg-sunk); }

        .perm-hd, .perm-row {
          display: grid; grid-template-columns: 1.2fr repeat(4, 1fr); gap: 16px; align-items: center;
          padding: 14px 18px; font-size: 13px;
        }
        .perm-hd { background: var(--bg-sunk); color: var(--fg-4); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--line); }
        [data-mood="technical"] .perm-hd { font-family: var(--font-mono); }
        .perm-row { border-bottom: 1px solid var(--line-2); }
        .perm-row:last-child { border-bottom: 0; }
      `}</style>
    </div>
  );
};

// ─── 계정 상세 + 액션 모달
// 상세 모달용 라벨-값 한 줄 컴포넌트
const DetailRow = ({ label, mono, children }) => (
  <div style={{ display: "flex", padding: "8px 0", borderBottom: "1px solid var(--line)", gap: 12 }}>
    <div style={{ width: 140, fontSize: 12, color: "var(--fg-3)", fontWeight: 600 }}>{label}</div>
    <div style={{ flex: 1, fontSize: 13, color: "var(--fg-1)", fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>{children}</div>
  </div>
);

// 관리자: 사용자 전체 정보 편집 모달
const EditUserModal = ({ user, onClose, onSave }) => {
  const D = window.WV_DATA;
  const [form, setForm] = React.useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    dept: user.dept || "",
    position: user.position || "",
    role: user.role || "staff",
    status: user.status || "active",
    hqId: user.hqId || "",
    siteIds: user.siteIds || "",   // CSV "1,5,7"
    password: "",   // 빈 칸이면 비밀번호 변경 안 함
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [hqs, setHQs] = React.useState([]);
  const [sites, setSites] = React.useState([]);
  const upd = (k, v) => setForm(s => ({ ...s, [k]: v }));

  // 본부/사업장 로드
  React.useEffect(() => {
    if (window.WV_API?.getHQs) window.WV_API.getHQs().then(d => setHQs(Array.isArray(d) ? d : []));
    if (window.WV_API?.getSites) window.WV_API.getSites().then(d => setSites(Array.isArray(d) ? d : []));
  }, []);

  // 선택된 본부의 사업장만 표시
  const sitesInHQ = React.useMemo(() => {
    if (!form.hqId) return [];
    return sites.filter(s => String(s.hqId) === String(form.hqId));
  }, [sites, form.hqId]);

  // 현재 siteIds 배열 (CSV 파싱)
  const selectedSiteIds = React.useMemo(() => {
    return String(form.siteIds || "").split(",").map(s => s.trim()).filter(Boolean);
  }, [form.siteIds]);

  const toggleSite = (siteId) => {
    const id = String(siteId);
    const set = new Set(selectedSiteIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    upd("siteIds", Array.from(set).join(","));
  };

  // 본부 변경 시 → 그 본부에 속하지 않는 사업장 자동 제거
  React.useEffect(() => {
    if (!form.hqId || sites.length === 0) return;
    const validIds = sites.filter(s => String(s.hqId) === String(form.hqId)).map(s => String(s.id));
    const filtered = selectedSiteIds.filter(id => validIds.includes(id));
    if (filtered.length !== selectedSiteIds.length) {
      upd("siteIds", filtered.join(","));
    }
  }, [form.hqId, sites]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError("이름을 입력해주세요."); return; }
    if (!form.email.trim()) { setError("아이디를 입력해주세요."); return; }
    setSaving(true); setError("");
    try {
      // 비밀번호가 비어있으면 payload에서 제외 (기존 비밀번호 유지)
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const result = await window.WV_API.updateUser(user.id, payload);
      if (result && !result.error) {
        onSave({ ...user, ...payload });
      } else {
        setError("저장 실패: " + (result?.error || "다시 시도해주세요."));
      }
    } catch (e) {
      setError("서버 연결 실패: " + (e.message || ""));
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-hd">
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>✏️ 사용자 정보 편집</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {error && <div style={{ color: "var(--danger)", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 6 }}>{error}</div>}
          <div className="field">
            <label className="field-label">이름</label>
            <input className="field-input" value={form.name} onChange={e => upd("name", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">아이디 (로그인 ID)</label>
            <input className="field-input" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="예: admin, manager1" />
          </div>
          <div className="field">
            <label className="field-label">새 비밀번호 <span style={{ color: "var(--fg-3)", fontWeight: 400 }}>(비워두면 기존 유지)</span></label>
            <input className="field-input" type="text" value={form.password} onChange={e => upd("password", e.target.value)} placeholder="••••••" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label className="field-label">부서</label>
              <input className="field-input" value={form.dept} onChange={e => upd("dept", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">직책</label>
              <input className="field-input" value={form.position} onChange={e => upd("position", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="field-label">연락처</label>
            <input className="field-input" value={form.phone} onChange={e => upd("phone", e.target.value)} placeholder="010-0000-0000" />
          </div>
          {/* 소속 본부 */}
          <div className="field">
            <label className="field-label">소속 본부</label>
            <select className="field-select" value={form.hqId || ""} onChange={e => upd("hqId", e.target.value)}>
              <option value="">— 본부 선택 (없으면 전사) —</option>
              {hqs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>

          {/* 담당 사업장 — 본부 선택 시 활성화 */}
          {form.hqId && (
            <div className="field">
              <label className="field-label">
                담당 사업장
                <span style={{ fontSize: 11, fontWeight: 400, color: "var(--fg-3)", marginLeft: 6 }}>
                  ({selectedSiteIds.length}개 선택됨 · 클릭으로 토글)
                </span>
              </label>
              {sitesInHQ.length === 0 ? (
                <div style={{ padding: 14, textAlign: "center", color: "var(--fg-3)", fontSize: 12, background: "var(--bg-sunk)", borderRadius: 8 }}>
                  이 본부에 등록된 사업장이 없습니다. 사업장 관리에서 먼저 등록해 주세요.
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 10, background: "var(--bg-sunk)", borderRadius: 8 }}>
                  {sitesInHQ.map(s => {
                    const selected = selectedSiteIds.includes(String(s.id));
                    return (
                      <button key={s.id} type="button" onClick={() => toggleSite(s.id)}
                        style={{
                          padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                          border: selected ? "1.5px solid var(--primary)" : "1px solid var(--line)",
                          background: selected ? "var(--primary-soft)" : "var(--bg-elev)",
                          color: selected ? "var(--primary)" : "var(--fg-2)", cursor: "pointer",
                          display: "inline-flex", alignItems: "center", gap: 4,
                        }}>
                        {selected && <Icon name="check" size={10} />}
                        {s.사업장명 || s.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {(form.role === "site_manager" || form.role === "site_staff") && (
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 4 }}>
                  💡 현장 직원은 선택된 사업장만 접근할 수 있습니다.
                </div>
              )}
              {(form.role === "staff" || form.role === "manager") && (
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 4 }}>
                  💡 본사 직원은 선택된 사업장의 현장 계정을 등록·관리할 수 있습니다. (미선택 시 본부 전체)
                </div>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label className="field-label">권한</label>
              <select className="field-select" value={form.role} onChange={e => upd("role", e.target.value)}>
                {(D?.roles || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">상태</label>
              <select className="field-select" value={form.status} onChange={e => upd("status", e.target.value)}>
                <option value="active">활성</option>
                <option value="dormant">휴면</option>
                <option value="inactive">비활성</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-ft" style={{ gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>취소</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
};

const AccountDetailModal = ({ user, onClose, onSetStatus, onExtend, onEditPerm, onEditAll, onDelete, onResetPassword, currentUserId }) => {
  const D = window.WV_DATA;
  const today = D && D.today;
  const role = D && D.roles && D.roles.find(r => r.id === user?.role);
  const expDays = null;
  // 방어: user 객체에 누락된 필드가 있어도 크래시 안 나도록
  if (!user) return null;
  const safeName = user.name || user.email || "(이름 없음)";
  const avatarChar = safeName.charAt(0) || "?";
  const isSelf = currentUserId && String(currentUserId) === String(user.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 680}}>
        <div className="modal-hd" style={{alignItems: "center"}}>
          <div style={{display: "flex", gap: 14, alignItems: "center"}}>
            <div className="activity-avatar" style={{width: 48, height: 48, background: role?.color || "#94a3b8", color: "#fff", fontSize: 18}}>{avatarChar}</div>
            <div>
              <h2 style={{margin: 0, fontSize: 20, fontWeight: 600}}>{safeName}</h2>
              <div style={{display: "flex", gap: 8, marginTop: 4, alignItems: "center"}}>
                <span className="chip"><Icon name="user" size={11} /> 사내 직원</span>
                <span className="meta">{user.dept || "—"}</span>
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd">
          <div className="detail-grid">
            <DetailRow label="아이디" mono>{user.email || "—"}</DetailRow>
            <DetailRow label="연락처">{user.phone || "—"}</DetailRow>
            <DetailRow label="가입일">{user.joinedAt || "—"}</DetailRow>
            <DetailRow label="최근 접속">{user.lastLoginAt || "—"}</DetailRow>
            <DetailRow label="비밀번호 마지막 변경">{user.pwChangedAt || "—"}</DetailRow>
            <DetailRow label="권한">{role?.name || "—"} {role?.desc && <span className="meta">— {role.desc}</span>}</DetailRow>
          </div>

          {/* Status section */}
          <div className="detail-section">
            <div className="detail-section-label">현재 상태</div>
            <div style={{display: "flex", gap: 8, alignItems: "center", padding: "12px 14px", background: "var(--bg-sunk)", borderRadius: "var(--r-md)"}}>
              {user.status === "active"   && <span className="chip chip-success"><span className="chip-dot" /> 활성</span>}
              {user.status === "dormant"  && <span className="chip chip-warning"><span className="chip-dot" /> 휴면</span>}
              {user.status === "inactive" && <span className="chip chip-rejected"><span className="chip-dot" /> 비활성</span>}
              <span className="meta">
                {user.status === "active" && "정상적으로 로그인 가능한 활성 계정입니다."}
                {user.status === "dormant" && "90일 이상 미접속으로 휴면 처리되었습니다."}
                {user.status === "inactive" && "강제 비활성화된 계정입니다. 로그인이 차단됩니다."}
              </span>
            </div>
          </div>
        </div>
        <div className="modal-ft" style={{flexWrap: "wrap", gap: 8}}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>닫기</button>
          {/* 위험 영역: 삭제 (본인 계정 보호) */}
          {!isSelf && onDelete && (
            <button
              className="btn btn-sm"
              style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}
              onClick={onDelete}
              title="이 계정을 영구 삭제합니다."
            >
              <Icon name="trash" size={12} /> 계정 삭제
            </button>
          )}
          <div style={{flex: 1}} />
          {/* 임시 비밀번호 재발급 */}
          {onResetPassword && (
            <button className="btn btn-secondary btn-sm" onClick={onResetPassword} title="임시 비밀번호를 발급합니다.">
              <Icon name="key" size={12} /> 🔑 임시 비번 재발급
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onEditAll}>
            <Icon name="edit" size={12} /> ✏️ 전체 정보 편집
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onEditPerm}>
            <Icon name="shield" size={12} /> 권한 편집
          </button>
          {user.status === "dormant" && (
            <button className="btn btn-sm" style={{background: "var(--success)", color: "#fff"}} onClick={() => onSetStatus("active")}>
              <Icon name="unlock" size={12} /> 휴면 해제
            </button>
          )}
          {!isSelf && (user.status !== "inactive" ? (
            <button className="btn btn-danger btn-sm" onClick={() => onSetStatus("inactive")}>
              <Icon name="lock" size={12} /> 강제 비활성화
            </button>
          ) : (
            <button className="btn btn-sm" style={{background: "var(--success)", color: "#fff"}} onClick={() => onSetStatus("active")}>
              <Icon name="unlock" size={12} /> 활성화
            </button>
          ))}
          {isSelf && (
            <span className="meta" style={{ fontSize: 11, color: "var(--fg-3)", marginLeft: 6 }}>
              본인 계정은 상태 변경/삭제할 수 없습니다.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const InviteForm = ({ onSave, onCancel, roles, depts, currentUser }) => {
  const [form, setForm] = React.useState({
    name: "", email: "", password: "",
    dept: depts[0] || "", role: "staff",
    hqId: "", siteIds: "", phone: "", position: "",
    status: "active"
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [hqs, setHQs] = React.useState([]);
  const [sites, setSites] = React.useState([]);
  const update = (k, v) => setForm(s => ({ ...s, [k]: v }));

  React.useEffect(() => {
    // 본인 권한 안에서만 본부/사업장 표시
    if (window.WV_API?.getHQs) {
      window.WV_API.getHQs().then(d => {
        const all = Array.isArray(d) ? d : [];
        setHQs(window.WV_PERMS?.filterHQsForUser(all, currentUser) || all);
      });
    }
    if (window.WV_API?.getSites) {
      Promise.all([window.WV_API.getSites(), window.WV_API.getHQs()])
        .then(([siteData, hqData]) => {
          const allSites = Array.isArray(siteData) ? siteData : [];
          const allHQs = Array.isArray(hqData) ? hqData : [];
          // 본인이 담당하는 사업장만 등록 가능
          setSites(window.WV_PERMS?.filterSitesByAssignment(allSites, currentUser, allHQs) || allSites);
        });
    }
  }, [currentUser]);

  const sitesInHQ = React.useMemo(() => {
    if (!form.hqId) return [];
    return sites.filter(s => String(s.hqId) === String(form.hqId));
  }, [sites, form.hqId]);

  const selectedSiteIds = React.useMemo(() => {
    return String(form.siteIds || "").split(",").map(s => s.trim()).filter(Boolean);
  }, [form.siteIds]);

  const toggleSite = (siteId) => {
    const id = String(siteId);
    const set = new Set(selectedSiteIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    update("siteIds", Array.from(set).join(","));
  };

  // 본부 1개만 접근 가능하면 자동 선택 (UX)
  React.useEffect(() => {
    if (hqs.length === 1 && !form.hqId) update("hqId", hqs[0].id);
  }, [hqs]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError("이름을 입력해주세요."); return; }
    if (!form.email.trim()) { setError("아이디를 입력해주세요."); return; }
    if (!form.password.trim()) { setError("초기 비밀번호를 입력해주세요."); return; }
    setSaving(true); setError("");
    try {
      const result = await window.WV_API.addUser({
        name: form.name, email: form.email, password: form.password,
        dept: form.dept, role: form.role, status: "active",
        hqId: form.hqId || null, siteIds: form.siteIds || "",
        phone: form.phone, position: form.position,
        joinedAt: new Date().toISOString(),
      });
      if (result && !result.error) {
        onSave({ ...form, id: result.user?.id || new Date().getTime().toString() });
      } else {
        setError("저장 실패: " + (result?.error || "다시 시도해주세요."));
      }
    } catch (e) {
      setError("서버 연결 실패.");
    }
    setSaving(false);
  };

  return (
    <>
      {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "#fef2f2", borderRadius: 6 }}>{error}</div>}
      <div className="field">
        <label className="field-label">이름 *</label>
        <input className="field-input" placeholder="홍길동" value={form.name} onChange={e => update("name", e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label className="field-label">아이디 *</label>
          <input className="field-input" placeholder="예: kim01" value={form.email} onChange={e => update("email", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">초기 비밀번호 *</label>
          <input className="field-input" type="text" placeholder="설정" value={form.password} onChange={e => update("password", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label className="field-label">권한</label>
          <select className="field-select" value={form.role} onChange={e => update("role", e.target.value)}>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name} — {r.desc}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">부서</label>
          <input className="field-input" placeholder="예: 안전팀, 현장1팀"
            value={form.dept} onChange={e => update("dept", e.target.value)} />
        </div>
      </div>

      {/* 소속 본부 */}
      <div className="field">
        <label className="field-label">소속 본부</label>
        <select className="field-select" value={form.hqId || ""} onChange={e => update("hqId", e.target.value)}>
          <option value="">— 본부 선택 —</option>
          {hqs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      {/* 담당 사업장 — 본부 선택 후 표시 */}
      {form.hqId && (
        <div className="field">
          <label className="field-label">
            담당 사업장
            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--fg-3)", marginLeft: 6 }}>
              ({selectedSiteIds.length}개 선택됨)
            </span>
          </label>
          {sitesInHQ.length === 0 ? (
            <div style={{ padding: 14, textAlign: "center", color: "var(--fg-3)", fontSize: 12, background: "var(--bg-sunk)", borderRadius: 8 }}>
              이 본부에 등록 가능한 사업장이 없습니다.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 10, background: "var(--bg-sunk)", borderRadius: 8 }}>
              {sitesInHQ.map(s => {
                const selected = selectedSiteIds.includes(String(s.id));
                return (
                  <button key={s.id} type="button" onClick={() => toggleSite(s.id)}
                    style={{
                      padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      border: selected ? "1.5px solid var(--primary)" : "1px solid var(--line)",
                      background: selected ? "var(--primary-soft)" : "var(--bg-elev)",
                      color: selected ? "var(--primary)" : "var(--fg-2)", cursor: "pointer",
                    }}>
                    {selected && "✓ "}{s.사업장명 || s.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="modal-ft">
        <button className="btn btn-secondary" onClick={onCancel}>취소</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <span className="login-spinner" /> : <><Icon name="check" size={14} /> 계정 추가</>}
        </button>
      </div>
    </>
  );
};

Object.assign(window, { ManageUsersView, AccountDetailModal, EditUserModal, InviteForm });

// InviteForm 업그레이드 버전 (사업장 선택 포함)
const InviteFormV2 = ({ onSave, onCancel, roles, sites = [], currentUserRole = "admin", currentUserSiteIds = [] }) => {
  const [form, setForm] = React.useState({
    name: "", email: "", password: "", dept: "", role: "site_staff", siteIds: "", status: "active"
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const update = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const allowedRoles = roles.filter(r => {
    if (currentUserRole === "admin" || currentUserRole === "safety") return true;
    if (currentUserRole === "manager" || currentUserRole === "staff") return ["site_manager", "site_staff"].includes(r.id);
    if (currentUserRole === "site_manager") return r.id === "site_staff";
    return false;
  });

  const allowedSites = sites.filter(s => {
    if (currentUserRole === "admin" || currentUserRole === "safety") return true;
    return currentUserSiteIds.includes(String(s.id));
  });

  const handleSave = async () => {
    if (!form.name.trim()) { setError("이름을 입력해주세요."); return; }
    if (!form.email.trim()) { setError("아이디를 입력해주세요."); return; }
    if (!form.password.trim()) { setError("초기 비밀번호를 입력해주세요."); return; }
    setSaving(true); setError("");
    try {
      const result = await window.WV_API.addUser({
        name: form.name, email: form.email, password: form.password,
        dept: form.dept, role: form.role, status: "active",
        siteIds: form.siteIds,
        joinedAt: new Date().toISOString(),
      });
      if (result && !result.error) {
        onSave({ ...form, id: new Date().getTime().toString() });
      } else {
        setError("저장 실패: " + (result?.error || "다시 시도해주세요."));
      }
    } catch (e) {
      setError("서버 연결 실패.");
    }
    setSaving(false);
  };

  return (
    <>
      {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div className="field">
        <label className="field-label">이름</label>
        <input className="field-input" placeholder="홍길동" value={form.name} onChange={e => update("name", e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label">아이디 (로그인 ID)</label>
        <input className="field-input" placeholder="예: admin, manager1" value={form.email} onChange={e => update("email", e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label">초기 비밀번호</label>
        <input className="field-input" type="password" placeholder="초기 비밀번호 설정" value={form.password} onChange={e => update("password", e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label">부서</label>
        <input className="field-input" placeholder="부서명 입력" value={form.dept} onChange={e => update("dept", e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label">권한</label>
        <select className="field-select" value={form.role} onChange={e => update("role", e.target.value)}>
          {allowedRoles.map(r => <option key={r.id} value={r.id}>{r.name} — {r.desc}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="field-label">담당 사업장</label>
        <select className="field-select" value={form.siteIds} onChange={e => update("siteIds", e.target.value)}>
          <option value="">사업장 선택</option>
          {allowedSites.map(s => <option key={s.id} value={s.id}>{s["사업장명"]}</option>)}
        </select>
      </div>
      <div className="modal-ft">
        <button className="btn btn-secondary" onClick={onCancel}>취소</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <span className="login-spinner" /> : <><Icon name="check" size={14} /> 계정 추가</>}
        </button>
      </div>
    </>
  );
};

Object.assign(window, { InviteFormV2 });
