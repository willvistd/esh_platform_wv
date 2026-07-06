'use strict';
// ── 법적의무 자동판정 페이지 (산업안전보건법 시행령 별표2·3·5·9 기반) ──

const BIZ_OPTIONS = [
  {
    group: "제조업 (안전관리자·책임자 50인↑, 별표3 제1~21호)",
    items: [
      { v: "A|1", l: "목재·나무제품 제조업 (가구 제외)" },
      { v: "A|1", l: "화학물질·화학제품 제조업 (의약품 제외)" },
      { v: "A|1", l: "코크스·연탄·석유정제품 제조업" },
      { v: "A|1", l: "고무·플라스틱제품 제조업" },
      { v: "A|1", l: "비금속광물제품 제조업" },
      { v: "A|1", l: "1차 금속 제조업 (제철·제강·비철금속 등)" },
      { v: "A|1", l: "금속가공제품 제조업 (기계·가구 제외)" },
      { v: "A|1", l: "기계·장비 제조업" },
      { v: "A|1", l: "자동차·트레일러 제조업" },
      { v: "A|1", l: "기타 운송장비 제조업 (선박·철도·항공기 등)" },
      { v: "A|1", l: "식료품 제조업" },
      { v: "A|1", l: "음료 제조업" },
      { v: "A|1", l: "섬유제품 제조업 (의복 제외)" },
      { v: "A|1", l: "의복·의복 액세서리·모피제품 제조업" },
      { v: "A|1", l: "가죽·가방·신발 제조업" },
      { v: "A|1", l: "의료용 물질·의약품 제조업" },
      { v: "A|1", l: "전기장비 제조업" },
      { v: "A|1", l: "전자부품·컴퓨터·영상·음향·통신장비 제조업" },
      { v: "A|1", l: "인쇄·기록매체 복제업" },
      { v: "A|1", l: "펄프·종이·종이제품 제조업" },
      { v: "A|1", l: "제조업 기타 (1~20호 이외 전체)" },
    ],
  },
  {
    group: "건설업 (공사금액 50억↑ 또는 상시 50인↑, 별표3 제49호)",
    items: [
      { v: "A|1", l: "건설업 (건축·토목·전문 건설 전체)" },
    ],
  },
  {
    group: "임업·환경·에너지·운수 (50인↑, 별표3 제22~27호)",
    items: [
      { v: "A|1", l: "임업" },
      { v: "A|1", l: "폐기물 수집·운반·처리업" },
      { v: "A|1", l: "환경정화·복원업" },
      { v: "A|1", l: "하수·폐수·분뇨 처리업" },
      { v: "A|0", l: "전기·가스·증기·공기조절 공급업" },
      { v: "A|0", l: "수도 공급업" },
      { v: "A|0", l: "운수·창고업 (물류센터·하역·운반 포함)" },
      { v: "A|0", l: "자동차 수리·판매업" },
    ],
  },
  {
    group: "서비스·시설관리 (안전보건책임자 100인↑, 별표3 제28~46호)",
    items: [
      { v: "C|0", l: "건물관리·시설관리업 (FM)" },
      { v: "C|0", l: "청소·방제 서비스업" },
      { v: "C|0", l: "경비·보안 서비스업" },
      { v: "C|0", l: "사업시설 유지관리·지원 서비스업" },
      { v: "C|0", l: "농업·어업 (100인 이상 사업장)" },
      { v: "C|0", l: "도매업" },
      { v: "C|0", l: "소매업" },
      { v: "C|0", l: "전자상거래업" },
      { v: "C|0", l: "숙박업" },
      { v: "C|0", l: "음식점업·주점업" },
      { v: "C|0", l: "육상운송업 (화물자동차·택배 등)" },
      { v: "C|0", l: "항공운송업" },
      { v: "C|0", l: "수상운송업" },
      { v: "C|0", l: "공공행정·국방업" },
      { v: "C|0", l: "교육서비스업 (유치원·초·중·고·특수학교)" },
      { v: "C|0", l: "의료업·병원" },
      { v: "C|0", l: "보건업 (의원·요양기관 등)" },
      { v: "C|0", l: "사회복지서비스업" },
      { v: "C|0", l: "예술·스포츠·여가 서비스업" },
      { v: "C|0", l: "수리·설치 서비스업" },
      { v: "C|0", l: "개인 서비스업 (세탁·미용 등)" },
      { v: "C|0", l: "기타 서비스업" },
    ],
  },
  {
    group: "사무직 중심 (안전보건책임자 300인↑, 별표3 제47~48호)",
    items: [
      { v: "B|0", l: "소프트웨어·IT·정보서비스업" },
      { v: "B|0", l: "금융업·은행업" },
      { v: "B|0", l: "보험업" },
      { v: "B|0", l: "부동산업" },
      { v: "B|0", l: "전문·과학·기술 서비스업 (사무직 위주)" },
      { v: "B|0", l: "경영컨설팅·광고·시장조사업" },
      { v: "B|0", l: "교육서비스업 (대학·대학원)" },
    ],
  },
];

const _respN  = c => c.tier === 'A' ? 50  : c.tier === 'B' ? 300 : 100;
// 별표9: 위원회 구성 기준은 tier가 아닌 mgmt5(제조·건설·임업·하수·폐기물 등 1~21호+49호) 여부로 결정
const _wiwonN = c => c.mgmt5 ? 50 : 100;
const REQ  = w => ({ s: 'req',  why: w });
const COND = w => ({ s: 'cond', why: w });
const NO   = w => ({ s: 'no',   why: w });

const LEGAL_ITEMS = [
  { n:"1",  t:"안전 및 보건에 관한 계획수립",          owner:"본사",        keep:"3년", docs:["안전보건계획서"],
    r:c=>c.n>=5?REQ("상시 5인↑ — 중대재해처벌법·산안법상 연간 안전보건계획 수립 대상"):COND("5인 미만 — 자율 수립 권고") },
  { n:"2",  t:"산업안전보건위원회",                     owner:"본사",        keep:"2년", docs:["회의록(분기)"],
    r:c=>c.n>=_wiwonN(c)?REQ(`상시 ${_wiwonN(c)}인↑ — 위원회 구성·분기 개최 의무(별표9)`):NO(`구성 기준 ${_wiwonN(c)}인 미만 — 의무 없음`) },
  { n:"3",  t:"관리감독자 업무수행 증빙",               owner:"사업장",      keep:"3년", docs:["업무 일지(매일)"],
    r:c=>c.n>=5?REQ("관리감독자 지정 사업장 — 업무수행 증빙 보존"):COND("5인 미만 — 해당 시") },
  { n:"4",  t:"근로자 채용 시 교육",                    owner:"사업장",      keep:"3년", docs:["교육일지/수료증"],
    r:c=>c.n>=5?REQ("상시 5인↑ — 채용 시 교육 의무"):NO("5인 미만 — 교육 적용 제외") },
  { n:"5",  t:"근로자 정기교육",                        owner:"사업장",      keep:"3년", docs:["교육일지/수료증(매반기)"],
    r:c=>c.n>=5?REQ("상시 5인↑ — 정기교육(매반기) 의무"):NO("5인 미만 — 교육 적용 제외") },
  { n:"6",  t:"작업내용 변경 시 교육",                  owner:"사업장",      keep:"3년", docs:["교육일지/수료증"],
    r:c=>c.n>=5?COND("작업내용 변경이 발생할 때"):NO("5인 미만 — 교육 적용 제외") },
  { n:"7",  t:"근로자 특별교육",                        owner:"사업장",      keep:"3년", docs:["교육일지"],
    r:_=>COND("유해·위험작업(특별교육 대상작업) 취급 시") },
  { n:"8",  t:"관리감독자 교육 (연 16시간)",            owner:"사업장",      keep:"3년", docs:["교육일지/수료증"],
    r:c=>c.n>=5?REQ("관리감독자 지정 사업장 — 연 16시간 교육 의무"):NO("5인 미만 — 적용 제외") },
  { n:"9",  t:"물질안전보건(MSDS) 교육",                owner:"사업장",      keep:"3년", docs:["교육일지"],
    r:c=>c.chem?REQ("대상물질 취급 — 취급 근로자 MSDS 교육 의무"):COND("화학물질·MSDS 대상물질 취급 시") },
  { n:"10", t:"정기 위험성평가",                        owner:"사업장",      keep:"5년", docs:["정기 위험성평가 결과보고서"],
    r:_=>REQ("전 사업장 의무 — 연 1회 정기 실시·5년 보존") },
  { n:"11", t:"수시·상시 위험성평가",                   owner:"사업장",      keep:"5년", docs:["수시 위험성평가 결과보고서"],
    r:_=>REQ("전 사업장 의무 — 설비·작업 변경·산재 발생 시 수시 실시") },
  { n:"12", t:"일일 TBM 활동",                          owner:"사업장 전 근로자", keep:"3년", docs:["단체방 / TBM 일지 / 조·석회 (택1)"],
    r:_=>COND("권장 활동 — 위험작업 사업장은 운영 권고") },
  { n:"13", t:"작업계획 수립 및 작업허가",              owner:"사업장",      keep:"3년", docs:["작업계획서","작업허가서"],
    r:_=>COND("차량계·고소·중량물 등 계획 대상작업 발생 시") },
  { n:"14", t:"유해·위험기계기구 및 공도구 관리",       owner:"사업장",      keep:"3년", docs:["사용점검대장","등록관리대장","사다리 사용관리대장"],
    r:_=>COND("해당 기계기구·사다리 등 보유 시 (보유 시 매월 점검)") },
  { n:"15", t:"안전인증 대상 관리",                     owner:"사업장",      keep:"3년", docs:["안전인증 기계기구 인증서","보호구 인증서"],
    r:_=>COND("안전인증 대상 기계기구·보호구 보유 시") },
  { n:"16", t:"안전보호구 지급 및 관리대장",            owner:"사업장",      keep:"3년", docs:["지급대장","관리대장"],
    r:c=>c.n>=5?REQ("보호구 지급 사업장 — 지급·관리대장 비치"):COND("해당 시") },
  { n:"17", t:"건강검진 실시 (일반/특수)",              owner:"사업장",      keep:"3년", docs:["개인별 건강검진 결과"],
    r:c=>REQ("일반건강진단 전 근로자 의무"+(c.chem?" · 유해인자 노출자 특수건강진단 추가":" (특수검진은 유해인자 노출 시)")) },
  { n:"18", t:"건강검진 유소견자 관리",                 owner:"사업장",      keep:"3년", docs:["유소견자 상담일지(관리감독자 자필)"],
    r:_=>COND("건강검진 유소견자(D·R 판정) 발생 시") },
  { n:"19", t:"근골격계부담작업",                       owner:"사업장",      keep:"3년", docs:["체크리스트","유해요인조사표","증상조사표","개선계획서"],
    r:_=>COND("근골격계부담작업 보유 시 — 3년 주기 유해요인조사") },
  { n:"22", t:"고객 폭언 등 건강장해 예방조치",        owner:"사업장",      keep:"3년", docs:["고객응대 매뉴얼","건강장해 예방교육"],
    r:c=>c.customer?REQ("고객응대 직종(보안·안내) — 예방조치 의무"):COND("보안·안내 등 고객응대 직종 있을 시") },
  { n:"23", t:"산업재해 발생보고 및 재발방지",         owner:"사업장",      keep:"3년", docs:["산업재해조사표","재발방지 대책","수시 위험성평가"],
    r:_=>COND("산업재해 발생 시 (발생일 1개월 이내 보고)") },
  { n:"24", t:"중대재해처벌법 대응 서류",              owner:"본사",        keep:"3년", docs:["안전보건목표·경영방침","관계법령 이행점검","예산편성","책임자 평가표"],
    r:c=>c.n>=5?REQ("상시 5인↑ — 중처법 안전보건확보 의무"+(c.n>=500?" · 전담조직 설치 대상(500인↑)":"")):NO("5인 미만 — 중처법 적용 제외") },
  { n:"25", t:"종사자 의견 청취 및 개선",             owner:"본사",        keep:"3년", docs:["의견청취 절차서","의견청취서"],
    r:c=>c.n>=5?REQ("상시 5인↑ — 반기 1회 의견청취"+(c.n>=300?" · 사업장 단위 작성 대상(300인↑)":"")):NO("5인 미만 — 적용 제외") },
  { n:"26", t:"중대산업재해 대응교육 및 훈련",        owner:"본사/사업장", keep:"3년", docs:["대응 절차서","실시 보고서","점검표"],
    r:c=>c.n>=5?REQ("상시 5인↑ — 비상대응 매뉴얼·반기 훈련"):NO("5인 미만 — 적용 제외") },
  { n:"27", t:"물질안전보건자료(MSDS)",               owner:"사업장",      keep:"3년", docs:["MSDS 관리대장","MSDS 자료(개별 물품)"],
    r:c=>c.chem?REQ("대상물질 취급 — 취급장소 비치·관리대장 작성"):COND("화학물질·MSDS 대상물질 취급 시") },
  { n:"+1", add:true, t:"온열질환(폭염) 예방조치",   owner:"사업장",      keep:"연말까지", docs:["위험성평가 폭염 반영","5대 기본수칙 점검표","체감온도·휴식 기록","자각증상 점검표"],
    r:c=>c.outdoor?REQ("폭염작업(체감온도 31℃↑·2h↑) — 법정 보건조치·기록 연말 보관"):COND("옥외·고열 작업 있을 시 (2025.7.17 의무화)") },
  { n:"+2", add:true, t:"밀폐공간 보건작업 프로그램",owner:"사업장",      keep:"3년", docs:["작업프로그램","출입·작업 허가서","가스농도 측정기록","특별교육"],
    r:c=>c.conf?REQ("밀폐공간 보유 — 작업프로그램 수립·허가제 운영"):COND("정화조·물탱크·집수정·맨홀 등 보유 시") },
  { n:"+3", add:true, t:"작업환경측정",               owner:"사업장",      keep:"5년/30년", docs:["측정 결과보고서","측정대상 유해인자 목록"],
    r:c=>c.chem?REQ("소음·분진·유기화합물 등 노출 — 6개월~1년 주기 측정"):COND("유해인자(소음·분진·화학물질) 노출 시") },
  { n:"+4", add:true, t:"안전보건 관리체계 선임 서류",owner:"본사/사업장", keep:"3년", docs:[],
    r:c=>{
      const roles=[];
      if(c.n>=_respN(c)) roles.push(`안전보건관리책임자(${_respN(c)}인↑)`);
      if(c.n>=50 && c.tier!=='B') roles.push("안전관리자·보건관리자(50인↑)");
      if(c.tier==='B' && c.n>=50) roles.push("안전관리자(50인↑·사무직만 사업장은 제외 가능)");
      if(c.mgmt5 && c.n>=20 && c.n<50) roles.push("안전보건관리담당자(20~50인 미만·5개 업종)");
      if(c.n>=500) roles.push("대표이사 안전보건계획 이사회 보고(500인↑)");
      return roles.length
        ? REQ("선임/지정 대상: "+roles.join(", ")+" — 선임 후 14일 내 보고")
        : COND("현재 규모·업종에서는 법정 선임의무 없음 — 관리감독자 지정만 운영");
    }},
  { n:"+5", add:true, t:"도급사업 안전·보건 조치",   owner:"사업장",      keep:"3년", docs:["안전보건협의체 회의록","합동 안전점검","순회점검","적격수급 평가"],
    r:c=>c.contract?REQ("도급·협력업체 운영 — 협의체·합동점검·순회점검 의무"):COND("도급(협력업체) 있을 시") },
  { n:"+6", add:true, t:"비상조치계획·소방훈련",      owner:"본사/사업장", keep:"3년", docs:["비상대피도","비상연락망","소방계획서","합동 훈련일지"],
    r:_=>COND("소방안전관리 대상물 — 연 1회↑ 훈련") },
  { n:"+7", add:true, t:"휴게시설 설치·관리",         owner:"사업장",      keep:"-", docs:["설치현황","관리기준(면적·온도·위치)"],
    r:c=>c.n>=20?REQ("상시 20인↑ — 휴게시설 설치·관리기준 준수 의무"):COND("특정 직종 2인↑ 등 요건 충족 시") },
];

const COND_CHIPS = [
  { k:"chem",     label:"화학물질·MSDS 대상물질 취급" },
  { k:"conf",     label:"밀폐공간 보유 (정화조·맨홀 등)" },
  { k:"outdoor",  label:"옥외·고열 작업 (폭염 노출)" },
  { k:"contract", label:"도급·협력업체 운영" },
  { k:"customer", label:"고객응대 직종 (보안·안내)" },
];

function LegalCheckerView({ onNav, currentUser }) {
  const [n, setN] = React.useState(30);
  const [biz, setBiz] = React.useState({ v: "C|0", l: "건물관리·시설관리업 (FM)" });
  const [search, setSearch] = React.useState("");
  const [showDrop, setShowDrop] = React.useState(false);
  const [conds, setConds] = React.useState({ chem:false, conf:false, outdoor:false, contract:false, customer:false });
  const [showNo, setShowNo] = React.useState(false);
  const dropRef = React.useRef(null);

  // 바깥 클릭 시 드롭다운 닫기
  React.useEffect(() => {
    if (!showDrop) return;
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDrop]);

  // 검색 필터
  const filteredBiz = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return BIZ_OPTIONS;
    return BIZ_OPTIONS.map(g => ({
      ...g, items: g.items.filter(o => o.l.toLowerCase().includes(q))
    })).filter(g => g.items.length > 0);
  }, [search]);

  // 판정 컨텍스트
  const ctx = React.useMemo(() => {
    const [tier, m5] = biz.v.split("|");
    return { n: parseInt(n) || 0, tier, mgmt5: m5 === "1", ...conds };
  }, [n, biz, conds]);

  // 판정 결과
  const buckets = React.useMemo(() => {
    const b = { req:[], cond:[], no:[] };
    LEGAL_ITEMS.forEach(it => { const r = it.r(ctx); b[r.s].push({ it, why: r.why }); });
    return b;
  }, [ctx]);

  const toggleCond = k => setConds(prev => ({ ...prev, [k]: !prev[k] }));

  const selectBiz = opt => { setBiz(opt); setSearch(""); setShowDrop(false); };

  // 색상 팔레트
  const colors = {
    req:  { fg:"var(--danger)",  bg:"rgba(217,45,32,0.07)",  border:"rgba(217,45,32,0.2)",  rail:"var(--danger)" },
    cond: { fg:"var(--warning)", bg:"rgba(245,158,11,0.07)", border:"rgba(245,158,11,0.25)", rail:"var(--warning)" },
    no:   { fg:"var(--fg-4)",   bg:"var(--bg-sunk)",         border:"var(--line)",           rail:"var(--fg-4)" },
  };

  const cardStyle = { background:"var(--bg-elev)", border:"1px solid var(--line)", borderRadius:"var(--r-md)", padding:"16px 20px", boxShadow:"var(--shadow)" };

  return (
    <div className="content" style={{ maxWidth: 920 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color:"var(--fg)", margin:"0 0 4px" }}>법적의무 자동판정</h2>
        <p style={{ fontSize: 13, color:"var(--fg-3)", margin:0 }}>
          상시근로자 수·업종을 입력하면 필수·해당·제외 서류를 자동 분류합니다. (시행령 별표2·3·5·9 기준)
        </p>
      </div>

      {/* 입력 카드 */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:16, alignItems:"end" }}>
          {/* 인원 수 */}
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--fg-3)", marginBottom:6 }}>
              상시근로자 수 <span style={{ fontWeight:500 }}>(명)</span>
            </label>
            <input
              type="number" min="1" value={n}
              onChange={e => setN(e.target.value)}
              style={{ width:"100%", fontFamily:"inherit", fontSize:20, fontWeight:700, textAlign:"center",
                border:"1.5px solid var(--line)", borderRadius:"var(--r-sm)", padding:"10px 8px",
                background:"var(--bg-sunk)", color:"var(--fg)", outline:"none", boxSizing:"border-box" }}
              onFocus={e => e.target.style.borderColor = "var(--primary)"}
              onBlur={e => e.target.style.borderColor = "var(--line)"}
            />
          </div>

          {/* 업종 검색 드롭다운 */}
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--fg-3)", marginBottom:6 }}>
              업종 <span style={{ fontWeight:500 }}>(시행령 별표 기준)</span>
            </label>
            <div ref={dropRef} style={{ position:"relative" }}>
              <input
                type="text"
                value={showDrop ? search : biz.l}
                placeholder="업종명 검색 또는 선택…"
                onFocus={() => { setSearch(""); setShowDrop(true); }}
                onChange={e => setSearch(e.target.value)}
                style={{ width:"100%", fontFamily:"inherit", fontSize:14, fontWeight: showDrop ? 400 : 600,
                  border:"1.5px solid var(--line)", borderRadius:"var(--r-sm)", padding:"11px 36px 11px 12px",
                  background:"var(--bg-sunk)", color:"var(--fg)", outline:"none", boxSizing:"border-box",
                  ...(showDrop && { borderColor:"var(--primary)", background:"var(--bg-elev)" }) }}
              />
              <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                fontSize:12, color:"var(--fg-4)", pointerEvents:"none" }}>
                {showDrop ? "▲" : "▼"}
              </span>

              {showDrop && (
                <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:200,
                  background:"var(--bg-elev)", border:"1.5px solid var(--primary)", borderRadius:"var(--r-sm)",
                  boxShadow:"var(--shadow-lg)", maxHeight:320, overflowY:"auto" }}>
                  {filteredBiz.length === 0 && (
                    <div style={{ padding:"14px 16px", fontSize:13, color:"var(--fg-4)", textAlign:"center" }}>
                      검색 결과 없음
                    </div>
                  )}
                  {filteredBiz.map((g, gi) => (
                    <div key={gi}>
                      <div style={{ padding:"8px 12px 4px", fontSize:11, fontWeight:700,
                        color:"var(--fg-4)", background:"var(--bg-sunk)", borderBottom:"1px solid var(--line-2)" }}>
                        {g.group}
                      </div>
                      {g.items.map((opt, oi) => (
                        <div key={oi} onClick={() => selectBiz(opt)}
                          style={{ padding:"9px 16px", fontSize:13, cursor:"pointer",
                            color: biz.v === opt.v && biz.l === opt.l ? "var(--primary)" : "var(--fg)",
                            fontWeight: biz.l === opt.l ? 700 : 400 }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--primary-soft)"}
                          onMouseLeave={e => e.currentTarget.style.background = ""}>
                          {opt.l}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 작업 특성 칩 */}
        <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid var(--line-2)" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"var(--fg-4)", marginBottom:8 }}>
            작업 특성 선택 — 켜면 해당 항목이 '필수'로 올라갑니다
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {COND_CHIPS.map(chip => (
              <button key={chip.k} onClick={() => toggleCond(chip.k)}
                style={{ fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer",
                  padding:"7px 14px", borderRadius:99, transition:"all 0.12s",
                  border: conds[chip.k] ? "1.5px solid var(--primary)" : "1.5px solid var(--line)",
                  background: conds[chip.k] ? "var(--primary-soft)" : "var(--bg-elev)",
                  color: conds[chip.k] ? "var(--primary)" : "var(--fg-3)" }}>
                {conds[chip.k] ? "✓ " : ""}{chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 요약 카드 3개 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:24 }}>
        {[
          { key:"req",  label:"필수",         color: colors.req },
          { key:"cond", label:"해당 시",       color: colors.cond },
          { key:"no",   label:"우리 규모 제외", color: colors.no },
        ].map(({ key, label, color }) => (
          <div key={key} style={{ background:"var(--bg-elev)", border:`1px solid var(--line)`,
            borderTop:`3px solid ${color.rail}`, borderRadius:"var(--r-md)",
            boxShadow:"var(--shadow)", padding:"14px 16px", textAlign:"center" }}>
            <div style={{ fontSize:32, fontWeight:800, color: color.fg, lineHeight:1 }}>
              {buckets[key].length}
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--fg-3)", marginTop:5 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* 결과 그룹 */}
      {[
        { key:"req",  title:"필수 — 반드시 챙겨야 할 서류",        foldDefault:false },
        { key:"cond", title:"해당 시 — 조건 발생 시 갖춰야 할 서류", foldDefault:false },
        { key:"no",   title:"우리 규모 제외 — 현재 인원·업종에서 의무 아님", foldDefault:true },
      ].map(({ key, title, foldDefault }) => {
        const col = colors[key];
        const items = buckets[key];
        const [open, setOpen] = React.useState(!foldDefault);
        return (
          <div key={key} style={{ marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ width:9, height:9, borderRadius:"50%", background: col.rail, flexShrink:0, display:"inline-block" }} />
              <span style={{ fontSize:14, fontWeight:800, color:"var(--fg)" }}>{title}</span>
              <span style={{ fontSize:12, fontWeight:700, color:"var(--fg-4)", background:"var(--bg-sunk)",
                border:"1px solid var(--line)", borderRadius:99, padding:"2px 10px" }}>
                {items.length}건
              </span>
              {foldDefault && (
                <button onClick={() => setOpen(o => !o)}
                  style={{ marginLeft:"auto", fontFamily:"inherit", fontSize:12, fontWeight:600,
                    color:"var(--fg-3)", background:"var(--bg-elev)", border:"1px solid var(--line)",
                    borderRadius:"var(--r-sm)", padding:"5px 12px", cursor:"pointer" }}>
                  {open ? "▾ 접기" : `▸ ${items.length}건 펼쳐보기`}
                </button>
              )}
            </div>
            {open && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {items.map(({ it, why }) => (
                  <div key={it.n} style={{ background:"var(--bg-elev)", border:`1px solid var(--line)`,
                    borderRadius:"var(--r-md)", boxShadow:"var(--shadow)", display:"flex", overflow:"hidden",
                    opacity: key === "no" ? 0.65 : 1 }}>
                    <div style={{ width:5, flexShrink:0, background: col.rail }} />
                    <div style={{ flex:1, padding:"12px 15px", minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
                        <span style={{ fontSize:14, fontWeight:700, color:"var(--fg)", letterSpacing:"-0.02em" }}>
                          {it.t}
                        </span>
                        {it.add && (
                          <span style={{ fontSize:10, fontWeight:800, color:"var(--success)",
                            background:"rgba(31,138,91,0.1)", border:"1px solid rgba(31,138,91,0.25)",
                            borderRadius:5, padding:"1px 6px" }}>추가</span>
                        )}
                      </div>
                      <div style={{ fontSize:12.5, color:"var(--fg-2)", marginTop:5, lineHeight:1.55 }}>{why}</div>
                      {it.docs.length > 0 && (
                        <div style={{ marginTop:6, display:"flex", flexWrap:"wrap", gap:"0 6px" }}>
                          {it.docs.map((d, di) => (
                            <span key={di} style={{ fontSize:11.5, color:"var(--fg-3)",
                              background:"var(--bg-sunk)", border:"1px solid var(--line-2)",
                              borderRadius:6, padding:"2px 8px", marginBottom:3 }}>{d}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink:0, padding:"12px 14px", display:"flex", flexDirection:"column",
                      alignItems:"flex-end", justifyContent:"center", gap:5, borderLeft:"1px solid var(--line-2)",
                      minWidth:110, textAlign:"right" }}>
                      <span style={{ fontSize:12.5, fontWeight:800, padding:"3px 10px", borderRadius:"var(--r-sm)",
                        color: col.fg, background: col.bg }}>
                        {key === "req" ? "필수" : key === "cond" ? "해당 시" : "제외"}
                      </span>
                      <span style={{ fontSize:11, color:"var(--fg-4)" }}>작성 {typeof it.owner === "function" ? it.owner() : it.owner}</span>
                      <span style={{ fontSize:11, color:"var(--fg-4)" }}>보존 <strong style={{ color:"var(--fg-3)" }}>{it.keep}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ paddingTop:16, borderTop:"1px solid var(--line)", fontSize:11.5, color:"var(--fg-4)", lineHeight:1.7 }}>
        선임·구성 기준은 산업안전보건법 시행령(별표2·3·5·9) 및 중대재해처벌법 기준입니다.<br/>
        실제 적용은 사업장 표준산업분류·작업 내용에 따라 달라질 수 있으니 최종 확인은 관할 노동청·별표 원문을 참고하세요.
      </div>
    </div>
  );
}

Object.assign(window, { LegalCheckerView });
