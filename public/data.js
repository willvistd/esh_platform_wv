// 윌앤비전 안전보건관리 게시판 - mock data
window.WV_DATA = (() => {
  // 실시간 오늘 날짜 (자정 0시 기준으로 D-day 계산 정확하게)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const daysFromNow = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return fmt(d);
  };
  const daysAgo = (n) => daysFromNow(-n);

  // 8 categories with their post style types
  const categories = [
    { id: "board-docs",       name: "게시판 게시 서류",           type: "board",        desc: "안전보건위원회 회의록, 산업안전보건법 게시 의무 자료", icon: "doc",      count: 0 },
    { id: "procedures",       name: "절차서 및 지침서",           type: "board",        desc: "전사 안전보건 표준 절차서, 작업별 안전 지침", icon: "book",     count: 0 },
    { id: "training",         name: "안전보건교육",               type: "form",         desc: "정기/특별 안전보건교육 양식 및 수료 제출", icon: "graduation", count: 0 },
    { id: "risk-assessment",  name: "위험성평가",                 type: "form",         desc: "정기·수시 위험성평가 양식, 부서별 작성", icon: "alert",    count: 0 },
    { id: "msds",             name: "물질안전보건자료 (MSDS)",     type: "board-form",   desc: "화학물질 MSDS 비치 자료 및 제출 양식", icon: "flask",    count: 0 },
    { id: "ergonomic",        name: "근골격계부담작업 유해요인조사", type: "board",        desc: "3년 1회 정기 조사 및 수시 조사 자료", icon: "body",     count: 0 },
    { id: "signage",          name: "안전보건표지",               type: "library",      desc: "현장 부착용 표지, 라벨, 안내문 다운로드", icon: "sign",     count: 0 },
    { id: "posters",          name: "안전보건 포스터",            type: "library",      desc: "월간 캠페인 포스터, 게시판 부착용 자료", icon: "image",    count: 0 },
    { id: "worker-feedback",  name: "종사자 의견 청취",           type: "form",         desc: "산업안전보건법 제4조 7호에 따라 종사자의 안전보건 관련 의견 청취", icon: "comment", count: 0 },
  ];

  const typeLabel = {
    board: "게시판형",
    form: "양식생성형",
    "board-form": "게시판 + 양식",
    library: "자료실형",
  };

  const roles = [
    { id: "admin",        name: "관리자",      desc: "전체 권한",                              kind: "system",   siteAdmin: true,  color: "#1e5fcf", builtin: true },
    { id: "safety",       name: "안전관리자",   desc: "업로드 · 수정 · 승인",                    kind: "internal", siteAdmin: true,  color: "#1f8a5b", builtin: true },
    { id: "manager",      name: "팀장(구)",     desc: "팀 공용으로 통합됨 — 신규 선택 불가(기존 계정은 팀 공용과 동일 권한)", kind: "internal", siteAdmin: false, color: "#d97757", builtin: true, hidden: true },
    { id: "staff",        name: "팀 공용",      desc: "팀 공용계정 · 모든 업무·카테고리 접근(관리자 설정 제외)", kind: "internal", siteAdmin: false, color: "#7280a5", builtin: true },
    { id: "site_manager", name: "현장대리인",   desc: "단위 사업장 직원 · 본인 사업장 이행 제출",  kind: "site",     siteAdmin: false, color: "#8b5cf6", builtin: true },
  ];

  // ─── 메뉴 카탈로그 (권한별 ON/OFF 대상) ───
  const menuCatalog = [
    { id: "dashboard",       name: "대시보드",         group: "공통" },
    { id: "submissions",     name: "이행사항 제출 현황", group: "공통" },
    { id: "legal-checker",   name: "법적의무 자동판정", group: "공통" },
    { id: "tool-org-chart",  name: "안전보건 조직도",   group: "공통" },
    { id: "cat:board-docs",      name: "게시판 게시 서류",   group: "카테고리" },
    { id: "cat:procedures",      name: "절차서 및 지침서",   group: "카테고리" },
    { id: "cat:training",        name: "안전보건교육",       group: "카테고리" },
    { id: "cat:risk-assessment", name: "위험성평가",         group: "카테고리" },
    { id: "cat:msds",            name: "물질안전보건자료",   group: "카테고리" },
    { id: "cat:ergonomic",       name: "근골격계 부담작업",  group: "카테고리" },
    { id: "cat:signage",         name: "안전보건표지",       group: "카테고리" },
    { id: "cat:posters",         name: "안전보건 포스터",    group: "카테고리" },
    { id: "cat:worker-feedback", name: "종사자 의견 청취",   group: "카테고리" },
    { id: "manage-categories",   name: "카테고리 관리",     group: "관리자" },
    { id: "manage-sites",        name: "사업장 관리",       group: "관리자" },
    { id: "manage-approvals",    name: "가입 승인 관리",    group: "관리자" },
    { id: "manage-users",        name: "계정 목록 관리",    group: "관리자" },
    { id: "manage-roles",        name: "권한 역할 관리",    group: "관리자" },
  ];

  // ─── 역할별 기본 접근 메뉴 ───
  const allMenus = menuCatalog.map(m => m.id);
  const adminMenus = allMenus;
  const safetyMenus = allMenus.filter(m => m !== "manage-categories" && m !== "manage-roles");
  // 팀 공용(구 팀장·일반직원 통합): 모든 카테고리 + 사업장 관리 + 운영 기능 전부 접근.
  // 관리자 전용 설정(계정 관리·권한 관리·카테고리 관리·가입 승인 관리)만 제외.
  const teamMenus = allMenus.filter(m => !["manage-categories", "manage-roles", "manage-users", "manage-approvals"].includes(m));
  const managerMenus = teamMenus;
  const staffMenus = teamMenus;
  // 현장대리인: 카테고리는 모두 노출 (자료실 접근 막을 이유 없음).
  // 단 관리자 전용 시스템 메뉴(계정/역할/카테고리/가입승인)는 제외.
  const siteManagerMenus = allMenus.filter(m =>
    !["manage-categories", "manage-users", "manage-roles", "manage-approvals"].includes(m)
  );
  // site_staff = site_manager 와 동일 권한 (현장대리인으로 통합)
  const siteStaffMenus = siteManagerMenus;
  const onlyCategories = (ids) => ["dashboard", "submissions", ...ids.map(i => "cat:" + i)];
  const roleMenus = {
    admin:        adminMenus,
    safety:       safetyMenus,
    manager:      managerMenus,
    staff:        staffMenus,
    site_manager: siteManagerMenus,
    site_staff:   siteStaffMenus,
  };

  const can = {
    // 글쓰기(upload)는 관리자·안전관리자·안전보건관리책임자만 — 그 외는 열람·제출만
    admin:         { upload: true,  manageCategory: true,  manageUser: true,  manageRole: true,  approveSignup: true,  approve: true,  submit: true,  comment: true },
    safety:        { upload: true,  manageCategory: false, manageUser: false, manageRole: false, approveSignup: true,  approve: true,  submit: true,  comment: true },
    // 팀 공용(팀장·일반직원 통합): 게시판 글쓰기 포함 모든 운영 접근. 관리자 설정(계정/권한/카테고리/가입승인)만 제외.
    manager:       { upload: true,  manageCategory: false, manageUser: false, manageRole: false, approveSignup: false, approve: false, submit: true,  comment: true },
    staff:         { upload: true,  manageCategory: false, manageUser: false, manageRole: false, approveSignup: false, approve: false, submit: true,  comment: true },
    // 현장대리인: 본인 사업장 이행 제출만. 글쓰기 X.
    site_manager:  { upload: false, manageCategory: false, manageUser: false, manageRole: false, approveSignup: false, approve: false, submit: true,  comment: true },
    site_staff:    { upload: false, manageCategory: false, manageUser: false, manageRole: false, approveSignup: false, approve: false, submit: true,  comment: true },
    "ext-general": { upload: false, manageCategory: false, manageUser: false, manageRole: false, approveSignup: false, approve: false, submit: false, comment: true },
    "ext-partner": { upload: true,  manageCategory: false, manageUser: false, manageRole: false, approveSignup: false, approve: false, submit: true,  comment: true },
  };

  // 실제 계정은 DB(users 테이블)에서 API로 불러옵니다. 여기는 더 이상 가짜 시드 명단을 두지 않음.
  // (배열 자체는 유지 — 일부 화면이 WV_DATA.users.find(...) fallback으로 참조하므로 빈 배열이어야 안전)
  const users = [];

  const posts = [];

  const signupRequests = [];

  const submissions = [];

  const depts = ["대표이사실", "감사실", "안전보건전담조직", "CRM 운영1팀", "CRM 운영3팀", "CRM 운영4팀", "HR 파견파트", "HR 유통파트", "HR 한국인삼공사", "HR 한국인삼공대형마트", "FM 운영팀", "공항사업본부", "대구사업본부", "부산사업본부", "대전사업본부", "광주사업본부", "윌비모터스", "물류사업본부", "동부캐리"];

  const activity = [];

  return { today, fmt, daysFromNow, daysAgo, categories, typeLabel, roles, menuCatalog, roleMenus, can, users, signupRequests, posts, submissions, depts, activity };
})();

// ── 카테고리 하위메뉴 카탈로그 (사이드바 날개 + 카테고리 관리 공용) ──
//   key: 고유 식별자 / catId·catName: 어느 카테고리 아래 / defaultLabel: 기본 표시명
//   nav: 클릭 시 이동 라우트 / actNames·actPrefix: 활성(하이라이트) 판단
//   ⚠ 각 항목은 전용 페이지가 있어야 작동 — 임의 추가 불가(이름/순서/표시여부만 관리)
window.WV_SUBMENUS = [
  { key: "risk-doc",      catId: "risk-assessment", defaultLabel: "위험성평가 서류 작성", nav: { name: "risk-assessment" }, actNames: ["risk-assessment"], actPrefix: "risk-" },
  { key: "worker-survey", catId: "risk-assessment", defaultLabel: "근무환경 조사표 출력", nav: { name: "tool-worker-survey" }, actNames: ["tool-worker-survey"] },
  { key: "field-insp",    catId: "risk-assessment", defaultLabel: "현장점검 보고서",       nav: { name: "field-inspection" }, actNames: ["field-inspection"] },
  { key: "edu-log",       catId: "training",        defaultLabel: "교육일지 작성/조회",    nav: { name: "education-log" }, actNames: ["education-log", "education-log-new", "education-log-list"] },
  { key: "msds-gen",      catId: "msds",            defaultLabel: "MSDS 서식 생성",         nav: { name: "msds-generate" }, actNames: ["msds-generate"] },
  { key: "safety-signs",  catId: "signage", catName: "안전보건표지", defaultLabel: "출입문 표지 생성", nav: { name: "tool-safety-signs" }, actNames: ["tool-safety-signs"] },
];

// ── 하위메뉴 헬퍼 (사이드바 + 카테고리 관리 공용) ──
//   설정 저장 형태: { [카테고리id]: [ {uid, kind, label, enabled, toolKey?, targetCat?} ] }
//   kind: "board"(게시판 링크, targetCat 없으면 자기 자신) | "tool"(고정 기능 페이지)
window.WV_SUB = {
  _uid: 0,
  newUid: () => "sm_" + (window.WV_SUB._uid++) + "_" + Math.floor(Math.random() * 100000),
  toolByKey: (key) => (window.WV_SUBMENUS || []).find((m) => m.key === key),
  toolsForCat: (c) => (window.WV_SUBMENUS || []).filter((m) => m.catId === c.id || (m.catName && m.catName === c.name)),
  // 관리자 설정이 없을 때의 기본 목록 (게시판 보기 + 해당 카테고리 고정 기능들)
  defaultList: (c) => {
    const tools = window.WV_SUB.toolsForCat(c);
    if (!tools.length) return []; // 고정 기능 없는 카테고리는 날개 없음(바로 진입)
    return [
      { uid: "board", kind: "board", label: "게시판 보기", enabled: true },
      ...tools.map((t) => ({ uid: t.key, kind: "tool", toolKey: t.key, label: t.defaultLabel, enabled: true })),
    ];
  },
  // 저장된 설정(배열) 있으면 그것, 없으면 기본 목록
  listFor: (c, cfg) => (Array.isArray(cfg && cfg[c.id]) ? cfg[c.id] : window.WV_SUB.defaultList(c)),
  // 항목 → { label, nav, act } (사이드바 렌더용)
  //   cats: 현재(라이브) 카테고리 목록 — 다른 카테고리 게시판 링크의 이름을 항상 최신으로 보이게 함
  resolve: (item, c, cats) => {
    if (item.kind === "tool") {
      const t = window.WV_SUB.toolByKey(item.toolKey);
      if (!t) return null;
      return {
        label: item.label || t.defaultLabel,
        nav: t.nav,
        act: (r) => (t.actNames || []).includes(r.name) || (t.actPrefix && r.name.startsWith(t.actPrefix)),
      };
    }
    const cid = item.targetCat || c.id; // board
    // ⚠ 다른 카테고리 게시판 링크(targetCat 지정)는 저장된 label이 '추가 당시 이름 스냅샷'이라
    //    카테고리명을 바꾸면 옛 이름이 그대로 남는다(호버=옛이름 / 클릭=새이름 불일치).
    //    → 라이브 카테고리 목록에서 현재 이름을 찾아 항상 최신으로 표시(스냅샷보다 우선).
    const liveCat = item.targetCat && Array.isArray(cats) ? cats.find((x) => x.id === cid) : null;
    const label = liveCat ? liveCat.name + " 게시판" : (item.label || "게시판 보기");
    return {
      label,
      nav: { name: "category", id: cid },
      act: (r) => r.name === "category" && r.id === cid,
    };
  },
};

// ── 문서 작성자(실명) — 공용계정 소프트 감사 ──
// 팀 공용계정은 로그인 이름이 팀명이라 "누가 작성했는지"가 안 남음.
// → 계정별로 '현재 작성자(실명)'를 localStorage에 저장하고, 문서 저장 시 이 이름을 사용.
//   미지정 시 계정 이름으로 fallback(개인계정은 기존과 동일하게 동작).
window.WV_ACTOR = {
  _key: (user) => "wv_actor_name_" + (user && user.id != null ? user.id : "anon"),
  getStored(user) { try { return localStorage.getItem(this._key(user)) || ""; } catch (e) { return ""; } },
  get(user) { return this.getStored(user) || (user && user.name) || ""; },
  set(user, name) {
    try {
      const v = String(name || "").trim();
      if (v) localStorage.setItem(this._key(user), v);
      else localStorage.removeItem(this._key(user));
    } catch (e) {}
  },
};
