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
  { n:"1",  t:"안전 및 보건에 관한 계획수립 (대표이사 이사회보고)", owner:"본사", keep:"3년", docs:["안전보건계획서","이사회 보고·승인 자료"],
    r:c=>c.n>=500?REQ("상시 500인↑ — 산안법 제14조, 대표이사 안전보건계획 수립·이사회 보고·승인 의무 (시공능력순위 1,000위 이내 건설사도 별도 해당)"):NO("500인 미만 — 산안법 제14조 이사회보고 대상 아님 (5인↑ 안전보건목표·경영방침 수립은 24번 항목 참고)") },
  { n:"2",  t:"산업안전보건위원회",                     owner:"본사",        keep:"2년", docs:["회의록(분기)"],
    r:c=>c.n>=_wiwonN(c)?REQ(`상시 ${_wiwonN(c)}인↑ — 위원회 구성·분기 개최 의무(별표9)`):NO(`구성 기준 ${_wiwonN(c)}인 미만 — 의무 없음`) },
  { n:"3",  t:"관리감독자 업무수행 증빙",               owner:"사업장",      keep:"3년", docs:["업무 일지(매일)"],
    r:c=>c.n>=5?REQ("관리감독자 지정 사업장 — 업무수행 증빙 보존"):COND("5인 미만 — 해당 시") },
  { n:"4",  t:"근로자 채용 시 교육",                    owner:"사업장",      keep:"3년", docs:["교육일지/수료증"],
    r:c=>c.n<5?NO("5인 미만 — 교육 적용 제외"):(c.office?COND("사무직만 종사 사업장 — 산안법 시행령 별표1에 따라 채용 시 교육 제외 여부 확인 필요"):REQ("상시 5인↑ — 채용 시 교육 의무")) },
  { n:"5",  t:"근로자 정기교육",                        owner:"사업장",      keep:"3년", docs:["교육일지/수료증(매반기)"],
    r:c=>c.n<5?NO("5인 미만 — 교육 적용 제외"):(c.office?COND("사무직만 종사 사업장 — 별표1에 따라 사무직 근로자 정기교육 제외 여부 확인 필요"):REQ("상시 5인↑ — 정기교육(매반기) 의무")) },
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
  { n:"17", t:"건강검진 실시 (일반/특수)",              owner:"사업장",      keep:"일반 5년 · 발암성 특수 30년", docs:["개인별 건강검진 결과"],
    r:c=>REQ("일반건강진단(사무직 2년 1회·그 외 1년 1회) 전 근로자 의무"+(c.chem?" · 유해인자 노출자 특수건강진단(유해인자별 주기) 추가":" (특수검진은 유해인자 노출 시)")) },
  { n:"18", t:"건강검진 유소견자 관리",                 owner:"사업장",      keep:"3년", docs:["유소견자 상담일지(관리감독자 자필)"],
    r:_=>COND("건강검진 유소견자(D·R 판정) 발생 시") },
  { n:"19", t:"근골격계부담작업",                       owner:"사업장",      keep:"3년", docs:["체크리스트","유해요인조사표","증상조사표","개선계획서"],
    r:_=>COND("근골격계부담작업 보유 시 — 3년 주기 유해요인조사") },
  { n:"20", t:"안전보건관리규정 작성·게시",             owner:"본사",        keep:"상시 비치", docs:["안전보건관리규정"],
    r:c=>{ const th=c.tier==='B'?300:100; return c.n>=th?REQ(`상시 ${th}인↑ — 산안법 제25조, 안전보건관리규정 작성·게시 의무 (별표2 기준 업종별 100인 또는 300인)`):NO(`${th}인 미만 — 작성 의무 대상 아님(별표2)`); } },
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
  { k:"office",   label:"사무직만 종사 (교육 일부 제외 검토)" },
];

function LegalCheckerView({ onNav, currentUser, initialLawQuery = "" }) {
  const [tab, setTab] = React.useState(initialLawQuery ? "search" : "checker");   // checker | search
  const [n, setN] = React.useState(30);
  const [biz, setBiz] = React.useState({ v: "C|0", l: "건물관리·시설관리업 (FM)" });
  const [search, setSearch] = React.useState("");
  const [showDrop, setShowDrop] = React.useState(false);
  const [conds, setConds] = React.useState({ chem:false, conf:false, outdoor:false, contract:false, customer:false, office:false });
  const [showNo, setShowNo] = React.useState(false);
  const [noOpen, setNoOpen] = React.useState(false);   // '제외' 그룹 펼침 상태(기본 접힘)
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
      {/* 탭: 법적의무 자동판정 / 안전보건법령 검색 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, borderBottom: "1px solid var(--line)" }}>
        {[["checker", "법적의무 자동판정"], ["search", "안전보건법령 검색"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ border: "none", background: "transparent", cursor: "pointer", padding: "10px 16px", fontSize: 14,
              fontWeight: tab === k ? 800 : 600, color: tab === k ? "var(--primary)" : "var(--fg-3)",
              borderBottom: tab === k ? "2.5px solid var(--primary)" : "2.5px solid transparent", marginBottom: -1 }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "search" && <LawSearchPanel initialQuery={initialLawQuery} />}

      {tab === "checker" && (<>
      <div className="content-hd">
        <div>
          <h1 className="content-title">법적의무 자동판정</h1>
          <div className="content-sub">
            상시근로자 수·업종을 입력하면 필수·해당·제외 서류를 자동 분류합니다. (시행령 별표2·3·5·9 기준)
          </div>
        </div>
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
        // 훅을 루프 안에서 호출하지 않도록 상단 state 사용('제외' 그룹만 접힘 토글)
        const open = foldDefault ? noOpen : true;
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
                <button onClick={() => setNoOpen(o => !o)}
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
      </>)}
    </div>
  );
}

// ── 안전보건법령 스마트검색 (공공데이터포털 KOSHA OpenAPI) ──
//   백엔드 /api/kosha-search 프록시를 통해 산업안전보건법·령·규칙, KOSHA GUIDE, 미디어 등을 키워드 검색.
function LawSmartSearch({ initialQuery = "" }) {
  // 자료 구분(국가법령정보센터와 동일한 체크박스 방식). '전체'는 상단 마스터 토글.
  const CATS = [
    { v: "1", l: "산업안전보건법" }, { v: "2", l: "시행령" }, { v: "3", l: "시행규칙" },
    { v: "4", l: "안전보건기준규칙" }, { v: "5", l: "고시·훈령·예규" }, { v: "8", l: "중대재해처벌법" },
    { v: "9", l: "중대재해처벌법 시행령" }, { v: "11", l: "유해·위험작업 취업제한 규칙" },
    { v: "7", l: "KOSHA GUIDE" }, { v: "6", l: "미디어" },
  ];
  const CAT_LABEL = CATS.reduce((m, c) => (m[c.v] = c.l, m), { "0": "전체" });
  const catLabel = (v) => CAT_LABEL[String(v)] || String(v || "");
  const defaultSel = () => { const o = {}; CATS.forEach(c => o[c.v] = true); return o; };

  const [q, setQ] = React.useState(initialQuery || "");
  const [sel, setSel] = React.useState(defaultSel);
  const [display, setDisplay] = React.useState(10);   // 분류별 가져올 개수
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState(null);        // { merged, counts, media, totalCount }
  const [err, setErr] = React.useState("");
  const [needKey, setNeedKey] = React.useState(false);
  const [fType, setFType] = React.useState("전체");    // 결과 목록 분류 필터(클라이언트)

  const card = { background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--shadow)" };

  const run = async (overrideQ, lim) => {
    const query = String(overrideQ != null ? overrideQ : q).trim();
    const disp = lim || display;
    const targets = CATS.filter(c => sel[c.v]).map(c => c.v);
    if (!query) { setErr("검색어를 입력하세요."); return; }
    if (targets.length === 0) { setErr("자료 구분을 하나 이상 선택하세요."); return; }
    setLoading(true); setErr(""); setNeedKey(false); setFType("전체");
    const allOn = targets.length === CATS.length;
    try {
      let merged = []; const counts = {}; let media = []; let total = 0; let needKeyAny = false; const errs = [];
      if (allOn) {
        // 전부 선택 → category=0 한 번으로(효율)
        const res = await fetch(`/api/kosha-search?searchValue=${encodeURIComponent(query)}&category=0&pageNo=1&numOfRows=${disp}`);
        const d = await res.json();
        if (d && d.needKey) needKeyAny = true;
        else if (!d || !d.ok) errs.push((d && d.message) || "오류");
        else {
          merged = (d.items || []); media = (d.media || []); total = parseInt(d.totalCount) || 0;
          Object.assign(counts, d.categoryCount || {});
        }
      } else {
        const results = await Promise.all(targets.map(async (v) => {
          try {
            const res = await fetch(`/api/kosha-search?searchValue=${encodeURIComponent(query)}&category=${v}&pageNo=1&numOfRows=${disp}`);
            return { v, d: await res.json() };
          } catch (e) { return { v, d: { ok: false, message: e.message } }; }
        }));
        for (const { v, d } of results) {
          if (d && d.needKey) { needKeyAny = true; continue; }
          if (!d || !d.ok) { errs.push(`${catLabel(v)}: ${(d && d.message) || "오류"}`); continue; }
          counts[v] = parseInt(d.totalCount) || 0;
          total += counts[v];
          (d.items || []).forEach(it => merged.push({ ...it, category: it.category || v }));
          (d.media || []).forEach(m => media.push({ ...m, category: m.category || v }));
        }
      }
      setData({ merged, counts, media, totalCount: total });
      if (merged.length === 0 && media.length === 0) {
        if (needKeyAny) setNeedKey(true);
        else if (errs.length) setErr(errs.join("  /  "));
      }
    } catch (e) { setData(null); setErr("검색 중 오류: " + e.message); }
    finally { setLoading(false); }
  };

  // 홈에서 넘어온 초기 검색어가 있으면 진입 시 자동 검색(1회)
  React.useEffect(() => {
    if (initialQuery && initialQuery.trim()) run(initialQuery);
    // eslint-disable-next-line
  }, [initialQuery]);

  // <em class='smart'>...</em> 강조 → <mark>로 변환(그 외 태그 제거)
  const hl = (s) => {
    const safe = String(s || "").replace(/<(?!\/?em\b)[^>]*>/gi, "");
    return { __html: safe.replace(/<em[^>]*>/gi, "<mark>").replace(/<\/em>/gi, "</mark>") };
  };

  const toggle = (v) => setSel(s => ({ ...s, [v]: !s[v] }));
  const allOn = CATS.every(c => sel[c.v]);
  const setAll = (on) => { const o = {}; CATS.forEach(c => o[c.v] = on); setSel(o); };

  const merged = (data && data.merged) || [];
  const media = (data && data.media) || [];
  const counts = (data && data.counts) || {};
  const totalCount = (data && data.totalCount) || 0;
  const shown = fType === "전체" ? merged : merged.filter(it => String(it.category) === String(fType));

  const resultRow = (it, i) => {
    const link = Array.isArray(it.filepath) ? it.filepath[0] : it.filepath;
    return (
      <div key={i} style={{ padding: "14px 2px", borderBottom: "1px solid var(--line-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span className="chip chip-primary">{catLabel(it.category)}</span>
          {link
            ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)", textDecoration: "none" }} dangerouslySetInnerHTML={hl(it.title)} />
            : <span style={{ fontSize: 15, fontWeight: 700 }} dangerouslySetInnerHTML={hl(it.title)} />}
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          dangerouslySetInnerHTML={hl(it.highlight_content || it.content)} />
        {it.keyword && <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          관련어: {String(it.keyword).split(/\s*,\s*/).filter(Boolean).slice(0, 6).join(" · ")}
        </div>}
      </div>
    );
  };

  return (
    <div>
      <div className="content-hd">
        <div>
          <h1 className="content-title">안전보건법령 검색</h1>
          <div className="content-sub">
            구분을 <b>체크</b>해서 산업안전보건법·시행령·규칙, KOSHA GUIDE, 중대재해처벌법 등을 <b>한 번에</b> 검색합니다. (출처: 안전보건공단 공공데이터)
          </div>
        </div>
      </div>

      {/* 구분 체크박스 — 전체(상단 가운데) + 하위 항목 격자 정렬 */}
      <div style={{ ...card, marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 16, fontWeight: 800, cursor: "pointer", paddingBottom: 11, marginBottom: 11, borderBottom: "1px solid var(--line)" }}>
          <input type="checkbox" checked={allOn} onChange={e => setAll(e.target.checked)} /> 전체
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "9px 10px" }}>
          {CATS.map(c => (
            <label key={c.v} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "var(--fg)", whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={!!sel[c.v]} onChange={() => toggle(c.v)} /> {c.l}
            </label>
          ))}
        </div>
      </div>

      {/* 검색 입력 */}
      <div style={{ ...card, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { setDisplay(10); run(null, 10); } }}
          placeholder="예: 사다리, 밀폐공간, 특별교육…"
          style={{ flex: "1 1 240px", minWidth: 180, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "9px 12px", fontSize: 14, background: "var(--bg-elev)", color: "var(--fg)" }} />
        <button className="btn btn-primary" onClick={() => { setDisplay(10); run(null, 10); }} disabled={loading}>
          {loading ? "검색 중…" : "검색"}
        </button>
      </div>

      {needKey && (
        <div style={{ ...card, marginBottom: 16, borderColor: "#fdba74", background: "#fff7ed" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#c2410c", marginBottom: 6 }}>🔑 공공데이터 인증키 설정이 필요합니다</div>
          <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.75 }}>
            이 검색은 공공데이터포털(data.go.kr)의 <b>안전보건공단 안전보건법령 스마트검색</b> API를 사용합니다.<br />
            1) data.go.kr에서 해당 API <b>활용신청</b> → 인증키(serviceKey) 발급<br />
            2) 발급받은 <b>인증키를 서버 환경변수 <code>law_key</code></b>로 등록(배포 설정)<br />
            설정 방법은 담당(개발)에게 전달해 주시면 바로 검색이 활성화됩니다.
          </div>
        </div>
      )}
      {err && <div style={{ ...card, marginBottom: 16, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{err}</div>}

      {data && !loading && (
        <div style={card}>
          {/* 분류별 건수 필터 칩(클라이언트) */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", margin: "2px 0 12px" }}>
            <button onClick={() => setFType("전체")} className={"chip" + (fType === "전체" ? " chip-primary" : "")}
              style={{ cursor: "pointer", fontWeight: fType === "전체" ? 700 : 500 }}>전체<b style={{ marginLeft: 5 }}>{totalCount.toLocaleString()}</b></button>
            {CATS.filter(c => (parseInt(counts[c.v]) || 0) > 0).map(c => (
              <button key={c.v} onClick={() => setFType(c.v)} className={"chip" + (fType === c.v ? " chip-primary" : "")}
                style={{ cursor: "pointer", fontWeight: fType === c.v ? 700 : 500 }}>
                {c.l}<b style={{ marginLeft: 5 }}>{(parseInt(counts[c.v]) || 0).toLocaleString()}</b>
              </button>
            ))}
          </div>
          {shown.length === 0 && media.length === 0
            ? <div style={{ padding: "28px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13.5 }}>검색 결과가 없습니다.</div>
            : <>
                {shown.map(resultRow)}
                {shown.length === 0 && media.map(resultRow)}
              </>}

          {merged.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
              <button className="btn btn-secondary btn-sm" disabled={loading}
                onClick={() => { const nd = display + 10; setDisplay(nd); run(null, nd); }}>
                더 보기 (분류별 {display}건씩 → {display + 10}건)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 법령 검색 패널 — 출처(산업안전공단 / 국가법령정보센터) 토글 ──
function LawSearchPanel({ initialQuery = "" }) {
  const [src, setSrc] = React.useState("kosha"); // kosha | lawgo
  const seg = (k, label) => (
    <button key={k} onClick={() => setSrc(k)}
      style={{ border: "1px solid var(--line)", cursor: "pointer", padding: "7px 14px", fontSize: 13,
        fontWeight: src === k ? 800 : 600, color: src === k ? "#fff" : "var(--fg-2)",
        background: src === k ? "var(--primary)" : "var(--bg-elev)",
        borderRadius: k === "kosha" ? "999px 0 0 999px" : "0 999px 999px 0" }}>
      {label}
    </button>
  );
  return (
    <div>
      <div style={{ display: "flex", marginBottom: 14 }}>
        {seg("kosha", "안전보건법령 검색")}
        {seg("lawgo", "국가법령정보센터")}
      </div>
      {src === "kosha" ? <LawSmartSearch initialQuery={initialQuery} /> : <LawGoSearch initialQuery={initialQuery} />}
    </div>
  );
}

// ── 국가법령정보센터(law.go.kr) 법령 검색 — 실제 법령 원문으로 딥링크 ──
function LawGoSearch({ initialQuery = "" }) {
  // 자료 구분(HRDB식 체크박스). 판례·해석류 기본 선택, 법령/행정규칙은 선택 시 추가.
  const TYPES = [
    { v: "prec", l: "판례" }, { v: "detc", l: "헌재결정례" }, { v: "expc", l: "법령해석" },
    { v: "decc", l: "행정심판례" }, { v: "nlrc", l: "노동위원회" }, { v: "iaciac", l: "산재재심사" },
    { v: "eiac", l: "고용보험심사위" }, { v: "law", l: "법령" }, { v: "admrul", l: "행정규칙" },
  ];
  const TLABEL = TYPES.reduce((m, t) => (m[t.v] = t.l, m), {});
  const PATHS = { law: "법령", admrul: "행정규칙", prec: "판례", detc: "헌재결정례", expc: "법령해석례", decc: "행정심판례" };
  const defaultSel = () => { const o = {}; TYPES.forEach(t => o[t.v] = !["law", "admrul"].includes(t.v)); return o; };

  const [q, setQ] = React.useState(initialQuery || "");
  const [sel, setSel] = React.useState(defaultSel);
  const [limit, setLimit] = React.useState(20);        // 자료형별 가져올 개수
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState(null);        // { merged:[], counts:{} }
  const [err, setErr] = React.useState("");
  const [needKey, setNeedKey] = React.useState(false);
  const [fType, setFType] = React.useState("전체");    // 결과 목록 분류 필터(클라이언트)
  // 본문 읽기 모달
  const [reader, setReader] = React.useState(null);
  const [rData, setRData] = React.useState(null);
  const [rLoading, setRLoading] = React.useState(false);
  const [rErr, setRErr] = React.useState("");
  // 본문 미리보기(검색어 주변 문장) — 항목별 저장
  const [prev, setPrev] = React.useState({});
  const startedRef = React.useRef({});   // 자동 미리보기 중복 요청 방지

  // 상세 응답에서 본문 텍스트만 추출
  const bodyText = (d) => {
    if (!d) return "";
    if (d.sections && d.sections.length) return d.sections.map(s => (s.title ? s.title + " " : "") + (s.content || "")).join("\n");
    if (d.articles && d.articles.length) return d.articles.map(a => (a.title ? a.title + " " : "") + (a.content || "")).join("\n") + (d.buchik ? "\n" + d.buchik : "");
    return "";
  };
  // 검색어 주변 발췌(앞뒤 radius 글자), 최대 max개
  const makeSnippet = (text, query, radius = 95, max = 2) => {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    if (!t) return [];
    const terms = Array.from(new Set([String(query || "").trim(), ...String(query || "").trim().split(/\s+/)].filter(Boolean)));
    const out = []; const used = [];
    for (const term of terms) {
      if (!term || out.length >= max) break;
      let idx = t.indexOf(term);
      while (idx !== -1 && out.length < max) {
        if (!used.some(u => Math.abs(u - idx) < radius)) {
          const s = Math.max(0, idx - radius), e = Math.min(t.length, idx + term.length + radius);
          out.push({ text: (s > 0 ? "…" : "") + t.slice(s, e) + (e < t.length ? "…" : "") });
          used.push(idx);
        }
        idx = t.indexOf(term, idx + term.length);
      }
    }
    if (out.length === 0) out.push({ text: t.slice(0, radius * 2) + (t.length > radius * 2 ? "…" : ""), noHit: true });
    return out;
  };
  // 검색어 목록 → 노란 형광펜 하이라이트(React)
  const queryTerms = () => {
    const base = String((data && data.query) || q || "").trim();
    return Array.from(new Set([base, ...base.split(/\s+/)].filter(t => t && t.length >= 1)));
  };
  const highlight = (text) => {
    const terms = queryTerms();
    if (!terms.length) return text;
    const escd = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length);
    let parts;
    try { parts = String(text).split(new RegExp("(" + escd.join("|") + ")", "gi")); }
    catch (e) { return text; }
    const low = terms.map(t => t.toLowerCase());
    return parts.map((p, i) => low.includes(String(p).toLowerCase())
      ? <mark key={i} style={{ background: "#fde68a", color: "#1f2937", padding: "0 1px", borderRadius: 2 }}>{p}</mark>
      : p);
  };
  const pkey = (it) => it._t + "|" + (it.mst || it.id || it.caseNo || it.name || "");
  const fetchPreview = async (it, auto) => {
    const k = pkey(it);
    try {
      const res = await fetch(`/api/lawgo-detail?target=${it._t}&mst=${encodeURIComponent(it.mst || "")}&id=${encodeURIComponent(it.id || "")}`);
      const d = await res.json();
      if (!d || !d.ok) { setPrev(p => ({ ...p, [k]: { open: true, auto, err: (d && d.needKey) ? "본문 열람 권한이 필요합니다." : ((d && d.message) || "본문을 불러오지 못했습니다.") } })); return; }
      const snips = makeSnippet(bodyText(d), (data && data.query) || q);
      setPrev(p => ({ ...p, [k]: { open: true, auto, snips } }));
    } catch (e) { setPrev(p => ({ ...p, [k]: { open: true, auto, err: "미리보기 오류: " + e.message } })); }
  };
  const togglePreview = (it) => {
    const k = pkey(it); const cur = prev[k];
    if (cur) { setPrev(p => ({ ...p, [k]: { ...p[k], open: !p[k].open } })); return; }
    startedRef.current[k] = true;
    setPrev(p => ({ ...p, [k]: { open: true, loading: true } }));
    fetchPreview(it, false);
  };
  // 자동 미리보기 — 검색 결과가 생기면 각 항목 본문 발췌를 자동으로 추출(법령·행정규칙 제외, 최대 20건, 동시 4건)
  React.useEffect(() => {
    const items = (data && data.merged) || [];
    if (!items.length) return;
    const queue = items.filter(it => it._t !== "law" && it._t !== "admrul").filter(it => {
      const k = pkey(it); if (startedRef.current[k]) return false; startedRef.current[k] = true; return true;
    }).slice(0, 20);
    if (!queue.length) return;
    let cancelled = false; let idx = 0;
    setPrev(p => { const n = { ...p }; queue.forEach(it => { const k = pkey(it); if (!n[k]) n[k] = { open: true, loading: true, auto: true }; }); return n; });
    const worker = async () => { while (!cancelled && idx < queue.length) { const it = queue[idx++]; await fetchPreview(it, true); } };
    for (let i = 0; i < 4; i++) worker();
    return () => { cancelled = true; };
  }, [data]);

  const card = { background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--shadow)" };
  const fmtDate = (s) => { const t = String(s || "").replace(/[^0-9]/g, ""); return t.length === 8 ? `${t.slice(0, 4)}.${t.slice(4, 6)}.${t.slice(6, 8)}` : (s || ""); };
  const dateNum = (s) => parseInt(String(s || "").replace(/[^0-9]/g, "").slice(0, 8) || "0") || 0;
  // 원문 링크 — 법령/행정규칙은 한글주소(지원됨), 판례·해석·심판 등은 상세페이지(일련번호 기반)
  // ※ 판례 등은 한글주소(/판례/사건번호)를 지원하지 않아 404가 나므로 상세페이지로 연결
  const DETAIL_PAGE = {
    prec: ["precInfoP", "precSeq"], detc: ["detcInfoP", "detcSeq"], expc: ["expcInfoP", "expcSeq"],
    decc: ["deccInfoP", "deccSeq"], nlrc: ["nlrcInfoP", "nlrcSeq"], iaciac: ["iaciacInfoP", "iaciacSeq"], eiac: ["eiacInfoP", "eiacSeq"],
  };
  const webLink = (it) => {
    const tp = it && it._t;
    if (tp === "law" || tp === "admrul") {
      return it.name ? `https://www.law.go.kr/${PATHS[tp]}/${encodeURIComponent(String(it.name))}` : "https://www.law.go.kr";
    }
    const m = DETAIL_PAGE[tp];
    if (m && it.id) return `https://www.law.go.kr/LSW/${m[0]}.do?${m[1]}=${encodeURIComponent(String(it.id))}`;
    return "https://www.law.go.kr";
  };
  // 판결문/결정문 본문을 읽기 좋게 정리(【항목】·번호 앞에서 줄바꿈)
  const prettyLegal = (s) => {
    let t = String(s || "").replace(/\r/g, "").replace(/ /g, " ");
    t = t.replace(/[ \t]{2,}/g, " ");
    t = t.replace(/\s*【\s*([^】]+?)\s*】\s*/g, "\n\n【$1】\n");          // 【주문】 【이유】 【질의】 【회시】 등
    t = t.replace(/\s+(\d{1,2}\.\s)/g, "\n$1");                          // 1.  2.
    t = t.replace(/\s+([가나다라마바사아자차카타파하]\.\s)/g, "\n$1");   // 가. 나. 다.
    t = t.replace(/\s*([①-⑮⑯-⑳])\s*/g, "\n$1 ");                        // ① ② …
    t = t.replace(/\s+(\(\s*\d{1,2}\s*\)\s)/g, "\n$1");                  // (1) (2)
    t = t.replace(/\n{3,}/g, "\n\n").trim();
    return t;
  };
  const isSummaryTitle = (t) => /판시사항|판결요지|결정요지|재결요지|회답|회신|회시|요지/.test(String(t || ""));
  const renderLegalBody = (txt, muted) => prettyLegal(txt).split("\n").map((ln, i) => {
    const line = ln.trim();
    const isHd = /^【.+】$/.test(line);
    if (!line) return <div key={i} style={{ height: 8 }} />;
    return <div key={i} style={{ fontWeight: isHd ? 800 : 400, color: isHd ? "var(--fg)" : (muted ? "var(--fg-2)" : "var(--fg)"), margin: isHd ? "8px 0 2px" : "0 0 3px", fontSize: isHd ? 13 : 13.5, lineHeight: 1.85 }}>{isHd ? line : highlight(line)}</div>;
  });
  // 인쇄/PDF 저장용 창 열기
  const printReader = () => {
    if (!rData) return;
    const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const terms = queryTerms();
    const hlHtml = (safe) => {
      if (!terms.length) return safe;
      try { return safe.replace(new RegExp("(" + terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi"), "<mark style='background:#fde68a'>$1</mark>"); }
      catch (e) { return safe; }
    };
    const toHtml = (txt) => esc(prettyLegal(txt)).split("\n").map(l => {
      const t = l.trim();
      if (!t) return "<div style='height:8px'></div>";
      return /^【.+】$/.test(t) ? `<div class='hd'>${t}</div>` : `<div class='ln'>${hlHtml(t)}</div>`;
    }).join("");
    const title = (rData.name) || (reader && (reader.name || reader.caseNo)) || "문서";
    const meta = [TLABEL[reader && reader._t], reader && reader.caseNo, (rData.effDate ? fmtDate(rData.effDate) : (reader && reader.date ? fmtDate(reader.date) : ""))].filter(Boolean).join("  ·  ");
    let body = "";
    if (rData.prec && rData.sections) body = rData.sections.map(s => `<h2>${esc(s.title)}</h2>${toHtml(s.content)}`).join("");
    else if (rData.articles) {
      body = rData.articles.map(a => `<h2>${a.no ? "제" + esc(a.no) + "조" : ""}${a.title ? "(" + esc(a.title) + ")" : ""}</h2>${toHtml(a.content)}`).join("");
      if (rData.buchik) body += `<h2>부칙</h2>${toHtml(rData.buchik)}`;
    }
    const w = window.open("", "_blank", "width=860,height=900");
    if (!w) { setRErr("팝업이 차단되어 PDF 창을 열 수 없습니다. 브라우저에서 팝업을 허용해주세요."); return; }
    w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:'Malgun Gothic','Apple SD Gothic Neo','맑은 고딕',sans-serif;max-width:800px;margin:34px auto;padding:0 26px;color:#1f2937;}
h1{font-size:19px;margin:0 0 5px;line-height:1.5;} .meta{font-size:12px;color:#6b7280;margin-bottom:22px;border-bottom:1px solid #e5e7eb;padding-bottom:12px;}
h2{font-size:14px;color:#1d4ed8;margin:22px 0 8px;} .hd{font-weight:800;margin:9px 0 3px;font-size:13px;} .ln{font-size:13.5px;line-height:1.9;margin-bottom:3px;}
.src{margin-top:30px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px;}
@media print{body{margin:0;max-width:none;}}</style></head>
<body><h1>${esc(title)}</h1><div class="meta">${esc(meta)}</div>${body}
<div class="src">출처: 국가법령정보센터 (law.go.kr) · 윌앤비전 안전보건플랫폼</div></body></html>`);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 350);
  };

  const openReader = async (it) => {
    setReader(it); setRData(null); setRErr(""); setRLoading(true);
    try {
      const res = await fetch(`/api/lawgo-detail?target=${it._t}&mst=${encodeURIComponent(it.mst || "")}&id=${encodeURIComponent(it.id || "")}`);
      const d = await res.json();
      if (!d.ok) setRErr(d.needKey ? "국가법령정보센터 인증(OC) 설정이 필요합니다." : (d.message || "본문을 불러오지 못했습니다."));
      else setRData(d);
    } catch (e) { setRErr("본문 조회 오류: " + e.message); }
    finally { setRLoading(false); }
  };

  const run = async (overrideQ, lim) => {
    const query = String(overrideQ != null ? overrideQ : q).trim();
    const disp = lim || limit;
    const targets = TYPES.map(t => t.v).filter(v => sel[v]);
    if (!query) { setErr("검색어를 입력하세요."); return; }
    if (targets.length === 0) { setErr("자료 구분을 하나 이상 선택하세요."); return; }
    setLoading(true); setErr(""); setNeedKey(false); setFType("전체"); setPrev({}); startedRef.current = {};
    try {
      const results = await Promise.all(targets.map(async (t) => {
        const sc = (t === "law" || t === "admrul" || t === "prec") ? "2" : "1";  // 법령·행정규칙·판례는 본문(전문)까지 폭넓게 검색
        try {
          const res = await fetch(`/api/lawgo-search?query=${encodeURIComponent(query)}&target=${t}&search=${sc}&page=1&display=${disp}`);
          return { t, d: await res.json() };
        } catch (e) { return { t, d: { ok: false, message: e.message } }; }
      }));
      const merged = []; const counts = {}; let needKeyAny = false; const errs = [];
      for (const { t, d } of results) {
        if (d && d.needKey) { needKeyAny = true; continue; }
        if (!d || !d.ok) { errs.push(`${TLABEL[t] || t}: ${(d && d.message) || "오류"}`); continue; }
        counts[t] = d.totalCount || 0;
        (d.items || []).forEach(it => merged.push({ ...it, _t: t }));
      }
      merged.sort((a, b) => dateNum(b.date) - dateNum(a.date));
      setData({ merged, counts, query });
      if (merged.length === 0) {
        if (needKeyAny) setNeedKey(true);
        else if (errs.length) setErr(errs.join("  /  "));
      }
    } catch (e) { setData(null); setErr("검색 중 오류: " + e.message); }
    finally { setLoading(false); }
  };
  React.useEffect(() => { if (initialQuery && initialQuery.trim()) run(initialQuery); /* eslint-disable-next-line */ }, [initialQuery]);

  const toggle = (v) => setSel(s => ({ ...s, [v]: !s[v] }));
  const allOn = TYPES.every(t => sel[t.v]);
  const setAll = (on) => { const o = {}; TYPES.forEach(t => o[t.v] = on); setSel(o); };

  const merged = (data && data.merged) || [];
  const counts = (data && data.counts) || {};
  const totalCount = Object.values(counts).reduce((a, b) => a + (parseInt(b) || 0), 0);
  const shown = fType === "전체" ? merged : merged.filter(it => it._t === fType);

  return (
    <div>
      <div className="content-hd">
        <div>
          <h1 className="content-title">국가법령정보센터 검색</h1>
          <div className="content-sub">구분을 <b>체크</b>해서 판례·헌재결정·행정해석·행정심판·노동위·산재재심사 등을 <b>한 번에</b> 검색합니다. 제목을 누르면 앱에서 본문을 바로 읽어요. (출처: 국가법령정보센터)</div>
        </div>
      </div>

      {/* 구분 체크박스 — 전체(상단 가운데) + 하위 항목 격자 정렬 */}
      <div style={{ ...card, marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 16, fontWeight: 800, cursor: "pointer", paddingBottom: 11, marginBottom: 11, borderBottom: "1px solid var(--line)" }}>
          <input type="checkbox" checked={allOn} onChange={e => setAll(e.target.checked)} /> 전체
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "9px 10px" }}>
          {TYPES.map(t => (
            <label key={t.v} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer", color: "var(--fg)", whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={!!sel[t.v]} onChange={() => toggle(t.v)} /> {t.l}
            </label>
          ))}
        </div>
      </div>

      {/* 검색창 */}
      <div style={{ ...card, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { setLimit(20); run(null, 20); } }}
          placeholder="예: 부당해고, 업무상 재해, 실업급여, 휴게시설…"
          style={{ flex: "1 1 240px", minWidth: 180, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "9px 12px", fontSize: 14, background: "var(--bg-elev)", color: "var(--fg)" }} />
        <button className="btn btn-primary" onClick={() => { setLimit(20); run(null, 20); }} disabled={loading}>{loading ? "검색 중…" : "검색"}</button>
      </div>

      {needKey && (
        <div style={{ ...card, marginBottom: 16, borderColor: "#fdba74", background: "#fff7ed" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#c2410c", marginBottom: 6 }}>🔑 국가법령정보센터 인증(OC)/해당 API 신청이 필요합니다</div>
          <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.75 }}>
            선택한 구분 중 일부는 open.law.go.kr에서 해당 API(목록·본문 XML) 신청/승인이 필요합니다. (인증 ID는 <code>LAWGO_OC</code>)
          </div>
        </div>
      )}
      {err && <div style={{ ...card, marginBottom: 16, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c", fontSize: 13, lineHeight: 1.7 }}>{err}</div>}

      {data && !loading && (
        <div style={card}>
          {/* 분류별 건수 필터 칩 */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <button onClick={() => setFType("전체")} className={"chip" + (fType === "전체" ? " chip-primary" : "")}
              style={{ cursor: "pointer", fontWeight: fType === "전체" ? 700 : 500 }}>전체 <b style={{ marginLeft: 4 }}>{totalCount.toLocaleString()}</b></button>
            {TYPES.filter(t => counts[t.v] != null).map(t => (
              <button key={t.v} onClick={() => setFType(t.v)} className={"chip" + (fType === t.v ? " chip-primary" : "")}
                style={{ cursor: "pointer", fontWeight: fType === t.v ? 700 : 500 }}>
                {t.l} <b style={{ marginLeft: 4 }}>{(counts[t.v] || 0).toLocaleString()}</b>
              </button>
            ))}
          </div>

          {shown.length === 0
            ? <div style={{ padding: "28px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13.5 }}>검색 결과가 없습니다.</div>
            : shown.map((it, i) => {
              const pv = prev[pkey(it)];
              return (
              <div key={i} style={{ padding: "12px 2px", borderBottom: "1px solid var(--line-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="chip chip-primary">{TLABEL[it._t] || it.kind || it.org}</span>
                  <button onClick={() => openReader(it)}
                    style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, textAlign: "left", fontSize: 15, fontWeight: 700, color: "var(--primary)", fontFamily: "inherit" }}>
                    {it.name || it.caseNo || "(제목 없음)"}
                  </button>
                  <button onClick={() => togglePreview(it)}
                    style={{ fontSize: 11.5, cursor: "pointer", color: (pv && pv.open) ? "#fff" : "var(--fg-3)", background: (pv && pv.open) ? "var(--primary)" : "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 8px", fontFamily: "inherit" }}>
                    {pv && pv.open ? "미리보기 접기" : "미리보기"}
                  </button>
                  <a href={webLink(it)} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11.5, color: "var(--fg-4)", textDecoration: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "1px 7px" }}>원문 ↗</a>
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 3 }}>
                  {[it.org, it.caseNo, it.date ? fmtDate(it.date) : ""].filter(Boolean).join("  ·  ")}
                </div>
                {pv && pv.open && (
                  <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, lineHeight: 1.8 }}>
                    {pv.loading && <span style={{ color: "var(--fg-3)" }}>본문에서 검색어 찾는 중…</span>}
                    {pv.err && <span style={{ color: "#b45309" }}>{pv.err} <span style={{ color: "var(--fg-4)" }}>(제목을 눌러 본문 전체 보기 / 원문 ↗ 이용)</span></span>}
                    {pv.snips && pv.snips.map((s, j) => (
                      <div key={j} style={{ marginBottom: j < pv.snips.length - 1 ? 7 : 0, color: "var(--fg-2)" }}>
                        {s.noHit && <span style={{ color: "var(--fg-4)", fontSize: 12 }}>[검색어가 본문에 직접 없어 앞부분 표시] </span>}
                        {highlight(s.text)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ); })}

          {/* 더 보기 — 자료형별 가져오는 개수 증가 */}
          {merged.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
              <button className="btn btn-secondary btn-sm" disabled={loading}
                onClick={() => { const nl = limit + 20; setLimit(nl); run(null, nl); }}>
                더 보기 (분류별 {limit}건씩 → {limit + 20}건)
              </button>
            </div>
          )}
        </div>
      )}

      {/* 본문 읽기 모달 */}
      {reader && (
        <div onClick={() => setReader(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px", overflowY: "auto" }}>
          <div onClick={e => e.stopPropagation()} className="card"
            style={{ width: "100%", maxWidth: 760, maxHeight: "86vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(rData && rData.name) || reader.name || reader.caseNo}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>
                  {[TLABEL[reader._t], reader.caseNo, (rData && rData.effDate) ? fmtDate(rData.effDate) : (reader.date ? fmtDate(reader.date) : "")].filter(Boolean).join("  ·  ")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {rData && <button className="btn btn-secondary btn-sm" onClick={printReader} title="판결문/결정문을 PDF로 저장하거나 인쇄">인쇄 · PDF</button>}
                <a href={webLink(reader)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">원문 ↗</a>
                <button className="btn btn-ghost btn-sm" onClick={() => setReader(null)}><Icon name="x" size={14} /></button>
              </div>
            </div>
            <div style={{ overflowY: "auto", padding: "16px 20px" }}>
              {rLoading && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--fg-3)" }}>본문 불러오는 중…</div>}
              {rErr && <div style={{ fontSize: 13, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 12px", lineHeight: 1.7 }}>
                {rErr}<br /><span style={{ color: "var(--fg-3)", fontSize: 12 }}>※ 본문 읽기는 공동활용에서 <b>'본문 XML'</b> 권한이 필요합니다. 우측 상단 <b>원문 ↗</b>으로 바로 볼 수 있어요.</span>
              </div>}
              {rData && rData.prec && (rData.sections || []).map((s, i) => {
                const hi = isSummaryTitle(s.title);
                return (
                  <div key={i} style={hi
                    ? { marginBottom: 16, padding: "12px 14px", background: "var(--primary-soft, #eef3ff)", border: "1px solid var(--line)", borderRadius: 10 }
                    : { marginBottom: 18 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--primary)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      {hi ? "⭐ " : ""}{s.title}{hi ? <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-4)" }}>핵심 요지</span> : null}
                    </div>
                    <div>{renderLegalBody(s.content)}</div>
                  </div>
                );
              })}
              {rData && !rData.prec && (rData.articles || []).map((a, i) => (
                <div key={i} style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--line-2)" }}>
                  {(a.no || a.title) && <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--primary)", marginBottom: 5 }}>
                    {a.no ? `제${a.no}조` : ""}{a.title ? `(${a.title})` : ""}
                  </div>}
                  <div>{renderLegalBody(a.content)}</div>
                </div>
              ))}
              {rData && !rData.prec && rData.buchik && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--fg-3)", marginBottom: 5 }}>부칙</div>
                  <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "var(--fg-2)" }}>{rData.buchik}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
Object.assign(window, { LegalCheckerView });
