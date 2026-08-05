// 윌앤비전 - 사업장 관리 (본부 → 사업장 구조)

const REGIONS = ["서울", "경기", "인천", "충남", "충북", "강원", "경남", "경북", "전남", "전북", "부산", "대구", "대전", "광주", "울산", "세종", "제주", "기타"];

// 본부별 색상 (UI 구분용)
const HQ_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16", "#ec4899"];
const colorForHQ = (idx) => HQ_COLORS[idx % HQ_COLORS.length];

// 권한별 사업장 관리 권한 결정
// admin / safety → 본부 추가/모든 본부 사업장 추가·수정·삭제
// manager / staff → 본인 본부 안 사업장 추가·수정 (본부/삭제 불가)
// site_manager / site_staff (현장대리인) → 본인 담당 사업장 정보만 수정
function canManageHQ(role) {
  return role === "admin" || role === "safety";
}
function isSiteAgent(role) {
  // 현장대리인 (site_manager = site_staff 통합)
  return role === "site_manager" || role === "site_staff";
}
// 사업장 추가 권한 (본부 안에 신규 사업장 등록)
function canAddSite(role) {
  return ["admin", "safety", "manager", "staff"].includes(role);
}
// 사업장 수정 권한 — 본부 안의 사업장 수정 가능 여부
function canManageSite(role, userHQs, targetHQ) {
  if (role === "admin" || role === "safety") return true;
  if (role === "manager" || role === "staff") return userHQs.includes(String(targetHQ));
  if (isSiteAgent(role)) return userHQs.includes(String(targetHQ));   // 본인 사업장만 수정
  return false;
}
// 사업장 삭제 권한 — admin/safety만 가능 (실수 방지)
function canDeleteSite(role) {
  return role === "admin" || role === "safety";
}

const ManageSitesView = ({ onNav, currentUser, role, onUserRefresh }) => {
  const [sites, setSites] = React.useState([]);
  const [hqs, setHQs] = React.useState([]);
  const [users, setUsers] = React.useState([]); // 담당자 선택용
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);            // 사업장 추가 모달
  const [editing, setEditing] = React.useState(null);          // 사업장 수정 모달
  const [hqAdding, setHQAdding] = React.useState(false);       // 본부 추가 모달
  const [hqEditing, setHQEditing] = React.useState(null);      // 본부 수정 모달
  const [search, setSearch] = React.useState("");
  const [regionFilter, setRegionFilter] = React.useState("전체");
  const [hqFilter, setHQFilter] = React.useState("전체");
  const [view, setView] = React.useState("grouped");           // grouped | flat
  const [addingForHQ, setAddingForHQ] = React.useState(null);  // 본부 카드에서 + 클릭 시 미리 hqId 설정

  // 본인 본부 목록 — 공통 권한 헬퍼 사용 (admin/safety는 전체)
  const userHQs = React.useMemo(() => {
    return window.WV_PERMS?.getAccessibleHQIds(currentUser, hqs) || [];
  }, [currentUser, hqs]);
  const isCrossHQ = window.WV_PERMS?.isCrossHQ(currentUser);

  const userIsSiteAgent = isSiteAgent(role);
  const isAdmin = role === "admin" || role === "safety";
  // staff/manager: 본부 전체 사업장 보이지만 본인 담당은 별도 섹션으로 강조
  const isStaffOrManager = role === "staff" || role === "manager";

  // 사업장 + 본부 + 사용자 목록 로드 (사용자는 담당자 선택용)
  const reloadAll = React.useCallback(() => {
    Promise.all([
      window.WV_API.getSites(),
      window.WV_API.getHQs(),
      window.WV_API.getUsers ? window.WV_API.getUsers() : Promise.resolve([]),
    ]).then(([siteData, hqData, userData]) => {
      const allSites = Array.isArray(siteData) ? siteData : [];
      const allHQs = Array.isArray(hqData) ? hqData : [];
      const allUsers = Array.isArray(userData) ? userData : (userData?.users || []);
      // ⚡ 권한 필터링
      const filteredHQs = window.WV_PERMS?.filterHQsForUser(allHQs, currentUser) || allHQs;
      // 현장대리인은 본인 담당 사업장만, 그 외는 본인 본부 전체 사업장
      const filteredSites = userIsSiteAgent
        ? (window.WV_PERMS?.filterSitesByAssignment(allSites, currentUser, allHQs) || [])
        : (window.WV_PERMS?.filterSitesForUser(allSites, currentUser, allHQs) || allSites);
      setSites(filteredSites);
      setHQs(filteredHQs);
      setUsers(allUsers);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentUser, userIsSiteAgent]);

  React.useEffect(() => { reloadAll(); }, [reloadAll]);

  // 내 담당 사업장 ID (staff/manager 화면 상단 강조용)
  const mySiteIds = React.useMemo(() => {
    if (!isStaffOrManager) return new Set();
    const ids = window.WV_PERMS?.getAccessibleSiteIds(currentUser, sites, hqs) || [];
    // getAccessibleSiteIds는 본부 전체 반환할 수도 있으므로 siteIds 명시된 것만
    const explicit = window.WV_PERMS?.parseSiteIds(currentUser) || [];
    return new Set(explicit);
  }, [currentUser, sites, hqs, isStaffOrManager]);
  const mySites = React.useMemo(
    () => sites.filter(s => mySiteIds.has(String(s.id))),
    [sites, mySiteIds]
  );
  const otherSites = React.useMemo(
    () => sites.filter(s => !mySiteIds.has(String(s.id))),
    [sites, mySiteIds]
  );

  // 본부별 사업장 묶음
  const sitesByHQ = React.useMemo(() => {
    const map = {};
    hqs.forEach(h => { map[h.id] = []; });
    map["_none"] = [];   // 본부 미지정 그룹
    sites.forEach(s => {
      const key = s.hqId ? s.hqId : "_none";
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [sites, hqs]);

  const filtered = sites.filter(s => {
    const matchRegion = regionFilter === "전체" || s["지역"] === regionFilter;
    const matchHQ = hqFilter === "전체" || String(s.hqId) === String(hqFilter);
    const matchSearch = !search || s["사업장명"]?.includes(search) || s["담당자"]?.includes(search) || s["고객사"]?.includes(search);
    return matchRegion && matchHQ && matchSearch;
  });

  // 사업장 삭제
  const handleDeleteSite = async (s) => {
    if (!window.confirm(`사업장 [${s.사업장명}]을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      const res = await window.WV_API.deleteSite(s.id);
      if (res && res.success) {
        setSites(prev => prev.filter(x => x.id !== s.id));
      } else {
        alert("삭제 실패: " + (res?.error || "다시 시도해주세요."));
      }
    } catch (e) {
      alert("서버 연결 실패: " + (e.message || ""));
    }
  };

  // 본부 삭제
  const handleDeleteHQ = async (h) => {
    if (!window.confirm(`본부 [${h.name}]을 삭제하시겠습니까?\n해당 본부에 소속된 사업장이 있다면 삭제할 수 없습니다.`)) return;
    try {
      const res = await window.WV_API.deleteHQ(h.id);
      if (res && res.success) {
        setHQs(prev => prev.filter(x => x.id !== h.id));
      } else {
        alert(res?.error || "삭제 실패");
      }
    } catch (e) {
      alert("서버 연결 실패: " + (e.message || ""));
    }
  };

  return (
    <div className="content">
      <div className="content-hd">
        <div>
          <h1 className="content-title">{userIsSiteAgent ? "내 사업장 정보" : "사업장 관리"}</h1>
          <div className="content-sub">
            {userIsSiteAgent
              ? "본인 담당 사업장 정보를 확인하고 수정합니다."
              : "본부별로 사업장을 등록하고 담당자를 연결합니다."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* 본부 추가 / 사업장 추가 — 현장대리인에게는 숨김 (본인 사업장 수정만 가능) */}
          {!userIsSiteAgent && canManageHQ(role) && (
            <button className="btn btn-secondary" onClick={() => setHQAdding(true)}>
              <Icon name="building" size={14} /> 본부 추가
            </button>
          )}
          {!userIsSiteAgent && canAddSite(role) && (
            <button className="btn btn-primary" onClick={() => { setAddingForHQ(null); setAdding(true); }}>
              <Icon name="plus" size={14} /> 사업장 추가
            </button>
          )}
        </div>
      </div>

      {/* 통계 — 현장대리인에게는 숨김 (본인 사업장만 보면 됨) */}
      {!loading && !userIsSiteAgent && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "전체 본부", value: hqs.length, color: "var(--primary)" },
            { label: "전체 사업장", value: sites.length, color: "var(--success)" },
            { label: "운영중", value: sites.filter(s => s["상태"] === "active").length, color: "var(--warning)" },
            { label: "본부 미지정", value: sites.filter(s => !s.hqId).length, color: "var(--fg-3)" },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 필터 + 뷰 토글 — 현장대리인은 본인 사업장 1~몇개라서 필터 불필요 */}
      {!userIsSiteAgent && (
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input className="field-input" style={{ width: 220 }}
          placeholder="사업장명, 담당자, 고객사 검색"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="field-select" style={{ width: 160 }}
          value={hqFilter} onChange={e => setHQFilter(e.target.value)}>
          <option value="전체">전체 본부</option>
          {hqs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select className="field-select" style={{ width: 120 }}
          value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
          <option>전체</option>
          {REGIONS.map(r => <option key={r}>{r}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ display: "inline-flex", padding: 3, background: "var(--bg-sunk)", borderRadius: 6 }}>
          <button className={`btn btn-sm ${view === "grouped" ? "btn-primary" : "btn-ghost"}`}
            style={{ padding: "4px 12px" }}
            onClick={() => setView("grouped")}>본부별</button>
          <button className={`btn btn-sm ${view === "flat" ? "btn-primary" : "btn-ghost"}`}
            style={{ padding: "4px 12px" }}
            onClick={() => setView("flat")}>전체 목록</button>
        </div>
      </div>
      )}

      {/* 로딩 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--fg-3)" }}>
          <span className="login-spinner" style={{ width: 32, height: 32 }} /> 불러오는 중...
        </div>
      ) : (
        <>
          {/* ─── staff/manager: 내 담당 사업장 강조 섹션 ─── */}
          {isStaffOrManager && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.012em", margin: 0, color: "var(--primary)" }}>
                  ⭐ 내 담당 사업장
                </h2>
                <span className="meta" style={{ fontSize: 12.5 }}>{mySites.length}개</span>
              </div>
              {mySites.length === 0 ? (
                <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--fg-3)", border: "1px dashed var(--line)" }}>
                  <Icon name="building" size={24} /><br/>
                  <div style={{ marginTop: 8, fontSize: 13 }}>아직 담당 사업장이 지정되지 않았습니다.</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 4 }}>관리자에게 담당 사업장 지정을 요청하거나, 직접 신규 사업장을 등록하세요.</div>
                </div>
              ) : (
                <div className="my-sites-grid">
                  {mySites.map(s => {
                    const hq = hqs.find(h => String(h.id) === String(s.hqId));
                    return (
                      <div key={s.id} className="my-site-card" onClick={() => setEditing(s)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          {hq && (
                            <span style={{
                              fontSize: 10.5, fontWeight: 800, color: "var(--primary)",
                              padding: "2px 7px", border: "1px solid var(--primary)", borderRadius: 4,
                              background: "var(--primary-soft)", letterSpacing: 0.04,
                            }}>{hq.code || "HQ"}</span>
                          )}
                          <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{s.사업장명 || s.name}</span>
                          {s.상태 === "active"
                            ? <span className="chip chip-success" style={{ fontSize: 10 }}><span className="chip-dot" /> 운영중</span>
                            : <span className="chip chip-rejected" style={{ fontSize: 10 }}><span className="chip-dot" /> 종료</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--fg-3)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <span><Icon name="users" size={11} /> {s.담당자 || "담당자 미지정"}</span>
                          {s.전화번호 && <span><Icon name="phone" size={11} /> {s.전화번호}</span>}
                          {s.지역 && <span>· {s.지역}</span>}
                        </div>
                        <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--primary)", fontWeight: 600 }}>
                          <Icon name="edit" size={11} /> 클릭하여 수정
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── 본부 전체 사업장 섹션 ─── */}
          {isStaffOrManager && otherSites.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.012em", margin: 0, color: "var(--fg-2)" }}>
                  본부 내 다른 사업장
                </h2>
                <span className="meta" style={{ fontSize: 12 }}>{otherSites.length}개 · 참고용</span>
              </div>
            </div>
          )}
        </>
      )}
      {!loading && view === "grouped" && (
        // ── 본부별 그룹 카드 뷰 ──
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {hqs
            .filter(h => hqFilter === "전체" || String(h.id) === String(hqFilter))
            .map((h, idx) => {
              const groupSites = (sitesByHQ[h.id] || []).filter(s => {
                const matchRegion = regionFilter === "전체" || s["지역"] === regionFilter;
                const matchSearch = !search || s["사업장명"]?.includes(search) || s["담당자"]?.includes(search) || s["고객사"]?.includes(search);
                return matchRegion && matchSearch;
              });
              const color = colorForHQ(idx);
              const canManageThis = canManageSite(role, userHQs, h.id);
              return (
                <div key={h.id} className="card" style={{ padding: 0, overflow: "hidden", borderLeft: `4px solid ${color}` }}>
                  <div style={{
                    padding: "14px 18px",
                    borderBottom: groupSites.length ? "1px solid var(--line)" : "0",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color, padding: "2px 8px",
                          border: `1px solid ${color}`, borderRadius: 4, letterSpacing: 0.5,
                        }}>{h.code || "HQ"}</span>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{h.name}</h3>
                        <span className="meta" style={{ fontSize: 12, color: "var(--fg-3)" }}>
                          사업장 {groupSites.length}개
                        </span>
                      </div>
                      {h.description && (
                        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>{h.description}</div>
                      )}
                    </div>
                    {!userIsSiteAgent && canManageThis && (
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => { setAddingForHQ(h.id); setAdding(true); }}
                        title={`${h.name}에 새 사업장 추가`}>
                        <Icon name="plus" size={12} /> 사업장 추가
                      </button>
                    )}
                    {canManageHQ(role) && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => setHQEditing(h)} title="본부 수정">
                          <Icon name="edit" size={12} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteHQ(h)} title="본부 삭제"
                          style={{ color: "var(--danger)" }}>
                          <Icon name="trash" size={12} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* 본부 안의 사업장 목록 */}
                  {groupSites.length > 0 ? (
                    <div style={{ padding: 0 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "var(--bg-sunk)", borderBottom: "1px solid var(--line)" }}>
                            {["사업장명", "지역", "고객사", "담당자", "전화번호", "상태", ""].map(h => (
                              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "var(--fg-3)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {groupSites.map((site) => (
                            <tr key={site.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                              <td style={{ padding: "12px 14px", fontWeight: 500 }}>{site["사업장명"]}</td>
                              <td style={{ padding: "12px 14px" }}>
                                <span className="chip" style={{ fontSize: 11 }}>{site["지역"] || "-"}</span>
                              </td>
                              <td style={{ padding: "12px 14px", color: "var(--fg-2)" }}>{site["고객사"] || "-"}</td>
                              <td style={{ padding: "12px 14px" }}>{site["담당자"] || "-"}</td>
                              <td style={{ padding: "12px 14px", color: "var(--fg-3)", fontSize: 12 }}>{site["전화번호"] || "-"}</td>
                              <td style={{ padding: "12px 14px" }}>
                                {site["상태"] === "active"
                                  ? <span className="chip chip-success"><span className="chip-dot" /> 운영중</span>
                                  : <span className="chip chip-rejected"><span className="chip-dot" /> 종료</span>}
                              </td>
                              <td style={{ padding: "12px 14px", display: "flex", gap: 4 }}>
                                {canManageThis && (
                                  <button className="btn btn-secondary btn-sm" onClick={() => setEditing(site)}>
                                    <Icon name="edit" size={12} /> 수정
                                  </button>
                                )}
                                {canDeleteSite(role) && (
                                  <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteSite(site)}
                                    title="사업장 삭제" style={{ color: "var(--danger)" }}>
                                    <Icon name="trash" size={12} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
                      등록된 사업장이 없습니다. {!userIsSiteAgent && canManageThis && (
                        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }}
                          onClick={() => { setAddingForHQ(h.id); setAdding(true); }}>
                          <Icon name="plus" size={12} /> 첫 사업장 추가
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          {/* 본부 미지정 그룹 */}
          {(sitesByHQ["_none"] || []).length > 0 && (hqFilter === "전체") && (
            <div className="card" style={{ padding: 0, overflow: "hidden", borderLeft: "4px dashed var(--fg-4)" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--fg-3)" }}>
                  ⚠️ 본부 미지정 ({sitesByHQ["_none"].length}개)
                </h3>
                <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>
                  본부에 소속되지 않은 사업장입니다. 수정 버튼으로 본부를 지정해주세요.
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {sitesByHQ["_none"].map((site) => (
                    <tr key={site.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 500 }}>{site["사업장명"]}</td>
                      <td style={{ padding: "12px 14px" }}>{site["담당자"] || "-"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <button className="btn btn-primary btn-sm" onClick={() => setEditing(site)}>
                          <Icon name="edit" size={12} /> 본부 지정
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {!loading && view === "flat" && (
        // ── 평탄한 전체 목록 뷰 ──
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-sunk)", borderBottom: "1px solid var(--line)" }}>
                {["No", "본부", "사업장명", "지역", "고객사", "담당자", "전화번호", "상태", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 12, color: "var(--fg-3)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((site, i) => {
                const hq = hqs.find(h => String(h.id) === String(site.hqId));
                const hqIdx = hqs.findIndex(h => String(h.id) === String(site.hqId));
                const color = hqIdx >= 0 ? colorForHQ(hqIdx) : "#94a3b8";
                return (
                  <tr key={site.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                    <td style={{ padding: "12px 14px", color: "var(--fg-3)", fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {hq ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color, padding: "2px 8px", border: `1px solid ${color}`, borderRadius: 4 }}>
                          {hq.code || hq.name}
                        </span>
                      ) : <span className="meta" style={{ color: "var(--fg-4)" }}>미지정</span>}
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 500 }}>{site["사업장명"]}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span className="chip" style={{ fontSize: 11 }}>{site["지역"] || "-"}</span>
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--fg-2)" }}>{site["고객사"] || "-"}</td>
                    <td style={{ padding: "12px 14px" }}>{site["담당자"] || "-"}</td>
                    <td style={{ padding: "12px 14px", color: "var(--fg-3)", fontSize: 12 }}>{site["전화번호"] || "-"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {site["상태"] === "active"
                        ? <span className="chip chip-success"><span className="chip-dot" /> 운영중</span>
                        : <span className="chip chip-rejected"><span className="chip-dot" /> 종료</span>}
                    </td>
                    <td style={{ padding: "12px 14px", display: "flex", gap: 4 }}>
                      {canManageSite(role, userHQs, site.hqId) && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(site)}>
                          <Icon name="edit" size={12} /> 수정
                        </button>
                      )}
                      {canDeleteSite(role) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteSite(site)}
                          title="삭제" style={{ color: "var(--danger)" }}>
                          <Icon name="trash" size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "var(--fg-3)" }}>
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 사업장 추가 모달 */}
      {adding && (
        <SiteFormModal
          title="사업장 추가"
          hqs={hqs}
          users={users}
          defaultHQId={addingForHQ}
          allowedHQIds={(role === "admin" || role === "safety") ? null : userHQs}
          onSave={async (data) => {
            await window.WV_API.addSite(data);
            // 팀 계정(manager/staff)이면 방금 추가한 사업장이 내 담당(siteIds)에 자동 연결됨
            // → 현재 로그인 사용자를 갱신해야 새 사업장이 바로 보임(사업장 관리·위험성평가 등 전 화면)
            await onUserRefresh?.();
            // 사용자 siteIds가 갱신됐으므로 전체 reload
            await reloadAll();
            setAdding(false);
            setAddingForHQ(null);
          }}
          onClose={() => { setAdding(false); setAddingForHQ(null); }}
        />
      )}

      {/* 사업장 수정 모달 */}
      {editing && (
        <SiteFormModal
          title="사업장 수정"
          initialData={editing}
          hqs={hqs}
          users={users}
          allowedHQIds={(role === "admin" || role === "safety") ? null : userHQs}
          onSave={async (data) => {
            await window.WV_API.updateSite(editing.id, data);
            await reloadAll();
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* 본부 추가/수정 모달 */}
      {(hqAdding || hqEditing) && (
        <HQFormModal
          title={hqEditing ? "본부 수정" : "본부 추가"}
          initialData={hqEditing}
          onSave={async (data) => {
            if (hqEditing) {
              const res = await window.WV_API.updateHQ(hqEditing.id, data);
              if (res?.hq) {
                setHQs(prev => prev.map(x => x.id === hqEditing.id ? res.hq : x));
              }
              setHQEditing(null);
            } else {
              const res = await window.WV_API.addHQ(data);
              if (res?.hq) {
                setHQs(prev => [...prev, res.hq].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
              }
              setHQAdding(false);
            }
          }}
          onClose={() => { setHQAdding(false); setHQEditing(null); }}
        />
      )}
    </div>
  );
};

// ─── 본부(HQ) 등록/수정 폼
const HQFormModal = ({ title, initialData, onSave, onClose }) => {
  const [form, setForm] = React.useState({
    name: initialData?.name || "",
    code: initialData?.code || "",
    description: initialData?.description || "",
    ownerDept: initialData?.ownerDept || "",
    sortOrder: initialData?.sortOrder || 0,
    status: initialData?.status || "active",
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const upd = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("본부명을 입력해주세요."); return; }
    setSaving(true); setError("");
    try { await onSave(form); }
    catch (e) { setError("저장 실패: " + (e.message || "")); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-hd">
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🏢 {title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {error && <div style={{ color: "var(--danger)", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 6 }}>{error}</div>}
          <div className="field">
            <label className="field-label">본부명 *</label>
            <input className="field-input" value={form.name} onChange={e => upd("name", e.target.value)}
              placeholder="예: 윌앤비전 FM사업본부" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label className="field-label">코드 (약어)</label>
              <input className="field-input" value={form.code} onChange={e => upd("code", e.target.value)}
                placeholder="FM" maxLength={6} />
            </div>
            <div className="field">
              <label className="field-label">정렬 순서</label>
              <input className="field-input" type="number" value={form.sortOrder}
                onChange={e => upd("sortOrder", parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="field">
            <label className="field-label">담당 부서</label>
            <input className="field-input" value={form.ownerDept} onChange={e => upd("ownerDept", e.target.value)}
              placeholder="예: FM사업본부" />
          </div>
          <div className="field">
            <label className="field-label">설명</label>
            <input className="field-input" value={form.description} onChange={e => upd("description", e.target.value)}
              placeholder="본부 설명 (선택)" />
          </div>
          <div className="field">
            <label className="field-label">상태</label>
            <select className="field-select" value={form.status} onChange={e => upd("status", e.target.value)}>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>
        </div>
        <div className="modal-ft" style={{ gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="login-spinner" /> : <><Icon name="check" size={14} /> 저장</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── 사업장 등록/수정 폼 (본부 선택 포함)
const SiteFormModal = ({ title, initialData, hqs = [], users = [], defaultHQId, allowedHQIds, onSave, onClose }) => {
  const [form, setForm] = React.useState({
    사업장명: initialData?.["사업장명"] || "",
    hqId: initialData?.hqId || defaultHQId || "",
    지역: initialData?.["지역"] || "서울",
    고객사: initialData?.["고객사"] || "",
    담당자: initialData?.["담당자"] || "",
    주소: initialData?.["주소"] || "",
    전화번호: initialData?.["전화번호"] || "",
    상태: initialData?.["상태"] || "active",
  });

  // 담당자(다중) — 수정 모드면 기존에 이 site id를 siteIds로 가진 user들로 초기화
  const [assigneeIds, setAssigneeIds] = React.useState(() => {
    if (!initialData?.id) return [];
    const sid = String(initialData.id);
    return users
      .filter(u => String(u.siteIds || "").split(",").map(s => s.trim()).includes(sid))
      .map(u => u.id);
  });

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [assigneeSearch, setAssigneeSearch] = React.useState("");

  const update = (k, v) => setForm(s => ({ ...s, [k]: v }));

  // 권한별 본부 옵션 필터링
  const hqOptions = React.useMemo(() => {
    if (!allowedHQIds) return hqs;     // null = 전체 허용 (admin/safety/manager)
    return hqs.filter(h => allowedHQIds.includes(String(h.id)));
  }, [hqs, allowedHQIds]);

  // 선택된 본부의 직원만 필터링 + 검색
  // ⚠ 현장대리인(site_manager/site_staff)은 사업장 자체와 1:1 매핑되는 별도 개체이므로
  //    "담당 직원" 후보에서 제외. 본사 직원(admin/safety/manager/staff)만 노출.
  const HQ_ROLES = ["admin", "safety", "manager", "staff"];
  const candidateUsers = React.useMemo(() => {
    if (!form.hqId) return [];
    const hqIdStr = String(form.hqId);
    const q = assigneeSearch.trim().toLowerCase();
    return users
      .filter(u => String(u.hqId || "") === hqIdStr)
      .filter(u => u.status !== "deleted" && u.status !== "pending")
      .filter(u => HQ_ROLES.includes(u.role))         // ✅ 본사 직원만
      .filter(u => !q || u.name?.toLowerCase().includes(q) || u.dept?.toLowerCase().includes(q))
      // 이미 선택된 사람을 위에 표시
      .sort((a, b) => {
        const aSel = assigneeIds.includes(a.id);
        const bSel = assigneeIds.includes(b.id);
        if (aSel !== bSel) return aSel ? -1 : 1;
        return (a.name || "").localeCompare(b.name || "", "ko");
      });
  }, [users, form.hqId, assigneeSearch, assigneeIds]);

  // 담당자는 사업장당 1명 — 체크하면 그 사람만 남기고, 같은 사람 다시 누르면 해제
  const toggleAssignee = (uid) => {
    setAssigneeIds(prev => (prev.length === 1 && prev[0] === uid) ? [] : [uid]);
  };

  // 선택된 사용자들의 이름 → form.담당자 자동 동기화
  const selectedUsers = users.filter(u => assigneeIds.includes(u.id));
  const autoManagerLabel = selectedUsers.map(u => u.name).join(", ");

  const handleSave = async () => {
    if (!form.사업장명) { setError("사업장명을 입력해주세요."); return; }
    if (!form.hqId) { setError("소속 본부를 선택해주세요."); return; }
    setSaving(true);
    try {
      // 담당자 텍스트는 선택된 사용자들 이름으로 자동 채움
      // (수동 입력값이 있다면 유지, 없으면 자동값 사용)
      const finalManager = autoManagerLabel || form.담당자 || "";
      await onSave({
        ...form,
        담당자: finalManager,
        hqId: parseInt(form.hqId) || null,
        assigneeIds, // 백엔드가 user.siteIds 동기화에 사용
      });
    } catch (e) {
      setError("저장 실패. 다시 시도해주세요.");
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-hd">
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd">
          {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "#fef2f2", borderRadius: 6 }}>{error}</div>}
          <div className="field">
            <label className="field-label">소속 본부 *</label>
            <select className="field-select" value={form.hqId || ""} onChange={e => update("hqId", e.target.value)}>
              <option value="">— 본부 선택 —</option>
              {hqOptions.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            {allowedHQIds && allowedHQIds.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>
                ⚠️ 등록 가능한 본부가 없습니다. 관리자에게 본부 권한을 요청하세요.
              </div>
            )}
          </div>
          <div className="field">
            <label className="field-label">사업장명 *</label>
            <input className="field-input" value={form.사업장명}
              onChange={e => update("사업장명", e.target.value)} placeholder="사업장명 입력" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label className="field-label">지역</label>
              <select className="field-select" value={form.지역} onChange={e => update("지역", e.target.value)}>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">고객사</label>
              <input className="field-input" value={form.고객사}
                onChange={e => update("고객사", e.target.value)} placeholder="고객사명" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">전화번호</label>
            <input className="field-input" value={form.전화번호}
              onChange={e => update("전화번호", e.target.value)} placeholder="02-0000-0000" />
          </div>

          {/* ── 담당 직원 다중선택 (본부 선택 후 활성화) ── */}
          <div className="field">
            <label className="field-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>담당 직원 {assigneeIds.length > 0 && <span style={{ color: "var(--primary)", fontWeight: 700 }}>({assigneeIds.length}명 선택)</span>}</span>
              {form.hqId && candidateUsers.length > 0 && (
                <input
                  type="text"
                  placeholder="이름/부서 검색"
                  value={assigneeSearch}
                  onChange={e => setAssigneeSearch(e.target.value)}
                  style={{ fontSize: 12, padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 4, width: 140 }}
                />
              )}
            </label>
            {!form.hqId ? (
              <div style={{ fontSize: 12, color: "var(--fg-3)", padding: "12px", background: "var(--bg-sunk)", borderRadius: 6, textAlign: "center" }}>
                ⬆ 먼저 소속 본부를 선택해주세요
              </div>
            ) : candidateUsers.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--fg-3)", padding: "12px", background: "var(--bg-sunk)", borderRadius: 6, textAlign: "center" }}>
                선택한 본부에 등록된 직원이 없습니다.<br />
                <span style={{ fontSize: 11 }}>계정 관리에서 직원을 본부에 배정해주세요.</span>
              </div>
            ) : (
              <div style={{
                maxHeight: 200, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 6, padding: 4,
                background: "var(--bg)",
              }}>
                {candidateUsers.map(u => {
                  const checked = assigneeIds.includes(u.id);
                  return (
                    <label key={u.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer",
                      borderRadius: 4,
                      background: checked ? "color-mix(in oklab, var(--primary) 12%, transparent)" : "transparent",
                    }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleAssignee(u.id)}
                        style={{ cursor: "pointer" }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                      <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{u.dept || "-"}</span>
                      <span style={{ fontSize: 10, color: "var(--fg-3)", marginLeft: "auto" }}>
                        {u.role === "admin" ? "관리자" :
                         u.role === "safety" ? "안전관리자" :
                         u.role === "manager" ? "팀 공용" :
                         u.role === "staff" ? "팀 공용" :
                         u.role === "site_manager" ? "현장대리인" : u.role}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6 }}>
              💡 선택한 직원이 로그인하면 이 사업장이 본인 담당으로 자동 표시됩니다.
            </div>
          </div>

          {/* 담당자 표시 텍스트 (자동/수동) */}
          <div className="field">
            <label className="field-label">담당자 표기 <span style={{ fontSize: 11, color: "var(--fg-3)" }}>(목록에 보이는 이름. 비워두면 선택한 직원 이름으로 자동)</span></label>
            <input className="field-input"
              value={form.담당자}
              onChange={e => update("담당자", e.target.value)}
              placeholder={autoManagerLabel || "예: 홍길동 / 미지정"} />
          </div>
          <div className="field">
            <label className="field-label">주소</label>
            <input className="field-input" value={form.주소}
              onChange={e => update("주소", e.target.value)} placeholder="사업장 주소 입력" />
          </div>
          <div className="field">
            <label className="field-label">상태</label>
            <select className="field-select" value={form.상태} onChange={e => update("상태", e.target.value)}>
              <option value="active">운영중</option>
              <option value="inactive">종료</option>
            </select>
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="login-spinner" /> : <><Icon name="check" size={14} /> 저장</>}
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ManageSitesView, SiteFormModal, HQFormModal });
