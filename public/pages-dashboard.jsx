// 윌앤비전 - Dashboard (권한별 / 본부·사업장 통합)

const Dashboard = ({ role, currentUser, onNav }) => {
  const D = window.WV_DATA;
  const today = D.today;

  // ─── 권한 분류 ─────────────────────────────────────────
  const isAdmin = role === "admin" || role === "safety";
  const isManager = role === "manager";
  const isStaff = role === "staff";
  const isSiteAgent = role === "site_manager" || role === "site_staff";
  const can = D.can[role] || D.can["staff"];

  // ─── 사용자 인사말 ──────────────────────────────────────
  const myName = currentUser?.name || (() => {
    try {
      const u = JSON.parse(localStorage.getItem("wv_user") || "{}");
      return u.name || D.users.find(u => u.role === role)?.name || "";
    } catch { return ""; }
  })();
  const roleInfo = D.roles.find(r => r.id === role);

  // ─── 본부/사업장 로드 ──────────────────────────────────
  const [hqs, setHQs] = React.useState([]);
  const [sites, setSites] = React.useState([]);
  React.useEffect(() => {
    if (window.WV_API?.getHQs) {
      window.WV_API.getHQs().then(d => setHQs(Array.isArray(d) ? d : [])).catch(() => {});
    }
    if (window.WV_API?.getSites) {
      window.WV_API.getSites().then(d => setSites(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, []);

  // 권한별 접근 가능한 본부/사업장
  const accessibleHQs = React.useMemo(
    () => window.WV_PERMS?.filterHQsForUser(hqs, currentUser) || hqs,
    [hqs, currentUser]
  );
  // 본부 전체 사업장 (팀장/admin/safety가 보는 범위)
  const accessibleSites = React.useMemo(() => {
    if (isSiteAgent) {
      return window.WV_PERMS?.filterSitesByAssignment(sites, currentUser, hqs) || [];
    }
    return window.WV_PERMS?.filterSitesForUser(sites, currentUser, hqs) || sites;
  }, [sites, hqs, currentUser, isSiteAgent]);
  // KPI용 사업장 카운트 — 일반직원·현장대리인은 본인 담당만, 그 외는 본부/전사
  const kpiSites = React.useMemo(() => {
    if (isSiteAgent || isStaff) {
      return window.WV_PERMS?.filterSitesByAssignment(sites, currentUser, hqs) || [];
    }
    return accessibleSites;
  }, [sites, hqs, currentUser, isSiteAgent, isStaff, accessibleSites]);
  // KPI 사업장 라벨
  const siteKPILabel =
    isAdmin ? "전체 사업장"
    : isManager ? "본부 사업장"
    : isStaff ? "관리 사업장"
    : isSiteAgent ? "내 담당 사업장"
    : "사업장";

  // ─── KPI 데이터 ─────────────────────────────────────────
  // mock data 안전 fallback
  const allSubs = D.submissions || [];
  const allPosts = D.posts || [];
  const allActivity = D.activity || [];

  const dueSoon = allPosts
    .filter(p => p.dueAt)
    .map(p => ({ ...p, days: Math.round((new Date(p.dueAt) - today) / 86400000) }))
    .filter(p => p.days >= 0 && p.days <= 30)
    .sort((a, b) => a.days - b.days);

  const unreadMustRead = allPosts.filter(p => p.mustRead && !p.readByMe);
  const pendingSubs = allSubs.filter(s => s.status === "pending").length;
  const approvedSubs = allSubs.filter(s => s.status === "approved").length;

  // 권한별 헤더 메시지
  const heroMessage = (() => {
    const urgentCount = dueSoon.filter(p => p.days <= 7).length;
    if (isAdmin) return { label: "전사 안전보건 통합 대시보드", emph: `${urgentCount}건의 이행사항 마감 임박` };
    if (isManager) return { label: "본부 안전보건 현황", emph: `${urgentCount}건의 이행사항 마감 임박` };
    if (isStaff) return { label: "내 담당 안전보건 업무", emph: `${urgentCount}건의 이행사항 마감 임박` };
    if (isSiteAgent) return { label: "내 사업장 안전보건 현황", emph: `${urgentCount}건의 이행사항 마감 임박` };
    return { label: "안전보건관리 대시보드", emph: `${urgentCount}건의 이행사항` };
  })();

  // ─── 빠른 액션 (권한별) ──────────────────────────────
  const quickActions = (() => {
    const base = [];
    base.push({
      label: "위험성평가 작성",
      desc: "정기·수시 평가 신규 작성",
      icon: "alert", color: "#3b82f6",
      action: () => onNav({ name: "risk-assessment" }),
    });
    if (can.submit || isSiteAgent) {
      base.push({
        label: "이행사항 제출",
        desc: "파일 업로드 + 항목 선택",
        icon: "upload", color: "#10b981",
        action: () => onNav({ name: "submissions" }),
      });
    }
    base.push({
      label: "안전보건교육",
      desc: "교육일지 작성 / 출석부",
      icon: "graduation", color: "#f59e0b",
      action: () => onNav({ name: "education-list" }),
    });
    if (isAdmin || isManager || isStaff) {
      base.push({
        label: "내 사업장 정보",
        desc: "사업장 등록 · 정보 수정",
        icon: "building", color: "#8b5cf6",
        action: () => onNav({ name: "manage-sites" }),
      });
    }
    return base;
  })();

  // ─── 카테고리 바로가기 (권한별 메뉴 필터) ─────────────
  const allowedCats = (D.categories || []).filter(c => {
    const menuId = "cat:" + c.id;
    const menus = currentUser?.menuOverrides?.length > 0 ? currentUser.menuOverrides : (D.roleMenus[role] || []);
    return menus.includes(menuId);
  });

  return (
    <div className="content dash-page">
      {/* ─── HERO ─── */}
      <section className="dash-hero">
        <div>
          <div className="dash-hero-eyebrow">
            <span className="dash-hero-dot" style={{ background: roleInfo?.color }} />
            {heroMessage.label} · {today.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </div>
          <h1 className="dash-hero-title">
            안녕하세요, {myName}님 👋<br/>
            <span className="dash-hero-accent">{heroMessage.emph}</span>
          </h1>
          <p className="dash-hero-sub">
            {isAdmin && "전 사업장의 안전보건 이행 현황과 가입 신청을 한눈에 확인하세요."}
            {isManager && "본부 사업장의 이행 진행률과 미제출 사항을 점검해 주세요."}
            {isStaff && "본부 사업장과 본인 담당 이행 항목을 확인하고 제출해 주세요."}
            {isSiteAgent && "본인 담당 사업장의 이행 항목을 확인하고 제출해 주세요."}
          </p>
        </div>
        <div className="dash-hero-stats">
          <Stat
            label={isAdmin ? "이번 주 마감" : "마감 임박"}
            value={dueSoon.filter(p => p.days <= 7).length} sub="건"
            tone="urgent"
            onClick={() => onNav({ name: "submissions" })}
          />
          <Stat
            label="필독"
            value={unreadMustRead.length} sub="건"
            tone="warning"
            onClick={unreadMustRead.length > 0
              ? () => onNav({ name: "post", id: unreadMustRead[0].id })
              : () => alert("미확인 필독 자료가 없습니다.")
            }
          />
          <Stat
            label={can.approve ? "내가 검토할 건" : "내 제출 검토중"}
            value={pendingSubs} sub="건"
            tone="primary"
            onClick={() => onNav({ name: "submissions" })}
          />
          <Stat
            label={siteKPILabel}
            value={kpiSites.length} sub="개"
            tone="success"
            onClick={() => onNav({ name: "manage-sites" })}
          />
        </div>
      </section>

      {/* ─── 사업장 현황 위젯 (Hero 직후, 권한별 분기) ─── */}
      {/* admin/safety/manager: 본부별 카드 */}
      {(isAdmin || isManager) && accessibleHQs.length > 0 && (
        <>
          <SectionHd
            title={isAdmin ? "본부별 이행 현황" : `${accessibleHQs[0]?.name || "내 본부"} 사업장 현황`}
            sub={`전체 ${accessibleSites.length}개 사업장`}
            action={<button className="btn btn-ghost btn-sm" onClick={() => onNav({ name: "submissions" })}>
              매트릭스 전체 보기 <Icon name="arrow" size={12} />
            </button>}
          />
          <div className="dash-hq-grid">
            {accessibleHQs.map((h, idx) => {
              const hqSites = accessibleSites.filter(s => String(s.hqId) === String(h.id));
              const HQ_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
              const color = HQ_COLORS[idx % HQ_COLORS.length];
              const rate = hqSites.length === 0 ? 0
                : Math.round(50 + (h.id * 13 + hqSites.length * 7) % 46);
              return (
                <div key={h.id} className="dash-hq-card" style={{ borderLeftColor: color }}>
                  <div className="dash-hq-hd">
                    <span className="dash-hq-code" style={{ color, borderColor: color, background: `color-mix(in oklab, ${color} 8%, transparent)` }}>{h.code || "HQ"}</span>
                    <span className="dash-hq-name">{h.name}</span>
                    <span className="dash-hq-count">사업장 {hqSites.length}</span>
                  </div>
                  <div className="dash-hq-progress">
                    <div className="dash-hq-bar"><div style={{ width: `${rate}%`, background: color }} /></div>
                    <span className="dash-hq-rate" style={{ color }}>{rate}%</span>
                  </div>
                  {hqSites.length > 0 && (
                    <div className="dash-hq-sites">
                      {hqSites.slice(0, 4).map(s => (
                        <span key={s.id} className="dash-hq-site-chip">{s.사업장명 || s.name}</span>
                      ))}
                      {hqSites.length > 4 && <span className="dash-hq-site-chip more">+{hqSites.length - 4}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* staff/현장대리인: 내 담당 사업장 카드 (각각 진행률) */}
      {(isStaff || isSiteAgent) && (
        <>
          <SectionHd
            title="⭐ 내 사업장 현황"
            sub={`본인 담당 ${kpiSites.length}개 사업장 · 항목별 이행률`}
            action={kpiSites.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => onNav({ name: "submissions" })}>
              매트릭스 전체 보기 <Icon name="arrow" size={12} />
            </button>}
          />
          {kpiSites.length === 0 ? (
            <div className="dash-empty">
              <Icon name="building" size={28} /><br/>
              아직 담당 사업장이 지정되지 않았습니다.<br/>
              <span style={{ fontSize: 12, color: "var(--fg-4)" }}>관리자에게 담당 사업장 지정을 요청하거나 직접 등록해 주세요.</span>
            </div>
          ) : (
            <div className="dash-mysite-grid">
              {kpiSites.map(s => {
                const hq = hqs.find(h => String(h.id) === String(s.hqId));
                // mock 이행률 (사이트별 hash 기반 deterministic)
                const rate = Math.round(50 + (s.id * 17 + 23) % 46);
                return (
                  <div key={s.id} className="dash-mysite-card" onClick={() => onNav({ name: "submissions" })}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      {hq && <span style={{
                        fontSize: 10.5, fontWeight: 800, color: "var(--primary)",
                        padding: "2px 7px", border: "1px solid var(--primary)", borderRadius: 4,
                        background: "var(--primary-soft)", letterSpacing: 0.04,
                      }}>{hq.code || "HQ"}</span>}
                      <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{s.사업장명 || s.name}</span>
                    </div>
                    <div className="dash-hq-progress" style={{ marginBottom: 8 }}>
                      <div className="dash-hq-bar">
                        <div style={{ width: `${rate}%`, background: rate >= 80 ? "var(--success)" : rate >= 50 ? "var(--primary)" : "var(--warning)" }} />
                      </div>
                      <span className="dash-hq-rate" style={{ color: rate >= 80 ? "var(--success)" : rate >= 50 ? "var(--primary)" : "var(--warning)" }}>{rate}%</span>
                    </div>
                    <div className="meta" style={{ fontSize: 12 }}>
                      {s.지역 || s.region || "—"} · {s.담당자 || s.manager || "담당자 미지정"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── 이행해야 할 사항 (Hero 직후 최상단) ─── */}
      <SectionHd
        title="이행해야 할 사항"
        sub="마감일 기준 정렬"
        action={dueSoon.length > 6 && <button className="btn btn-ghost btn-sm" onClick={() => onNav({ name: "submissions" })}>
          전체 보기 <Icon name="arrow" size={12} />
        </button>}
      />
      {dueSoon.length === 0 ? (
        <div className="dash-empty">
          <Icon name="check-circle" size={28} /><br/>
          현재 마감 임박 항목이 없습니다.
        </div>
      ) : (
        <div className="due-grid">
          {dueSoon.slice(0, 6).map(p => (
            <DueCard key={p.id} post={p} today={today} onClick={() => onNav({ name: "post", id: p.id })} />
          ))}
        </div>
      )}

      {/* ─── 빠른 액션 ─── */}
      <SectionHd title="빠른 액션" sub="자주 사용하는 기능 바로가기" />
      <div className="dash-quick-grid">
        {quickActions.map((a, i) => (
          <button key={i} className="dash-quick-card" onClick={a.action} style={{ "--qa-c": a.color }}>
            <div className="dash-quick-ico"><Icon name={a.icon} size={20} /></div>
            <div className="dash-quick-body">
              <div className="dash-quick-label">{a.label}</div>
              <div className="dash-quick-desc">{a.desc}</div>
            </div>
            <Icon name="arrow" size={14} className="dash-quick-arrow" />
          </button>
        ))}
      </div>

      {/* ─── 2-column: 최근활동 + 카테고리 바로가기 ─── */}
      <div className="dash-2col">
        <div>
          <SectionHd title="최근 활동" />
          <div className="card activity-card">
            {allActivity.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--fg-3)" }}>활동 기록이 없습니다.</div>
            ) : allActivity.slice(0, 6).map((a, i) => (
              <div key={i} className="activity-row">
                <div className="activity-avatar">{a.who?.[0] || "?"}</div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div className="activity-line">
                    <b>{a.who}</b>님이 <span className="activity-action">{a.action}</span><br/>
                    <span className="activity-target">{a.what}</span>
                  </div>
                </div>
                <div className="activity-when">{a.when}</div>
              </div>
            ))}
          </div>

          {unreadMustRead.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <SectionHd title="필독" />
              <div className="card">
                {unreadMustRead.map(p => (
                  <div key={p.id} className="must-row" onClick={() => onNav({ name: "post", id: p.id })}>
                    <Icon name="flag" size={14} style={{ color: "var(--urgent)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="must-title">{p.title}</div>
                      <div className="meta">{p.author} · {KOSHORTDATE(p.createdAt)}</div>
                    </div>
                    <Icon name="chevron-right" size={14} className="muted" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 우측: 카테고리 바로가기 */}
        <div>
          <SectionHd title="자료 카테고리" sub="권한이 부여된 카테고리만 표시" />
          <div className="dash-cat-grid">
            {allowedCats.length === 0 ? (
              <div className="dash-empty">접근 가능한 카테고리가 없습니다.</div>
            ) : allowedCats.map(c => (
              <CategoryCard key={c.id} cat={c} onClick={() => onNav({ name: "category", id: c.id })} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .dash-page { padding-bottom: 60px; }

        /* ── HERO ── */
        .dash-hero {
          display: grid; grid-template-columns: 1fr auto; gap: 48px; align-items: end;
          padding: 24px 0 40px;
          border-bottom: 1px solid var(--line);
          margin-bottom: 32px;
        }
        @media (max-width: 1100px) { .dash-hero { grid-template-columns: 1fr; gap: 28px; } }
        .dash-hero-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 12.5px; color: var(--fg-3); font-weight: 500;
          margin-bottom: 16px;
        }
        .dash-hero-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        [data-mood="technical"] .dash-hero-eyebrow { font-family: var(--font-mono); }
        .dash-hero-title {
          font-size: 38px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.18;
          margin: 0; max-width: 720px;
        }
        [data-mood="warm"] .dash-hero-title { font-weight: 600; }
        [data-mood="technical"] .dash-hero-title { font-size: 28px; font-weight: 600; }
        .dash-hero-accent {
          background: linear-gradient(105deg, var(--primary), color-mix(in oklab, var(--primary) 60%, var(--urgent)));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        [data-mood="technical"] .dash-hero-accent { background: none; color: var(--primary); -webkit-text-fill-color: var(--primary); }
        .dash-hero-sub {
          color: var(--fg-3); font-size: 14.5px; margin: 14px 0 0; max-width: 580px; line-height: 1.5;
        }
        .dash-hero-stats {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
        }
        @media (min-width: 1100px) { .dash-hero-stats { grid-template-columns: repeat(2, 1fr); width: 360px; } }

        .stat {
          background: var(--bg-elev); border: 1px solid var(--line); border-radius: var(--r-lg);
          padding: 14px 16px;
          box-shadow: 0 1px 3px rgba(15,23,42,.04);
        }
        [data-mood="technical"] .stat { box-shadow: none; }
        .stat-label { font-size: 11.5px; color: var(--fg-3); font-weight: 600; }
        [data-mood="technical"] .stat-label { font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.04em; }
        .stat-value-line { display: flex; align-items: baseline; gap: 4px; margin-top: 6px; }
        .stat-value { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; }
        [data-mood="warm"] .stat-value { font-weight: 600; }
        .stat-sub { color: var(--fg-3); font-size: 12.5px; }
        .stat[data-tone="urgent"]  .stat-value { color: var(--urgent); }
        .stat[data-tone="warning"] .stat-value { color: var(--warning); }
        .stat[data-tone="primary"] .stat-value { color: var(--primary); }
        .stat[data-tone="success"] .stat-value { color: var(--success); }

        /* 클릭 가능한 KPI 카드 */
        .stat-click {
          cursor: pointer;
          transition: transform .15s, box-shadow .15s, border-color .15s;
        }
        .stat-click:hover {
          transform: translateY(-2px);
          border-color: color-mix(in oklab, var(--primary) 35%, var(--line));
          box-shadow: 0 6px 18px -8px rgba(15,23,42,.12);
        }
        .stat-click:active { transform: translateY(0); }

        /* ── 빠른 액션 ── */
        .dash-quick-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px; margin-bottom: 8px;
        }
        .dash-quick-card {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 18px;
          background: var(--bg-elev); border: 1px solid var(--line);
          border-radius: 14px; cursor: pointer; text-align: left;
          transition: all .15s;
        }
        .dash-quick-card:hover {
          border-color: var(--qa-c);
          background: color-mix(in oklab, var(--qa-c) 4%, var(--bg-elev));
          transform: translateY(-1px);
          box-shadow: 0 8px 24px -10px color-mix(in oklab, var(--qa-c) 40%, transparent);
        }
        .dash-quick-ico {
          width: 44px; height: 44px; border-radius: 12px;
          display: grid; place-items: center;
          background: color-mix(in oklab, var(--qa-c) 14%, transparent);
          color: var(--qa-c); flex-shrink: 0;
        }
        .dash-quick-body { flex: 1; min-width: 0; }
        .dash-quick-label { font-size: 14.5px; font-weight: 700; color: var(--fg); }
        .dash-quick-desc { font-size: 12px; color: var(--fg-3); margin-top: 2px; }
        .dash-quick-arrow { color: var(--fg-4); transition: transform .15s; }
        .dash-quick-card:hover .dash-quick-arrow { color: var(--qa-c); transform: translateX(2px); }

        /* ── 본부 카드 그리드 ── */
        .dash-hq-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 12px; margin-bottom: 8px;
        }
        .dash-hq-card {
          background: var(--bg-elev); border: 1px solid var(--line);
          border-left: 4px solid transparent;
          border-radius: 12px; padding: 14px 16px;
          transition: box-shadow .15s;
        }
        .dash-hq-card:hover { box-shadow: 0 4px 16px -6px rgba(15,23,42,.10); }
        .dash-hq-hd { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .dash-hq-code {
          font-size: 10.5px; font-weight: 800;
          padding: 2px 8px; border-radius: 4px;
          border: 1px solid; letter-spacing: 0.04em;
        }
        .dash-hq-name { font-weight: 700; font-size: 14px; flex: 1; min-width: 0; }
        .dash-hq-count { font-size: 11.5px; color: var(--fg-3); font-weight: 500; }
        .dash-hq-progress { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .dash-hq-bar { flex: 1; height: 8px; background: var(--bg-sunk); border-radius: 4px; overflow: hidden; }
        .dash-hq-bar > div { height: 100%; border-radius: 4px; transition: width .5s; }
        .dash-hq-rate { font-weight: 700; font-size: 14px; min-width: 42px; text-align: right; }
        .dash-hq-sites { display: flex; flex-wrap: wrap; gap: 4px; }
        .dash-hq-site-chip {
          font-size: 10.5px; padding: 2px 7px; border-radius: 4px;
          background: var(--bg-sunk); color: var(--fg-2); border: 1px solid var(--line-2);
        }
        .dash-hq-site-chip.more { background: var(--fg-4); color: #fff; font-weight: 700; border-color: var(--fg-4); }

        /* ── 현장대리인용 내 사업장 ── */
        .dash-mysite-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .dash-mysite-card {
          background: var(--bg-elev); border: 1px solid var(--line);
          border-radius: 12px; padding: 16px 18px;
          cursor: pointer; transition: all .15s;
        }
        .dash-mysite-card:hover {
          border-color: var(--primary);
          box-shadow: 0 4px 16px -6px color-mix(in oklab, var(--primary) 30%, transparent);
        }

        /* ── 마감 임박 ── */
        .due-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .due-card {
          background: var(--bg-elev); border: 1px solid var(--line); border-radius: var(--r-lg);
          padding: 18px 20px;
          cursor: pointer;
          transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
          display: flex; flex-direction: column; gap: 12px;
          min-height: 168px;
          position: relative; overflow: hidden;
        }
        .due-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); border-color: color-mix(in oklab, var(--primary) 30%, var(--line)); }
        .due-card[data-urgent="true"]::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: var(--urgent);
        }
        .due-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .due-card-dday {
          display: inline-flex; align-items: baseline; gap: 4px;
          font-family: var(--font-mono); font-weight: 600;
          font-size: 18px; color: var(--fg-2); letter-spacing: -0.01em;
        }
        .due-card-dday[data-urgent="true"] { color: var(--urgent); }
        .due-card-dday-sub { font-size: 11px; color: var(--fg-4); font-family: var(--font-body); font-weight: 400; }
        .due-card-title { font-size: 15px; font-weight: 600; line-height: 1.35; flex: 1; }
        .due-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; }
        .due-card-progress { flex: 1; }
        .due-card-progress-label { font-size: 11px; color: var(--fg-3); margin-bottom: 4px; display: flex; justify-content: space-between; }

        /* ── 2-column 활동/카테고리 ── */
        .dash-2col {
          display: grid; grid-template-columns: 1.4fr 1fr;
          gap: 28px; margin-top: 36px;
        }
        @media (max-width: 1000px) { .dash-2col { grid-template-columns: 1fr; } }

        /* ── 카테고리 바로가기 ── */
        .dash-cat-grid {
          display: grid; grid-template-columns: 1fr; gap: 8px;
        }
        .cat-card {
          background: var(--bg-elev); border: 1px solid var(--line);
          border-radius: 10px; padding: 14px 16px;
          cursor: pointer;
          display: flex; gap: 12px; align-items: flex-start;
          transition: all .15s;
        }
        .cat-card:hover { border-color: color-mix(in oklab, var(--primary) 40%, var(--line)); transform: translateX(2px); }
        .cat-card-icon {
          width: 34px; height: 34px; flex-shrink: 0;
          border-radius: 8px;
          display: grid; place-items: center;
          background: var(--primary-soft); color: var(--primary);
        }
        .cat-card-body { flex: 1; min-width: 0; }
        .cat-card-name { font-weight: 600; font-size: 13.5px; margin-bottom: 2px; }
        .cat-card-desc { color: var(--fg-3); font-size: 11.5px; line-height: 1.4; }

        /* ── 섹션 헤더 ── */
        .section-hd {
          display: flex; align-items: flex-end; justify-content: space-between; gap: 16px;
          margin: 32px 0 14px;
        }
        .section-hd h2 { font-size: 18px; font-weight: 700; letter-spacing: -0.012em; margin: 0; }
        .section-hd-sub { color: var(--fg-3); font-size: 12.5px; margin-top: 3px; }

        /* ── 활동 ── */
        .activity-card { padding: 4px 0; }
        .activity-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; }
        .activity-row + .activity-row { border-top: 1px solid var(--line-2); }
        .activity-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: var(--primary-soft); color: var(--primary);
          display: grid; place-items: center; font-weight: 600; font-size: 12px;
          flex-shrink: 0;
        }
        .activity-line { font-size: 13px; line-height: 1.5; }
        .activity-action { color: var(--fg-3); }
        .activity-target { color: var(--fg-2); }
        .activity-when { color: var(--fg-4); font-size: 11.5px; white-space: nowrap; }

        .must-row { display: flex; gap: 10px; align-items: center; padding: 12px 16px; cursor: pointer; }
        .must-row + .must-row { border-top: 1px solid var(--line-2); }
        .must-row:hover { background: var(--bg-sunk); }
        .must-title { font-weight: 500; font-size: 13.5px; line-height: 1.35; }
        .muted { color: var(--fg-4); }

        /* ── 빈 상태 ── */
        .dash-empty {
          padding: 32px; text-align: center; color: var(--fg-3);
          background: var(--bg-elev); border: 1px dashed var(--line);
          border-radius: 12px; font-size: 13px;
        }
        .dash-empty svg { color: var(--fg-4); margin-bottom: 8px; }
      `}</style>
    </div>
  );
};

const Stat = ({ label, value, sub, tone, onClick }) => (
  <div
    className={"stat" + (onClick ? " stat-click" : "")}
    data-tone={tone}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <div className="stat-label">{label}{onClick && <span style={{ marginLeft: 4, fontSize: 10, color: "var(--fg-4)" }}>›</span>}</div>
    <div className="stat-value-line">
      <span className="stat-value">{value}</span>
      <span className="stat-sub">{sub}</span>
    </div>
  </div>
);

const DueCard = ({ post, today, onClick }) => {
  const days = Math.round((new Date(post.dueAt) - today) / 86400000);
  const urgent = days <= 3;
  const sub = post.submissions;
  return (
    <article className="due-card" data-urgent={urgent} onClick={onClick}>
      <div className="due-card-top">
        <div>
          <div className="due-card-dday" data-urgent={urgent}>
            {days > 0 ? `D-${days}` : days === 0 ? "D-DAY" : `D+${Math.abs(days)}`}
            <span className="due-card-dday-sub">· {KOSHORTDATE(post.dueAt)} 마감</span>
          </div>
        </div>
      </div>
      <div className="due-card-title">{post.title}</div>
      <div className="due-card-foot">
        {sub ? (
          <div className="due-card-progress">
            <div className="due-card-progress-label">
              <span>제출 {sub.received} / {sub.target}</span>
              <span>{Math.round(sub.received / sub.target * 100)}%</span>
            </div>
            <div className="progress"><div style={{ width: `${sub.received / sub.target * 100}%` }} /></div>
          </div>
        ) : (
          <div className="meta">제출 양식 없음</div>
        )}
      </div>
    </article>
  );
};

const CategoryCard = ({ cat, onClick }) => (
  <div className="cat-card" onClick={onClick}>
    <div className="cat-card-icon">
      <Icon name={CAT_ICON[cat.id] || "doc"} size={16} />
    </div>
    <div className="cat-card-body">
      <div className="cat-card-name">{cat.name}</div>
      <div className="cat-card-desc">{cat.desc}</div>
    </div>
  </div>
);

const SectionHd = ({ title, sub, action }) => (
  <div className="section-hd">
    <div>
      <h2>{title}</h2>
      {sub && <div className="section-hd-sub">{sub}</div>}
    </div>
    {action}
  </div>
);

Object.assign(window, { Dashboard, Stat, DueCard, CategoryCard, SectionHd });
