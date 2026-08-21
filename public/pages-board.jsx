// 윌앤비전 - Category list / Post detail / Compose page

// ─── Category view (list of posts in a category)
const CategoryView = ({ catId, view, onNav, onCompose, role, currentUser, categories }) => {
  const D = window.WV_DATA;
  // 백엔드에서 가져온 categories 우선, 없으면 D.categories fallback
  const allCategories = (categories && categories.length > 0) ? categories : D.categories;
  const cat = allCategories.find(c => c.id === catId);
  if (!cat) return <div className="content"><h1>카테고리를 찾을 수 없습니다.</h1></div>;
  const can = D.can[role] || D.can["staff"];

  // 🎯 종사자 의견 청취 카테고리는 일반 게시판 대신 전용 폼/관리 화면으로 분기
  // id 또는 name 둘 다 허용 (안전망)
  if (cat.id === "worker-feedback" || cat.name === "종사자 의견 청취") {
    // admin/safety는 관리 화면, 그 외는 작성 폼
    if (can.approve) {
      return <WorkerFeedbackList onNav={onNav} role={role} />;
    }
    return <WorkerFeedbackForm onNav={onNav} currentUser={currentUser} />;
  }

  // 🎯 자료실(library) 타입: 안전보건표지·포스터 → 썸네일 카드 그리드
  if (cat.type === "library") {
    return <LibraryView cat={cat} onNav={onNav} role={role} currentUser={currentUser} />;
  }
  const [filter, setFilter] = React.useState("all");
  const [sort, setSort] = React.useState("recent");
  const [allPosts, setAllPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // 이 카테고리 게시글만 스코프로 로드 (예전엔 모든 카테고리 게시글+base64 썸네일을 통째로 불러와 느렸음)
    window.WV_API.getPosts(catId).then(data => {
      setAllPosts(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [catId]);

  let posts = allPosts.filter(p => p.categoryId === catId && p.status !== "deleted");
  if (filter === "pinned") posts = posts.filter(p => p.pinned);
  if (filter === "mustread") posts = posts.filter(p => p.mustRead);
  if (filter === "due") posts = posts.filter(p => p.dueAt);
  if (sort === "recent") posts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sort === "due")    posts = [...posts].sort((a, b) => (new Date(a.dueAt || "2099-01-01")) - (new Date(b.dueAt || "2099-01-01")));
  if (sort === "views")  posts = [...posts].sort((a, b) => (b.views||0) - (a.views||0));
  posts = [...posts.filter(p => p.pinned), ...posts.filter(p => !p.pinned)];

  if (loading) return (
    <div className="content" style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300 }}>
      <span className="login-spinner" style={{ width:32, height:32 }} /> &nbsp; 게시글 불러오는 중...
    </div>
  );

  return (
    <div className="content">
      <div className="bcr" onClick={() => onNav({ name: "dashboard" })}>
        <Icon name="arrow-left" size={14} /> 대시보드
      </div>

      <div className="content-hd">
        <div>
          <h1 className="content-title">{cat.name}</h1>
          <div className="content-sub">{cat.desc}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <span className="meta">자료 {posts.length}건</span>
          </div>
        </div>
        {can.upload && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={() => onCompose(cat.id)}>
              <Icon name="plus" size={14} /> 새 게시글
            </button>
          </div>
        )}
      </div>

      {/* filters */}
      <div className="cat-filters">
        <div className="filter-group">
          {[
            { id: "all", label: "전체" },
            { id: "pinned", label: "공지/고정" },
            { id: "mustread", label: "필독" },
            { id: "due", label: "마감 있는 자료" },
          ].map(f => (
            <button key={f.id} className={"filter-btn" + (filter === f.id ? " active" : "")} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <select className="field-select" style={{ width: "auto", height: 32, padding: "0 12px" }} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">최신순</option>
          <option value="due">마감일순</option>
          <option value="views">조회순</option>
        </select>
        <div className="view-toggle">
          <button className={view === "list" ? "active" : ""} title="리스트" onClick={() => window.__setView?.("list")}><Icon name="list" size={14} /></button>
          <button className={view === "card" ? "active" : ""} title="카드"  onClick={() => window.__setView?.("card")}><Icon name="grid" size={14} /></button>
        </div>
      </div>

      {/* List or grid */}
      {view === "card" ? (
        <div className="post-grid">
          {posts.map(p => <PostCard key={p.id} post={p} onClick={() => onNav({ name: "post", id: p.id })} />)}
        </div>
      ) : (
        <div className="card post-list">
          <div className="post-list-hd">
            <div style={{ width: 32 }}></div>
            <div>제목</div>
            <div>작성자</div>
            <div>날짜</div>
            <div>마감</div>
            <div>제출/조회</div>
            <div style={{ width: 18 }}></div>
          </div>
          {posts.length === 0 && (
            <div style={{padding: 60, textAlign: "center", color: "var(--fg-3)"}}>해당 조건의 게시글이 없습니다.</div>
          )}
          {posts.map(p => (
            <PostRow key={p.id} post={p} onClick={() => onNav({ name: "post", id: p.id })} today={D.today} />
          ))}
        </div>
      )}

      <style>{`
        .bcr {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--fg-3); font-size: 13px; margin-bottom: 18px;
          cursor: pointer; padding: 4px 0;
        }
        .bcr:hover { color: var(--fg); }

        .cat-filters {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0;
          border-bottom: 1px solid var(--line);
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .filter-group { display: flex; gap: 4px; }
        .filter-btn {
          padding: 6px 12px; height: 30px;
          border-radius: var(--r-md);
          background: transparent; color: var(--fg-3);
          border: 1px solid transparent;
          font-size: 12.5px; font-weight: 500;
        }
        .filter-btn:hover { background: var(--bg-sunk); color: var(--fg-2); }
        .filter-btn.active { background: var(--fg); color: var(--bg-elev); }
        [data-mood="warm"] .filter-btn.active { background: var(--primary); color: var(--primary-fg); }

        .view-toggle {
          display: flex; padding: 2px;
          background: var(--bg-sunk); border-radius: var(--r-md);
        }
        .view-toggle button {
          width: 28px; height: 28px; padding: 0;
          background: transparent; border: 0;
          color: var(--fg-3);
          border-radius: calc(var(--r-md) - 2px);
          display: grid; place-items: center;
        }
        .view-toggle button.active { background: var(--bg-elev); color: var(--fg); box-shadow: var(--shadow); }

        .post-list { padding: 0; overflow: hidden; }
        .post-list-hd, .post-row {
          display: grid;
          grid-template-columns: 32px 1fr 110px 90px 90px 130px 18px;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          font-size: 13px;
        }
        @media (max-width: 900px) {
          .post-list-hd, .post-row { grid-template-columns: 32px 1fr 90px 70px 18px; }
          .col-due, .col-stats { display: none; }
        }
        .post-list-hd {
          color: var(--fg-4); font-size: 11.5px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.04em;
          border-bottom: 1px solid var(--line);
          background: var(--bg-sunk);
        }
        [data-mood="technical"] .post-list-hd { font-family: var(--font-mono); }
        .post-row {
          cursor: pointer;
          border-bottom: 1px solid var(--line-2);
        }
        .post-row:last-child { border-bottom: 0; }
        .post-row:hover { background: var(--bg-sunk); }
        .post-row[data-pinned="true"] { background: color-mix(in oklab, var(--primary) 3%, var(--bg-elev)); }
        .post-row[data-pinned="true"]:hover { background: color-mix(in oklab, var(--primary) 6%, var(--bg-sunk)); }

        .post-title-line {
          display: flex; align-items: center; gap: 8px;
          font-weight: 500;
        }
        .post-title-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pin-ico { color: var(--primary); flex-shrink: 0; }
        .pin-ico-empty { width: 16px; height: 16px; }

        .post-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .post-card {
          background: var(--bg-elev); border: 1px solid var(--line);
          border-radius: var(--r-lg); padding: 18px 20px;
          cursor: pointer;
          display: flex; flex-direction: column; gap: 10px;
          min-height: 180px;
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .post-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
        .post-card-title { font-weight: 600; font-size: 15px; line-height: 1.4; flex: 1; }
        [data-mood="warm"] .post-card-title { font-weight: 500; }
        .post-card-foot { display: flex; justify-content: space-between; color: var(--fg-3); font-size: 12px; }
      `}</style>
    </div>
  );
};

// 첨부파일 개수 — 백엔드는 attachments를 JSON 문자열로 저장하므로 파싱 필요.
// 배열이면 그대로 length, 문자열이면 JSON.parse 시도, 실패 시 0.
function countAttachments(att) {
  if (Array.isArray(att)) return att.length;
  if (typeof att === "string" && att.trim()) {
    try {
      const parsed = JSON.parse(att);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch { return 0; }
  }
  return 0;
}

const PostRow = ({ post, onClick, today }) => {
  const days = post.dueAt ? Math.round((new Date(post.dueAt) - today) / 86400000) : null;
  const urgent = days !== null && days <= 3 && days >= 0;
  return (
    <div className="post-row" data-pinned={post.pinned} onClick={onClick}>
      <div>{post.pinned ? <Icon name="pin" size={14} className="pin-ico" /> : <span className="pin-ico-empty" />}</div>
      <div className="post-title-line">
        <span className="post-title-text">{post.title}</span>
        {post.priority === "urgent" && <PriorityChip priority="urgent" />}
        {post.mustRead && !post.readByMe && <span className="chip chip-primary">필독</span>}
        <span className="meta col-attach"><Icon name="paperclip" size={11} /> {countAttachments(post.attachments)}</span>
      </div>
      <div className="meta">{post.author}</div>
      <div className="meta">{KOSHORTDATE(post.createdAt)}</div>
      <div className="meta col-due">
        {post.dueAt ? (
          <span style={{ color: days < 0 ? "var(--danger)" : urgent ? "var(--urgent)" : "var(--fg-3)" }}>
            {days > 0 ? `D-${days}` : days === 0 ? "D-DAY" : `D+${Math.abs(days)}`}
          </span>
        ) : "—"}
      </div>
      <div className="meta col-stats">
        {post.submissions ? (
          <span>제출 <b style={{color: "var(--fg-2)"}}>{post.submissions.received}</b>/{post.submissions.target}</span>
        ) : (
          <span>조회 {post.views}</span>
        )}
      </div>
      <Icon name="chevron-right" size={14} className="muted" />
    </div>
  );
};

const PostCard = ({ post, onClick }) => (
  <article className="post-card" onClick={onClick}>
    <div style={{display: "flex", justifyContent: "space-between"}}>
      <div style={{display: "flex", gap: 6}}>
        {post.pinned && <Icon name="pin" size={14} style={{color: "var(--primary)"}} />}
        <PriorityChip priority={post.priority} />
        {post.mustRead && <span className="chip chip-primary">필독</span>}
      </div>
      <span className="meta"><Icon name="paperclip" size={11} /> {post.attachments?.length || 0}</span>
    </div>
    <div className="post-card-title">{post.title}</div>
    <div className="post-card-foot">
      <span>{post.author} · {KOSHORTDATE(post.createdAt)}</span>
      <span>{post.dueAt ? (() => {
        const d = Math.round((new Date(post.dueAt) - window.WV_DATA.today) / 86400000);
        return d > 0 ? `D-${d}` : d === 0 ? "D-DAY" : `D+${Math.abs(d)}`;
      })() : `${post.views} 조회`}</span>
    </div>
  </article>
);

// ─── Post detail
const PostDetail = ({ postId, onNav, role }) => {
  const D = window.WV_DATA;
  const can = D.can[role] || D.can["staff"];
  const [post, setPost] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [submitOpen, setSubmitOpen] = React.useState(false);

  React.useEffect(() => {
    window.WV_API.getPosts().then(data => {
      const found = data.find(p => String(p.id) === String(postId));
      // 조회수 +1 (상세 진입 시 1회). 낙관적으로 화면에도 즉시 반영.
      if (found) {
        setPost({ ...found, views: (found.views || 0) + 1 });
        window.WV_API.incrementView?.(postId);
      } else {
        setPost(null);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [postId]);

  if (loading) return (
    <div className="content" style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300 }}>
      <span className="login-spinner" style={{ width:32, height:32 }} /> &nbsp; 불러오는 중...
    </div>
  );
  if (!post) return <div className="content"><h1>게시글을 찾을 수 없습니다.</h1></div>;

  const cat = D.categories.find(c => c.id === post.categoryId);
  const days = post.dueAt ? Math.round((new Date(post.dueAt) - D.today) / 86400000) : null;
  const submissionsForThis = D.submissions.filter(s => s.postId === post.id);

  let attachments = [];
  try {
    if (post.attachments) {
      if (typeof post.attachments === "string") {
        try {
          const parsed = JSON.parse(post.attachments);
          if (Array.isArray(parsed)) {
            attachments = parsed;
          }
        } catch {
          // 구형 형식: URL 목록 (줄바꿈/쉼표 구분)
          attachments = post.attachments.split(/[\n,]/).map(u => u.trim()).filter(Boolean).map(url => ({
            name: url.split("/").pop() || "파일",
            url,
          }));
        }
      } else if (Array.isArray(post.attachments)) {
        attachments = post.attachments;
      }
    }
  } catch(e) {}

  return (
    <div className="content" style={{ maxWidth: 1080 }}>
      <div className="bcr" onClick={() => onNav({ name: "category", id: post.categoryId })}>
        <Icon name="arrow-left" size={14} /> {cat?.name}
      </div>

      <div className="post-doc">

      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--line)", paddingBottom: 28, marginBottom: 28 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {post.pinned && <span className="chip chip-primary"><Icon name="pin" size={11} /> 공지</span>}
          {post.mustRead && <span className="chip chip-warning">필독</span>}
        </div>
        <h1 className="content-title" style={{ fontSize: 32 }}>{post.title}</h1>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 18, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 18, color: "var(--fg-3)", fontSize: 13, flexWrap: "wrap" }}>
            <span><b style={{ color: "var(--fg-2)" }}>{post.author || post.authorName}</b> · {post.dept}</span>
            <span><Icon name="calendar" size={12} /> 게시 {String(post.createdAt).slice(0,10)}</span>
            {post.dueAt && (
              <span style={{ color: days < 0 ? "var(--danger)" : days <= 3 ? "var(--urgent)" : "var(--fg-3)" }}>
                <Icon name="clock" size={12} /> 마감 {post.dueAt}
                {days > 0 && <> · <b>D-{days}</b> ({days}일 남음)</>}
                {days === 0 && <> · <b style={{ color: "var(--urgent)" }}>D-DAY</b> (오늘 마감)</>}
                {days < 0 && <> · <b style={{ color: "var(--danger)" }}>D+{Math.abs(days)}</b> (마감 {Math.abs(days)}일 지남)</>}
              </span>
            )}
          </div>
          {can.upload && (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => onNav({ name: "post-edit", id: post.id, data: post })}>
                <Icon name="edit" size={12} /> 수정
              </button>
              <button className="btn btn-secondary btn-sm" onClick={async () => {
                if (!confirm("이 게시글을 삭제할까요?")) return;
                try {
                  const rowId = post.rowNumber || post.id;
                  if (rowId) await window.WV_API.deletePost(rowId);
                } catch(e) {}
                onNav({ name: "category", id: post.categoryId });
              }}>
                <Icon name="trash" size={12} /> 삭제
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <article className="post-body">
        {(post.content || post.body || "").split("\n").map((line, i) => <p key={i}>{line || "\u00A0"}</p>)}
      </article>

      {/* Attachments */}
      {attachments.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <SectionHd title={`첨부 자료 (${attachments.length})`} sub="파일명을 클릭하여 다운로드합니다." />
          <div className="card attachments">
            {attachments.map((a, i) => (
              <div key={i} className="attach-row">
                <div className="attach-icon"><Icon name="file" size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="attach-name">{a.name || a.url}</div>
                </div>
                <a href={a.url} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm">
                  <Icon name="download" size={12} /> 열기
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Submission section */}
      {post.submissions && (
        <section style={{ marginTop: 36 }}>
          <SectionHd
            title="이행사항 제출"
            sub="아래에 작성한 양식을 업로드하여 제출합니다."
            action={
              <div className="meta" style={{textAlign: "right"}}>
                전사 제출률<br />
                <b style={{ color: "var(--fg)", fontSize: 16 }}>{post.submissions.received} / {post.submissions.target}</b>
                <span style={{ marginLeft: 6 }}>({Math.round(post.submissions.received / post.submissions.target * 100)}%)</span>
              </div>
            }
          />
          <div className="card" style={{ padding: 20 }}>
            <div className="progress" style={{ marginBottom: 18 }}>
              <div style={{ width: `${post.submissions.received / post.submissions.target * 100}%` }} />
            </div>
            {can.submit ? (
              <button className="btn btn-primary btn-lg" onClick={() => setSubmitOpen(true)}>
                <Icon name="upload" size={14} /> 제출 양식 업로드
              </button>
            ) : (
              <div className="meta"><Icon name="lock" size={12} /> 제출 권한이 없는 계정입니다.</div>
            )}

            {/* recent submissions for this post */}
            {submissionsForThis.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <div className="meta" style={{ marginBottom: 8 }}>최근 제출 ({submissionsForThis.length})</div>
                <div className="sub-mini-list">
                  {submissionsForThis.map(s => (
                    <div key={s.id} className="sub-mini-row">
                      <div className="activity-avatar">{s.submitter[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{s.dept} · {s.submitter}</div>
                        <div className="meta">{s.file}</div>
                      </div>
                      <StatusChip status={s.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}



      {submitOpen && <SubmitModal post={post} role={role} onClose={() => setSubmitOpen(false)} />}

      </div>{/* .post-doc */}

      <style>{`
        .post-doc {
          background: #ffffff;
          border: 1px solid var(--line);
          border-radius: var(--r-lg);
          box-shadow: var(--shadow);
          padding: 40px 48px 48px;
          margin-top: 4px;
        }
        .post-body { font-size: 16px; line-height: 1.7; color: var(--fg-2); max-width: 720px; }
        .post-body p { margin: 0 0 12px; }

        .attachments { padding: 6px 0; }
        .attach-row {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 18px;
          border-bottom: 1px solid var(--line-2);
        }
        .attach-row:last-child { border-bottom: 0; }
        .attach-icon {
          width: 38px; height: 44px; flex-shrink: 0;
          background: var(--bg-sunk); border-radius: 6px;
          display: grid; place-items: center;
          color: var(--fg-3);
        }
        .attach-name { font-weight: 500; font-size: 13.5px; }

        .sub-mini-list { display: flex; flex-direction: column; }
        .sub-mini-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 0;
          border-top: 1px solid var(--line-2);
        }
      `}</style>
    </div>
  );
};

const CommentRow = ({ who, dept, when, text }) => (
  <div style={{ display: "flex", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--line-2)" }}>
    <div className="activity-avatar">{who[0]}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13 }}>
        <b>{who}</b> <span className="meta">· {dept} · {when}</span>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 4 }}>{text}</div>
    </div>
  </div>
);

// ─── Submit modal (upload)
const SubmitModal = ({ post, role, onClose }) => {
  const [file, setFile] = React.useState(null);
  const [memo, setMemo] = React.useState("");
  const [dragging, setDragging] = React.useState(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <div>
            <div className="meta">이행사항 제출</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 600 }}>{post.title}</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd">
          <div
            className={"dropzone" + (dragging ? " dragging" : "")}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById("submit-file-input")?.click()}
          >
            <Icon name="upload" size={28} />
            <div style={{ fontWeight: 600, marginTop: 10 }}>파일을 끌어다 놓거나 클릭하여 선택</div>
            <div className="meta" style={{ marginTop: 4 }}>지원: XLSX, PDF, ZIP (최대 50MB)</div>
            {file && (
              <div className="file-pill" onClick={(e) => e.stopPropagation()}>
                <Icon name="file" size={14} />
                {file.name}
                <button onClick={() => setFile(null)}><Icon name="x" size={12} /></button>
              </div>
            )}
            <input id="submit-file-input" type="file" hidden onChange={(e) => setFile(e.target.files[0])} />
          </div>

          <div className="field" style={{ marginTop: 18 }}>
            <label className="field-label">제출 부서</label>
            <select className="field-select">
              {window.WV_DATA.depts.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">메모 (선택)</label>
            <textarea className="field-textarea" placeholder="검토자에게 전달할 메모를 작성하세요" value={memo} onChange={e => setMemo(e.target.value)} />
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" disabled={!file} onClick={onClose}><Icon name="check" size={14} /> 제출하기</button>
        </div>

        <style>{`
          .dropzone {
            border: 2px dashed var(--line); border-radius: var(--r-lg);
            padding: 36px; text-align: center; color: var(--fg-3);
            cursor: pointer;
            transition: all .2s ease;
          }
          .dropzone:hover, .dropzone.dragging { border-color: var(--primary); background: var(--primary-soft); color: var(--primary); }
          .file-pill {
            display: inline-flex; align-items: center; gap: 6px;
            margin-top: 14px;
            padding: 6px 6px 6px 10px;
            background: var(--bg-elev); border: 1px solid var(--line);
            border-radius: 999px; font-size: 12px; color: var(--fg);
          }
          .file-pill button { background: transparent; border: 0; padding: 4px; border-radius: 50%; display: grid; place-items: center; color: var(--fg-3); }
        `}</style>
      </div>
    </div>
  );
};

// ─── 파일 첨부 컴포넌트
const FileAttacher = ({ files, onFilesChange }) => {
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState("");
  const inputRef = React.useRef(null);

  const uploadFiles = async (fileList) => {
    const arr = Array.from(fileList);
    if (!arr.length) return;
    setUploading(true);
    setUploadError("");
    try {
      const results = await Promise.all(arr.map(async (file) => {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("업로드 실패");
        return await res.json();
      }));
      onFilesChange([...files, ...results.map(r => ({ name: r.name, url: r.url }))]);
    } catch(e) {
      setUploadError("업로드 실패. 파일 크기(50MB 이하)를 확인하세요.");
    }
    setUploading(false);
  };

  const removeFile = (i) => onFilesChange(files.filter((_, j) => j !== i));

  // 드래그 앤 드롭으로 파일 순서 변경
  const [dragIndex, setDragIndex] = React.useState(null);
  const [dragOverIndex, setDragOverIndex] = React.useState(null);
  const handleDragStart = (i) => (e) => {
    setDragIndex(i);
    e.dataTransfer.effectAllowed = "move";
    // 일부 브라우저 호환 (드래그 이미지 살리기)
    try { e.dataTransfer.setData("text/plain", String(i)); } catch (_) {}
  };
  const handleDragOver = (i) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== i) setDragOverIndex(i);
  };
  const handleDragLeave = () => setDragOverIndex(null);
  const handleDrop = (i) => (e) => {
    e.preventDefault();
    e.stopPropagation();   // 부모 드롭존 onDrop으로 전파 막기
    if (dragIndex == null || dragIndex === i) {
      setDragIndex(null); setDragOverIndex(null);
      return;
    }
    const next = [...files];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    onFilesChange(next);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  return (
    <div>
      <div
        className="attach-drop-area"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
        onDragLeave={e => e.currentTarget.classList.remove("drag-over")}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.classList.remove("drag-over");
          uploadFiles(e.dataTransfer.files);
        }}
      >
        {uploading ? (
          <>
            <span className="login-spinner" style={{ width: 20, height: 20 }} />
            <span style={{ marginLeft: 10, fontSize: 13 }}>업로드 중...</span>
          </>
        ) : (
          <>
            <Icon name="paperclip" size={16} />
            <span style={{ fontWeight: 600, fontSize: 13, marginLeft: 8 }}>내 PC에서 파일 선택</span>
            <span className="meta" style={{ marginLeft: 8 }}>또는 여기로 드래그</span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" multiple hidden onChange={e => uploadFiles(e.target.files)} />

      {uploadError && (
        <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>{uploadError}</div>
      )}

      {files.length > 0 && (
        <div className="attach-file-list">
          {files.map((f, i) => (
            <div key={i}
              className={
                "attach-file-row drag-row" +
                (dragIndex === i ? " is-dragging" : "") +
                (dragOverIndex === i && dragIndex !== i ? " drop-target" : "")
              }
              draggable={true}
              onDragStart={handleDragStart(i)}
              onDragOver={handleDragOver(i)}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop(i)}
              onDragEnd={handleDragEnd}
            >
              {/* 드래그 핸들 (좌측) */}
              <span className="drag-handle" title="끌어서 순서 변경">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                  <circle cx="4" cy="3" r="1.3"/><circle cx="10" cy="3" r="1.3"/>
                  <circle cx="4" cy="7" r="1.3"/><circle cx="10" cy="7" r="1.3"/>
                  <circle cx="4" cy="11" r="1.3"/><circle cx="10" cy="11" r="1.3"/>
                </svg>
              </span>
              <Icon name="file" size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
              </div>
              <button className="btn btn-ghost btn-sm" title="삭제" onClick={() => removeFile(i)}>
                <Icon name="x" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .attach-drop-area {
          display: flex; align-items: center;
          border: 1.5px dashed var(--line);
          border-radius: var(--r-md);
          padding: 12px 16px;
          cursor: pointer;
          color: var(--fg-3);
          transition: all .15s ease;
          user-select: none;
        }
        .attach-drop-area:hover, .attach-drop-area.drag-over {
          border-color: var(--primary);
          background: var(--primary-soft);
          color: var(--primary);
        }
        .attach-file-list {
          margin-top: 8px;
          border: 1px solid var(--line-2);
          border-radius: var(--r-md);
          overflow: hidden;
        }
        /* 드래그 핸들 + 시각 효과 (드래그로 순서 변경) */
        .drag-handle {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; flex-shrink: 0;
          color: var(--fg-4);
          cursor: grab;
          border-radius: 4px;
          transition: color .15s, background .15s;
        }
        .drag-handle:hover { color: var(--primary); background: var(--bg-sunk); }
        .drag-handle:active { cursor: grabbing; }
        .drag-row.is-dragging {
          opacity: 0.4;
          background: var(--bg-sunk);
        }
        .drag-row.drop-target {
          border-top: 3px solid var(--primary) !important;
          background: color-mix(in oklab, var(--primary) 6%, transparent);
        }
        .attach-file-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--line-2);
          background: var(--bg-elev);
          font-size: 13px;
        }
        .attach-file-row:last-child { border-bottom: 0; }
      `}</style>
    </div>
  );
};

// 기존 첨부파일 문자열 파싱 (JSON 또는 URL 목록)
const parseAttachments = (str) => {
  if (!str) return [];
  try {
    const p = JSON.parse(str);
    if (Array.isArray(p)) return p;
  } catch {}
  return str.split(/[\n,]/).map(u => u.trim()).filter(Boolean).map(url => ({
    name: url.split("/").pop() || "파일", url,
  }));
};

// ─── Compose (write/upload) — 신규 + 수정 겸용
const Compose = ({ catId, editPost, onCancel, onSubmit, role }) => {
  const D = window.WV_DATA;
  const isEdit = !!editPost;
  const [form, setForm] = React.useState({
    categoryId: editPost?.categoryId || catId || D.categories[0]?.id || "",
    title: editPost?.title || "",
    body: editPost?.content || "",
    pinned: editPost?.pinned === "true" || editPost?.pinned === true || false,
    mustRead: editPost?.mustRead === "true" || editPost?.mustRead === true || false,
    priority: editPost?.priority || "normal",
    dueAt: editPost?.dueAt || "",
    hasSubmission: editPost?.hasSubmission === "true" || editPost?.hasSubmission === true || false,
    submissionTarget: Number(editPost?.submissionTarget) || 100,
    files: parseAttachments(editPost?.attachments),
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");

  const update = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const buildPayload = () => ({
    title: form.title,
    content: form.body,
    categoryId: form.categoryId,
    priority: form.priority || "normal",
    dueAt: form.dueAt || "",
    pinned: form.pinned ? "true" : "",
    mustRead: form.mustRead ? "true" : "",
    hasSubmission: form.hasSubmission ? "true" : "",
    submissionTarget: form.hasSubmission ? (form.submissionTarget || 0) : "",
    attachments: form.files.length > 0 ? JSON.stringify(form.files) : "",
  });

  const handleSubmit = async () => {
    if (!form.title.trim()) { setSubmitError("제목을 입력해주세요."); return; }
    if (!form.body.trim()) { setSubmitError("내용을 입력해주세요."); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      let result;
      if (isEdit) {
        result = await window.WV_API.updatePost(editPost.id, buildPayload());
        if (result && result.post) {
          onSubmit(form.categoryId);
        } else {
          setSubmitError("수정 실패: " + (result?.error || "다시 시도해주세요."));
        }
      } else {
        const user = JSON.parse(localStorage.getItem("wv_user") || "{}");
        result = await window.WV_API.addPost({
          ...buildPayload(),
          authorId: user.id || "",
          authorName: (window.WV_ACTOR?.get(user)) || user.name || "",
        });
        if (result && result.post) {
          onSubmit(form.categoryId);
        } else {
          setSubmitError("게시 실패: " + (result?.error || "다시 시도해주세요."));
        }
      }
    } catch (err) {
      setSubmitError("서버 연결 실패. 잠시 후 다시 시도해주세요.");
    }
    setSubmitting(false);
  };

  return (
    <div className="content" style={{ maxWidth: 900 }}>
      <div className="bcr" onClick={onCancel}>
        <Icon name="arrow-left" size={14} /> 취소
      </div>
      <h1 className="content-title">{isEdit ? "게시글 수정" : "새 게시글 작성"}</h1>
      <div className="content-sub">자료를 업로드하거나 이행 양식을 게시할 수 있습니다.</div>

      <div className="card" style={{ padding: 28, marginTop: 24 }}>
        <div className="field">
          <label className="field-label">카테고리</label>
          <select className="field-select" value={form.categoryId} onChange={e => update("categoryId", e.target.value)}>
            {D.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label className="field-label">제목</label>
          <input className="field-input" placeholder="예: 2026년 2분기 정기 안전보건교육" value={form.title} onChange={e => update("title", e.target.value)} />
        </div>

        <div className="field">
          <label className="field-label">내용</label>
          <textarea className="field-textarea" placeholder="자료 안내 및 이행 기준을 작성하세요" value={form.body} onChange={e => update("body", e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field">
            <label className="field-label">중요도</label>
            <select className="field-select" value={form.priority} onChange={e => update("priority", e.target.value)}>
              <option value="normal">일반</option>
              <option value="high">중요</option>
              <option value="urgent">긴급</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">마감일 (선택)</label>
            <KDate block className="field-input" value={form.dueAt} onChange={e => update("dueAt", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="field-label">게시 옵션 <span style={{ fontSize: 11, fontWeight: 400, color: "var(--fg-3)", marginLeft: 6 }}>(클릭으로 켜고 끄기)</span></label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Check
              icon="pin" label="상단 고정 (공지)"
              desc="게시판 상단에 항상 표시"
              color="#3b82f6"
              checked={!!form.pinned} onChange={v => update("pinned", v)} />
            <Check
              icon="flag" label="필독 처리"
              desc="확인 전까지 강조 표시"
              color="#f59e0b"
              checked={!!form.mustRead} onChange={v => update("mustRead", v)} />
            <Check
              icon="upload" label="이행 제출 받기"
              desc="사업장 단위로 자료 제출 받음"
              color="#10b981"
              checked={!!form.hasSubmission} onChange={v => update("hasSubmission", v)} />
          </div>
        </div>

        <div className="field">
          <label className="field-label">첨부파일</label>
          <FileAttacher files={form.files} onFilesChange={v => update("files", v)} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24, borderTop: "1px solid var(--line-2)", paddingTop: 20 }}>
          {submitError && <span style={{color: "var(--danger)", fontSize: 13, alignSelf: "center"}}>{submitError}</span>}
          <button className="btn btn-secondary" onClick={onCancel}>취소</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <span className="login-spinner" /> : <><Icon name="check" size={14} /> {isEdit ? "수정하기" : "게시하기"}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// 시각적 토글 칩 — 켜짐/꺼짐을 명확히 구분
const Check = ({ label, desc, icon, color = "#3b82f6", checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      padding: "10px 14px",
      border: checked ? `1.5px solid ${color}` : "1.5px solid var(--line)",
      borderRadius: 10,
      background: checked
        ? `color-mix(in oklab, ${color} 10%, var(--bg-elev))`
        : "var(--bg-elev)",
      cursor: "pointer",
      transition: "all .15s ease",
      textAlign: "left",
      minWidth: 180,
      boxShadow: checked ? `0 0 0 3px color-mix(in oklab, ${color} 14%, transparent)` : "none",
    }}
  >
    {/* 토글 스위치 인디케이터 */}
    <span style={{
      position: "relative",
      width: 32, height: 18, borderRadius: 999,
      background: checked ? color : "var(--line)",
      transition: "background .2s",
      flexShrink: 0,
    }}>
      <span style={{
        position: "absolute",
        top: 2, left: checked ? 16 : 2,
        width: 14, height: 14, borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        transition: "left .2s",
      }} />
    </span>
    {/* 아이콘 */}
    {icon && (
      <span style={{
        display: "grid", placeItems: "center",
        width: 28, height: 28, borderRadius: 7,
        background: checked ? `color-mix(in oklab, ${color} 18%, transparent)` : "var(--bg-sunk)",
        color: checked ? color : "var(--fg-4)",
        transition: "all .15s",
        flexShrink: 0,
      }}>
        <Icon name={icon} size={14} />
      </span>
    )}
    {/* 라벨 + 설명 */}
    <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: checked ? color : "var(--fg-2)" }}>
        {label}
      </span>
      {desc && (
        <span style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.3 }}>{desc}</span>
      )}
    </span>
  </button>
);

// ─── PDF 첫 페이지 자동 썸네일 (pdf.js 지연 로드) ───────────────
// 교육자료 등 이미지가 아닌 PDF도 포스터처럼 미리보기 이미지로 표시
let _wvPdfjsPromise = null;
const loadPdfJs = () => {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (_wvPdfjsPromise) return _wvPdfjsPromise;
  _wvPdfjsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js";
    s.onload = () => {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
      } catch (e) {}
      resolve(window.pdfjsLib);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _wvPdfjsPromise;
};

const PdfThumb = ({ url }) => {
  const [dataUrl, setDataUrl] = React.useState(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    loadPdfJs()
      .then(async (pdfjs) => {
        const pdf = await pdfjs.getDocument(url).promise;
        const page = await pdf.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const scale = 400 / base.width;
        const vp = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
        if (!cancelled) setDataUrl(canvas.toDataURL("image/jpeg", 0.82));
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [url]);
  if (failed)
    return (
      <div style={{ textAlign: "center", color: "var(--fg-3)" }}>
        <Icon name="file" size={36} />
        <div style={{ fontSize: 11, marginTop: 4 }}>미리보기 없음</div>
      </div>
    );
  if (!dataUrl)
    return (
      <div style={{ textAlign: "center", color: "var(--fg-3)" }}>
        <Icon name="file" size={36} />
        <div style={{ fontSize: 11, marginTop: 4 }}>미리보기 생성 중…</div>
      </div>
    );
  return <img src={dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
};

// ═══════════════════════════════════════════════════════════════
// 자료실 (library 타입 카테고리: 안전보건표지 / 안전보건 포스터)
//   - 썸네일 카드 그리드 + 하위분류 탭 + 검색
//   - 관리자/안전관리자만 업로드·삭제, 직원은 다운로드만
// ═══════════════════════════════════════════════════════════════
const LibraryView = ({ cat, onNav, role, currentUser }) => {
  const D = window.WV_DATA;
  const can = D.can[role] || D.can["staff"];
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [subFilter, setSubFilter] = React.useState("전체");
  const [showUpload, setShowUpload] = React.useState(false);
  const [editItem, setEditItem] = React.useState(null);

  const reload = React.useCallback(() => {
    setLoading(true);
    // 이 자료실 카테고리 것만 스코프로 로드(썸네일 포함) — 다른 카테고리 base64 썸네일까지 받던 문제 해결
    window.WV_API.getPosts(cat.id).then(data => {
      setItems(data.filter(p => p.categoryId === cat.id && p.status !== "deleted"));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [cat.id]);
  React.useEffect(() => { reload(); }, [reload]);

  // 하위분류 목록 (등록된 자료의 subCategory들에서 추출)
  const subCats = React.useMemo(() => {
    const set = new Set();
    items.forEach(it => { if (it.subCategory) set.add(it.subCategory); });
    return ["전체", ...[...set].sort((a, b) => a.localeCompare(b, "ko"))];
  }, [items]);

  const filtered = items.filter(it => {
    const matchSub = subFilter === "전체" || it.subCategory === subFilter;
    const matchSearch = !search ||
      it.title?.toLowerCase().includes(search.toLowerCase()) ||
      it.content?.toLowerCase().includes(search.toLowerCase());
    return matchSub && matchSearch;
  });

  // attachments(JSON 문자열)에서 첫 파일 URL 뽑기
  const firstFileUrl = (it) => {
    try {
      const arr = typeof it.attachments === "string" ? JSON.parse(it.attachments) : it.attachments;
      return Array.isArray(arr) && arr[0] ? arr[0].url : null;
    } catch { return null; }
  };
  const fileCount = (it) => {
    try {
      const arr = typeof it.attachments === "string" ? JSON.parse(it.attachments) : it.attachments;
      return Array.isArray(arr) ? arr.length : 0;
    } catch { return 0; }
  };

  const handleDelete = async (it) => {
    if (!window.confirm(`"${it.title}" 자료를 삭제하시겠습니까?`)) return;
    try {
      await window.WV_API.deletePost(it.id);
      reload();
    } catch (e) { alert("삭제 실패: " + (e.message || e)); }
  };

  return (
    <div className="content">
      <div className="bcr" onClick={() => onNav({ name: "dashboard" })}>
        <Icon name="arrow-left" size={14} /> 대시보드
      </div>

      <div className="content-hd">
        <div>
          <h1 className="content-title">{cat.name}</h1>
          <div className="content-sub">{cat.desc}</div>
          <div style={{ marginTop: 8 }}><span className="meta">총 {items.length}건</span></div>
        </div>
        {can.upload && (
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowUpload(true); }}>
            <Icon name="upload" size={14} /> 자료 등록
          </button>
        )}
      </div>

      {/* 하위분류 탭 + 검색 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
          {subCats.map(sc => (
            <button key={sc} onClick={() => setSubFilter(sc)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: "1px solid " + (subFilter === sc ? "var(--primary)" : "var(--line)"),
                background: subFilter === sc ? "var(--primary)" : "var(--bg)",
                color: subFilter === sc ? "#fff" : "var(--fg-2)",
              }}>
              {sc} {sc !== "전체" && <span style={{ opacity: 0.7 }}>{items.filter(i => i.subCategory === sc).length}</span>}
            </button>
          ))}
        </div>
        <input className="field-input" style={{ width: 220 }} placeholder="제목·내용 검색"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--fg-3)" }}>
          <span className="login-spinner" style={{ width: 32, height: 32 }} /> 불러오는 중...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--fg-3)" }}>
          <Icon name="image" size={32} />
          <div style={{ marginTop: 12 }}>
            {items.length === 0 ? "등록된 자료가 없습니다." : "검색 결과가 없습니다."}
          </div>
          {can.upload && items.length === 0 && (
            <button className="btn btn-primary" style={{ marginTop: 16 }}
              onClick={() => { setEditItem(null); setShowUpload(true); }}>첫 자료 등록하기</button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {filtered.map(it => {
            const fileUrl = firstFileUrl(it);
            const thumb = it.thumbUrl || (fileUrl && /\.(png|jpe?g|gif|webp)$/i.test(fileUrl) ? fileUrl : null);
            return (
              <div key={it.id} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* 썸네일 */}
                <div style={{
                  aspectRatio: "4/3", background: "var(--bg-sunk)", display: "flex",
                  alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative",
                }}>
                  {thumb
                    ? <img src={thumb} alt={it.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (fileUrl && /\.pdf(\?|$)/i.test(fileUrl))
                      ? <PdfThumb url={fileUrl} />
                      : <div style={{ textAlign: "center", color: "var(--fg-3)" }}>
                          <Icon name="file" size={36} />
                          <div style={{ fontSize: 11, marginTop: 4 }}>미리보기 없음</div>
                        </div>}
                  {it.subCategory && (
                    <span style={{
                      position: "absolute", top: 8, left: 8, padding: "2px 8px", borderRadius: 10,
                      fontSize: 10, fontWeight: 700, background: "rgba(0,0,0,0.6)", color: "#fff",
                    }}>{it.subCategory}</span>
                  )}
                </div>
                {/* 정보 */}
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{it.title}</div>
                  {it.content && <div className="meta" style={{ fontSize: 12, whiteSpace: "normal", lineHeight: 1.4, flex: 1 }}>{it.content}</div>}
                  <div className="meta" style={{ fontSize: 11 }}>{KOSHORTDATE(it.createdAt)} · 파일 {fileCount(it)}개</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {fileUrl ? (
                      <a href={fileUrl} download className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}>
                        <Icon name="download" size={12} /> 다운로드
                      </a>
                    ) : (
                      <span className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center", opacity: 0.5 }}>파일 없음</span>
                    )}
                    {can.upload && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditItem(it); setShowUpload(true); }} title="수정">
                          <Icon name="edit" size={12} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(it)} title="삭제">
                          <Icon name="trash" size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUpload && (
        <LibraryUploadModal
          cat={cat} currentUser={currentUser} editItem={editItem}
          existingSubCats={subCats.filter(s => s !== "전체")}
          onClose={() => { setShowUpload(false); setEditItem(null); }}
          onSaved={() => { setShowUpload(false); setEditItem(null); reload(); }}
        />
      )}
    </div>
  );
};

// 이미지 파일을 미리보기용으로 축소 (긴 변 maxW px, JPEG 압축) → 작은 File 반환. 실패/부적합 시 원본 그대로.
async function resizeImageFile(file, maxW = 800, quality = 0.82) {
  try {
    if (!file || !/\.(png|jpe?g|webp)$/i.test(file.name || "")) return file; // gif(애니메이션) 등은 원본 유지
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
    });
    const longSide = Math.max(img.width, img.height);
    const scale = Math.min(1, maxW / longSide);
    if (scale >= 1 && file.size < 300 * 1024) return file; // 이미 충분히 작으면 그대로
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file; // 오히려 커지면 원본 사용
    const base = (file.name || "thumb").replace(/\.[^.]+$/, "");
    return new File([blob], base + ".jpg", { type: "image/jpeg" });
  } catch (e) { return file; }
}

// 자료실 업로드/수정 모달
const LibraryUploadModal = ({ cat, currentUser, editItem, existingSubCats, onClose, onSaved }) => {
  const [title, setTitle] = React.useState(editItem?.title || "");
  const [desc, setDesc] = React.useState(editItem?.content || "");
  const [subCategory, setSubCategory] = React.useState(editItem?.subCategory || "");
  const [thumbUrl, setThumbUrl] = React.useState(editItem?.thumbUrl || "");
  const [files, setFiles] = React.useState(() => {
    try {
      const arr = typeof editItem?.attachments === "string" ? JSON.parse(editItem.attachments) : editItem?.attachments;
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [thumbUploading, setThumbUploading] = React.useState(false);
  const thumbRef = React.useRef(null);

  const uploadThumb = async (file) => {
    if (!file) return;
    if (!/\.(png|jpe?g|gif|webp)$/i.test(file.name)) { setError("썸네일은 이미지 파일만 가능합니다."); return; }
    setThumbUploading(true); setError("");
    try {
      const small = await resizeImageFile(file, 800, 0.82);   // 미리보기용 자동 축소
      const fd = new FormData(); fd.append("file", small);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error("업로드 실패");
      setThumbUrl(d.url);
    } catch (e) { setError("썸네일 업로드 실패"); }
    setThumbUploading(false);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        title: title.trim(), content: desc.trim(), categoryId: cat.id,
        authorId: String(currentUser?.id || ""), authorName: (window.WV_ACTOR?.get(currentUser)) || currentUser?.name || "",
        attachments: JSON.stringify(files), thumbUrl, subCategory: subCategory.trim(),
      };
      if (editItem) await window.WV_API.updatePost(editItem.id, payload);
      else await window.WV_API.addPost(payload);
      onSaved();
    } catch (e) { setError("저장 실패: " + (e.message || e)); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-hd">
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{editItem ? "자료 수정" : "자료 등록"} — {cat.name}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd">
          {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "#fef2f2", borderRadius: 6 }}>{error}</div>}

          <div className="field">
            <label className="field-label">제목 *</label>
            <input className="field-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 지게차 운행 안전수칙" />
          </div>

          <div className="field">
            <label className="field-label">분류 <span style={{ fontSize: 11, color: "var(--fg-3)" }}>(탭으로 묶임 · 비워도 됨)</span></label>
            <input className="field-input" value={subCategory} onChange={e => setSubCategory(e.target.value)}
              placeholder="예: 작업안전 / 화기 / 보호구" list="lib-subcats" />
            {existingSubCats.length > 0 && (
              <datalist id="lib-subcats">{existingSubCats.map(s => <option key={s} value={s} />)}</datalist>
            )}
          </div>

          <div className="field">
            <label className="field-label">설명 (선택)</label>
            <textarea className="field-textarea" value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="자료에 대한 간단한 설명" style={{ minHeight: 60 }} />
          </div>

          {/* 썸네일 */}
          <div className="field">
            <label className="field-label">미리보기 이미지 <span style={{ fontSize: 11, color: "var(--fg-3)" }}>(카드에 표시 · 이미지 파일이면 자동)</span></label>
            {thumbUrl ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <img src={thumbUrl} alt="썸네일" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
                <button className="btn btn-secondary btn-sm" onClick={() => setThumbUrl("")}>제거</button>
              </div>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => thumbRef.current?.click()} disabled={thumbUploading}>
                {thumbUploading ? <span className="login-spinner" /> : <><Icon name="image" size={12} /> 이미지 선택</>}
              </button>
            )}
            <input ref={thumbRef} type="file" accept="image/*" hidden onChange={e => uploadThumb(e.target.files?.[0])} />
          </div>

          {/* 첨부파일 (다운로드용) */}
          <div className="field">
            <label className="field-label">첨부 파일 (다운로드용) *</label>
            <FileAttacher files={files} onFilesChange={setFiles} />
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="login-spinner" /> : <><Icon name="check" size={14} /> {editItem ? "수정" : "등록"}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { CategoryView, PostDetail, Compose, PostRow, PostCard, SubmitModal, CommentRow, Check, FileAttacher, LibraryView, LibraryUploadModal });
