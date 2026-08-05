// 윌앤비전 - 권한 역할 관리 + 계정별 권한 편집 모달

// ─── 5. 권한 역할 관리 페이지
const ManageRolesView = () => {
  const D = window.WV_DATA;
  const [roles, setRoles] = React.useState(D.roles);
  const [roleMenus, setRoleMenus] = React.useState({ ...D.roleMenus });
  const [editing, setEditing] = React.useState(null);
  const [adding, setAdding] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(null);

  const kindLabel = {
    "system": "시스템관리자",
    "internal": "사내직원",
    "external-general": "외부일반",
    "external-partner": "외부파트너",
  };

  // 역할별 인원수: 실제 DB 계정 기준으로 계산 (예전엔 더미 D.users로 세어 실제와 무관했음)
  const [realUsers, setRealUsers] = React.useState([]);
  React.useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(d => setRealUsers(d.users || [])).catch(() => {});
  }, []);
  const userCount = (rid) => realUsers.filter(u => u.role === rid).length;

  const onSaveMenus = (roleId, menus) => {
    setRoleMenus(rm => ({ ...rm, [roleId]: menus }));
    setEditing(null);
  };
  const onSaveRole = (newRole) => {
    setRoles(rs => rs.find(r => r.id === newRole.id) ? rs.map(r => r.id === newRole.id ? newRole : r) : [...rs, newRole]);
    if (!roleMenus[newRole.id]) setRoleMenus(rm => ({ ...rm, [newRole.id]: ["dashboard"] }));
    setAdding(false);
  };
  const onToggleSiteAdmin = (rid) => setRoles(rs => rs.map(r => r.id === rid ? { ...r, siteAdmin: !r.siteAdmin } : r));
  const onDelete = (rid) => {
    setRoles(rs => rs.filter(r => r.id !== rid));
    setConfirmDel(null);
  };

  return (
    <div className="content">
      <div className="content-hd">
        <div>
          <h1 className="content-title">권한 역할 관리</h1>
          <div className="content-sub">시스템 내 역할(Role)을 정의하고 각 역할이 접근할 메뉴를 설정합니다.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> 역할 추가</button>
      </div>

      {/* Role table */}
      <div className="card" style={{padding: 0, overflow: "hidden"}}>
        <div className="role-tbl-hd">
          <div>역할명</div>
          <div>구분</div>
          <div>설명</div>
          <div>사용자</div>
          <div>접근 메뉴</div>
          <div>사업장관리자</div>
          <div>액션</div>
        </div>
        {roles.map(r => {
          const menus = roleMenus[r.id] || [];
          return (
            <div key={r.id} className="role-tbl-row" onClick={() => setEditing(r)}>
              <div style={{display: "flex", gap: 10, alignItems: "center"}}>
                <span className="role-dot" style={{background: r.color, width: 12, height: 12}} />
                <div>
                  <div style={{fontWeight: 600, fontSize: 13.5}}>{r.name}</div>
                  {r.builtin && <div className="meta" style={{fontSize: 11}}>기본 역할</div>}
                </div>
              </div>
              <div>
                <span className={"chip " + (
                  r.kind === "system" ? "chip-primary" :
                  r.kind === "internal" ? "chip-success" :
                  "chip-warning"
                )}>{kindLabel[r.kind] || r.kind}</span>
              </div>
              <div style={{fontSize: 12.5, color: "var(--fg-3)"}}>{r.desc}</div>
              <div className="mono" style={{color: "var(--fg-2)"}}>{userCount(r.id)}명</div>
              <div className="mono" style={{color: "var(--fg-2)"}}>{menus.length} / {D.menuCatalog.length}</div>
              <div onClick={e => e.stopPropagation()}>
                <Toggle on={r.siteAdmin} onClick={() => onToggleSiteAdmin(r.id)} />
              </div>
              <div style={{display: "flex", gap: 4}} onClick={e => e.stopPropagation()}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(r)}>
                  <Icon name="edit" size={12} /> 편집
                </button>
                {!r.builtin && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(r)}>
                    <Icon name="trash" size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <div className="role-hint">
        <Icon name="shield" size={14} />
        <div>
          <b>사업장관리자</b>는 자신이 속한 사업장 범위 내에서 자료 등록·승인이 가능한 권한입니다.
          <span className="meta"> 사업장관리자가 OFF인 역할은 부서 자료 등록만 가능하며 전사 자료 등록은 차단됩니다.</span>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <RoleMenuModal
          role={editing}
          menuIds={roleMenus[editing.id] || []}
          onClose={() => setEditing(null)}
          onSave={(menus) => onSaveMenus(editing.id, menus)}
        />
      )}
      {adding && (
        <RoleAddModal onClose={() => setAdding(false)} onSave={onSaveRole} />
      )}
      {confirmDel && (
        <ConfirmModal
          title="역할 삭제"
          message={`「${confirmDel.name}」 역할을 삭제합니다. 이 역할이 부여된 ${userCount(confirmDel.id)}명의 계정은 팀 공용으로 자동 변경됩니다.`}
          confirmLabel="삭제"
          dangerous
          onClose={() => setConfirmDel(null)}
          onConfirm={() => onDelete(confirmDel.id)}
        />
      )}

      <style>{`
        .role-tbl-hd, .role-tbl-row {
          display: grid;
          grid-template-columns: 200px 110px 1fr 90px 110px 130px 140px;
          gap: 12px; align-items: center;
          padding: 12px 18px; font-size: 13px;
        }
        @media (max-width: 1200px) {
          .role-tbl-hd, .role-tbl-row { grid-template-columns: 180px 100px 1fr 130px 140px; }
          .role-tbl-row > div:nth-child(3),
          .role-tbl-hd > div:nth-child(3),
          .role-tbl-row > div:nth-child(4),
          .role-tbl-hd > div:nth-child(4) { display: none; }
        }
        .role-tbl-hd {
          background: var(--bg-sunk); color: var(--fg-4);
          font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
          border-bottom: 1px solid var(--line);
        }
        [data-mood="technical"] .role-tbl-hd { font-family: var(--font-mono); }
        .role-tbl-row { border-bottom: 1px solid var(--line-2); cursor: pointer; }
        .role-tbl-row:last-child { border-bottom: 0; }
        .role-tbl-row:hover { background: var(--bg-sunk); }

        .role-hint {
          display: flex; gap: 12px; align-items: flex-start;
          padding: 14px 18px;
          background: var(--primary-soft);
          border: 1px solid var(--primary-soft-2);
          border-radius: var(--r-md);
          color: var(--fg-2); font-size: 12.5px; line-height: 1.55;
          margin-top: 18px;
        }
        .role-hint > svg { color: var(--primary); flex-shrink: 0; margin-top: 1px; }
        .role-hint b { color: var(--primary); }
      `}</style>
    </div>
  );
};

// ─── 역할별 메뉴 편집 모달
const RoleMenuModal = ({ role, menuIds, onClose, onSave }) => {
  const D = window.WV_DATA;
  const [selected, setSelected] = React.useState(new Set(menuIds));
  const groups = ["공통", "카테고리", "관리자"];

  // ── 백엔드 카테고리 동기화 (AccountPermissionModal과 동일 패턴) ──
  const [liveCategories, setLiveCategories] = React.useState(null);
  React.useEffect(() => {
    if (window.WV_API?.getCategories) {
      window.WV_API.getCategories()
        .then(list => {
          const cats = Array.isArray(list) ? list : [];
          setLiveCategories(cats);
          // 라이브 카테고리는 기본으로 '접근 허용'(체크) 처리.
          // (하드코딩 기본 목록에 없던 카테고리가 ID 불일치로 조용히 해제돼 보이던 문제 방지)
          setSelected(prev => {
            const next = new Set(prev);
            cats.forEach(c => next.add("cat:" + c.id));
            return next;
          });
        })
        .catch(() => setLiveCategories([]));
    }
  }, []);
  const dynamicMenuCatalog = React.useMemo(() => {
    const nonCategoryItems = D.menuCatalog.filter(m => !m.id.startsWith("cat:"));
    if (!liveCategories) return D.menuCatalog;
    const categoryItems = liveCategories.map(c => ({
      id: "cat:" + c.id, name: c.name, group: "카테고리",
    }));
    const common = nonCategoryItems.filter(m => m.group === "공통");
    const admin = nonCategoryItems.filter(m => m.group === "관리자");
    return [...common, ...categoryItems, ...admin];
  }, [D.menuCatalog, liveCategories]);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const toggleGroup = (group, ids, allOn) => {
    const next = new Set(selected);
    ids.forEach(id => allOn ? next.delete(id) : next.add(id));
    setSelected(next);
  };
  const toggleAll = (on) => setSelected(new Set(on ? dynamicMenuCatalog.map(m => m.id) : []));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 640}}>
        <div className="modal-hd">
          <div>
            <div className="meta">접근 메뉴 편집</div>
            <h2 style={{margin: "4px 0 0", fontSize: 18, fontWeight: 600}}>
              <span className="role-dot" style={{background: role.color, width: 10, height: 10, marginRight: 8, display: "inline-block", verticalAlign: "middle"}} />
              {role.name} 역할
            </h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd">
          <div className="menu-edit-toolbar">
            <div className="meta">선택 {selected.size} / {dynamicMenuCatalog.length}</div>
            <div style={{flex: 1}} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleAll(true)}>전체 선택</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleAll(false)}>전체 해제</button>
          </div>
          {groups.map(g => {
            const items = dynamicMenuCatalog.filter(m => m.group === g);
            const allOn = items.length > 0 && items.every(m => selected.has(m.id));
            return (
              <div key={g} className="menu-edit-group">
                <div className="menu-edit-group-hd">
                  <h3>{g}
                    {g === "카테고리" && liveCategories === null && (
                      <span className="meta" style={{ marginLeft: 8, fontSize: 11 }}>로딩 중…</span>
                    )}
                  </h3>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleGroup(g, items.map(i => i.id), allOn)}>
                    {allOn ? "전체 해제" : "전체 선택"}
                  </button>
                </div>
                <div className="menu-edit-grid">
                  {items.map(m => (
                    <label key={m.id} className={"menu-edit-item" + (selected.has(m.id) ? " on" : "")}>
                      <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
                      <span className="menu-edit-check"><Icon name="check" size={12} /></span>
                      <span>{m.name}</span>
                    </label>
                  ))}
                  {g === "카테고리" && liveCategories?.length === 0 && (
                    <div style={{ padding: 12, fontSize: 12, color: "var(--fg-3)", gridColumn: "1 / -1" }}>
                      등록된 카테고리가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="modal-ft">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => onSave([...selected])}>
            <Icon name="check" size={14} /> 저장
          </button>
        </div>

        <style>{`
          .menu-edit-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--line-2); }
          .menu-edit-group + .menu-edit-group { margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--line-2); }
          .menu-edit-group-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
          .menu-edit-group-hd h3 {
            margin: 0; font-size: 13px; font-weight: 600;
            color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.04em;
          }
          [data-mood="technical"] .menu-edit-group-hd h3 { font-family: var(--font-mono); }
          .menu-edit-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
          .menu-edit-item {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 12px;
            border: 1px solid var(--line);
            border-radius: var(--r-md);
            background: var(--bg-elev);
            cursor: pointer;
            font-size: 13px;
            transition: background-color .15s, border-color .15s;
          }
          .menu-edit-item input { display: none; }
          .menu-edit-item:hover { background: var(--bg-sunk); }
          .menu-edit-item.on { border-color: var(--primary); background: var(--primary-soft); }
          .menu-edit-check {
            width: 18px; height: 18px; border-radius: 4px;
            border: 1.5px solid var(--fg-4); background: var(--bg-elev);
            display: inline-grid; place-items: center; flex-shrink: 0;
            color: transparent; transition: all .15s;
          }
          .menu-edit-item.on .menu-edit-check { background: var(--primary); border-color: var(--primary); color: #fff; }
        `}</style>
      </div>
    </div>
  );
};

// ─── 역할 추가 모달
const RoleAddModal = ({ onClose, onSave }) => {
  const [form, setForm] = React.useState({
    name: "", desc: "", kind: "internal", color: "#7280a5", siteAdmin: false,
  });
  const valid = form.name.trim().length > 0;
  const submit = () => {
    if (!valid) return;
    const id = "custom-" + Date.now();
    onSave({ ...form, id, builtin: false });
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 480}}>
        <div className="modal-hd">
          <h2 style={{margin: 0, fontSize: 18, fontWeight: 600}}>새 권한 역할</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd">
          <div className="field">
            <label className="field-label">역할명 *</label>
            <input className="field-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="예: 협력사 안전담당자" />
          </div>
          <div className="field">
            <label className="field-label">설명</label>
            <input className="field-input" value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} placeholder="역할의 책임 범위를 간단히 작성하세요." />
          </div>
          <div className="field">
            <label className="field-label">구분</label>
            <select className="field-select" value={form.kind} onChange={e => setForm({...form, kind: e.target.value})}>
              <option value="system">시스템관리자</option>
              <option value="internal">사내직원</option>
              <option value="external-general">외부일반</option>
              <option value="external-partner">외부파트너</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">컬러</label>
            <div style={{display: "flex", gap: 8}}>
              {["#1e5fcf", "#1f8a5b", "#d97757", "#7280a5", "#9b6bd9", "#0e9aab", "#e8307a", "#f59e0b"].map(c => (
                <button key={c} type="button"
                  className={"color-pick" + (form.color === c ? " active" : "")}
                  style={{background: c}}
                  onClick={() => setForm({...form, color: c})} />
              ))}
            </div>
          </div>
          <div className="field">
            <label style={{display: "flex", alignItems: "center", gap: 10, cursor: "pointer"}}>
              <Toggle on={form.siteAdmin} onClick={() => setForm({...form, siteAdmin: !form.siteAdmin})} />
              <div>
                <div style={{fontSize: 13, fontWeight: 600}}>사업장관리자 권한</div>
                <div className="meta">전사 자료 등록·승인이 가능합니다.</div>
              </div>
            </label>
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" disabled={!valid} onClick={submit}><Icon name="check" size={14} /> 추가</button>
        </div>
        <style>{`
          .color-pick {
            width: 28px; height: 28px; border-radius: 50%;
            border: 2px solid var(--bg-elev);
            box-shadow: 0 0 0 1px var(--line);
            cursor: pointer;
          }
          .color-pick.active { box-shadow: 0 0 0 2px var(--fg); }
        `}</style>
      </div>
    </div>
  );
};

// ─── 계정별 권한 편집 모달 (역할 + 개별 메뉴 ON/OFF)
const AccountPermissionModal = ({ user, onClose, onSave }) => {
  const D = window.WV_DATA;
  const [roleId, setRoleId] = React.useState(user.role);
  const [overrides, setOverrides] = React.useState(new Set(user.menuOverrides || []));
  const [useOverride, setUseOverride] = React.useState((user.menuOverrides || []).length > 0);

  // ── 백엔드에서 실제 카테고리 로드 (하드코딩된 menuCatalog의 cat:* 항목 동기화) ──
  const [liveCategories, setLiveCategories] = React.useState(null);
  React.useEffect(() => {
    if (window.WV_API?.getCategories) {
      window.WV_API.getCategories()
        .then(list => setLiveCategories(Array.isArray(list) ? list : []))
        .catch(() => setLiveCategories([]));
    }
  }, []);

  // 동적 menuCatalog: data.js의 비-카테고리 항목 + 백엔드 카테고리
  const dynamicMenuCatalog = React.useMemo(() => {
    const nonCategoryItems = D.menuCatalog.filter(m => !m.id.startsWith("cat:"));
    if (!liveCategories) return D.menuCatalog; // 로딩 중엔 기본값
    const categoryItems = liveCategories.map(c => ({
      id: "cat:" + c.id,
      name: c.name,
      group: "카테고리",
    }));
    // 공통 → 카테고리 → 관리자 순서 유지
    const common = nonCategoryItems.filter(m => m.group === "공통");
    const admin = nonCategoryItems.filter(m => m.group === "관리자");
    return [...common, ...categoryItems, ...admin];
  }, [D.menuCatalog, liveCategories]);

  // baseMenus 계산:
  // 1) data.js의 정적 roleMenus
  // 2) 백엔드 카테고리는 기본 ON (모든 역할 — 자료실 접근은 막을 이유 없음)
  //    단, 역할에서 카테고리 자체를 안 가진 케이스는 (예: 향후 추가될 외부 게스트) 그대로 유지
  const baseMenus = React.useMemo(() => {
    const set = new Set(D.roleMenus[roleId] || []);
    // 이 역할이 카테고리를 하나라도 갖고 있다면 → 백엔드의 모든 카테고리도 기본 ON
    const hasAnyCategory = [...set].some(id => id.startsWith("cat:"));
    if (hasAnyCategory && liveCategories) {
      liveCategories.forEach(c => set.add("cat:" + c.id));
    }
    return set;
  }, [roleId, D.roleMenus, liveCategories]);
  const effective = useOverride ? overrides : baseMenus;

  const toggle = (id) => {
    if (!useOverride) setUseOverride(true);
    const next = new Set(useOverride ? overrides : baseMenus);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOverrides(next);
  };

  const resetToRole = () => {
    setOverrides(new Set(baseMenus));
    setUseOverride(false);
  };

  const role = D.roles.find(r => r.id === roleId);
  const groups = ["공통", "카테고리", "관리자"];

  const submit = () => {
    onSave({ role: roleId, menuOverrides: useOverride ? [...overrides] : [] });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 720}}>
        <div className="modal-hd" style={{alignItems: "center"}}>
          <div style={{display: "flex", gap: 12, alignItems: "center"}}>
            <div className="activity-avatar" style={{width: 40, height: 40, background: D.roles.find(r => r.id === user.role)?.color, color: "#fff", fontSize: 16}}>{user.name[0]}</div>
            <div>
              <div className="meta">권한 편집</div>
              <h2 style={{margin: "2px 0 0", fontSize: 18, fontWeight: 600}}>{user.name} <span className="meta" style={{fontWeight: 400}}>· {user.dept}</span></h2>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd">
          {/* Role selector */}
          <div className="field">
            <label className="field-label">역할 변경</label>
            <select className="field-select" value={roleId} onChange={e => { setRoleId(e.target.value); if (!useOverride) setOverrides(new Set(D.roleMenus[e.target.value] || [])); }}>
              {D.roles.map(r => <option key={r.id} value={r.id}>{r.name} — {r.desc}</option>)}
            </select>
            <div className="meta" style={{marginTop: 6}}>
              <span className="role-dot" style={{background: role?.color, width: 8, height: 8, display: "inline-block", marginRight: 6, verticalAlign: "middle"}} />
              기본 접근 메뉴: <b>{(D.roleMenus[roleId] || []).length}개</b>
              {role?.siteAdmin && <span className="chip chip-primary" style={{marginLeft: 8}}>사업장관리자</span>}
            </div>
          </div>

          {/* Override toggle */}
          <div style={{display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: useOverride ? "var(--primary-soft)" : "var(--bg-sunk)", borderRadius: "var(--r-md)", border: "1px solid " + (useOverride ? "var(--primary-soft-2)" : "var(--line)"), marginBottom: 18}}>
            <Toggle on={useOverride} onClick={() => { setUseOverride(x => !x); if (!useOverride) setOverrides(new Set(baseMenus)); }} />
            <div style={{flex: 1}}>
              <div style={{fontSize: 13.5, fontWeight: 600}}>이 계정만 개별 메뉴 ON/OFF 적용</div>
              <div className="meta">활성화하면 역할 기본값과 다르게 이 계정만의 메뉴 접근 권한을 설정합니다.</div>
            </div>
            {useOverride && (
              <button className="btn btn-ghost btn-sm" onClick={resetToRole}>
                <Icon name="refresh" size={12} /> 역할 기본값으로 초기화
              </button>
            )}
          </div>

          {/* Menu list */}
          {groups.map(g => {
            const items = dynamicMenuCatalog.filter(m => m.group === g);
            return (
              <div key={g} className="menu-edit-group">
                <div className="menu-edit-group-hd">
                  <h3>{g}
                    {g === "카테고리" && liveCategories === null && (
                      <span className="meta" style={{ marginLeft: 8, fontSize: 11 }}>로딩 중…</span>
                    )}
                  </h3>
                  <span className="meta">{items.filter(m => effective.has(m.id)).length} / {items.length}</span>
                </div>
                <div className="menu-edit-grid">
                  {items.map(m => {
                    const inRole = baseMenus.has(m.id);
                    const on = effective.has(m.id);
                    const diff = useOverride && (on !== inRole);
                    return (
                      <label key={m.id} className={"menu-edit-item" + (on ? " on" : "") + (diff ? " diff" : "") + (!useOverride ? " locked" : "")}>
                        <input type="checkbox" checked={on} onChange={() => toggle(m.id)} disabled={!useOverride && false} />
                        <span className="menu-edit-check"><Icon name="check" size={12} /></span>
                        <span style={{flex: 1}}>{m.name}</span>
                        {diff && (
                          <span className="chip" style={{fontSize: 9.5, padding: "1px 6px", background: "var(--warning)", color: "#fff", border: 0}}>
                            {on ? "+추가" : "−제외"}
                          </span>
                        )}
                      </label>
                    );
                  })}
                  {g === "카테고리" && liveCategories?.length === 0 && (
                    <div style={{ padding: 12, fontSize: 12, color: "var(--fg-3)", gridColumn: "1 / -1" }}>
                      등록된 카테고리가 없습니다. 카테고리 관리에서 추가하세요.
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="meta" style={{marginTop: 14, fontSize: 11.5}}>
            <Icon name="shield-check" size={11} /> 변경 내역은 감사 로그에 기록됩니다.
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={submit}><Icon name="check" size={14} /> 저장</button>
        </div>

        <style>{`
          .menu-edit-item.locked { opacity: .85; }
          .menu-edit-item.diff { border-color: var(--warning); }
          .menu-edit-item.diff.on { background: color-mix(in oklab, var(--warning) 8%, var(--bg-elev)); }
        `}</style>
      </div>
    </div>
  );
};

// ─── 공용 토글
const Toggle = ({ on, onClick }) => (
  <button type="button" className={"wv-toggle" + (on ? " on" : "")} onClick={onClick} aria-pressed={on}>
    <span className="wv-toggle-thumb" />
    <style>{`
      .wv-toggle {
        position: relative; width: 42px; height: 24px;
        background: var(--bg-sunk); border: 1px solid var(--line);
        border-radius: 999px; padding: 0; cursor: pointer;
        transition: background-color .2s ease, border-color .2s ease;
        flex-shrink: 0;
      }
      .wv-toggle.on { background: var(--primary); border-color: var(--primary); }
      .wv-toggle-thumb {
        position: absolute; top: 2px; left: 2px;
        width: 18px; height: 18px; border-radius: 50%;
        background: var(--bg-elev);
        box-shadow: 0 1px 3px rgba(0,0,0,.2);
        transition: transform .2s ease, background-color .2s;
      }
      .wv-toggle.on .wv-toggle-thumb { transform: translateX(18px); background: #fff; }
    `}</style>
  </button>
);

// ─── Confirm 모달
const ConfirmModal = ({ title, message, confirmLabel = "확인", dangerous, onClose, onConfirm }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 460}}>
      <div className="modal-hd">
        <h2 style={{margin: 0, fontSize: 18, fontWeight: 600}}>{title}</h2>
        <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
      </div>
      <div className="modal-bd">
        <p style={{margin: 0, fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6}}>{message}</p>
      </div>
      <div className="modal-ft">
        <button className="btn btn-secondary" onClick={onClose}>취소</button>
        <button className={"btn " + (dangerous ? "btn-danger" : "btn-primary")} onClick={onConfirm}>
          {dangerous ? <Icon name="trash" size={14} /> : <Icon name="check" size={14} />} {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

Object.assign(window, { ManageRolesView, RoleMenuModal, RoleAddModal, AccountPermissionModal, Toggle, ConfirmModal });
