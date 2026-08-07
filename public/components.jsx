// 윌앤비전 - 공용 컴포넌트 (Sidebar, TopBar, Cards, Badges)

const D = window.WV_DATA;

// ─── icons by category id (mapped to Icon names)
const CAT_ICON = {
  "board-docs": "doc",
  "procedures": "book",
  "training": "graduation",
  "risk-assessment": "alert",
  "msds": "flask",
  "ergonomic": "body",
  "signage": "sign",
  "posters": "image"
};

// ─── Logo block (small) — 윌앤비전 3색 도형 마크
//  · 3개 모두 동일한 길이의 원통형 도형 (둥근 dome 상단)
//  · 분홍·연두는 우하단으로 뾰족하게 빠짐, 파랑만 좌하단으로 뾰족하게 빠짐
//  · 각 도형 위에 분리된 작은 점
const LogoMark = ({ size = 22 }) => {
  const flame = (cx, color, tail) => {
    // 본체: 둥근 dome 상단 + 직선 측면 + 한쪽으로 뾰족하게 빠지는 꼬리
    const body = tail === "right" ?
    `M ${cx - 5} 13
         A 5 5 0 0 1 ${cx + 5} 13
         L ${cx + 5} 50
         L ${cx + 7.5} 54.5
         L ${cx - 5} 52
         Z` :
    `M ${cx - 5} 13
         A 5 5 0 0 1 ${cx + 5} 13
         L ${cx + 5} 52
         L ${cx - 7.5} 54.5
         L ${cx - 5} 50
         Z`;
    return (
      <g key={cx} fill={color}>
        <circle cx={cx} cy="4.6" r="1.9" style={{ strokeWidth: "0px", opacity: "0" }} />
        <path d={body} />
      </g>);

  };
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" aria-label="윌앤비전">
      {flame(12, "#E8307A", "right")}  {/* 분홍 — 우하단 꼬리 */}
      {flame(30, "#C8DA16", "right")}  {/* 연두 — 우하단 꼬리 */}
      {flame(48, "#2AB8E6", "left")}   {/* 파랑 — 좌하단 꼬리 */}
    </svg>);

};

// ─── Sidebar
const Sidebar = ({ route, onNav, role, currentUser, onLogout, categories: propCategories }) => {
  const myUser = currentUser || D.users.find((u) => u.role === role);
  // 카테고리는 App(라이브 목록)에서 내려주는 prop을 그대로 사용.
  // (예전엔 내부 state가 D.categories 씨앗을 먼저 그린 뒤 갱신해 옛 목록이 깜빡였음)
  const categories = propCategories || [];

  const allowedMenus = new Set(
    (currentUser?.menuOverrides && currentUser.menuOverrides.length > 0)
      ? currentUser.menuOverrides
      : (D.roleMenus[role] || [])
  );
  // 기존 roleMenus에 없는 신규 카테고리도, 카테고리 접근 권한이 있는 역할이면 표시
  const allow = (id) => {
    if (allowedMenus.has(id)) return true;
    if (id.startsWith("cat:") && allowedMenus.has("cat:board-docs")) return true;
    return false;
  };

  // ─── 카테고리별 하위메뉴 (호버 시 오른쪽 플라이아웃) — 카탈로그+관리자 설정(DB) ───
  //   설정: { [카테고리id]: [항목...] } (게시판 보기 포함, 순서=배열 순). 없으면 기본 목록.
  const [subCfg, setSubCfg] = React.useState({});
  React.useEffect(() => {
    fetch("/api/settings/submenus")
      .then((r) => r.json())
      .then((d) => { if (d && d.value) setSubCfg(d.value); })
      .catch(() => {});
  }, []);
  const getSubs = (c) => {
    const list = window.WV_SUB.listFor(c, subCfg);
    const items = list
      .filter((it) => it.enabled !== false)
      .map((it) => window.WV_SUB.resolve(it, c, categories))  // categories(라이브) 전달 → 게시판 링크 이름 최신 반영
      .filter(Boolean);
    return items.length ? items : null;
  };

  const [flyout, setFlyout] = React.useState(null);
  const flyTimer = React.useRef(null);
  const openFly = (e, c, subs) => {
    clearTimeout(flyTimer.current);
    const r = e.currentTarget.getBoundingClientRect();
    setFlyout({ id: c.id, name: c.name, subs, top: r.top, left: r.right + 4 });
  };
  const scheduleFlyClose = () => { flyTimer.current = setTimeout(() => setFlyout(null), 140); };
  const keepFlyOpen = () => clearTimeout(flyTimer.current);

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <img src="assets/logo-will-vision2.png" alt="윌앤비전 로고" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
        <div className="sb-brand-text">
          <span className="sb-brand-name">Will&Vision</span>
          <span className="sb-brand-sub">안전보건관리</span>
        </div>
      </div>

      <div className="sb-section-label">메뉴</div>
      {allow("dashboard") && (
        <NavLink active={route.name === "dashboard"} icon="home" onClick={() => onNav({ name: "dashboard" })}>대시보드</NavLink>
      )}
      {allow("submissions") && (() => {
        const can = D.can[role] || D.can["staff"];
        // 승인 권한 있는 관리자 그룹(admin/safety/manager)에게만 "현황" 라벨 + pending 카운트 표시
        const isApprover = !!can.approve;
        return (
          <NavLink active={route.name === "submissions"} icon="inbox" onClick={() => onNav({ name: "submissions" })}>
            {isApprover ? "이행사항 제출 현황" : "이행사항 제출"}
            {isApprover && (
              <span className="sb-link-count">{D.submissions.filter((s) => s.status === "pending").length}</span>
            )}
          </NavLink>
        );
      })()}
      {allow("legal-checker") && (
        <NavLink active={route.name === "legal-checker"} icon="shield" onClick={() => onNav({ name: "legal-checker" })}>법적의무 자동판정</NavLink>
      )}
      {allow("tool-org-chart") && (
        <NavLink active={route.name === "tool-org-chart"} icon="users" onClick={() => onNav({ name: "tool-org-chart" })}>안전보건 조직도</NavLink>
      )}

      {categories.some((c) => allow("cat:" + c.id)) && (
        <>
          <div className="sb-section-label">카테고리</div>
          {categories.map((c) => {
            if (!allow("cat:" + c.id)) return null;
            const subs = getSubs(c);
            const hasActiveSub = subs && subs.some((s) => s.act(route));
            return (
              <div
                key={c.id}
                onMouseEnter={subs ? (e) => openFly(e, c, subs) : undefined}
                onMouseLeave={subs ? scheduleFlyClose : undefined}>
                <NavLink
                  active={(route.name === "category" && route.id === c.id) || (flyout?.id === c.id) || hasActiveSub}
                  icon={CAT_ICON[c.id] || "doc"}
                  // 하위메뉴 있는 카테고리: 클릭해도 바로 진입 안 하고 날개(플라이아웃)를 염
                  //   → 게시판 포함 모든 진입을 오른쪽 날개에서만. (없으면 기존대로 바로 진입)
                  onClick={subs ? (e) => openFly(e, c, subs) : () => onNav({ name: "category", id: c.id })}>
                  {c.name}
                  <span className="sb-link-count">{c.count}</span>
                  {subs && <Icon name="chevron-right" size={13} className="sb-cat-caret" />}
                </NavLink>
              </div>
            );
          })}
        </>
      )}

      {(allow("manage-categories") || allow("manage-approvals") || allow("manage-users") || allow("manage-roles") || allow("manage-sites")) && (
        <>
          <div className="sb-section-label">관리자</div>
          {allow("manage-categories") && (
            <NavLink active={route.name === "manage-categories"} icon="settings" onClick={() => onNav({ name: "manage-categories" })}>카테고리 관리</NavLink>
          )}
          {allow("manage-sites") && (
            <NavLink active={route.name === "manage-sites"} icon="home" onClick={() => onNav({ name: "manage-sites" })}>사업장 관리</NavLink>
          )}
          {/* 결재함 — 현재 미사용, 숨김 처리 (기능은 유지) */}
          {false && (
          <NavLink active={route.name === "approval-inbox" || route.name === "approval-compose" || route.name === "approval-detail"}
            icon="check-square" onClick={() => onNav({ name: "approval-inbox" })}>
            결재함
          </NavLink>
          )}
          {allow("manage-approvals") && (
            <NavLink active={route.name === "manage-approvals"} icon="user-plus" onClick={() => onNav({ name: "manage-approvals" })}>
              가입 승인 관리
              <span className="sb-link-count">{D.signupRequests.filter((r) => r.status === "pending").length}</span>
            </NavLink>
          )}
          {allow("manage-users") && (
            <NavLink active={route.name === "manage-users"} icon="users" onClick={() => onNav({ name: "manage-users" })}>계정 목록 관리</NavLink>
          )}
          {allow("manage-roles") && (
            <NavLink active={route.name === "manage-roles"} icon="shield" onClick={() => onNav({ name: "manage-roles" })}>권한 역할 관리</NavLink>
          )}
        </>
      )}

      <div className="sb-spacer" />

      <div className="sb-user">
        <div className="sb-user-avatar" style={{ background: D.roles.find((r) => r.id === role)?.color }}>
          {myUser?.name?.[0] || "U"}
        </div>
        <div className="sb-user-text" style={{ flex: 1, minWidth: 0 }}>
          <span className="sb-user-name">{myUser?.name || "—"}</span>
          <span className="sb-user-role">{D.roles.find((r) => r.id === role)?.name}</span>
        </div>
        {onLogout && (
          <button className="sb-logout" title="로그아웃" onClick={onLogout}>
            <Icon name="external-link" size={14} />
          </button>
        )}
      </div>

      {/* 플라이아웃은 document.body에 포털 렌더링 — 특정 페이지(예: MSDS 그림문자 그리드)의
          z-index/쌓임 맥락과 무관하게 항상 최상단에 보이도록 함 */}
      {flyout && ReactDOM.createPortal(
        <div
          className="sb-flyout"
          style={{ top: flyout.top, left: flyout.left }}
          onMouseEnter={keepFlyOpen}
          onMouseLeave={scheduleFlyClose}>
          <div className="sb-flyout-hd">{flyout.name}</div>
          {flyout.subs.map((s) => (
            <div
              key={s.label}
              className={"sb-flyout-link" + (s.act(route) ? " active" : "")}
              onClick={() => {
                if (s.external && s.url) window.open(s.url, "_blank", "noopener,noreferrer");
                else onNav(s.nav);
                setFlyout(null);
              }}>
              {s.label}{s.external && " ↗"}
            </div>
          ))}
        </div>,
        document.body
      )}
    </aside>);

};

const NavLink = ({ active, icon, onClick, children, style }) =>
<div className={"sb-link" + (active ? " active" : "")} onClick={onClick} style={style}>
    {icon && <Icon name={icon} size={16} className="sb-link-ico" />}
    <span className="sb-link-text">{children}</span>
  </div>;


// ─── 공통 인쇄/PDF 출력 버튼 (모든 페이지 통일) ───
// props: onClick(기본 window.print), label(기본 "PDF 출력"), className(추가), style(추가)
const PrintButton = ({ onClick, label = "PDF 출력", className = "", style }) => (
  <button
    className={("btn btn-secondary btn-sm no-print " + className).trim()}
    onClick={onClick || (() => window.print())}
    style={style}
  >
    <Icon name="printer" size={13} /> {label}
  </button>
);

// ── 한국식 날짜 필드 — 달력(date input)은 유지, 화면·인쇄엔 yyyy. mm. dd.로 표시 ──
//   (type=date 표시형식이 브라우저/OS 로케일 따라 mm/dd/yyyy로 나오는 문제를 앱에서 고정)
//   block=true → 래퍼가 셀/컨테이너 전폭을 채움(width:100% 입력용). 정렬은 style.textAlign 따라감.
//   ⚠️ Chrome은 인쇄 시 input[type=date] 값을 color:transparent 무시하고 그대로 찍음
//      → styles.css @media print에서 .kdate-wrap의 input을 숨기고 오버레이만 인쇄.
const KDate = ({ value, onChange, className = "", style = {}, block = false, ...rest }) => {
  const k = value ? String(value).replace(/-/g, ". ") + "." : "";
  const ta = style.textAlign;
  const justify = ta === "center" ? "center" : ta === "right" ? "flex-end" : "flex-start";
  return (
    <span className={"kdate-wrap" + (block ? " kdate-block" : "")}>
      <input type="date" value={value || ""} onChange={onChange} className={className}
        style={{ ...style, color: value ? "transparent" : (style.color || undefined) }} {...rest} />
      {value && <span className="kdate-ovl" aria-hidden="true"
        style={{ fontSize: style.fontSize, color: style.color || "var(--fg)", justifyContent: justify }}>{k}</span>}
    </span>
  );
};


// ─── TopBar with search + compose button (역할 스위처는 보안상 제거됨 — 로그인 권한으로 대체)
// 검색: searchableItems prop으로 받은 모든 항목에서 keyword 매칭, 드롭다운으로 결과 표시
const TopBar = ({ role, currentUser, searchableItems, onNav, onCompose, onLogout, onUpdateProfile }) => {
  const [profileOpen, setProfileOpen] = React.useState(false);
  // 문서에 기록될 '현재 작성자(실명)' — 공용계정 소프트 감사용
  const [actorName, setActorName] = React.useState(() => (window.WV_ACTOR ? window.WV_ACTOR.getStored(currentUser) : "") || "");
  const can = D.can[role];
  const roleInfo = D.roles.find((r) => r.id === role);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef(null);

  // 외부 클릭 시 드롭다운 닫기
  React.useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ⌘K / Ctrl+K 단축키
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        const input = wrapperRef.current?.querySelector("input");
        if (input) { input.focus(); input.select(); }
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // 검색 매칭 (대소문자 무시, 라벨만 매칭 — sublabel은 표시용 부가 정보)
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const items = (searchableItems || []);
    const matched = items
      .map((it) => {
        const labelLower = (it.label || "").toLowerCase();
        if (!labelLower.includes(q)) return null;
        // 점수: 정확히 일치=4, 시작 일치=3, 포함=2
        //       타입별 보너스: 페이지/카테고리 우선
        let score = labelLower === q ? 4 : labelLower.startsWith(q) ? 3 : 2;
        if (it.type === "page" || it.type === "category") score += 0.5;
        return { ...it, _score: score };
      })
      .filter(Boolean)
      .sort((a, b) => b._score - a._score)
      .slice(0, 15);
    return matched;
  }, [query, searchableItems]);

  // 타입별 그룹핑 (드롭다운 표시용)
  const grouped = React.useMemo(() => {
    const g = {};
    for (const r of results) {
      const key = r.type || "기타";
      if (!g[key]) g[key] = [];
      g[key].push(r);
    }
    return g;
  }, [results]);

  const handleSelect = (item) => {
    setQuery("");
    setOpen(false);
    if (typeof item.onClick === "function") item.onClick();
    else if (item.route && onNav) onNav(item.route);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && results.length > 0) {
      handleSelect(results[0]);
    }
  };

  const TYPE_LABEL = {
    page: "📄 페이지",
    category: "📁 카테고리",
    post: "📝 게시글",
    "risk-eval": "⚠️ 위험성평가",
    "edu-log": "📚 교육일지",
    site: "🏢 사업장",
  };

  return (
    <header className="topbar">
      <div className="tb-search" ref={wrapperRef} style={{ position: "relative" }}>
        <Icon name="search" size={16} />
        <input
          placeholder="자료, 게시글, 카테고리 검색…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {open && query.trim() && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6,
            background: "#ffffff",                            /* 완전 불투명 흰 배경 */
            border: "1px solid #d4d4d8", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",        /* 더 강한 그림자 */
            maxHeight: 480, overflowY: "auto", zIndex: 1000,
          }}>
            {results.length === 0 ? (
              <div style={{ padding: "20px 16px", color: "#71717a", fontSize: 13, textAlign: "center", background: "#fff" }}>
                "<b>{query}</b>"에 대한 결과가 없습니다.
              </div>
            ) : (
              Object.entries(grouped).map(([type, items]) => (
                <div key={type} style={{ background: "#fff" }}>
                  <div style={{ padding: "8px 14px 4px", fontSize: 11, fontWeight: 700, color: "#52525b", background: "#f4f4f5", letterSpacing: 0.3 }}>
                    {TYPE_LABEL[type] || type} <span style={{ opacity: 0.6 }}>({items.length})</span>
                  </div>
                  {items.map((it, i) => (
                    <button key={`${type}-${i}`}
                      onClick={() => handleSelect(it)}
                      style={{
                        width: "100%", padding: "10px 14px", textAlign: "left",
                        background: "#fff", border: "none", cursor: "pointer",
                        borderBottom: "1px solid #e4e4e7", display: "flex", flexDirection: "column", gap: 2,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f4f4f5"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#18181b" }}>{it.label}</div>
                      {it.sublabel && <div style={{ fontSize: 11, color: "#71717a" }}>{it.sublabel}</div>}
                    </button>
                  ))}
                </div>
              ))
            )}
            <div style={{ padding: "8px 14px", fontSize: 11, color: "#71717a", borderTop: "1px solid #e4e4e7", background: "#f4f4f5" }}>
              ↵ Enter로 첫 항목 이동 · Esc로 닫기
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />


      {/* Current logged-in user badge — clickable: 내 정보 화면 진입 */}
      <button
        className="tb-user-pill"
        onClick={() => setProfileOpen(true)}
        title="내 정보 보기/수정"
        style={{ cursor: "pointer", background: "transparent", border: "1px solid var(--line)" }}
      >
        <span className="tb-user-pill-dot" style={{ background: roleInfo?.color }} />
        <span className="tb-user-pill-role">{roleInfo?.name}</span>
        <span className="tb-user-pill-sep">·</span>
        <span className="tb-user-pill-name">{currentUser?.name}</span>
      </button>

      {/* 내 정보 모달 */}
      {profileOpen && (
        <MyProfileModal
          currentUser={currentUser}
          roleInfo={roleInfo}
          onActorSaved={setActorName}
          onClose={() => setProfileOpen(false)}
          onUpdate={async (data) => {
            try {
              const res = await window.WV_API.updateMyProfile(currentUser.id, data, currentUser.id);
              if (res?.success) {
                onUpdateProfile?.({ ...currentUser, ...data });
                return { ok: true };
              }
              return { ok: false, error: res?.error };
            } catch (e) {
              return { ok: false, error: e.message };
            }
          }}
        />
      )}

      {can.upload &&
      <button className="btn btn-primary" onClick={() => onCompose?.()}>
          <Icon name="plus" size={14} /> 글쓰기
        </button>
      }

      <button className="tb-icon-btn" title="알림"><Icon name="bell" size={16} /></button>
      <button className="tb-icon-btn" title="로그아웃" onClick={onLogout}>
        <Icon name="external-link" size={14} />
      </button>
    </header>);

};

// ─── Misc small bits
const PriorityChip = ({ priority }) => {
  if (priority === "urgent") return <span className="chip chip-urgent"><span className="chip-dot" /> 마감 임박</span>;
  if (priority === "high") return <span className="chip chip-warning"><span className="chip-dot" /> 중요</span>;
  return null;
};

const TypeChip = ({ type }) => {
  const label = D.typeLabel[type];
  return <span className="chip">{label}</span>;
};

const StatusChip = ({ status }) => {
  if (status === "approved") return <span className="chip chip-success"><Icon name="check" size={11} /> 승인</span>;
  if (status === "pending") return <span className="chip chip-pending"><Icon name="clock" size={11} /> 검토중</span>;
  if (status === "rejected") return <span className="chip chip-rejected"><Icon name="x" size={11} /> 반려</span>;
  return null;
};

// Format date difference into "D-N" / "N일 전" / "오늘"
const dDay = (dateStr, today) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);d.setHours(0, 0, 0, 0);
  const t = new Date(today);t.setHours(0, 0, 0, 0);
  const diff = Math.round((d - t) / 86400000);
  if (diff === 0) return "오늘";
  if (diff > 0) return `D-${diff}`;
  return `${-diff}일 전`;
};

const KOSHORTDATE = (s) => {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
};

// ─── 내 정보 모달 (본인 셀프 수정: 연락처, 부서만 가능)
const MyProfileModal = ({ currentUser, roleInfo, onClose, onUpdate, onActorSaved }) => {
  const [form, setForm] = React.useState({
    phone: currentUser?.phone || "",
    dept: currentUser?.dept || "",
  });
  // 현재 작성자(실명) — localStorage에 즉시 저장(서버 저장 아님)
  const [actor, setActor] = React.useState(() => (window.WV_ACTOR ? window.WV_ACTOR.getStored(currentUser) : "") || "");
  const saveActor = (v) => {
    setActor(v);
    window.WV_ACTOR?.set(currentUser, v);
    onActorSaved?.(v);
  };
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const upd = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    const res = await onUpdate(form);
    if (res?.ok) {
      setSuccess("수정 완료");
      setTimeout(() => setSuccess(""), 2000);
    } else {
      setError(res?.error || "저장 실패");
    }
    setSaving(false);
  };

  if (!currentUser) return null;
  const avatarChar = (currentUser.name || currentUser.email || "?").charAt(0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-hd">
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>👤 내 정보</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 프로필 헤더 */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "var(--bg-sunk)", borderRadius: 8 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: roleInfo?.color || "#94a3b8", color: "#fff",
              display: "grid", placeItems: "center", fontSize: 22, fontWeight: 700,
            }}>{avatarChar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{currentUser.name}</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "monospace" }}>{currentUser.email}</span>
                <span>·</span>
                <span style={{ color: roleInfo?.color, fontWeight: 600 }}>{roleInfo?.name}</span>
              </div>
            </div>
          </div>

          {/* 현재 작성자(실명) — 문서에 기록될 이름 (공용계정 소프트 감사) */}
          <div className="field">
            <label className="field-label">✍ 현재 작성자 (실명)</label>
            <input className="field-input" value={actor} onChange={e => saveActor(e.target.value)}
              placeholder={currentUser.name} />
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4, lineHeight: 1.5 }}>
              공용계정을 여러 명이 함께 쓸 때, 지금 작성하는 분 성함을 적어두면 위험성평가·점검·결재·게시글 등 <b>문서에 이 이름이 작성자로 기록</b>됩니다. (미입력 시 계정 이름 “{currentUser.name}”으로 기록)
            </div>
          </div>

          {/* 읽기 전용 필드 — 관리자만 변경 가능 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", background: "color-mix(in oklab, var(--warning) 8%, transparent)", borderRadius: 6, fontSize: 12 }}>
            <div style={{ color: "var(--fg-3)", fontWeight: 600 }}>🔒 변경 불가 항목 (관리자 문의)</div>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "4px 12px" }}>
              <span style={{ color: "var(--fg-3)" }}>아이디</span>
              <span style={{ fontFamily: "monospace" }}>{currentUser.email}</span>
              <span style={{ color: "var(--fg-3)" }}>권한</span>
              <span>{roleInfo?.name || currentUser.role}</span>
              <span style={{ color: "var(--fg-3)" }}>비밀번호</span>
              <span style={{ color: "var(--fg-3)" }}>관리자에게 임시 비밀번호 재발급 요청</span>
            </div>
          </div>

          {/* 수정 가능 필드 */}
          <div className="field">
            <label className="field-label">부서</label>
            <input className="field-input" value={form.dept} onChange={e => upd("dept", e.target.value)}
              placeholder="예: 안전팀, 현장1팀" />
          </div>
          <div className="field">
            <label className="field-label">연락처</label>
            <input className="field-input" value={form.phone} onChange={e => upd("phone", e.target.value)}
              placeholder="010-0000-0000" />
          </div>

          {error && (
            <div style={{ color: "var(--danger)", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 6 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ color: "var(--success)", fontSize: 13, padding: "8px 12px", background: "#f0fdf4", borderRadius: 6 }}>
              ✅ {success}
            </div>
          )}
        </div>
        <div className="modal-ft" style={{ gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>닫기</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="login-spinner" /> : <><Icon name="check" size={14} /> 저장</>}
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { LogoMark, Sidebar, NavLink, PrintButton, TopBar, MyProfileModal, PriorityChip, TypeChip, StatusChip, CAT_ICON, dDay, KOSHORTDATE });