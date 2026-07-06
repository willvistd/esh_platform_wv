'use strict';
// ── 근무환경 청취 조사표 (콜센터 및 사무환경) ──

const WORKER_SURVEY_STYLE = `
.ws-page { max-width: 800px; margin: 0 auto; padding: 20px 24px 40px; background: #fff; }
.ws-banner { background: #1B2430; color: #fff; font-size: 15px; font-weight: 900;
  padding: 10px 18px; margin-bottom: 12px; border-radius: var(--r-sm);
  display: flex; align-items: center; justify-content: space-between; }
.ws-banner-logo { height: 28px; object-fit: contain; filter: brightness(0) invert(1); }
.ws-intro { border: 1px solid var(--line); padding: 10px 14px; margin-bottom: 14px;
  font-size: 13px; line-height: 1.8; background: var(--bg-elev); border-radius: var(--r-sm); color: var(--fg-2); }
.ws-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 13px; }
.ws-table td, .ws-table th { border: 1px solid #555; padding: 9px 11px; vertical-align: middle; }
.ws-lbl { background: #EEF1F4; font-weight: 700; text-align: center; white-space: nowrap; width: 76px; }
.ws-input { border: none; border-bottom: 1px solid #aaa; width: 100%; outline: none;
  font-family: inherit; font-size: 13px; background: transparent; padding: 2px 0; color: var(--fg); }
.ws-cb { display: inline-flex; align-items: center; gap: 4px; margin-right: 10px; cursor: pointer; font-size: 13px; }
.ws-cb input[type="checkbox"] {
  -webkit-appearance: checkbox !important; -moz-appearance: checkbox !important; appearance: checkbox !important;
  width: 13px; height: 13px; cursor: pointer; accent-color: #1B2430; flex-shrink: 0;
}
.ws-업무내용 { line-height: 2.2; padding: 10px 11px !important; }
.ws-sec-title { font-size: 14px; font-weight: 900; margin: 18px 0 7px; color: var(--fg); border-top: 2px solid #1B2430; padding-top: 10px; }
.ws-sec-sub { font-size: 13px; margin: 10px 0 6px; font-weight: 700; color: var(--fg); }
.ws-sec-note { font-size: 11px; color: var(--fg-3); margin: 4px 0 6px; line-height: 1.6; }
.ws-acc-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 10px; }
.ws-acc-table th { background: #EEF1F4; border: 1px solid #555; padding: 8px 11px; text-align: center; font-weight: 700; }
.ws-acc-table td { border: 1px solid #555; padding: 8px 11px; vertical-align: middle; min-height: 34px; }
.ws-place-cbs { display: flex; gap: 12px; }
.ws-place-cbs label { display: inline-flex; align-items: center; gap: 3px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.ws-place-cbs input[type="checkbox"] {
  -webkit-appearance: checkbox !important; -moz-appearance: checkbox !important; appearance: checkbox !important;
  width: 13px; height: 13px; cursor: pointer; accent-color: #1B2430; flex-shrink: 0;
}
.ws-write-box { border: 1px solid #aaa; min-height: 60px; width: 100%; margin-top: 6px;
  padding: 8px 10px; font-size: 13px; resize: vertical; font-family: inherit;
  border-radius: var(--r-sm); color: var(--fg); background: var(--bg-elev); box-sizing: border-box; }
.ws-write-box:focus { outline: none; border-color: var(--primary); }
.ws-row-input { border: none; border-bottom: 1px solid #aaa; outline: none;
  font-family: inherit; font-size: 13px; background: transparent; color: var(--fg); }
.ws-impr-tbl { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
.ws-impr-tbl th { background: #EEF1F4; border: 1px solid #555; padding: 8px; text-align: center; font-weight: 700; }
.ws-impr-tbl td { border: 1px solid #555; padding: 6px 8px; vertical-align: middle; }
.ws-page-2 { margin-top: 30px; }

@media print {
  .ws-no-print { display: none !important; }
  .sidebar { display: none !important; }
  .topbar { display: none !important; }
  .app { display: block !important; }
  .ws-page { padding: 0; max-width: 100%; }
  .ws-page-2 { page-break-before: always; margin-top: 0; }
  .ws-write-box { border: 1px solid #555 !important; background: #fff !important; }
  .ws-table td, .ws-table th,
  .ws-acc-table td, .ws-acc-table th,
  .ws-impr-tbl td, .ws-impr-tbl th { border-color: #333 !important; }
  .ws-sec-title { border-top-color: #1B2430 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .ws-lbl, .ws-acc-table th, .ws-impr-tbl th { background: #EEF1F4 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .ws-banner { background: #1B2430 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
`;

const ACC_TYPES = [
  { label: "떨어짐(사다리, 책상 등 높은 곳 등에서 떨어져 다침)" },
  { label: "넘어짐(미끄러지거나 걸려서 넘어지면서 다침)" },
  { label: "부딪힘(사무실 가구, 설비, 구조물 등 물체와 부딪혀 다침)" },
  { label: "끼임(물체와 물체 사이에 신체의 일부가 끼임으로 인해 다침)" },
  { label: "감림·뒤집힘(물체가 쓰러지거나 뒤집힐 때 깔리면서 다침)" },
  { label: "무너짐(쌓여진 서류, 짐 등이 무너지면서 다침)" },
  { label: "물체에 맞음(위에서 떨어지거나 날아오는 물체에 맞아서 다침)" },
  { label: "감전(인체가 전선 등에 접촉하여 전류가 흘러 상처를 입거나 충격을 느낌)" },
  { label: "화재·폭발(주변 가연성 및 인화성 물질의 화재 및 폭발로 인해 다침)" },
  { label: "기타", etc: true },
];
const PLACES = ["사무실", "복도", "계단", "창고"];

const PC_RISKS = [
  "컴퓨터 작업 중 1시간에 10분씩 휴식할 수 있습니까?",
  "사무업무 책상 높이는 조절 가능하고 스스로 자세를 바꾸면서 일할 수 있습니까?",
  "의자는 고정식 안정적이고, 이동식 회전이 원활합니까?",
  "의자의 동판이 등 전체를 적절히 지지하고 있습니까?",
  "차광막이나 커튼 설치 등으로 창문이나 조명으로부터 반사광이 화면에 비치지 않아 편안하게 작업할 수 있습니까?",
  "단말기 화면은 회전 및 경사조절이 가능합니까?",
  "화면의 위치가 적절하여 목과 머리를 돌리지 않고 작업할 수 있습니까?",
];


function WorkerSurveyView({ onNav }) {
  const [form, setForm] = React.useState({
    일시: "", 사업장명: "", 성명: "",
    성별남: false, 성별여: false, 재직1년미만: false, 세55이상: false,
    업무사무: false, 업무민원: false, 업무외: false, 업무비상: false,
    출근횟수: "", 초과근무횟수: "",
  });
  const [accChecks, setAccChecks] = React.useState(
    ACC_TYPES.map(() => ({ checked: false, places: { 사무실: false, 복도: false, 계단: false, 창고: false } }))
  );
  const [etcText, setEtcText] = React.useState("");
  const [freeText, setFreeText] = React.useState("");

  // 2-1 건강문제
  const [health, setHealth] = React.useState({
    근골격계: false, 심뇌혈관: false, 감염성: false, 민원정신: false, 직무스트레스: false, 기타: false, 기타텍스트: "",
  });
  // 2-2 컴퓨터 작업 위험요인
  const [pcRisks, setPcRisks] = React.useState(PC_RISKS.map(() => ({ 예: false, 아니오: false })));
  // 2-3 자유서술
  const [healthFreeText, setHealthFreeText] = React.useState("");
  // 3. 개선의견
  const [improvements, setImprovements] = React.useState(
    Array.from({ length: 2 }, () => ({ factor: "", opinion: "" }))
  );

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const updAcc = (i, val) => setAccChecks(p => p.map((r, idx) => idx === i ? { ...r, checked: val } : r));
  const updPlace = (i, place, val) => setAccChecks(p => p.map((r, idx) => idx === i ? { ...r, places: { ...r.places, [place]: val } } : r));
  const updPc = (i, key, val) => setPcRisks(p => p.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  const updImpr = (i, k, v) => setImprovements(p => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  const handlePrint = () => window.print();
  const handleReset = () => {
    if (!window.confirm("모든 입력 내용을 초기화하시겠습니까?")) return;
    setForm({ 일시:"", 사업장명:"", 성명:"", 성별남:false, 성별여:false, 재직1년미만:false, 세55이상:false,
      업무사무:false, 업무민원:false, 업무외:false, 업무비상:false, 출근횟수:"", 초과근무횟수:"" });
    setAccChecks(ACC_TYPES.map(() => ({ checked:false, places:{ 사무실:false, 복도:false, 계단:false, 창고:false } })));
    setEtcText(""); setFreeText("");
    setHealth({ 근골격계:false, 심뇌혈관:false, 감염성:false, 민원정신:false, 직무스트레스:false, 기타:false, 기타텍스트:"" });
    setPcRisks(PC_RISKS.map(() => ({ 예:false, 아니오:false })));
    setHealthFreeText("");
    setImprovements(Array.from({ length: 2 }, () => ({ factor: "", opinion: "" })));
  };

  const CB = ({ checked, onChange, children }) => (
    <label className="ws-cb">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {children}
    </label>
  );

  return (
    <div className="ws-page">
      <style>{WORKER_SURVEY_STYLE}</style>

      {/* 상단 버튼 */}
      <div className="ws-no-print" style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:14 }}>
        <button onClick={handleReset}
          style={{ fontFamily:"inherit", fontSize:13, padding:"7px 16px", borderRadius:"var(--r-sm)",
            border:"1px solid var(--line)", background:"var(--bg-elev)", color:"var(--fg-2)", cursor:"pointer" }}>
          ↺ 초기화
        </button>
        <button className="btn btn-secondary btn-sm no-print" onClick={handlePrint}
          style={{ display:"flex", alignItems:"center", gap:6 }}>
          <Icon name="printer" size={13} /> PDF 출력
        </button>
      </div>

      {/* ══════════ 1페이지 ══════════ */}
      <div className="ws-page-1">
        <div className="ws-banner">
          <span>근무환경 청취를 위한 조사표 (콜센터 및 사무환경)</span>
          <img src="assets/logo-will-vision2.png" className="ws-banner-logo" alt="윌앤비전 로고" />
        </div>

        <div className="ws-intro">
          우리 사업장은 근무환경의 유해·위험요인을 발견하여 이를 개선하고자 합니다.<br/>
          근무 중 사고 혹은 건강문제 악화가 예상되어 개선이 필요하다고 생각하는 항목에 체크해 주세요.
        </div>

        {/* 기본정보 */}
        <table className="ws-table">
          <colgroup><col style={{ width:76 }}/><col/><col style={{ width:76 }}/><col/></colgroup>
          <tbody>
            <tr>
              <td className="ws-lbl">일 시</td>
              <td><input className="ws-input" value={form.일시} onChange={e=>upd("일시",e.target.value)} /></td>
              <td className="ws-lbl">사업장명</td>
              <td><input className="ws-input" value={form.사업장명} onChange={e=>upd("사업장명",e.target.value)} /></td>
            </tr>
            <tr>
              <td className="ws-lbl">성 명</td>
              <td><input className="ws-input" value={form.성명} onChange={e=>upd("성명",e.target.value)} /></td>
              <td className="ws-lbl">인구특성</td>
              <td>
                성별&nbsp;
                <CB checked={form.성별남} onChange={v=>upd("성별남",v)}> 남</CB>
                <CB checked={form.성별여} onChange={v=>upd("성별여",v)}> 여</CB>
                &nbsp;&nbsp;
                <CB checked={form.재직1년미만} onChange={v=>upd("재직1년미만",v)}> 재직 1년 미만</CB>
                <CB checked={form.세55이상} onChange={v=>upd("세55이상",v)}> 55세 이상</CB>
              </td>
            </tr>
            <tr>
              <td className="ws-lbl" style={{ verticalAlign:"middle" }}>업무내용<br/>(모두체크)</td>
              <td colSpan={3} className="ws-업무내용">
                <CB checked={form.업무사무} onChange={v=>upd("업무사무",v)}> 사무업무(문서의 작성과 관리, 회의, 행정업무, 비품관리, 서비스운영 등의 업무)</CB><br/>
                <CB checked={form.업무민원} onChange={v=>upd("업무민원",v)}> 민원응대(민원상담 및 민원 결과를 처리하는 업무)</CB><br/>
                <CB checked={form.업무외} onChange={v=>upd("업무외",v)}> 사무실 외 업무(근무자의 사무실 외 장소에서 교육이나 워크숍 등을 하는 업무)</CB><br/>
                <CB checked={form.업무비상} onChange={v=>upd("업무비상",v)}> 비상업무(재난상황 발생 시 현장 사무실 설치 및 동행파악을 하는 업무)</CB>
              </td>
            </tr>
            <tr>
              <td className="ws-lbl">업무특성</td>
              <td colSpan={3}>
                출근&nbsp;
                <input className="ws-row-input" style={{ width:44, textAlign:"center" }} value={form.출근횟수} onChange={e=>upd("출근횟수",e.target.value)}/>
                회/월 (한달 평균)&nbsp;&nbsp;&nbsp;&nbsp;
                주 52시간 초과근무&nbsp;
                <input className="ws-row-input" style={{ width:44, textAlign:"center" }} value={form.초과근무횟수} onChange={e=>upd("초과근무횟수",e.target.value)}/>
                회/월 (한달 평균)
              </td>
            </tr>
          </tbody>
        </table>

        {/* 1. 사고관련 요인 */}
        <div className="ws-sec-title">1. 사고관련 요인</div>
        <div className="ws-sec-sub">1-1. 사무현장에서 사고가 발생할 수 있는 사고유형을 모두 체크하여 주세요. (중복체크 가능)</div>

        <table className="ws-acc-table">
          <thead>
            <tr>
              <th style={{ width:"62%" }}>사고유형</th>
              <th style={{ width:"38%" }}>장소</th>
            </tr>
          </thead>
          <tbody>
            {ACC_TYPES.map((t, i) => (
              <tr key={i}>
                <td>
                  {t.etc ? (
                    <span>기타&nbsp;(&nbsp;<input className="ws-row-input" style={{ width:"68%" }} value={etcText} onChange={e=>setEtcText(e.target.value)}/>&nbsp;)</span>
                  ) : (
                    <CB checked={accChecks[i].checked} onChange={v=>updAcc(i,v)}>{t.label}</CB>
                  )}
                </td>
                <td>
                  {!t.etc && (
                    <div className="ws-place-cbs">
                      {PLACES.map(p => (
                        <label key={p}>
                          <input type="checkbox" checked={accChecks[i].places[p]} onChange={e=>updPlace(i,p,e.target.checked)}/> {p}
                        </label>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ws-sec-sub">1-2. 그 외에 사고가 발생할 빈한 장소와 위험요인을 적어 주세요.</div>
        <textarea className="ws-write-box" rows={3} value={freeText} onChange={e=>setFreeText(e.target.value)} />
      </div>

      {/* ══════════ 2페이지 ══════════ */}
      <div className="ws-page-2">
        <div className="ws-banner">
          <span>근무환경 청취를 위한 조사표 (콜센터 및 사무환경)</span>
          <img src="assets/logo-will-vision2.png" className="ws-banner-logo" alt="윌앤비전 로고" />
        </div>

        {/* 2. 건강문제 요인 */}
        <div className="ws-sec-title">2. 업무 내용과 관련된 건강문제 요인</div>

        <div className="ws-sec-sub">2-1. 업무와 관련하여 질병이 발생할 수 있는 건강문제를 모두 체크하여 주세요. (중복체크 가능)</div>
        <div style={{ paddingLeft:8, lineHeight:2.1, fontSize:13 }}>
          <CB checked={health.근골격계} onChange={v=>setHealth(p=>({...p,근골격계:v}))}> 근골격계질환(신체에 부담되는 힘·동작, 부적절 작업자세 등으로 근육, 인대 등 손상)</CB><br/>
          <CB checked={health.심뇌혈관} onChange={v=>setHealth(p=>({...p,심뇌혈관:v}))}> 심뇌혈관질환(뇌출혈, 심근경색 등 혈관에 이상이 생겨 발생하는 질환)</CB><br/>
          <CB checked={health.감염성} onChange={v=>setHealth(p=>({...p,감염성:v}))}> 감염성 질환(코로나-19, 독감, 장염 등)</CB><br/>
          <CB checked={health.민원정신} onChange={v=>setHealth(p=>({...p,민원정신:v}))}> 민원응대로 인한 정신건강문제</CB><br/>
          <CB checked={health.직무스트레스} onChange={v=>setHealth(p=>({...p,직무스트레스:v}))}> 직무스트레스로 인한 정신건강문제</CB><br/>
          <label className="ws-cb">
            <input type="checkbox" checked={health.기타} onChange={e=>setHealth(p=>({...p,기타:e.target.checked}))}/>
            &nbsp;기타 질병:&nbsp;<input className="ws-row-input" style={{ width:220 }} value={health.기타텍스트} onChange={e=>setHealth(p=>({...p,기타텍스트:e.target.value}))}/>
          </label>
        </div>

        <div className="ws-sec-sub" style={{ marginTop:14 }}>2-2. 컴퓨터 작업과 관련하여 질병이 발생할 수 있는 위험요인의 정도를 체크하여 주세요.</div>
        <table className="ws-acc-table">
          <thead>
            <tr>
              <th style={{ width:"70%" }}>유해 위험요인</th>
              <th style={{ width:"15%" }}>예</th>
              <th style={{ width:"15%" }}>아니오</th>
            </tr>
          </thead>
          <tbody>
            {PC_RISKS.map((q, i) => (
              <tr key={i}>
                <td style={{ fontSize:12 }}>{q}</td>
                <td style={{ textAlign:"center" }}>
                  <label style={{ cursor:"pointer" }}>
                    <input type="checkbox" checked={pcRisks[i].예} onChange={e=>updPc(i,"예",e.target.checked)}
                      style={{ WebkitAppearance:"checkbox", MozAppearance:"checkbox", appearance:"checkbox", width:13, height:13, cursor:"pointer", accentColor:"#1B2430" }}/>
                  </label>
                </td>
                <td style={{ textAlign:"center" }}>
                  <label style={{ cursor:"pointer" }}>
                    <input type="checkbox" checked={pcRisks[i].아니오} onChange={e=>updPc(i,"아니오",e.target.checked)}
                      style={{ WebkitAppearance:"checkbox", MozAppearance:"checkbox", appearance:"checkbox", width:13, height:13, cursor:"pointer", accentColor:"#1B2430" }}/>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ws-sec-sub">2-3. 그 외에 업무하다가 질병이 발생할 수 있는 업무와 위험요인을 적어 주세요.</div>
        <textarea className="ws-write-box" rows={3} value={healthFreeText} onChange={e=>setHealthFreeText(e.target.value)} />

        {/* 3. 개선의견 */}
        <div className="ws-sec-title" style={{ marginTop:16 }}>3. 위와 관련하여 요인별 개선의견에 대해 작성해주세요.</div>
        <table className="ws-impr-tbl">
          <thead>
            <tr>
              <th style={{ width:"30%" }}>관련 요인</th>
              <th>개선 의견</th>
            </tr>
          </thead>
          <tbody>
            {improvements.map((r, i) => (
              <tr key={i} style={{ height:44 }}>
                <td><input className="ws-input" value={r.factor} onChange={e=>updImpr(i,"factor",e.target.value)} /></td>
                <td><input className="ws-input" value={r.opinion} onChange={e=>updImpr(i,"opinion",e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { WorkerSurveyView });
