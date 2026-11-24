// 윌앤비전 - 안전보건게시판 (벽면 게시판형)
//   · 사진 속 실물 게시판처럼 칸마다 제목 + 부착된 PDF. 클릭하면 열기/다운로드.
//   · 조회: 모든 사용자 / 수정·업로드·추가·삭제: 관리자급만(서버가 canEdit로 알려줌)
const SafetyBoardView = ({ onNav, currentUser }) => {
  const [items, setItems] = React.useState([]);
  const [canEdit, setCanEdit] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [edit, setEdit] = React.useState(false);        // 편집 모드(관리자)
  const [busyId, setBusyId] = React.useState(null);     // 업로드 중인 칸 id
  const [err, setErr] = React.useState("");
  const fileRefs = React.useRef({});

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/safety-board").then(r => r.json()).then(d => {
      setItems(Array.isArray(d.items) ? d.items : []);
      setCanEdit(!!d.canEdit);
      setLoading(false);
    }).catch(() => { setErr("목록을 불러오지 못했습니다."); setLoading(false); });
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const patch = async (id, body) => {
    const res = await fetch(`/api/safety-board/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json();
    if (res.ok && d.item) setItems(xs => xs.map(x => x.id === id ? d.item : x));
    else setErr(d.error || "저장 실패");
  };

  const onPickFile = async (id, file) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) { setErr("PDF 파일만 올릴 수 있습니다."); return; }
    setErr(""); setBusyId(id);
    try {
      const r = await window.WV_API.uploadFile(file);
      if (!r || r.error || !r.url) throw new Error((r && r.error) || "업로드 실패");
      await patch(id, { fileUrl: r.url, fileName: r.name || file.name });
    } catch (e) { setErr(e.message || "업로드 실패"); }
    setBusyId(null);
  };

  const addItem = async () => {
    const res = await fetch("/api/safety-board", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "새 항목" }),
    });
    const d = await res.json();
    if (res.ok && d.item) setItems(xs => [...xs, d.item]);
    else setErr(d.error || "추가 실패");
  };
  const removeItem = async (id) => {
    if (!window.confirm("이 칸을 삭제할까요? (붙은 파일 링크도 사라집니다)")) return;
    const res = await fetch(`/api/safety-board/${id}`, { method: "DELETE" });
    if (res.ok) setItems(xs => xs.filter(x => x.id !== id));
    else setErr("삭제 실패");
  };
  const clearFile = async (id) => { if (window.confirm("이 칸의 파일을 떼어낼까요?")) await patch(id, { fileUrl: "", fileName: "" }); };

  return (
    <div className="content" style={{ maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h1 className="content-title">안전보건게시판</h1>
          <p className="meta" style={{ marginTop: 4 }}>
            칸을 누르면 자료(PDF)가 열립니다.{canEdit ? " 관리자는 편집 모드에서 파일을 붙이거나 제목을 바꿀 수 있습니다." : " 수정은 관리자만 가능합니다."}
          </p>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 8 }}>
            {edit && <button className="btn btn-secondary" onClick={addItem}>＋ 칸 추가</button>}
            <button className={edit ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setEdit(v => !v)}>
              {edit ? "편집 완료" : "✎ 편집"}
            </button>
          </div>
        )}
      </div>

      {err && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--fg-3)" }}>불러오는 중...</div>
      ) : (
        <div className="sb-board">
          <div className="sb-board-head">
            <span className="sb-board-title">안전보건게시판</span>
            <span className="sb-board-org">윌앤비전</span>
          </div>
          <div className="sb-grid">
            {items.map(it => {
              const uploading = busyId === it.id;
              return (
                <div key={it.id} className="sb-slot">
                  {/* 제목 칩 */}
                  {edit ? (
                    <input className="sb-slot-title-input" defaultValue={it.title || ""}
                      onBlur={e => { const v = e.target.value.trim(); if (v && v !== it.title) patch(it.id, { title: v }); }} />
                  ) : (
                    <div className="sb-slot-title">{it.title || "(제목 없음)"}</div>
                  )}

                  {/* 게시물(종이) 영역 */}
                  <div className={"sb-paper" + (it.fileUrl ? " has-file" : "")}>
                    <span className="sb-pin" />
                    {it.fileUrl ? (
                      <a className="sb-doc" href={it.fileUrl} target="_blank" rel="noopener noreferrer" title="클릭하여 열기/다운로드">
                        <div className="sb-doc-icon">PDF</div>
                        <div className="sb-doc-name">{it.fileName || "자료"}</div>
                        <div className="sb-doc-hint">클릭하여 열기</div>
                      </a>
                    ) : (
                      <div className="sb-empty">
                        {edit ? (
                          <button className="sb-upload-btn" disabled={uploading}
                            onClick={() => fileRefs.current[it.id] && fileRefs.current[it.id].click()}>
                            {uploading ? "올리는 중..." : "＋ PDF 올리기"}
                          </button>
                        ) : (
                          <span className="sb-empty-txt">자료 준비중</span>
                        )}
                      </div>
                    )}
                    <input ref={el => fileRefs.current[it.id] = el} type="file" accept=".pdf" hidden
                      onChange={e => { onPickFile(it.id, e.target.files[0]); e.target.value = ""; }} />
                  </div>

                  {/* 편집 모드 하단 버튼 */}
                  {edit && (
                    <div className="sb-slot-actions">
                      <button onClick={() => fileRefs.current[it.id] && fileRefs.current[it.id].click()} disabled={uploading}>
                        {it.fileUrl ? "교체" : "파일"}
                      </button>
                      {it.fileUrl && <button onClick={() => clearFile(it.id)}>떼기</button>}
                      <button className="sb-del" onClick={() => removeItem(it.id)}>칸삭제</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .sb-board {
          background: linear-gradient(135deg,#e9edf3,#f6f8fb);
          border: 10px solid; border-image: linear-gradient(145deg,#cfd6e0,#9aa6b8,#e7ecf3,#aab4c4) 1;
          border-radius: 10px; padding: 0 0 22px; box-shadow: 0 14px 34px rgba(20,30,50,.18);
        }
        .sb-board-head {
          display:flex; align-items:center; justify-content:space-between;
          background: linear-gradient(180deg,#6b7280,#4b5563); color:#fff;
          padding: 11px 20px; border-radius: 2px; margin: 10px 12px 18px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.2);
        }
        .sb-board-title { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
        .sb-board-org { font-size: 13px; font-weight: 700; opacity: .9; }
        .sb-grid {
          display: grid; gap: 16px; padding: 0 18px;
          grid-template-columns: repeat(4, minmax(0,1fr));
        }
        .sb-slot { display:flex; flex-direction:column; align-items:center; }
        .sb-slot-title, .sb-slot-title-input {
          width: 100%; text-align:center; font-size: 13px; font-weight: 700; color:#fff;
          background: linear-gradient(180deg,#6b7280,#525a66); border-radius: 7px;
          padding: 7px 8px; margin-bottom: 11px; box-shadow: 0 2px 5px rgba(0,0,0,.18);
        }
        .sb-slot-title-input { border: 2px solid #f59e0b; outline:none; }
        .sb-paper {
          position: relative; width: 100%; aspect-ratio: 3/4;
          background: repeating-linear-gradient(45deg,#fff,#fff 10px,#fafafa 10px,#fafafa 20px);
          border: 1px solid #d5dae2; border-radius: 3px;
          box-shadow: 0 4px 10px rgba(20,30,50,.12); display:flex;
          align-items:center; justify-content:center; overflow:hidden;
        }
        .sb-paper.has-file { border-color:#c3d0e4; }
        .sb-pin { position:absolute; top:7px; left:50%; transform:translateX(-50%);
          width:13px; height:13px; border-radius:50%;
          background: radial-gradient(circle at 35% 30%,#ff8a8a,#d4473b); box-shadow:0 2px 3px rgba(0,0,0,.3); }
        .sb-doc { display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:9px; text-decoration:none; width:100%; height:100%; padding:14px; color:#1f2733; }
        .sb-doc:hover { background: rgba(37,99,235,.05); }
        .sb-doc-icon { background:#d4473b; color:#fff; font-weight:800; font-size:13px; letter-spacing:1px;
          padding:9px 11px; border-radius:6px; box-shadow:0 2px 5px rgba(212,71,59,.4); }
        .sb-doc-name { font-size:12px; font-weight:700; text-align:center; line-height:1.4;
          display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; word-break:break-all; }
        .sb-doc-hint { font-size:11px; color:#2563eb; font-weight:600; }
        .sb-empty { display:flex; align-items:center; justify-content:center; width:100%; height:100%; }
        .sb-empty-txt { color:#aab2bf; font-size:12.5px; }
        .sb-upload-btn { background:#fff; border:1.5px dashed #94a3b8; color:#475569; font-weight:700;
          font-size:12.5px; border-radius:8px; padding:9px 12px; cursor:pointer; }
        .sb-upload-btn:hover { border-color:#2563eb; color:#2563eb; }
        .sb-slot-actions { display:flex; gap:5px; margin-top:9px; flex-wrap:wrap; justify-content:center; }
        .sb-slot-actions button { font-size:11.5px; padding:4px 9px; border-radius:6px; border:1px solid var(--line);
          background:var(--card-bg,#fff); color:var(--fg,#333); cursor:pointer; font-weight:600; }
        .sb-slot-actions .sb-del { color:#b91c1c; border-color:#fca5a5; }
        @media (max-width: 980px) { .sb-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
        @media (max-width: 520px) { .sb-grid { grid-template-columns: 1fr; } .sb-board-title{font-size:17px;} }
      `}</style>
    </div>
  );
};
Object.assign(window, { SafetyBoardView });
