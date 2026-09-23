// 윌앤비전 안전보건관리 - 메인 앱

// ── 세션 만료 자동 처리 ──
// 모든 /api 응답에서 401(세션 쿠키 만료/없음)이 오면 로그인 화면으로.
// fetch를 한 곳에서 감싸므로 개별 호출부는 수정 불필요.
(() => {
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const res = await origFetch(input, init);
    try {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      // 로그인돼 있다고 여기는 상태(wv_user 존재)에서만 세션만료 처리 → 리로드.
      // 로그인 화면(wv_user 없음)에선 401 나도 아무것도 안 함(무한 새로고침 방지).
      if (res.status === 401 && url.startsWith("/api") && !url.startsWith("/api/login") && !url.startsWith("/api/logout") && localStorage.getItem("wv_user")) {
        // 동시접속 차단으로 밀려난 경우: 로그인 화면에 안내 메시지 표시
        try { if (res.headers.get("X-Session-Superseded") === "1") localStorage.setItem("wv_kick_msg", "다른 기기 또는 브라우저에서 로그인되어 로그아웃되었습니다."); } catch (e) {}
        localStorage.removeItem("wv_auth_v1");
        localStorage.removeItem("wv_user");
        if (!window.__wvReloading) { window.__wvReloading = true; window.location.reload(); }
      }
    } catch (e) {}
    return res;
  };
})();

// ── 백엔드 API 엔드포인트 (자체 서버 /api 프록시) ──
const API_BASE = "/api";
const ENDPOINTS = {
  users:       API_BASE + "/users",
  posts:       API_BASE + "/posts",
  sessions:    API_BASE + "/sessions",
  eduLogs:     API_BASE + "/edu-logs",
  eduAttendees:API_BASE + "/edu-attendees",
  eduTypes:    API_BASE + "/edu-types",
  sites:       API_BASE + "/sites",
  hq:          API_BASE + "/hq",
  categories:  API_BASE + "/categories",
  workerFeedback: API_BASE + "/worker-feedback",
  compliance: API_BASE + "/compliance-submissions",
  orgCharts:  API_BASE + "/org-charts",
  msdsLedger: API_BASE + "/msds-ledger",
};

const api = {
  async getUsers() {
    const res = await fetch(ENDPOINTS.users);
    const data = await res.json();
    return data.users || [];
  },
  async getLoginLog({ userId, anomaly, limit } = {}) {
    const p = new URLSearchParams();
    if (userId) p.set("userId", userId);
    if (anomaly) p.set("anomaly", "1");
    if (limit) p.set("limit", limit);
    const res = await fetch(API_BASE + "/login-log" + (p.toString() ? "?" + p.toString() : ""));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `접속 이력 조회 실패 (${res.status})`);
    return data.items || [];
  },
  async getPosts(categoryId) {
    // categoryId 지정 시 해당 카테고리만(썸네일 포함) — 전체 로드 시 base64 썸네일 제외되어 가벼움
    const url = categoryId ? `${ENDPOINTS.posts}?categoryId=${encodeURIComponent(categoryId)}` : ENDPOINTS.posts;
    const res = await fetch(url);
    const data = await res.json();
    return data.posts || [];
  },
  async login(email, password) {
    // 비밀번호 검증은 서버에서 (비번이 프론트로 내려오지 않음)
    let result;
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password: password.trim() }),
      });
      result = await res.json();
    } catch (e) {
      return { success: false, message: "서버 연결 오류가 발생했습니다." };
    }
    // 새 기기 이메일 OTP 필요 — 코드 입력 화면으로 넘김
    if (result && result.otpRequired) {
      return { success: false, otpRequired: true, pendingId: result.pendingId, emailMasked: result.emailMasked };
    }
    if (!result || !result.success || !result.user) {
      return { success: false, message: (result && result.message) || "이메일 또는 비밀번호가 올바르지 않습니다." };
    }
    return { success: true, user: this._normalizeUser(result.user) };
  },
  _normalizeUser(u) {
    return { ...u, id: String(u.id), phone: u.phone || "", position: u.position || "", hqId: u.hqId || null, siteIds: u.siteIds || "" };
  },
  async verifyOtp(pendingId, code) {
    let result;
    try {
      const res = await fetch("/api/login/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId, code: String(code).trim() }),
      });
      result = await res.json();
    } catch (e) { return { success: false, message: "서버 연결 오류가 발생했습니다." }; }
    if (!result || !result.success || !result.user) {
      return { success: false, message: (result && result.message) || "인증코드가 올바르지 않습니다." };
    }
    return { success: true, user: this._normalizeUser(result.user) };
  },
  async resendOtp(pendingId) {
    try {
      const res = await fetch("/api/login/resend-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId }),
      });
      return await res.json();
    } catch (e) { return { success: false, message: "재발송 실패" }; }
  },
  async incrementView(postId) {
    try {
      const res = await fetch(`${ENDPOINTS.posts}/${postId}/view`, { method: "POST" });
      const d = await res.json();
      return d.views;
    } catch (e) { return null; }
  },
  async addPost(post) {
    const res = await fetch(ENDPOINTS.posts, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: post.title, content: post.content,
        categoryId: post.categoryId, authorId: post.authorId,
        authorName: post.authorName,
        priority: post.priority || "normal",
        dueAt: post.dueAt || "",
        pinned: post.pinned || "",
        mustRead: post.mustRead || "",
        hasSubmission: post.hasSubmission || "",
        submissionTarget: post.submissionTarget || "",
        attachments: post.attachments || "",
        thumbUrl: post.thumbUrl || "",
        subCategory: post.subCategory || "",
      })
    });
    return await res.json();
  },
  async getEduLogs() {
    try {
      const res = await fetch(ENDPOINTS.eduLogs);
      const data = await res.json();
      return data.logs || [];
    } catch (e) {
      console.error('getEduLogs 실패:', e);
      return [];
    }
  },
  async addEduLog(log) {
    const res = await fetch(ENDPOINTS.eduLogs, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    if (!res.ok) throw new Error(`교육일지 저장 실패 (${res.status})`);
    return await res.json();
  },
  async updateEduLog(id, log) {
    const res = await fetch(`${ENDPOINTS.eduLogs}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `교육일지 수정 실패 (${res.status})`);
    return data;
  },
  async deleteEduLog(id) {
    const res = await fetch(`${ENDPOINTS.eduLogs}/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `교육일지 삭제 실패 (${res.status})`);
    return data;
  },
  async getMsdsLedger() {
    try {
      const res = await fetch(ENDPOINTS.msdsLedger);
      const data = await res.json();
      return data.items || [];
    } catch (e) {
      console.error('getMsdsLedger 실패:', e);
      return [];
    }
  },
  async addMsdsLedger(item) {
    const res = await fetch(ENDPOINTS.msdsLedger, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `MSDS 관리대장 저장 실패 (${res.status})`);
    return data;
  },
  async updateMsdsLedger(id, patch) {
    const res = await fetch(`${ENDPOINTS.msdsLedger}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `MSDS 관리대장 수정 실패 (${res.status})`);
    return data;
  },
  async deleteMsdsLedger(id) {
    const res = await fetch(`${ENDPOINTS.msdsLedger}/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `MSDS 관리대장 삭제 실패 (${res.status})`);
    return data;
  },
  async deleteEduAttendeesByEdu(educationId) {
    const res = await fetch(`${ENDPOINTS.eduAttendees}?educationId=${educationId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `참석자 삭제 실패 (${res.status})`);
    return data;
  },
  async getEduAttendees(eduId) {
    try {
      const url = eduId ? `${ENDPOINTS.eduAttendees}?educationId=${eduId}` : ENDPOINTS.eduAttendees;
      const res = await fetch(url);
      const data = await res.json();
      return data.attendees || [];
    } catch (e) {
      console.error('getEduAttendees 실패:', e);
      return [];
    }
  },
  async addEduAttendee(attendee) {
    const res = await fetch(ENDPOINTS.eduAttendees, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendee),
    });
    if (!res.ok) throw new Error(`참석자 저장 실패 (${res.status})`);
    return await res.json();
  },
  async getEduTypes({ includeHidden = false } = {}) {
    try {
      const url = includeHidden ? `${ENDPOINTS.eduTypes}?includeHidden=true` : ENDPOINTS.eduTypes;
      const res = await fetch(url);
      const data = await res.json();
      return data.types || [];
    } catch (e) {
      console.error('getEduTypes 실패:', e);
      return [];
    }
  },
  async addEduType(type) {
    const res = await fetch(ENDPOINTS.eduTypes, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(type),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `교육종류 추가 실패 (${res.status})`);
    return data;
  },
  async updateEduType(id, patch) {
    const res = await fetch(`${ENDPOINTS.eduTypes}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `교육종류 수정 실패 (${res.status})`);
    return data;
  },
  async deleteEduType(id) {
    const res = await fetch(`${ENDPOINTS.eduTypes}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `교육종류 삭제 실패 (${res.status})`);
    return data;
  },
  async getSites() {
    const res = await fetch(ENDPOINTS.sites);
    const data = await res.json();
    const items = data.sites || [];
    return items.map(s => ({
      ...s,
      id: s.id,
      hqId: s.hqId || s["hqId"] || null,
      사업장명: s["사업장명"] || s.name || "",
      지역: s["지역"] || s.region || "",
      고객사: s["고객사"] || s.client || "",
      담당자: s["담당자"] || s.manager || "",
      주소: s["주소"] || s.address || "",
      전화번호: s["전화번호"] || s.phone || "",
      상태: s["상태"] || s.status || "active",
      expiresAt: s.expiresAt || s["expiresAt"] || "",
      // 사업장 등록 개편 신규 필드
      구분: s.orgType || "본사",
      계열사명: s.affiliateName || "",
      사업장관리번호: s.mgmtNo || "",
      사업개시번호: s.openNo || "",
      업무내용: s.workType || "",
      계약형태: s.contractType || "",
      startAt: s.startAt || "",
    }));
  },
  async addSite(site) {
    const res = await fetch(ENDPOINTS.sites, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: site.사업장명 || site.name || "",
        region: site.지역 || site.region || "",
        client: site.고객사 || site.client || "",
        manager: site.담당자 || site.manager || "",
        phone: site.전화번호 || site.phone || "",
        status: site.상태 || site.status || "active",
        hqId: site.hqId || site["hqId"] || null,
        address: site.주소 || site.address || "",
        expiresAt: site.expiresAt || "",
        assigneeIds: site.assigneeIds,
        orgType: site.구분 || "본사",
        affiliateName: site.계열사명 || "",
        mgmtNo: site.사업장관리번호 || "",
        openNo: site.사업개시번호 || "",
        workType: site.업무내용 || "",
        contractType: site.계약형태 || "",
        startAt: site.startAt || "",
      })
    });
    return await res.json();
  },
  async deleteSite(rowId) {
    const res = await fetch(`${ENDPOINTS.sites}/${rowId}`, { method: "DELETE" });
    return await res.json();
  },
  // 사업장 일괄 등록 (엑셀/CSV 가져오기) — rows: 이미 API 필드(name, manager, hqId, orgType…)로 정규화된 배열
  async bulkImportSites(rows, skipDuplicates = true) {
    const res = await fetch(`${ENDPOINTS.sites}/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, skipDuplicates }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `일괄 등록 실패 (${res.status})`);
    return data;
  },
  // 사업장명 일괄 변경 (접미사 정리 등) — renames: [{id, name}]
  async renameSitesBulk(renames) {
    const res = await fetch(`${ENDPOINTS.sites}/rename-bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renames }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `이름 정리 실패 (${res.status})`);
    return data;
  },
  // ── HQ (본부) ──
  async getHQs() {
    const res = await fetch(ENDPOINTS.hq);
    const data = await res.json();
    return data.hq || [];
  },
  async addHQ(hq) {
    const res = await fetch(ENDPOINTS.hq, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hq),
    });
    return await res.json();
  },
  async updateHQ(id, hq) {
    const res = await fetch(`${ENDPOINTS.hq}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hq),
    });
    return await res.json();
  },
  async deleteHQ(id) {
    const res = await fetch(`${ENDPOINTS.hq}/${id}`, { method: "DELETE" });
    return await res.json();
  },
  // ── Worker Feedback (종사자 의견 청취) ──
  async getWorkerFeedback() {
    const res = await fetch(ENDPOINTS.workerFeedback);
    const data = await res.json();
    return data.feedback || [];
  },
  async submitWorkerFeedback(data) {
    const res = await fetch(ENDPOINTS.workerFeedback, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async updateWorkerFeedback(id, data) {
    const res = await fetch(`${ENDPOINTS.workerFeedback}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async deleteWorkerFeedback(id) {
    const res = await fetch(`${ENDPOINTS.workerFeedback}/${id}`, { method: "DELETE" });
    return await res.json();
  },
  // ── 파일 업로드 (multer) ──
  async uploadFile(fileObj) {
    const fd = new FormData();
    fd.append("file", fileObj);
    const res = await fetch(API_BASE + "/upload", { method: "POST", body: fd });
    return await res.json();   // { name, url, size }
  },
  // ── Compliance Submissions (이행사항 제출) ──
  async getComplianceSubmissions(period) {
    const url = period ? `${ENDPOINTS.compliance}?period=${encodeURIComponent(period)}` : ENDPOINTS.compliance;
    const res = await fetch(url);
    const data = await res.json();
    return data.submissions || [];
  },
  async submitCompliance(payload) {
    const res = await fetch(ENDPOINTS.compliance, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },
  async deleteCompliance(id) {
    const res = await fetch(`${ENDPOINTS.compliance}/${id}`, { method: "DELETE" });
    return await res.json();
  },
  async updateUser(rowId, data) {
    const res = await fetch(`${ENDPOINTS.users}/${rowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  },
  async addUser(data) {
    const res = await fetch(ENDPOINTS.users, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  },
  async deleteUser(rowId) {
    const res = await fetch(`${ENDPOINTS.users}/${rowId}`, { method: "DELETE" });
    return await res.json();
  },
  async resetUserPassword(rowId) {
    const res = await fetch(`${ENDPOINTS.users}/${rowId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  },
  // ── 회원가입 (status='pending'으로 신청 → 관리자 승인 대기) ──
  async register(data) {
    const res = await fetch(API_BASE + "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  // ── 관리자: 가입 신청 승인 ──
  async approveUser(rowId) {
    const res = await fetch(`${ENDPOINTS.users}/${rowId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  },
  // ── 관리자: 가입 신청 거부 (계정 삭제) ──
  async rejectUser(rowId) {
    const res = await fetch(`${ENDPOINTS.users}/${rowId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  },
  // ── 본인이 자기 정보 수정 (phone, dept만) ──
  async updateMyProfile(rowId, data, currentUserId) {
    const res = await fetch(`${ENDPOINTS.users}/${rowId}/self`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, currentUserId }),
    });
    return await res.json();
  },
  async updatePost(rowId, data) {
    const res = await fetch(`${ENDPOINTS.posts}/${rowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  },
  async deletePost(rowId) {
    await fetch(`${ENDPOINTS.posts}/${rowId}`, { method: "DELETE" });
  },
  async updateSite(rowId, data) {
    const res = await fetch(`${ENDPOINTS.sites}/${rowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.사업장명 || data.name || "",
        region: data.지역 || data.region || "",
        client: data.고객사 || data.client || "",
        manager: data.담당자 || data.manager || "",
        phone: data.전화번호 || data.phone || "",
        status: data.상태 || data.status || "active",
        hqId: data.hqId || data["hqId"] || null,
        address: data.주소 || data.address || "",
        expiresAt: data.expiresAt || "",
        assigneeIds: data.assigneeIds,
        orgType: data.구분 || "본사",
        affiliateName: data.계열사명 || "",
        mgmtNo: data.사업장관리번호 || "",
        openNo: data.사업개시번호 || "",
        workType: data.업무내용 || "",
        contractType: data.계약형태 || "",
        startAt: data.startAt || "",
      })
    });
    return await res.json();
  },
  async getCategories() {
    const res = await fetch(ENDPOINTS.categories);
    const data = await res.json();
    return data.categories || [];
  },
  async addCategory(cat) {
    const res = await fetch(ENDPOINTS.categories, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cat)
    });
    return await res.json();
  },
  async updateCategory(catId, data) {
    const res = await fetch(`${ENDPOINTS.categories}/${catId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  },
  async deleteCategory(catId) {
    await fetch(`${ENDPOINTS.categories}/${catId}`, { method: "DELETE" });
  },
  // 카테고리 순서 일괄 변경 — ids 배열 순서대로 sortOrder 부여
  async reorderCategories(ids) {
    const res = await fetch(`${ENDPOINTS.categories}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: ids }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `순서 변경 실패 (${res.status})`);
    return data;
  },
  // 안전보건 조직도 — { hq: {...}, site: {...} } 형태로 반환
  async getOrgCharts() {
    const res = await fetch(ENDPOINTS.orgCharts);
    if (!res.ok) return {};
    return await res.json();
  },
  async saveOrgChart(scope, data) {
    const res = await fetch(`${ENDPOINTS.orgCharts}/${scope}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) throw new Error(`저장 실패 (${res.status})`);
    return await res.json();
  },
};

window.WV_API = api;

// ─────────────────────────────────────────────────────────────────────────
// 권한 헬퍼 — 사용자가 볼 수 있는 본부/사업장 필터링 (전사 통일)
// 규칙:
//   admin / safety → 모든 본부, 모든 사업장 (전사 안전관리)
//   manager / staff → 본인이 속한 본부의 사업장만
//   site_manager / site_staff → 본인이 속한 본부의 사업장만 (추후 사업장 단위로 좁힐 수 있음)
//   본부 매칭 우선순위: user.hqId → user.dept 문자열에서 본부코드/이름 추정 (fallback)
// ─────────────────────────────────────────────────────────────────────────
window.WV_PERMS = {
  // 사용자가 접근 가능한 본부 ID 목록 (문자열 배열)
  getAccessibleHQIds(currentUser, hqs) {
    if (!currentUser || !Array.isArray(hqs)) return [];
    const r = currentUser.role;
    if (r === "admin" || r === "safety") return hqs.map(h => String(h.id));
    // 1순위: user.hqId 직접
    if (currentUser.hqId) return [String(currentUser.hqId)];
    // 2순위: dept 문자열에서 본부 추정 (fallback — 기존 사용자 호환)
    if (currentUser.dept) {
      const matched = hqs.filter(h =>
        (h.code && currentUser.dept.includes(h.code)) ||
        (h.name && currentUser.dept.includes(h.name))
      );
      if (matched.length > 0) return matched.map(h => String(h.id));
    }
    return [];   // 매칭 안 되면 빈 목록 (보안 우선)
  },
  // 본 사용자가 볼 수 있는 사업장만 필터링
  filterSitesForUser(allSites, currentUser, hqs) {
    if (!Array.isArray(allSites)) return [];
    if (!currentUser) return [];
    if (currentUser.role === "admin" || currentUser.role === "safety") return allSites;
    const ids = this.getAccessibleHQIds(currentUser, hqs);
    if (ids.length === 0) return [];
    return allSites.filter(s => ids.includes(String(s.hqId)));
  },
  // 본 사용자가 볼 수 있는 본부만 필터링 (드롭다운 등)
  filterHQsForUser(allHQs, currentUser) {
    if (!Array.isArray(allHQs)) return [];
    if (!currentUser) return [];
    if (currentUser.role === "admin" || currentUser.role === "safety") return allHQs;
    const ids = this.getAccessibleHQIds(currentUser, allHQs);
    return allHQs.filter(h => ids.includes(String(h.id)));
  },
  // 사용자가 전사(모든 본부) 접근 가능한가?
  isCrossHQ(currentUser) {
    if (!currentUser) return false;
    return currentUser.role === "admin" || currentUser.role === "safety";
  },

  // user.siteIds 문자열을 배열로 파싱 ("1,5,7" → ["1","5","7"])
  parseSiteIds(user) {
    if (!user || !user.siteIds) return [];
    return String(user.siteIds).split(",").map(s => s.trim()).filter(Boolean);
  },

  // 사용자가 접근 가능한 사업장 ID 목록 (문자열 배열)
  // - admin/safety: 모든 사업장
  // - manager/staff: 본인 본부의 모든 사업장 (siteIds 명시되어 있으면 그것만)
  // - site_manager/site_staff: siteIds에 명시된 사업장만 (없으면 본인 본부 사업장)
  getAccessibleSiteIds(currentUser, allSites, allHQs) {
    if (!currentUser || !Array.isArray(allSites)) return [];
    if (currentUser.role === "admin" || currentUser.role === "safety") {
      return allSites.map(s => String(s.id));
    }
    const explicitSiteIds = this.parseSiteIds(currentUser);
    // site_manager/site_staff는 명시된 siteIds 우선 (없으면 본부 사업장 전체 fallback)
    if (currentUser.role === "site_manager" || currentUser.role === "site_staff") {
      if (explicitSiteIds.length > 0) return explicitSiteIds;
    }
    // 본사 staff/manager: 본인 본부 사업장. siteIds 명시되어 있으면 그 안에서만
    const hqIds = this.getAccessibleHQIds(currentUser, allHQs);
    const hqSites = allSites.filter(s => hqIds.includes(String(s.hqId))).map(s => String(s.id));
    if (explicitSiteIds.length > 0) {
      // 본부 사업장 ∩ 명시된 siteIds
      return hqSites.filter(id => explicitSiteIds.includes(id));
    }
    return hqSites;
  },

  // 사업장 단위까지 좁힌 사업장 필터링 (이행 매트릭스/위험성평가 본인 담당만)
  filterSitesByAssignment(allSites, currentUser, allHQs) {
    if (!Array.isArray(allSites)) return [];
    if (!currentUser) return [];
    if (currentUser.role === "admin" || currentUser.role === "safety") return allSites;
    const ids = this.getAccessibleSiteIds(currentUser, allSites, allHQs);
    return allSites.filter(s => ids.includes(String(s.id)));
  },

  // 사용자가 다른 사용자를 등록/수정할 수 있는가?
  // → admin / safety: 누구나
  // → manager: 본인 본부 안의 누구나
  // → staff: 본인 담당 사업장의 현장대리인(site_manager)만
  // → site_manager (현장대리인): 불가 — 본사가 등록해줌
  canManageUser(currentUser, targetUser, allSites, allHQs) {
    if (!currentUser) return false;
    const r = currentUser.role;
    if (r === "admin" || r === "safety") return true;
    if (!targetUser) return false;
    if (r === "manager") {
      const myHqs = this.getAccessibleHQIds(currentUser, allHQs);
      return myHqs.includes(String(targetUser.hqId));
    }
    if (r === "staff") {
      if (targetUser.role !== "site_manager") return false;
      const mySites = this.getAccessibleSiteIds(currentUser, allSites, allHQs);
      const targetSites = this.parseSiteIds(targetUser);
      return targetSites.some(id => mySites.includes(id));
    }
    // 현장대리인(site_manager)은 본사 직원이 아니므로 계정 관리 불가
    return false;
  },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mood": "minimal",
  "primaryColor": "#1e5fcf",
  "fontSize": 14,
  "sidebarPos": "left",
  "view": "list",
  "dark": false,
  "adminName": "이화택",
  "adminDept": "대표이사실",
  "previewRole": "actual"
}/*EDITMODE-END*/;

const PRIMARY_OPTIONS = [
  "#1e5fcf",  // 신뢰 블루 (기본)
  "#0066ff",  // 더 선명한 블루
  "#1d4ed8",  // 딥 블루
  "#0e7490",  // 청록 (안전)
];

const AUTH_KEY = "wv_auth_v1";

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [auth, setAuth] = React.useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [currentUserData, setCurrentUserData] = React.useState(() => {
    try {
      const raw = localStorage.getItem("wv_user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [route, setRoute] = React.useState({ name: "dashboard" });
  // 위험성평가 데이터 계정별 서버 동기화: 로그인 시 서버→로컬 하이드레이션 후 재렌더
  const [riskSynced, setRiskSynced] = React.useState(0);
  React.useEffect(() => {
    const uid = currentUserData && currentUserData.id;
    if (uid == null) return;
    if (window.__setRiskOwner) window.__setRiskOwner(uid);
    if (window.__hydrateRiskStore) {
      window.__hydrateRiskStore(uid).then(() => setRiskSynced(s => s + 1)).catch(() => {});
    }
  }, [currentUserData && currentUserData.id]);
  const prevRouteNameRef = React.useRef(null);   // 직전 화면 추적 (위험성평가 허브 진입 판별용)
  const [composing, setComposing] = React.useState(null);
  // search state: TopBar 내부에서 query state 관리 (글로벌 state 불필요)
  // 카테고리 캐시: 직전에 DB에서 받은 목록을 localStorage에 저장해두고,
  // 다음 접속 때 하드코딩 씨앗(옛날 목록) 대신 이걸 먼저 보여줘 초기 깜빡임 제거.
  const CAT_CACHE_KEY = "wv_live_categories";
  const [liveCategories, setLiveCategories] = React.useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CAT_CACHE_KEY) || "null");
      if (Array.isArray(cached) && cached.length > 0) return cached;
    } catch (e) {}
    // 캐시가 없으면 옛날 씨앗(window.WV_DATA.categories)을 그리지 않고 빈 목록으로 시작.
    // DB 응답이 오면 그때 실제 목록을 표시 → 옛 목록이 잠깐 떴다 사라지는 깜빡임 제거.
    // (DB가 끝까지 실패하는 경우에만 아래 useEffect에서 씨앗을 안전망으로 사용)
    return [];
  });
  const [catRefreshKey, setCatRefreshKey] = React.useState(0);
  // DB에서 받은 '진짜' 목록일 때만 캐시에 저장하기 위한 플래그 (mock 안전망은 저장 금지)
  const catAuthoritativeRef = React.useRef(false);
  const [livePosts, setLivePosts] = React.useState(window.WV_DATA.posts || []);

  // 구글 시트에서 posts 불러오기
  React.useEffect(() => {
    window.WV_API.getPosts().then(data => {
      if (data && data.length > 0) {
        const mapped = data.map(p => ({
          ...p,
          id: String(p.id || p.rowNumber),
          dueAt: p.dueAt || p.dueat || "",
          mustRead: p.mustRead === "true" || p.mustread === "true" || false,
          hasSubmission: p.hasSubmission === "true" || p.hassubmission === "true" || false,
          submissionTarget: Number(p.submissionTarget || p.submissiontarget || 0),
          pinned: p.pinned === "true" || false,
          priority: p.priority || "normal",
          content: p.content || p.body || "",
          attachments: p.attachments || "",
        }));
        window.WV_DATA.posts = mapped;
        setLivePosts(mapped);
      }
    }).catch(() => {});
  }, []);

  // livePosts가 바뀔 때마다 카테고리별 count 계산
  React.useEffect(() => {
    // ⚠️ posts가 아직 안 온 초기 상태(빈 배열)에서 개수를 0으로 덮으면
    //   캐시에 담아둔 개수가 지워져 다시 깜빡임. → 게시글이 실제로 로드된 뒤에만 개수 갱신.
    if (!livePosts || livePosts.length === 0) return;
    const countMap = {};
    livePosts.forEach(p => {
      if (p.categoryId) countMap[p.categoryId] = (countMap[p.categoryId] || 0) + 1;
    });
    setLiveCategories(cats => cats.map(c => ({ ...c, count: countMap[c.id] || 0 })));
  }, [livePosts]);

  // liveCategories가 확정될 때마다(개수 포함) 캐시에 저장 → 다음 접속 첫 화면이 지난번과 '완전히 동일'.
  //   개수까지 캐시에 담겨 서버 병합 때 0으로 리셋되지 않으므로 깜빡임이 사라짐.
  //   단, DB에서 온 진짜 목록일 때만 저장(mock 안전망은 저장 안 함).
  React.useEffect(() => {
    if (!catAuthoritativeRef.current) return;
    try {
      if (Array.isArray(liveCategories) && liveCategories.length > 0) {
        localStorage.setItem(CAT_CACHE_KEY, JSON.stringify(liveCategories));
      }
    } catch (e) {}
  }, [liveCategories]);

  const view = t.view;

  // 백엔드(DB)에서 카테고리 불러오기 — DB가 진실의 원천
  // mock 카테고리 정보는 누락된 필드(icon 등)만 보충용으로 사용
  React.useEffect(() => {
    let cancelled = false;
    // ⚠️ 백엔드(Railway) 콜드스타트/일시 네트워크 오류로 fetch가 실패하면
    //   초기 seed(window.WV_DATA.categories)에 남게 되는데, seed엔 DB에만 있는
    //   카테고리(예: 종사자 의견 청취)가 빠져 있어 그 항목만 사라져 보임.
    //   → 실패/빈응답 시 몇 차례 재시도해 DB 목록을 확실히 받아온다.
    const load = (attempt = 0) => {
      window.WV_API.getCategories().then(data => {
        if (cancelled) return;
        if (data && data.length > 0) {
          // 백엔드에 있는 카테고리만 표시 (삭제된 것은 사라짐)
          const mockMap = Object.fromEntries(
            (window.WV_DATA.categories || []).map(c => [c.id, c])
          );
          // ⚠️ 병합 시 count를 0으로 리셋하면 "캐시(개수 있음) → 0 → 다시 개수" 로 깜빡임.
          //   직전 목록(캐시 포함)의 개수를 그대로 유지해 리셋 깜빡임 제거.
          setLiveCategories(prev => {
            const prevCount = Object.fromEntries((prev || []).map(c => [c.id, c.count || 0]));
            return data.map(c => {
              const mock = mockMap[c.id] || {};
              return {
                id: c.id,
                name: c.name || mock.name || "",
                desc: c.desc || mock.desc || "",
                type: c.type || mock.type || "board",
                icon: c.icon || mock.icon || "doc",
                approval: c.approval ?? mock.approval ?? false,
                url: c.url || "",
                rowNumber: c.rowNumber,
                count: prevCount[c.id] || 0,
              };
            });
          });
          // 이 목록은 DB에서 온 '진짜' 목록 → 캐시 저장 허용 (아래 effect가 개수까지 포함해 저장)
          catAuthoritativeRef.current = true;
        } else if (attempt < 8) {
          // 콜드스타트(수십 초)까지 견디도록 더 오래 재시도 (지수 백오프, 최대 3초 간격)
          setTimeout(() => load(attempt + 1), Math.min(800 * (attempt + 1), 3000));
        } else {
          // 끝까지 빈응답 — 캐시/현재 목록이 있으면 그대로 유지(옛 mock 씨앗으로 덮으면
          //   '과거 카테고리'가 되살아남). 목록이 아예 없을 때만 mock 안전망 사용.
          catAuthoritativeRef.current = false;
          setLiveCategories(prev => (Array.isArray(prev) && prev.length > 0) ? prev : (window.WV_DATA.categories || []));
        }
      }).catch(() => {
        // 오류 시 재시도 (콜드스타트 대비). 최종 실패해도 캐시/현재 목록은 건드리지 않음.
        if (!cancelled && attempt < 8) setTimeout(() => load(attempt + 1), Math.min(800 * (attempt + 1), 3000));
      });
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Override admin user identity from tweaks (for the demo admin's name field)
  React.useEffect(() => {
    const admin = window.WV_DATA.users.find(u => u.role === "admin");
    if (admin) {
      admin.name = t.adminName || admin.name;
      admin.dept = t.adminDept || admin.dept;
    }
  }, [t.adminName, t.adminDept]);

  // Apply primaryColor to CSS variable
  React.useEffect(() => {
    document.documentElement.style.setProperty("--primary", t.primaryColor);
    document.documentElement.style.setProperty("--primary-soft", t.primaryColor + "1a");
    document.documentElement.style.setProperty("--primary-soft-2", t.primaryColor + "2e");
  }, [t.primaryColor]);

  // 인쇄(PDF 저장) 시 파일명이 되는 document.title을 현재 화면에 맞춰 자동 설정.
  //   (기본 브라우저 탭 제목 '윌앤비전 통합 안전보건 플랫폼'이 모든 PDF에 붙던 문제 해결)
  //   위험성평가는 종류(최초/정기/수시)·사업장·시기를 붙임. MSDS 서식생성은 자체 팝업 창에서
  //   제품명으로 저장하므로 여기서 제외, 위험성평가 전체출력도 자체 파일명 사용.
  React.useEffect(() => {
    const RISK_TYPE_KO = { initial: "최초", regular: "정기", occasional: "수시" };
    const sanitize = (s) => String(s || "").replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
    const titleForRoute = (r) => {
      const n = r && r.name;
      if (!n || n === "risk-print-all") return null;
      if (n.indexOf("risk-") === 0) {
        let c = null; try { c = JSON.parse(localStorage.getItem("wv_risk_evalContext") || "null"); } catch (e) {}
        const type = c && RISK_TYPE_KO[c.type] ? RISK_TYPE_KO[c.type] : "";
        const site = c ? sanitize(c["사업장명"] || c.company) : "";
        const when = c ? (c.type === "occasional" ? sanitize(c.date) : (c.year ? c.year + "년" : "")) : "";
        return ["위험성평가", type, site, when].filter(Boolean).join("_") || "위험성평가";
      }
      const MAP = {
        "msds-ledger": "MSDS관리대장",
        "msds-hazard-list": "작업환경측정_특수건강진단_유해인자목록표",
        "education-log": "교육일지", "education-log-list": "교육일지", "education-log-new": "교육일지",
        "education-attendee-sheet": "교육_참석자명단", "education-photo-board": "교육_사진대지",
        "field-inspection": "현장점검보고서",
        "tool-worker-survey": "근무환경조사표",
        "tool-safety-signs": "안전보건표지",
        "tool-org-chart": "안전보건관리조직도",
        "legal-checker": "법규진단결과",
      };
      return MAP[n] || null;
    };
    let saved = null;
    const onBefore = () => { const tt = titleForRoute(route); if (tt) { saved = document.title; document.title = tt; } };
    const onAfter = () => { if (saved != null) { document.title = saved; saved = null; } };
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => { window.removeEventListener("beforeprint", onBefore); window.removeEventListener("afterprint", onAfter); };
  }, [route]);

  const refreshPosts = () => {
    window.WV_API.getPosts().then(data => {
      if (data) {
        const mapped = (data.length > 0 ? data : []).map(p => ({
          ...p,
          id: String(p.id || p.rowNumber),
          dueAt: p.dueAt || p.dueat || "",
          mustRead: p.mustRead === "true" || p.mustread === "true" || false,
          hasSubmission: p.hasSubmission === "true" || p.hassubmission === "true" || false,
          submissionTarget: Number(p.submissionTarget || p.submissiontarget || 0),
          pinned: p.pinned === "true" || false,
          priority: p.priority || "normal",
          content: p.content || p.body || "",
          attachments: p.attachments || "",
        }));
        window.WV_DATA.posts = mapped;
        setLivePosts(mapped);
      }
    }).catch(() => {});
  };

  const submitCompose = (savedCatId) => {
    setComposing(null);
    setCatRefreshKey(k => k + 1);
    refreshPosts();
    if (savedCatId) onNav({ name: "category", id: savedCatId });
  };

  const login = (user) => {
    const payload = { userId: user.id, at: Date.now() };
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
    localStorage.setItem("wv_user", JSON.stringify(user));
    setCurrentUserData(user);
    setAuth(payload);
    setRoute({ name: "dashboard" });
  };
  const logout = () => {
    fetch("/api/logout", { method: "POST" }).catch(() => {}); // 세션 쿠키 제거
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem("wv_user");
    setCurrentUserData(null);
    setAuth(null);
  };

  window.__setView = (v) => setTweak("view", v);
  const onNav = (r) => { prevRouteNameRef.current = route.name; setRoute(r); window.scrollTo({ top: 0 }); };
  const onCompose = (categoryId) => setComposing({ categoryId: categoryId || (route.id) });
  const closeCompose = () => setComposing(null);

  // ── Not logged in: show login screen ──
  if (!auth) {
    return (
      <div className="app-shell-login" data-mood={t.mood} data-dark={t.dark}>
        <LoginScreen onLogin={login} />
        <TweaksPanel>
          <TweakSection label="무드 / 톤" />
          <TweakRadio label="전체 무드" value={t.mood}
            options={[
              { value: "minimal", label: "미니멀" },
              { value: "warm", label: "따뜻" },
              { value: "technical", label: "테크" },
            ]}
            onChange={(v) => setTweak("mood", v)} />
          <TweakToggle label="다크모드" value={t.dark} onChange={(v) => setTweak("dark", v)} />
          <TweakSection label="컬러" />
          <TweakColor label="메인 컬러" value={t.primaryColor}
            options={PRIMARY_OPTIONS}
            onChange={(v) => setTweak("primaryColor", v)} />
        </TweaksPanel>
      </div>
    );
  }

  // ── Logged in ──
  const currentUser = currentUserData || window.WV_DATA.users.find(u => u.id === auth.userId);
  if (!currentUser) {
    // stale session
    logout();
    return null;
  }

  // Preview role override (Tweaks panel only — for design review)
  const actualRole = currentUser.role;
  const effectiveRole = t.previewRole === "actual" ? actualRole : t.previewRole;
  const role = effectiveRole;
  const previewing = effectiveRole !== actualRole;

  // The user object whose name appears in chrome — actual or simulated
  const displayUser = previewing
    ? (window.WV_DATA.users.find(u => u.role === effectiveRole) || currentUser)
    : currentUser;

  return (
    <div className="app" data-mood={t.mood} data-dark={t.dark} data-sidebar={t.sidebarPos}
         style={{ "--fs": `${t.fontSize}px` }}>
      <Sidebar route={route} onNav={onNav} role={role} currentUser={displayUser} onLogout={logout} categories={liveCategories} />
      <main className="main">
        {previewing && (
          <div className="preview-banner">
            <Icon name="eye" size={12} />
            디자인 미리보기 모드 — 실제 로그인은 <b>{D.roles.find(r => r.id === actualRole)?.name}</b>이지만 <b>{D.roles.find(r => r.id === effectiveRole)?.name}</b> 화면을 미리보고 있습니다.
            <button onClick={() => setTweak("previewRole", "actual")}>실제 권한으로 복귀</button>
          </div>
        )}
        <TopBar role={role} currentUser={displayUser}
          searchableItems={(() => {
            const items = [];
            // 1. 정적 페이지 (사이드바 메뉴)
            const _canApprove = !!(window.WV_DATA?.can?.[role]?.approve);
            const STATIC_PAGES = [
              { label: "대시보드", route: { name: "dashboard" } },
              { label: _canApprove ? "이행사항 제출 현황" : "이행사항 제출", route: { name: "submissions" } },
              { label: "위험성평가", route: { name: "risk-assessment" } },
              { label: "안전보건교육 - 교육일지 작성", route: { name: "education-log-new" } },
              { label: "안전보건교육 - 교육일지 조회", route: { name: "education-log-list" } },
              { label: "교육 참석자 명단", route: { name: "education-attendee-sheet" } },
              { label: "교육 사진대지", route: { name: "education-photo-board" } },
              { label: "결재함", route: { name: "approval-inbox" } },
              { label: "결재 작성/기안", route: { name: "approval-compose" } },
              { label: "MSDS 서식 생성", route: { name: "msds-generate" } },
              { label: "카테고리 관리", route: { name: "manage-categories" } },
              { label: "사용자 관리", route: { name: "manage-users" } },
              { label: "사업장 관리", route: { name: "manage-sites" } },
              { label: "역할 관리", route: { name: "manage-roles" } },
              { label: "회원가입 승인 관리", route: { name: "manage-approvals" } },
            ];
            STATIC_PAGES.forEach(p => items.push({ type: "page", label: p.label, sublabel: "메뉴 페이지", route: p.route }));

            // 2. 카테고리
            (liveCategories || []).forEach(c => items.push({
              type: "category", label: c.name, sublabel: `카테고리${c.approval ? " · 결재 카테고리" : ""}`,
              route: { name: "category", id: c.id },
            }));

            // 3. 게시글
            (livePosts || []).forEach(p => {
              const cat = (liveCategories || []).find(c => c.id === p.categoryId);
              items.push({
                type: "post", label: p.title || "(제목 없음)",
                sublabel: `게시글${cat ? " · " + cat.name : ""}${p.author ? " · " + p.author : ""}`,
                route: { name: "post", id: p.id },
              });
            });

            // 4. 위험성평가 (localStorage)
            try {
              const evalList = JSON.parse(localStorage.getItem("wv_risk_evalList") || "[]");
              evalList.forEach(ev => {
                items.push({
                  type: "risk-eval",
                  label: ev.사업장명 || ev.evalId,
                  sublabel: `위험성평가${ev.company ? " · " + ev.company : ""}${ev.year ? " · " + ev.year : ""}${ev.type ? " · " + ev.type : ""}`,
                  onClick: () => {
                    // evalContext 설정 후 단계 안내로 이동
                    try { localStorage.setItem("wv_risk_evalContext", JSON.stringify(ev)); } catch(e) {}
                    onNav({ name: "risk-overview" });
                  },
                });
              });
            } catch (e) {}

            return items;
          })()}
          onNav={onNav}
          onCompose={() => onCompose(route.id || null)}
          onLogout={logout}
          onUpdateProfile={(updated) => setCurrentUserData(updated)} />
        {composing ? (
          <Compose catId={composing.categoryId} onCancel={closeCompose} onSubmit={submitCompose} role={role} />
        ) : route.name === "dashboard" ? (
          <Dashboard role={role} onNav={onNav} currentUser={currentUser} />
        ) : route.name === "category" ? (
          <CategoryView key={`cat-${route.id}-${catRefreshKey}`} catId={route.id} view={view} onNav={onNav} onCompose={onCompose} role={role} currentUser={currentUser} categories={liveCategories} />
        ) : route.name === "post" ? (
          <PostDetail postId={route.id} onNav={onNav} role={role} />
        ) : route.name === "post-edit" ? (
          <Compose
            catId={route.data?.categoryId}
            editPost={route.data}
            onCancel={() => onNav({ name: "post", id: route.id })}
            onSubmit={(catId) => { setCatRefreshKey(k => k + 1); onNav({ name: "category", id: catId }); }}
            role={role}
          />
        ) : route.name === "submissions" ? (
          <SubmissionsView onNav={onNav} role={role} currentUser={currentUser} />
        ) : route.name === "manage-categories" ? (
          <ManageCategoriesView onNav={onNav} onCategoryUpdate={(cats) => {
            setLiveCategories(cats);
            // 캐시도 갱신 → 새로고침 시 옛 카테고리(옛 유형)가 잠깐 뜨는 것 방지
            try { localStorage.setItem(CAT_CACHE_KEY, JSON.stringify(cats)); } catch (e) {}
          }} />
        ) : route.name === "manage-users" ? (
          <ManageUsersView currentUser={currentUser} />
        ) : route.name === "manage-approvals" ? (
          <SignupApprovalView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "manage-roles" ? (
          <ManageRolesView />
        ) : route.name === "manage-sites" ? (
          <ManageSitesView onNav={onNav} currentUser={currentUser} role={role}
            onUserRefresh={async () => {
              // 팀 계정이 사업장 추가로 siteIds가 바뀌었을 때, 현재 로그인 사용자를 서버 기준으로 갱신
              try {
                const res = await fetch("/api/users");
                const data = await res.json();
                const fresh = (data.users || []).find(u => String(u.id) === String(currentUser.id));
                if (fresh) { setCurrentUserData(fresh); localStorage.setItem("wv_user", JSON.stringify(fresh)); }
              } catch (e) {}
            }} />
        ) : route.name === "education-log" ? (
          <EducationLogView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "education-log-new" ? (
          <EducationLogForm onNav={onNav} currentUser={currentUser} editData={route.data} />
        ) : route.name === "education-log-list" ? (
          <EducationLogList onNav={onNav} currentUser={currentUser} role={role} />
        ) : route.name === "education-attendee-sheet" ? (
          <EducationAttendeeSheet onNav={onNav} currentUser={currentUser} />
        ) : route.name === "education-photo-board" ? (
          <EducationPhotoBoard onNav={onNav} currentUser={currentUser} />
        ) : route.name === "approval-inbox" ? (
          <ApprovalInbox onNav={onNav} currentUser={currentUser} categories={liveCategories} />
        ) : route.name === "approval-compose" ? (
          <ApprovalCompose onNav={onNav} currentUser={currentUser} categories={liveCategories} />
        ) : route.name === "approval-detail" ? (
          <ApprovalDetail onNav={onNav} docId={route.id} currentUser={currentUser} />
        ) : route.name === "msds-generate" ? (
          <MsdsGeneratorView onNav={onNav} currentUser={currentUser} role={role} />
        ) : route.name === "msds-ledger" ? (
          <MsdsLedgerView onNav={onNav} currentUser={currentUser} role={role} />
        ) : route.name === "msds-hazard-list" ? (
          <MsdsHazardListView onNav={onNav} currentUser={currentUser} role={role} />
        ) : route.name === "tool-safety-signs" ? (
          <SafetySignsView onNav={onNav} />
        ) : route.name === "tool-org-chart" ? (
          <OrgChartView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "field-inspection" ? (
          <FieldInspectionView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "tool-worker-survey" ? (
          <WorkerSurveyView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "legal-checker" ? (
          <LegalCheckerView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "risk-assessment" ? (
          <RiskAssessmentView onNav={onNav} currentUser={currentUser}
            fromRiskFlow={(() => { const p = prevRouteNameRef.current || ""; return p.startsWith("risk-") && p !== "risk-assessment"; })()} />
        ) : route.name === "risk-overview" ? (
          <RiskOverviewView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "risk-cover" ? (
          <RiskCoverView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "risk-site" ? (
          <RiskSiteView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "risk-criteria" ? (
          <RiskCriteriaView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "risk-meeting" ? (
          <RiskMeetingView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "risk-training" ? (
          <RiskTrainingView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "risk-attendees" ? (
          <RiskAttendeesView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "risk-meeting-photos" ? (
          <RiskMeetingPhotosView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "risk-print-all" ? (
          <RiskPrintAllView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "risk-hazard-types" ? (
          <RiskHazardTypesView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "risk-table" ? (
          <RiskTableView onNav={onNav} currentUser={currentUser} />
        ) : route.name === "risk-photos" ? (
          <RiskPhotosView onNav={onNav} currentUser={currentUser} />
        ) : (
          <div className="content"><h1>준비 중</h1></div>
        )}
      </main>

      <TweaksPanel>
        <TweakSection label="무드 / 톤" />
        <TweakRadio
          label="전체 무드"
          value={t.mood}
          options={[
            { value: "minimal", label: "미니멀" },
            { value: "warm", label: "따뜻" },
            { value: "technical", label: "테크" },
          ]}
          onChange={(v) => setTweak("mood", v)}
        />
        <TweakToggle label="다크모드" value={t.dark} onChange={(v) => setTweak("dark", v)} />

        <TweakSection label="컬러 & 타입" />
        <TweakColor label="메인 컬러" value={t.primaryColor}
          options={PRIMARY_OPTIONS}
          onChange={(v) => setTweak("primaryColor", v)} />
        <TweakSlider label="글자 크기" value={t.fontSize} min={12} max={18} unit="px"
          onChange={(v) => setTweak("fontSize", v)} />

        <TweakSection label="레이아웃" />
        <TweakRadio label="사이드바" value={t.sidebarPos}
          options={[
            { value: "left",  label: "좌측" },
            { value: "right", label: "우측" },
            { value: "none",  label: "없음" },
          ]}
          onChange={(v) => setTweak("sidebarPos", v)} />
        <TweakRadio label="목록 보기" value={t.view}
          options={[
            { value: "list", label: "리스트" },
            { value: "card", label: "카드" },
          ]}
          onChange={(v) => setTweak("view", v)} />

        <TweakSection label="디자인 검토용 미리보기" />
        <TweakSelect
          label="권한 화면 미리보기"
          value={t.previewRole}
          options={[
            { value: "actual", label: `실제 권한 (${D.roles.find(r => r.id === actualRole)?.name})` },
            ...D.roles.map(r => ({ value: r.id, label: r.name + " 시점 미리보기" })),
          ]}
          onChange={(v) => setTweak("previewRole", v)}
        />

        <TweakSection label="관리자 계정" />
        <TweakText label="관리자 이름" value={t.adminName} onChange={(v) => setTweak("adminName", v)} />
        <TweakText label="관리자 부서" value={t.adminDept} onChange={(v) => setTweak("adminDept", v)} />

        <TweakSection label="세션" />
        <TweakButton label="로그아웃" onClick={logout} />
      </TweaksPanel>
    </div>
  );
}

const D = window.WV_DATA;

// ── 인쇄 모드 (백엔드 puppeteer가 ?print=<step>&token=<token>으로 호출) ──
// 토큰으로 백엔드에서 데이터 받아와 localStorage에 주입 → STEP 컴포넌트가 평소처럼 렌더
function PrintApp({ step, token, area }) {
  const [state, setState] = React.useState({
    loading: !!token,
    error: null,
    ready: !token,
  });

  React.useEffect(() => {
    if (!token) return;
    fetch(`/api/risk/print-data/${token}`)
      .then(r => {
        if (!r.ok) throw new Error(`데이터 로드 실패 (HTTP ${r.status})`);
        return r.json();
      })
      .then(data => {
        const evalId = data.ctx && data.ctx.evalId;
        if (!evalId) throw new Error('evalId 누락');
        try {
          // STEP 데이터 localStorage 주입 (각 컴포넌트가 평소 경로로 읽음)
          // ⚠️ 키 이름 주의: getEvalContext()가 읽는 RISK_EVAL_CTX_KEY = "wv_risk_evalContext"
          localStorage.setItem('wv_risk_evalContext', JSON.stringify(data.ctx));
          if (data.ctx.company) localStorage.setItem('wv_risk_company', data.ctx.company);
          if (data.coverData)    localStorage.setItem(`wv_risk_cover_${evalId}`,    JSON.stringify(data.coverData));
          if (data.siteData)     localStorage.setItem(`wv_risk_site_${evalId}`,     JSON.stringify(data.siteData));
          if (data.meetingData)  localStorage.setItem(`wv_risk_meeting_${evalId}`,  JSON.stringify(data.meetingData));
          if (data.trainingData) localStorage.setItem(`wv_risk_training_${evalId}`, JSON.stringify(data.trainingData));
          if (data.photosData)   localStorage.setItem(`wv_risk_photos_${evalId}`,   JSON.stringify(data.photosData));
          (data.tableSheets || []).forEach(t => {
            localStorage.setItem(`wv_risk_table_${evalId}_${t.area}`, JSON.stringify(t.data));
          });
        } catch (e) { console.error('localStorage 주입 실패:', e); }
        setState({ loading: false, error: null, ready: true });
      })
      .catch(e => setState({ loading: false, error: e.message, ready: false }));
  }, []);

  if (state.error) return <div style={{padding:40, fontSize:14, color:'#b91c1c'}}>PDF 데이터 로드 오류: {state.error}</div>;
  if (state.loading) return <div style={{padding:40, fontSize:14, color:'#666'}}>인쇄 데이터 로드 중...</div>;
  if (!state.ready) return null;

  const dummyNav = () => {};
  const dummyUser = { name: '인쇄', role: 'admin' };
  const Comp = {
    cover:    window.RiskCoverView,
    site:     window.RiskSiteView,
    meeting:  window.RiskMeetingView,
    table:    window.RiskTableView,
    photos:   window.RiskPhotosView,
    training: window.RiskTrainingView,
  }[step];

  if (!Comp) return <div style={{padding:40}}>알 수 없는 STEP: {step}</div>;

  return (
    <div className="print-app-mode">
      <style>{`
        body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        .sidebar, aside, nav[role="navigation"], .top-bar, .preview-banner { display: none !important; }
        .no-print { display: none !important; }
        .app, .app-main, .layout, .layout-main, main { display: block !important; grid-template-columns: 1fr !important; padding: 0 !important; margin: 0 !important; max-width: none !important; }
        .content { padding: 0 !important; max-width: none !important; }
        /* ⭐ 표지 외 STEP의 인라인 minHeight: 1100 무효화 — A4 사용영역(~1009px)보다 커서
           1px만 넘어가도 빈 페이지 추가됨. 자연 흐름으로 풀어 빈 페이지 제거 */
        body .print-app-mode .risk-print-area:not(.cover-page),
        body .print-app-mode .train-print-area,
        body .print-app-mode .photos-print-area {
          min-height: 0 !important;
        }

        /* ⭐ 표지(cover-page) — RISK_STYLE의 .risk-print-area.cover-page (specificity 0,2,0 + !important)을
           이기려면 body 추가해서 (0,3,1) 로 specificity 올림. !important + 더 높은 specificity → 확실히 이김 */
        body .print-app-mode .risk-print-area.cover-page {
          position: relative !important;
          top: auto !important; left: auto !important; right: auto !important; bottom: auto !important;
          width: 180mm !important;
          height: 267mm !important;
          max-height: 267mm !important;
          min-height: 267mm !important;
          margin: 0 auto !important;
          padding: 15mm 18mm !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
        }
        /* @media print 안에서도 한 번 더 보강 (puppeteer는 print mode로 렌더링) */
        @media print {
          body .print-app-mode .risk-print-area.cover-page {
            position: relative !important;
            top: auto !important; left: auto !important; right: auto !important; bottom: auto !important;
            width: 180mm !important;
            height: 267mm !important;
            max-height: 267mm !important;
            min-height: 267mm !important;
            margin: 0 auto !important;
            padding: 15mm 18mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }
        }
      `}</style>
      <Comp onNav={dummyNav} currentUser={dummyUser} />
    </div>
  );
}

const _printParams = (() => {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const step = p.get("print");
  if (!step) return null;
  return { step, token: p.get("token"), area: p.get("area") };
})();

const root = ReactDOM.createRoot(document.getElementById("root"));
if (_printParams) {
  root.render(<PrintApp step={_printParams.step} token={_printParams.token} area={_printParams.area} />);
} else {
  root.render(<App />);
}
