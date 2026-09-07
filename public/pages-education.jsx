// 윌앤비전 - 교육일지 관리
// EDU_TYPES / EDU_CONTENT는 백엔드(education_types 테이블)가 비어있을 때만 쓰는 fallback.
// 평소에는 useEduTypes() 훅이 백엔드에서 가져온 값을 사용함.

// ── 백엔드 교육종류 로딩 훅 ──
// includeHidden=false → 사용자 화면 (드롭다운/필터): 숨김 항목 제외
// includeHidden=true  → 관리 화면: 숨김 포함 전체 표시
const useEduTypes = ({ includeHidden = false } = {}) => {
  const [types, setTypes] = React.useState(null); // null = 로딩 중, [] = 비어있음
  const reload = React.useCallback(() => {
    window.WV_API.getEduTypes({ includeHidden }).then(list => {
      if (Array.isArray(list) && list.length > 0) setTypes(list);
      else setTypes([]); // 비어있으면 fallback 사용
    }).catch(() => setTypes([]));
  }, [includeHidden]);
  React.useEffect(() => { reload(); }, [reload]);
  // 백엔드가 비어있거나 로딩 중이면 fallback 사용 (hidden 없는 기본값)
  const effective = (types && types.length > 0)
    ? types
    : EDU_TYPES.map(t => ({ ...t, content: EDU_CONTENT[t.id] || '', hidden: false }));
  return { types: effective, loading: types === null, reload, isFromBackend: types && types.length > 0 };
};

const EDU_TYPES = [
  { id: "정기교육_근로자",        label: "정기교육 (근로자)",              hours: "2시간" },
  { id: "채용시교육_근로자",       label: "채용 시 교육 (근로자)",           hours: "8시간" },
  { id: "작업내용변경_근로자",      label: "작업내용 변경 시 교육 (근로자)",   hours: "2시간" },
  { id: "정기교육_관리감독자",      label: "정기교육 (관리감독자)",            hours: "2시간" },
  { id: "채용시교육_관리감독자",     label: "채용 시 교육 (관리감독자)",        hours: "8시간" },
  { id: "작업내용변경_관리감독자",   label: "작업내용 변경 시 교육 (관리감독자)", hours: "2시간" },
  { id: "MSDS",               label: "물질안전보건자료 (MSDS)",          hours: "2시간" },
  { id: "특별교육_공통_근로자",     label: "특별교육 공통내용 (근로자)",        hours: "8시간" },
  { id: "특별교육_공통_관리감독자",  label: "특별교육 공통내용 (관리감독자)",     hours: "8시간" },
  { id: "특별교육_용접",          label: "특별교육 개별 (제2호 용접)",        hours: "8시간" },
  { id: "특별교육_전기",          label: "특별교육 개별 (제17호 전기)",       hours: "8시간" },
  { id: "특별교육_보일러",         label: "특별교육 개별 (제31호 보일러)",     hours: "8시간" },
  { id: "특별교육_밀폐공간",        label: "특별교육 개별 (제34호 밀폐공간)",   hours: "8시간" },
  { id: "특별교육_유해물질",        label: "특별교육 개별 (제35호 유해물질취급)", hours: "8시간" },
  { id: "위험성평가_회의록",       label: "위험성평가 (회의록)",              hours: "1시간" },
  { id: "위험성평가_결과전파",      label: "위험성평가 (결과 전파교육)",        hours: "1시간" },
  { id: "근골격계",             label: "근골격계 유해요인조사",              hours: "-" },
];

const EDU_CONTENT = {
  "정기교육_근로자": "산업안전보건법 시행규칙 [별표 5] 제1호 가목 (정기교육)\n○ 산업안전 및 산업재해 예방에 관한 사항(화재ㆍ폭발 사고 발생 시 대피에 관한 사항을 포함한다)\n○ 산업보건 및 건강장해 예방에 관한 사항(폭염ㆍ한파작업으로 인한 건강장해 발생 시 응급조치에 관한 사항을 포함한다)\n○ 위험성 평가에 관한 사항\n○ 건강증진 및 질병 예방에 관한 사항\n○ 유해ㆍ위험 작업환경 관리에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항",
  "채용시교육_근로자": "산업안전보건법 시행규칙 [별표 5] 제1호 다목 (채용 시 교육 및 작업내용 변경 시 교육)\n○ 산업안전 및 산업재해 예방에 관한 사항(화재ㆍ폭발 사고 발생 시 대피에 관한 사항을 포함한다)\n○ 산업보건 및 건강장해 예방에 관한 사항\n○ 위험성 평가에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항\n○ 기계ㆍ기구의 위험성과 작업의 순서 및 동선에 관한 사항\n○ 작업 개시 전 점검에 관한 사항\n○ 정리정돈 및 청소에 관한 사항\n○ 사고 발생 시 긴급조치에 관한 사항\n○ 물질안전보건자료에 관한 사항",
  "작업내용변경_근로자": "산업안전보건법 시행규칙 [별표 5] 제1호 다목 (채용 시 교육 및 작업내용 변경 시 교육)\n○ 산업안전 및 산업재해 예방에 관한 사항(화재ㆍ폭발 사고 발생 시 대피에 관한 사항을 포함한다)\n○ 산업보건 및 건강장해 예방에 관한 사항\n○ 위험성 평가에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 기계ㆍ기구의 위험성과 작업의 순서 및 동선에 관한 사항\n○ 작업 개시 전 점검에 관한 사항\n○ 정리정돈 및 청소에 관한 사항\n○ 사고 발생 시 긴급조치에 관한 사항\n○ 물질안전보건자료에 관한 사항",
  "정기교육_관리감독자": "산업안전보건법 시행규칙 [별표 5] 제1호의2 가목 (정기교육)\n○ 산업안전 및 산업재해 예방에 관한 사항(화재ㆍ폭발 사고 발생 시 대피에 관한 사항을 포함한다)\n○ 산업보건 및 건강장해 예방에 관한 사항(폭염ㆍ한파작업으로 인한 건강장해 발생 시 응급조치에 관한 사항을 포함한다)\n○ 위험성평가에 관한 사항\n○ 유해ㆍ위험 작업환경 관리에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항\n○ 작업공정의 유해ㆍ위험과 재해 예방대책에 관한 사항\n○ 사업장 내 안전보건관리체제 및 안전ㆍ보건조치 현황에 관한 사항\n○ 표준안전 작업방법 결정 및 지도ㆍ감독 요령에 관한 사항\n○ 현장근로자와의 의사소통능력 및 강의능력 등 안전보건교육 능력 배양에 관한 사항\n○ 비상시 또는 재해 발생 시 긴급조치에 관한 사항\n○ 그 밖의 관리감독자의 직무에 관한 사항",
  "채용시교육_관리감독자": "산업안전보건법 시행규칙 [별표 5] 제1호의2 나목 (채용 시 교육 및 작업내용 변경 시 교육)\n○ 산업안전 및 산업재해 예방에 관한 사항(화재ㆍ폭발 사고 발생 시 대피에 관한 사항을 포함한다)\n○ 산업보건 및 건강장해 예방에 관한 사항\n○ 위험성평가에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항\n○ 기계ㆍ기구의 위험성과 작업의 순서 및 동선에 관한 사항\n○ 작업 개시 전 점검에 관한 사항\n○ 물질안전보건자료에 관한 사항\n○ 사업장 내 안전보건관리체제 및 안전ㆍ보건조치 현황에 관한 사항\n○ 표준안전 작업방법 결정 및 지도ㆍ감독 요령에 관한 사항\n○ 비상시 또는 재해 발생 시 긴급조치에 관한 사항\n○ 그 밖의 관리감독자의 직무에 관한 사항",
  "작업내용변경_관리감독자": "산업안전보건법 시행규칙 [별표 5] 제1호의2 나목 (채용 시 교육 및 작업내용 변경 시 교육)\n○ 산업안전 및 산업재해 예방에 관한 사항(화재ㆍ폭발 사고 발생 시 대피에 관한 사항을 포함한다)\n○ 산업보건 및 건강장해 예방에 관한 사항\n○ 위험성평가에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 기계ㆍ기구의 위험성과 작업의 순서 및 동선에 관한 사항\n○ 작업 개시 전 점검에 관한 사항\n○ 물질안전보건자료에 관한 사항\n○ 사업장 내 안전보건관리체제 및 안전ㆍ보건조치 현황에 관한 사항\n○ 표준안전 작업방법 결정 및 지도ㆍ감독 요령에 관한 사항\n○ 비상시 또는 재해 발생 시 긴급조치에 관한 사항\n○ 그 밖의 관리감독자의 직무에 관한 사항",
  "MSDS": "물질안전보건자료(MSDS) 교육\n○ 대상화학물질의 명칭(또는 제품명)\n○ 물리적 위험성 및 건강 유해성\n○ 취급상의 주의사항\n○ 적절한 보호구\n○ 응급조치 요령 및 사고시 대처방법\n○ 물질안전보건자료 및 경고표지를 이해하는 방법",
  "특별교육_공통_근로자": "산업안전보건법 시행규칙 [별표 5] 제3호 가목 (특별교육 공통내용 - 근로자)\n○ 산업안전 및 산업재해 예방에 관한 사항\n○ 위험성평가에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 직장 내 괴롭힘, 고객의 폭언 등으로 인한 건강장해 예방 및 관리에 관한 사항\n○ 기계ㆍ기구의 위험성과 작업의 순서 및 동선에 관한 사항\n○ 작업 개시 전 점검에 관한 사항\n○ 정리정돈 및 청소에 관한 사항\n○ 사고 발생 시 긴급조치에 관한 사항\n○ 물질안전보건자료에 관한 사항\n○ 보호구 착용 및 취급방법에 관한 사항",
  "특별교육_공통_관리감독자": "산업안전보건법 시행규칙 [별표 5] 제3호 나목 (특별교육 공통내용 - 관리감독자)\n○ 산업안전 및 산업재해 예방에 관한 사항\n○ 위험성평가에 관한 사항\n○ 유해ㆍ위험 작업환경 관리에 관한 사항\n○ 산업안전보건법령 및 산업재해보상보험 제도에 관한 사항\n○ 직무스트레스 예방 및 관리에 관한 사항\n○ 작업공정의 유해ㆍ위험과 재해 예방대책에 관한 사항\n○ 표준안전 작업방법 결정 및 지도ㆍ감독 요령에 관한 사항\n○ 현장근로자와의 의사소통능력 및 강의능력 등 안전보건교육 능력 배양에 관한 사항\n○ 비상시 또는 재해 발생 시 긴급조치에 관한 사항",
  "특별교육_용접": "특별교육 대상 작업별 교육 <개별내용> 제2호\n아세틸렌 용접장치 또는 가스집합 용접장치를 사용하는 금속의 용접·용단 또는 가열작업\n○ 용접 흄, 분진 및 유해광선 등의 유해성에 관한 사항\n○ 가스용접기, 압력조정기, 호스 및 취관두 등의 기기점검에 관한 사항\n○ 작업방법·순서 및 응급처치에 관한 사항\n○ 안전기 및 보호구 취급에 관한 사항\n○ 화재예방 및 초기대응에 관한 사항\n○ 그 밖에 안전·보건관리에 필요한 사항",
  "특별교육_전기": "특별교육 대상 작업별 교육 <개별내용> 제17호\n전압이 75볼트 이상인 정전 및 활선작업\n○ 전기의 위험성 및 전격 방지에 관한 사항\n○ 해당 설비의 보수 및 점검에 관한 사항\n○ 정전작업·활선작업 시의 안전작업방법 및 순서에 관한 사항\n○ 절연용 보호구, 절연용 방호구 및 활선작업용 기구 등의 사용에 관한 사항\n○ 그 밖에 안전·보건관리에 필요한 사항",
  "특별교육_보일러": "특별교육 대상 작업별 교육 <개별내용> 제31호\n보일러의 설치 및 취급 작업\n○ 기계 및 기기 점화장치 계측기의 점검에 관한 사항\n○ 열관리 및 방호장치에 관한 사항\n○ 작업순서 및 방법에 관한 사항\n○ 그 밖에 안전·보건관리에 필요한 사항",
  "특별교육_밀폐공간": "특별교육 대상 작업별 교육 <개별내용> 제34호\n밀폐공간에서의 작업\n○ 산소농도 측정 및 작업환경에 관한 사항\n○ 사고 시의 응급처치 및 비상 시 구출에 관한 사항\n○ 보호구 착용 및 보호 장비 사용에 관한 사항\n○ 작업내용ㆍ안전작업방법 및 절차에 관한 사항\n○ 장비ㆍ설비 및 시설 등의 안전점검에 관한 사항\n○ 그 밖에 안전ㆍ보건관리에 필요한 사항",
  "특별교육_유해물질": "특별교육 대상 작업별 교육 <개별내용> 제35호\n허가 또는 관리 대상 유해물질의 제조 또는 취급작업\n○ 취급물질의 성질 및 상태에 관한 사항\n○ 유해물질이 인체에 미치는 영향\n○ 국소배기장치 및 안전설비에 관한 사항\n○ 안전작업방법 및 보호구 사용에 관한 사항\n○ 그 밖에 안전ㆍ보건관리에 필요한 사항",
  "위험성평가_회의록": "위험성평가 (회의록)\n○ 유해ㆍ위험요인 파악 및 위험성 결정\n○ 위험성 감소대책 수립 및 이행\n○ 위험성평가 결과 및 감소대책 논의\n○ 유해ㆍ위험요인별 개선 완료사항 확인\n○ 근로자 의견 청취 및 반영사항",
  "위험성평가_결과전파": "위험성평가 (결과 전파교육)\n○ 위험성평가 실시 결과 공유\n○ 유해ㆍ위험요인 및 감소대책 안내\n○ 작업별 안전수칙 및 주의사항 전달\n○ 근로자 의견 수렴\n○ 개선 완료사항 및 향후 일정 안내",
  "근골격계": "근골격계 유해요인조사\n○ 근골격계 부담작업 유해요인 조사 실시\n○ 작업별 유해요인 파악 및 평가\n○ 근골격계질환 예방을 위한 개선대책 수립\n○ 근로자 증상조사 및 건강상태 파악\n○ 작업환경 개선 조치사항 안내",
};

// MSDS 교육 실시 사유 (체크박스 항목) — 산업안전보건법 시행규칙 제169조
const MSDS_REASONS = [
  "대상화학물질을 제조·사용·운반 또는 저장하는 작업에 근로자를 배치하게 된 경우",
  "새로운 대상화학물질이 도입된 경우",
  "유해성·위험성 정보가 변경된 경우",
];

// 결재 권한
const APPROVAL_ROLES = {
  담당: ["site_staff", "site_manager", "staff"],
  검토: ["safety", "manager"],
  승인: ["admin"],
};

const ROLE_LABEL = {
  site_staff: "현장직원",
  site_manager: "현장센터장/소장",
  staff: "본사직원",
  safety: "안전/보건관리자",
  manager: "관리자",
  admin: "안전보건관리책임자",
};

// ── 교육일지 목록 ──
const EducationLogList = ({ onNav, currentUser, role }) => {
  const [logs, setLogs] = React.useState([]);
  const [sites, setSites] = React.useState([]); // 권한별 필터링용
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("전체");
  const [showManage, setShowManage] = React.useState(false);
  const { types: eduTypes, reload: reloadEduTypes } = useEduTypes();

  // admin / 안전관리자만 교육종류 관리 가능
  const canManageTypes = role === "admin" || role === "safety";

  const reloadLogs = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      window.WV_API.getEduLogs(),
      window.WV_API.getSites ? window.WV_API.getSites() : Promise.resolve([]),
    ]).then(([logData, siteData]) => {
      setLogs(logData);
      setSites(Array.isArray(siteData) ? siteData : (siteData?.sites || []));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  React.useEffect(() => { reloadLogs(); }, [reloadLogs]);

  // ──────────────────────────────────────────────
  // 권한별 가시성 필터링
  //   admin / safety: 전체 (전사 안전관리 책임)
  //   manager / staff: 본인 본부 사업장의 일지만 (사업장명 ↔ site.hqId 매칭)
  //   site_manager / site_staff: 본인 담당 사업장(siteIds)의 일지만
  // ──────────────────────────────────────────────
  const visibleLogs = React.useMemo(() => {
    if (role === "admin" || role === "safety") return logs;

    // 사용자가 볼 수 있는 사업장명 집합 만들기
    const allowedSiteNames = new Set();

    if (role === "site_manager" || role === "site_staff") {
      // 본인 담당 사업장만
      const myIds = String(currentUser?.siteIds || "")
        .split(",").map(s => s.trim()).filter(Boolean);
      sites.forEach(s => {
        if (myIds.includes(String(s.id))) allowedSiteNames.add(s.name);
      });
    } else if (role === "manager" || role === "staff") {
      // 본인 본부의 모든 사업장 + 본인 담당 사업장(있다면)
      const myHqId = currentUser?.hqId;
      const myIds = String(currentUser?.siteIds || "")
        .split(",").map(s => s.trim()).filter(Boolean);
      sites.forEach(s => {
        if (myHqId && String(s.hqId) === String(myHqId)) allowedSiteNames.add(s.name);
        if (myIds.includes(String(s.id))) allowedSiteNames.add(s.name);
      });
    }

    // 항상 본인이 작성한 건 보임 (안전망)
    return logs.filter(l => {
      if (l["작성자"] === currentUser?.name) return true;
      const logSiteName = l["사업장명"] || "";
      // 정확 일치 또는 부분 일치 (수기 입력 오차 대응)
      for (const name of allowedSiteNames) {
        if (!name) continue;
        if (logSiteName === name || logSiteName.includes(name) || name.includes(logSiteName)) {
          return true;
        }
      }
      return false;
    });
  }, [logs, sites, role, currentUser]);

  // 권한 라벨 (안내용)
  const scopeLabel = (() => {
    if (role === "admin") return "전사 전체";
    if (role === "safety") return "전사 안전보건 자료";
    if (role === "manager" || role === "staff") return "본인 본부 사업장";
    if (role === "site_manager" || role === "site_staff") return "본인 담당 사업장";
    return "본인 작성분";
  })();

  // 권한: admin/safety는 모두, 그 외는 본인이 작성한 일지만 수정/삭제 가능
  const canEditLog = (log) => {
    if (role === "admin" || role === "safety") return true;
    return log["작성자"] === currentUser?.name;
  };

  const handleDelete = async (log) => {
    if (!window.confirm(
      `다음 교육일지를 삭제하시겠습니까?\n\n` +
      `· 교육종류: ${log["교육종류"]}\n` +
      `· 사업장: ${log["사업장명"]}\n` +
      `· 교육일자: ${log["교육일자"]}\n\n` +
      `⚠ 참석자 명단도 함께 삭제되며 복구할 수 없습니다.`
    )) return;
    try {
      await window.WV_API.deleteEduLog(log.id);
      await reloadLogs();
    } catch (e) {
      alert("삭제 실패: " + (e.message || e));
    }
  };

  const filtered = visibleLogs.filter(l => {
    const matchType = typeFilter === "전체" || l["교육종류"] === typeFilter;
    const matchSearch = !search || l["사업장명"]?.includes(search) || l["강사명"]?.includes(search);
    return matchType && matchSearch;
  });

  return (
    <div className="content">
      {showManage && <EducationTypesManageModal
        onClose={() => { setShowManage(false); reloadEduTypes(); }}
      />}
      {/* 뒤로가기 버튼 */}
      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm"
          onClick={() => onNav({ name: "category", id: "training" })}>
          <Icon name="arrow-left" size={14} /> 안전보건교육으로
        </button>
      </div>

      <div className="content-hd">
        <div>
          <h1 className="content-title">교육일지 목록</h1>
          <div className="content-sub">
            작성된 교육일지를 조회하고 PDF로 출력할 수 있습니다.
            <span style={{
              marginLeft: 8, padding: "2px 8px", borderRadius: 10, fontSize: 11,
              background: "var(--bg-sunk)", color: "var(--fg-2)", border: "1px solid var(--line)",
            }}>📂 조회 범위: {scopeLabel}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canManageTypes && (
            <button className="btn btn-secondary" onClick={() => setShowManage(true)}>
              <Icon name="settings" size={14} /> 교육 종류 관리
            </button>
          )}
          <button className="btn btn-primary" onClick={() => onNav({ name: "education-log-new" })}>
            <Icon name="plus" size={14} /> 교육일지 작성
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input className="field-input" style={{ width: 200 }}
          placeholder="사업장명, 강사명 검색"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="field-select" style={{ width: 260 }}
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option>전체</option>
          {eduTypes.map(t => <option key={t.id}>{t.label}</option>)}
        </select>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--fg-3)" }}>
          <span className="login-spinner" style={{ width: 32, height: 32 }} /> 불러오는 중...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--fg-3)" }}>
          <Icon name="file" size={32} />
          <div style={{ marginTop: 12 }}>
            {visibleLogs.length === 0
              ? `조회 범위(${scopeLabel}) 내 교육일지가 없습니다.`
              : "검색 결과가 없습니다."}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }}
            onClick={() => onNav({ name: "education-log-new" })}>
            교육일지 작성하기
          </button>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-sunk)", borderBottom: "1px solid var(--line)" }}>
                {["교육종류", "사업장명", "교육일자", "교육시간", "강사명", "실시인원", "작성자", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 12, color: "var(--fg-3)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--line-2)" }}>
                  <td style={{ padding: "12px 14px" }}><span className="chip chip-primary" style={{ fontSize: 11 }}>{log["교육종류"]}</span></td>
                  <td style={{ padding: "12px 14px", fontWeight: 500 }}>{log["사업장명"]}</td>
                  <td style={{ padding: "12px 14px", color: "var(--fg-2)" }}>{log["교육일자"]}</td>
                  <td style={{ padding: "12px 14px", color: "var(--fg-2)" }}>{log["시작시간"]} ~ {log["종료시간"]}</td>
                  <td style={{ padding: "12px 14px" }}>{log["강사명"]}</td>
                  <td style={{ padding: "12px 14px" }}>{log["실시자수_계"]}명</td>
                  <td style={{ padding: "12px 14px", color: "var(--fg-3)", fontSize: 12 }}>{log["작성자"]}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => onNav({ name: "education-log-new", data: log })}
                        title="조회 및 출력">
                        <Icon name="eye" size={12} /> 조회
                      </button>
                      {canEditLog(log) && (
                        <>
                          <button className="btn btn-primary btn-sm"
                            onClick={() => onNav({ name: "education-log-new", data: { ...log, _editMode: true } })}
                            title="내용 수정">
                            <Icon name="edit" size={12} /> 수정
                          </button>
                          <button className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(log)}
                            title="교육일지 삭제">
                            <Icon name="trash" size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && visibleLogs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20 }}>
          <div className="card" style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--primary)" }}>{visibleLogs.length}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>교육 실시 ({scopeLabel})</div>
          </div>
          <div className="card" style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--success)" }}>
              {[...new Set(visibleLogs.map(l => l["사업장명"]))].length}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>교육 실시 사업장</div>
          </div>
          <div className="card" style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--warning)" }}>
              {visibleLogs.reduce((sum, l) => sum + (parseInt(l["실시자수_계"]) || 0), 0)}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>총 교육 인원</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── 교육일지 작성/조회 폼 ──
// editData 없음 → 새로 작성
// editData + _editMode=true → 수정 모드 (필드 편집 가능 + PUT 저장)
// editData + _editMode 없음 → 조회 모드 (읽기 전용 + 출력만)
const EducationLogForm = ({ onNav, currentUser, editData }) => {
  const isEditMode = !!editData && editData._editMode === true;
  const isView = !!editData && !isEditMode;
  const { types: eduTypes } = useEduTypes();
  const selectedTypeObj = eduTypes[0] || EDU_TYPES[0];
  const [eduType, setEduType] = React.useState(editData?.["교육종류"] || selectedTypeObj.label);
  const [form, setForm] = React.useState({
    사업장명: editData?.["사업장명"] || "",
    교육일자: editData?.["교육일자"] || "",
    시작시간: editData?.["시작시간"] || "",
    종료시간: editData?.["종료시간"] || "",
    대상자수_계: editData?.["대상자수_계"] || "",
    대상자수_남: editData?.["대상자수_남"] || "",
    대상자수_여: editData?.["대상자수_여"] || "",
    실시자수_계: editData?.["실시자수_계"] || "",
    실시자수_남: editData?.["실시자수_남"] || "",
    실시자수_여: editData?.["실시자수_여"] || "",
    미참석사유: editData?.["미참석사유"] || "",
    강사명: editData?.["강사명"] || "",
    강사직책: editData?.["강사직책"] || "",
    교육장소: editData?.["교육장소"] || "",
    추가교육내용: editData?.["추가교육내용"] || "",   // MSDS: 대상화학물질 명칭 등
    실시사유: editData?.["실시사유"] || "",            // MSDS: 교육 실시 사유 체크(콤마구분 번호)
  });
  const [attendees, setAttendees] = React.useState(
    Array.from({ length: 18 }, (_, i) => ({ 연번: i + 1, 직종: "", 성명: "" }))
  );
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState("");

  // 조회/수정 모드 진입 시 기존 참석자 목록 백엔드에서 로드
  React.useEffect(() => {
    if (editData?.id) {
      window.WV_API.getEduAttendees(editData.id).then(list => {
        if (!Array.isArray(list) || list.length === 0) return;
        // 백엔드 컬럼명 → 폼 필드 매핑. 직종 컬럼은 없으므로 직급으로 사용.
        const restored = list.map((a, i) => ({
          연번: a["번호"] || i + 1,
          직종: a["직급"] || a["소속"] || "",
          성명: a["성명"] || "",
        }));
        // 폼은 20명 고정 슬롯 — 비어있는 칸 채우기
        const padded = [...restored];
        while (padded.length < 18) padded.push({ 연번: padded.length + 1, 직종: "", 성명: "" });
        setAttendees(padded);
      }).catch(() => {/* 로드 실패해도 빈 폼 유지 */});
    }
  }, [editData?.id]);

  const update = (k, v) => setForm(s => ({ ...s, [k]: v }));
  const updateAttendee = (i, k, v) => setAttendees(a => a.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  // MSDS 교육 실시 사유 체크 상태 (form.실시사유 = "1,3" 형태)
  const reasonSet = new Set(String(form.실시사유 || "").split(",").map(x => parseInt(x.trim())).filter(Boolean));
  const toggleReason = (n) => {
    const set = new Set(reasonSet);
    set.has(n) ? set.delete(n) : set.add(n);
    update("실시사유", [...set].sort((a, b) => a - b).join(","));
  };

  const currentEduType = eduTypes.find(t => t.label === eduType) || eduTypes[0] || EDU_TYPES[0];
  // 백엔드 type은 content 필드 직접 가짐, fallback은 EDU_CONTENT 맵 참조
  const eduContent = currentEduType?.content || EDU_CONTENT[currentEduType?.id] || "해당 교육의 법령 내용이 적용됩니다.";
  // 참석자 명단 인원수 (MSDS는 1페이지에 맞게 17명, 그 외 18명). 2열 배치 → 행 수는 절반.
  const maxAttendees = currentEduType?.id === "MSDS" ? 17 : 18;
  const attRows = Math.ceil(maxAttendees / 2);

  // 결재 권한 확인
  const canSign담당 = APPROVAL_ROLES.담당.includes(currentUser.role);
  const canSign검토 = APPROVAL_ROLES.검토.includes(currentUser.role);
  const canSign승인 = APPROVAL_ROLES.승인.includes(currentUser.role);

  const handleSave = async () => {
    if (!form.사업장명) { setError("사업장명을 입력해주세요."); return; }
    if (!form.교육일자) { setError("교육일자를 입력해주세요."); return; }
    if (!form.강사명) { setError("강사명을 입력해주세요."); return; }
    setSaving(true); setError("");
    try {
      const logData = {
        교육종류: eduType,
        ...form,
        작성자: editData?.["작성자"] || currentUser.name, // 수정 시 원작성자 유지
        작성일: editData?.["작성일"] || new Date().toISOString(),
      };

      let logId;
      if (isEditMode && editData?.id) {
        // ── 수정 모드: PUT + 참석자 전체 재저장 ──
        await window.WV_API.updateEduLog(editData.id, logData);
        logId = editData.id;
        // 기존 참석자 삭제 → 현재 폼의 참석자 재삽입
        await window.WV_API.deleteEduAttendeesByEdu(logId);
      } else {
        // ── 새로 작성 ──
        const res = await window.WV_API.addEduLog({ ...logData, id: new Date().getTime().toString() });
        logId = res?.log?.id || res?.EducationLog?.id || res?.["시트5:EducationLog"]?.id;
      }

      // 참석자 저장 (수정/신규 공통)
      const filled = attendees.filter(a => a.성명?.trim());
      for (const a of filled) {
        await window.WV_API.addEduAttendee({
          educationId: logId,
          번호: a.연번,
          성명: a.성명,
          소속: form.사업장명 || "",
          직급: a.직종 || "",
          사번: "",
          서명: "",
        });
      }
      setSaved(true);
    } catch (e) {
      setError((isEditMode ? "수정" : "저장") + " 실패: " + (e.message || "다시 시도해주세요."));
    }
    setSaving(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString("ko-KR");

  return (
    <div className="content edu-form-wrap" style={{ maxWidth: 900 }}>
      <style>{`
        /* ── 화면용 버튼 ── */
        .edu-no-print { }

        /* ── A4 인쇄 표준 (위험성평가 표지와 동일 양식) ── */
        @page { size: A4 portrait; margin: 15mm; }
        @media print {
          /* 1) 페이지 리셋 */
          html, body {
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            font-size: 11pt !important;
            line-height: 1.45 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 2) 화면용 컨테이너 너비 제한 해제 */
          body * { visibility: hidden; }
          .edu-print-area, .edu-print-area * { visibility: visible; }
          .content, .content > *, main, #root, .app, .app-main, .layout, .layout-main, .edu-form-wrap {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
          }

          /* 3) 인쇄 영역 = A4 한 페이지 (테두리 없음) */
          .edu-print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            min-height: 267mm !important;
            font-size: 11pt !important;
            color: #000 !important;
          }

          /* 4) 화면 전용 요소 숨김 */
          .edu-no-print { display: none !important; }
          .no-print { display: none !important; }

          /* 5) 폼 요소 단순화 */
          input, select, textarea {
            border: none !important;
            background: transparent !important;
            color: #000 !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            outline: none !important;
          }

          /* 6) 달력 아이콘 인쇄 시 숨김 */
          input[type="date"]::-webkit-calendar-picker-indicator,
          input[type="datetime-local"]::-webkit-calendar-picker-indicator,
          input[type="time"]::-webkit-calendar-picker-indicator,
          input[type="month"]::-webkit-calendar-picker-indicator,
          input[type="week"]::-webkit-calendar-picker-indicator {
            display: none !important;
            opacity: 0 !important;
            width: 0 !important;
            padding: 0 !important;
          }

          /* 7) 표 가독성 + 페이지 분리 */
          .edu-print-area table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto;
          }
          .edu-print-area tr { page-break-inside: avoid; page-break-after: auto; }
          .edu-print-area thead { display: table-header-group; }
          .edu-print-area th,
          .edu-print-area td { font-size: 10.5pt !important; color: #000 !important; }
          .edu-print-area input,
          .edu-print-area textarea,
          .edu-print-area select { font-size: 11pt !important; color: #000 !important; }

          /* 8) 제목 폰트 크기 */
          .edu-print-area h1 { font-size: 18pt !important; }
          .edu-print-area h2 { font-size: 14pt !important; }
        }

        /* ── 서식 표 스타일 (사업장명~교육내용) ── */
        .edu-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
        .edu-tbl td, .edu-tbl th {
          border: 1px solid #333;
          padding: 10px 12px;
          vertical-align: middle;
        }
        .edu-tbl .lbl {
          background: #f0f0f0;
          font-weight: 600;
          text-align: center;
          white-space: nowrap;
          width: 90px;
          font-size: 13px;
        }
        .edu-tbl input[type="text"],
        .edu-tbl input[type="date"],
        .edu-tbl input[type="time"],
        .edu-tbl input[type="number"] {
          width: 100%;
          border: none;
          background: transparent;
          font-size: 13px;
          padding: 2px 0;
          outline: none;
        }
        .edu-attendee-tbl { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
        .edu-attendee-tbl td, .edu-attendee-tbl th {
          border: 1px solid #333;
          padding: 10px 12px;
          text-align: center;
        }
        .edu-attendee-tbl th { background: #f0f0f0; font-weight: 600; font-size: 13px; padding: 8px 12px; }
        .edu-attendee-tbl input {
          width: 100%; border: none; background: transparent;
          font-size: 13px; text-align: center; outline: none;
          padding: 2px 0;
        }
        .edu-title-row {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 8px;
        }
        .edu-approval-box { display: flex; gap: 0; border: 1px solid #333; }
        .edu-approval-cell {
          width: 64px; text-align: center; border-left: 1px solid #333;
        }
        .edu-approval-cell:first-child { border-left: none; }
        .edu-approval-cell .ap-label {
          background: #f0f0f0; font-size: 11px; font-weight: 600;
          padding: 3px; border-bottom: 1px solid #333;
        }
        .edu-approval-cell .ap-body { height: 48px; }
      `}</style>

      {/* 상단 버튼 (인쇄 제외) */}
      <div className="edu-no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => onNav({ name: "education-log-list" })}>
            <Icon name="arrow-left" size={14} /> 목록으로
          </button>
          {/* 모드 배지 */}
          {isEditMode && (
            <span style={{
              padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
              background: "var(--warning)", color: "#fff",
            }}>✏ 수정 모드</span>
          )}
          {isView && (
            <span style={{
              padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
              background: "var(--bg-sunk)", color: "var(--fg-2)", border: "1px solid var(--line)",
            }}>👁 조회 모드</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* 조회 모드에서 "수정으로 전환" 버튼 (권한자만) */}
          {isView && (currentUser?.role === "admin" || currentUser?.role === "safety" || editData?.["작성자"] === currentUser?.name) && (
            <button className="btn btn-primary"
              onClick={() => onNav({ name: "education-log-new", data: { ...editData, _editMode: true } })}>
              <Icon name="edit" size={14} /> 수정하기
            </button>
          )}
          {/* 작성/수정 모드: 저장 버튼 */}
          {(!isView) && !saved && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="login-spinner" /> : <><Icon name="check" size={14} /> {isEditMode ? "수정 저장" : "저장"}</>}
            </button>
          )}
          <PrintButton onClick={handlePrint} />
        </div>
      </div>

      {saved && (
        <div className="edu-no-print" style={{ background: "var(--success)", color: "#fff", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span><Icon name="check-circle" size={16} /> {isEditMode ? "수정 완료!" : "저장 완료!"} PDF 출력 버튼으로 출력하세요.</span>
          <button className="btn btn-sm" onClick={() => onNav({ name: "education-log-list" })}
            style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }}>
            목록으로 돌아가기
          </button>
        </div>
      )}
      {error && (
        <div className="edu-no-print" style={{ background: "var(--danger)", color: "#fff", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ═══ 인쇄 영역 (A4 한 페이지) — 위험성평가 문서와 동일 규격(padding 40px 50px, minHeight 미지정) ═══ */}
      <div className="edu-print-area card" style={{ padding: "40px 50px", border: "none", borderRadius: 0, background: "#fff", boxShadow: "none" }}>

        {/* 제목 — 위험성평가와 동일 스타일(26px/800 중앙정렬) */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{eduType} 교육일지</h2>
          {/* 화면에서만 보이는 드롭다운 */}
          {!isView && (
            <select className="edu-no-print"
              style={{ marginTop: 10, fontSize: 13, border: "1px solid #ddd", padding: "4px 8px", borderRadius: 4 }}
              value={eduType} onChange={e => setEduType(e.target.value)}>
              {eduTypes.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
            </select>
          )}
        </div>

        {/* 기본 정보 테이블 — colgroup + table-layout:fixed로 컬럼 너비 강제 */}
        <table className="edu-tbl" style={{ tableLayout: "fixed", marginTop: 28 }}>
          <colgroup>
            <col style={{ width: 90 }} />   {/* col1: 좌측 라벨 (사업장명/교육일자/교육인원/교육실시자) */}
            <col />                          {/* col2: 입력1 / 라벨2 (구분/교육대상자수 등) — 자동 */}
            <col style={{ width: 72 }} />   {/* col3: 계 (교육시간 라벨도 여기) */}
            <col style={{ width: 72 }} />   {/* col4: 남 */}
            <col style={{ width: 72 }} />   {/* col5: 여 */}
            <col />                          {/* col6: 미참석사유 — 자동 */}
          </colgroup>
          <tbody>
            {/* 사업장명 */}
            <tr>
              <td className="lbl">사업장명</td>
              <td colSpan={5}>
                <input type="text" value={form.사업장명}
                  onChange={e => update("사업장명", e.target.value)}
                  placeholder="사업장명 입력" readOnly={isView} />
              </td>
            </tr>
            {/* 교육일자 / 교육시간 */}
            <tr>
              <td className="lbl">교육일자</td>
              <td>
                <KDate value={form.교육일자}
                  onChange={e => update("교육일자", e.target.value)} readOnly={isView} />
              </td>
              <td className="lbl">교육시간</td>
              <td colSpan={3}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input type="time" step={600} value={form.시작시간} style={{ width: 90 }}
                    onChange={e => update("시작시간", e.target.value)} readOnly={isView} />
                  <span>~</span>
                  <input type="time" step={600} value={form.종료시간} style={{ width: 90 }}
                    onChange={e => update("종료시간", e.target.value)} readOnly={isView} />
                  <span style={{ color: "#666" }}>({currentEduType.hours})</span>
                </div>
              </td>
            </tr>
            {/* 교육인원 헤더 — colgroup으로 col3=col4=col5 너비 강제 (80px) */}
            <tr>
              <td className="lbl" rowSpan={3}>교육인원</td>
              <td className="lbl" style={{ background: "#f8f8f8" }}>구분</td>
              <td className="lbl" style={{ background: "#f8f8f8" }}>계</td>
              <td className="lbl" style={{ background: "#f8f8f8" }}>남</td>
              <td className="lbl" style={{ background: "#f8f8f8" }}>여</td>
              <td className="lbl" style={{ background: "#f8f8f8" }}>교육 미참석 사유</td>
            </tr>
            {/* 교육 대상자 수 */}
            <tr>
              <td className="lbl" style={{ background: "#fafafa" }}>교육 대상자 수</td>
              <td>
                <input type="number" min="0" value={form.대상자수_계}
                  onChange={e => update("대상자수_계", e.target.value)}
                  style={{ textAlign: "center" }} readOnly={isView} />
              </td>
              <td>
                <input type="number" min="0" value={form.대상자수_남}
                  onChange={e => update("대상자수_남", e.target.value)}
                  style={{ textAlign: "center" }} readOnly={isView} />
              </td>
              <td>
                <input type="number" min="0" value={form.대상자수_여}
                  onChange={e => update("대상자수_여", e.target.value)}
                  style={{ textAlign: "center" }} readOnly={isView} />
              </td>
              <td rowSpan={2}>
                <input type="text" value={form.미참석사유}
                  onChange={e => update("미참석사유", e.target.value)}
                  placeholder="미참석 사유" readOnly={isView} />
              </td>
            </tr>
            {/* 교육 실시자 수 */}
            <tr>
              <td className="lbl" style={{ background: "#fafafa" }}>교육 실시자 수</td>
              <td>
                <input type="number" min="0" value={form.실시자수_계}
                  onChange={e => update("실시자수_계", e.target.value)}
                  style={{ textAlign: "center" }} readOnly={isView} />
              </td>
              <td>
                <input type="number" min="0" value={form.실시자수_남}
                  onChange={e => update("실시자수_남", e.target.value)}
                  style={{ textAlign: "center" }} readOnly={isView} />
              </td>
              <td>
                <input type="number" min="0" value={form.실시자수_여}
                  onChange={e => update("실시자수_여", e.target.value)}
                  style={{ textAlign: "center" }} readOnly={isView} />
              </td>
            </tr>
            {/* 교육실시자 */}
            <tr>
              <td className="lbl" rowSpan={2}>교육실시자</td>
              <td className="lbl" style={{ background: "#fafafa" }}>담당자명</td>
              <td colSpan={2}>
                <input type="text" value={form.강사명}
                  onChange={e => update("강사명", e.target.value)}
                  placeholder="강사명" readOnly={isView} />
              </td>
              <td className="lbl" style={{ background: "#fafafa" }}>교육장소</td>
              <td>
                <input type="text" value={form.교육장소}
                  onChange={e => update("교육장소", e.target.value)}
                  placeholder="교육장소" readOnly={isView} />
              </td>
            </tr>
            <tr>
              <td className="lbl" style={{ background: "#fafafa" }}>직책</td>
              <td colSpan={4}>
                <input type="text" value={form.강사직책}
                  onChange={e => update("강사직책", e.target.value)}
                  placeholder="직책 입력" readOnly={isView} />
              </td>
            </tr>
            {/* 교육 실시 사유 (MSDS 전용) */}
            {currentEduType.id === "MSDS" && (
              <tr>
                <td className="lbl" style={{ lineHeight: 1.35 }}>교육<br />실시<br />사유</td>
                <td colSpan={5} style={{ padding: "10px 12px" }}>
                  {MSDS_REASONS.map((r, i) => {
                    const n = i + 1;
                    const checked = reasonSet.has(n);
                    return (
                      <label key={n} style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "5px 0", fontSize: 12, cursor: isView ? "default" : "pointer" }}>
                        <input type="checkbox" checked={checked} disabled={isView}
                          onChange={() => toggleReason(n)} style={{ marginTop: 2 }} />
                        <span>{n}. {r}</span>
                      </label>
                    );
                  })}
                </td>
              </tr>
            )}
            {/* 교육내용 */}
            <tr>
              <td className="lbl">교육내용</td>
              <td colSpan={5} style={{ whiteSpace: "pre-line", fontSize: 12.5, lineHeight: 1.9, padding: "14px 12px", minHeight: 180 }}>
                {eduContent}
                {currentEduType.id === "MSDS" && (
                  <div style={{ marginTop: 8, borderTop: "1px dashed #ccc", paddingTop: 6 }}>
                    <textarea
                      style={{ width: "100%", border: "none", background: "transparent", resize: "none", fontSize: 11.5, outline: "none", minHeight: 60 }}
                      placeholder="현재 사용 중인 대상화학물질의 명칭을 입력하세요"
                      readOnly={isView}
                      value={form.추가교육내용 || ""}
                      onChange={e => update("추가교육내용", e.target.value)}
                    />
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 참석자 명단 */}
        <div style={{ marginTop: 16 }}>
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
            &lt; 참석자 명단 &gt;
          </div>
          <table className="edu-attendee-tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }}>연번</th>
                <th style={{ width: 70 }}>직종</th>
                <th style={{ width: 90 }}>성명</th>
                <th style={{ width: 110 }}>서 명</th>
                <th style={{ width: 30 }}>연번</th>
                <th style={{ width: 70 }}>직종</th>
                <th style={{ width: 90 }}>성명</th>
                <th style={{ width: 110 }}>서 명</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: attRows }, (_, i) => (
                <tr key={i}>
                  {[i, i + attRows].map(idx => (
                    idx < maxAttendees ? (
                      <React.Fragment key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <input value={attendees[idx]?.직종 || ""}
                            onChange={e => updateAttendee(idx, "직종", e.target.value)}
                            readOnly={isView} />
                        </td>
                        <td>
                          <input value={attendees[idx]?.성명 || ""}
                            onChange={e => updateAttendee(idx, "성명", e.target.value)}
                            readOnly={isView} />
                        </td>
                        <td style={{ height: 38 }}></td>
                      </React.Fragment>
                    ) : (
                      <React.Fragment key={idx}>
                        <td></td><td></td><td></td><td style={{ height: 38 }}></td>
                      </React.Fragment>
                    )
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

// ── 교육일지 바로가기 ──
const EducationLogView = ({ onNav, currentUser }) => {
  // 위험성평가 '종류 선택' 카드(최초/정기/수시)와 동일한 스타일·크기.
  // 컨테이너도 법적의무판정처럼 maxWidth로 좁혀 화면 중앙에 오도록 함.
  const cards = [
    { icon: "plus",  color: "#1e5fcf", bg: "#eff6ff", title: "교육일지 작성", desc: "새 교육일지 작성 및 저장",   route: "education-log-new" },
    { icon: "file",  color: "#16a34a", bg: "#f0fdf4", title: "교육일지 목록", desc: "작성된 일지 조회 및 출력",   route: "education-log-list" },
    { icon: "users", color: "#d97706", bg: "#fffbeb", title: "참석자 명단",   desc: "별도 참석자 명단 출력",       route: "education-attendee-sheet" },
    { icon: "image", color: "#8b5cf6", bg: "#f5f3ff", title: "사진 대지",     desc: "교육 현장 사진 첨부 및 출력", route: "education-photo-board" },
  ];
  return (
    <div className="content" style={{ maxWidth: 900 }}>
      <h1 className="content-title">안전보건교육 일지</h1>
      <div className="content-sub">교육일지를 작성하거나 기존 일지를 조회할 수 있습니다.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 28 }}>
        {cards.map(c => (
          <div key={c.route}
            onClick={() => onNav({ name: c.route })}
            style={{
              background: c.bg, border: `2px solid ${c.color}`, borderRadius: 16,
              padding: "30px 24px", cursor: "pointer",
              transition: "transform .12s, box-shadow .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
          >
            <Icon name={c.icon} size={36} style={{ color: c.color }} />
            <h2 style={{ fontSize: 20, fontWeight: 800, color: c.color, marginTop: 14, marginBottom: 8 }}>{c.title}</h2>
            <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>{c.desc}</div>
            <div style={{ marginTop: 16, fontSize: 12, color: c.color, fontWeight: 600 }}>
              열기 →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 참석자 명단 별도 출력 (위험성평가 RiskAttendeesView와 동일 구조) ──
const EducationAttendeeSheet = ({ onNav, currentUser }) => {
  const [title, setTitle] = React.useState("");
  const [site, setSite] = React.useState("");
  const [date, setDate] = React.useState("");
  const [rows, setRows] = React.useState(
    Array.from({ length: 40 }, (_, i) => ({ 연번: i + 1, 직종: "", 성명: "", 서명: "" }))
  );
  const updRow = (i, k, v) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  return (
    <div className="content" style={{ maxWidth: 900 }}>
      <style>{`
        /* ── 참석자 명단 양식 (위험성평가와 동일 — 40명 좌우 분할) ── */
        @page { size: A4 portrait; margin: 15mm; }
        @media print {
          html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden; }
          .attendee-print-area, .attendee-print-area * { visibility: visible; }
          .content, .content > *, main, #root, .app, .app-main, .layout, .layout-main {
            max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important;
            background: transparent !important; box-shadow: none !important; border: none !important;
          }
          .attendee-print-area {
            position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important;
            width: 100% !important; max-width: none !important; margin: 0 !important;
            padding: 18mm 20mm !important;
            background: #fff !important; box-shadow: none !important;
            border: 1.5px solid #000 !important; border-radius: 0 !important; box-sizing: border-box !important;
            min-height: 267mm !important; font-size: 11pt !important; color: #000 !important;
          }
          .attendee-no-print { display: none !important; }
          input, select, textarea {
            border: none !important; background: transparent !important; color: #000 !important;
            -webkit-appearance: none !important; appearance: none !important; outline: none !important;
          }
          input[type="date"]::-webkit-calendar-picker-indicator {
            display: none !important; opacity: 0 !important; width: 0 !important; padding: 0 !important;
          }
        }
        /* ── 화면·인쇄 공통: 표 테두리 강제 통일 (1px solid #000) ── */
        .attendee-print-area .att-meta-tbl,
        .attendee-print-area .att-tbl {
          width: 100%; border-collapse: collapse !important; font-size: 13px;
          border: 1px solid #000 !important;
        }
        .attendee-print-area .att-meta-tbl { margin-bottom: 14px; }
        .attendee-print-area .att-meta-tbl td,
        .attendee-print-area .att-tbl td,
        .attendee-print-area .att-tbl th {
          border: 1px solid #000 !important;
          padding: 8px 12px;
          vertical-align: middle;
          box-sizing: border-box !important;
        }
        .attendee-print-area .att-tbl td,
        .attendee-print-area .att-tbl th {
          padding: 6px 8px;
          text-align: center;
          height: 40px;
        }
        .attendee-print-area .att-tbl th {
          background: #f0f0f0;
          font-weight: 700;
          padding: 8px 10px;
        }
        .attendee-print-area .att-meta-tbl .lbl {
          background: #f0f0f0;
          font-weight: 600;
          text-align: center;
          white-space: nowrap;
        }
        .attendee-print-area .att-meta-tbl input,
        .attendee-print-area .att-tbl input {
          width: 100%; border: none !important; background: transparent;
          font-size: 13px; outline: none !important; padding: 2px 0;
          font-family: inherit;
        }
        .attendee-print-area .att-tbl input {
          text-align: center;
        }
        .attendee-print-area .att-num {
          background: #fafafa;
          font-weight: 600;
          color: #555;
        }
        @media print {
          .attendee-print-area .att-meta-tbl,
          .attendee-print-area .att-tbl,
          .attendee-print-area .att-meta-tbl td,
          .attendee-print-area .att-tbl th,
          .attendee-print-area .att-tbl td {
            border: 1px solid #000 !important;
            border-collapse: collapse !important;
          }
          .attendee-print-area .att-meta-tbl input,
          .attendee-print-area .att-tbl input {
            border: none !important;
            background: transparent !important;
          }
          .attendee-print-area .att-meta-tbl .lbl,
          .attendee-print-area .att-tbl th,
          .attendee-print-area .att-num {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* 헤더 (인쇄 제외) */}
      <div className="attendee-no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onNav({ name: "education-log" })}>
          <Icon name="arrow-left" size={14} /> 돌아가기
        </button>
        <span style={{ fontWeight: 700, fontSize: 15 }}>참석자 명단 (별도 출력)</span>
        <div style={{ marginLeft: "auto" }}>
          <PrintButton />
        </div>
      </div>

      {/* 인쇄 영역 (A4) */}
      <div className="attendee-print-area" style={{ padding: 30, border: "1.5px solid #000", borderRadius: 0, background: "#fff", minHeight: 1100 }}>
        {/* 제목 */}
        <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 700, margin: "0 0 18px", letterSpacing: 4 }}>
          &lt; 참 석 자 명 단 &gt;
        </h2>

        {/* 메타 정보 (교육명/일자/사업장명) — 위험성평가와 동일 */}
        <table className="att-meta-tbl">
          <colgroup>
            <col style={{ width: "17%" }} />
            <col style={{ width: "33%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "33%" }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="lbl">교육명</td>
              <td>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 정기 안전보건교육" />
              </td>
              <td className="lbl">일자</td>
              <td>
                <KDate value={date} onChange={e => setDate(e.target.value)} />
              </td>
            </tr>
            <tr>
              <td className="lbl">사업장명</td>
              <td colSpan={3}>
                <input value={site} onChange={e => setSite(e.target.value)} placeholder="사업장명" />
              </td>
            </tr>
          </tbody>
        </table>

        {/* 40명 참석자 명단 (좌우 분할 1~20 / 21~40) */}
        <table className="att-tbl">
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>연번</th><th>직종</th><th>성명</th><th>서 명</th>
              <th>연번</th><th>직종</th><th>성명</th><th>서 명</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 20 }, (_, i) => {
              const left = i, right = i + 20;
              return (
                <tr key={i}>
                  {[left, right].map(idx => (
                    <React.Fragment key={idx}>
                      <td className="att-num">{idx + 1}</td>
                      <td><input value={rows[idx]?.직종 || ""} onChange={e => updRow(idx, "직종", e.target.value)} /></td>
                      <td><input value={rows[idx]?.성명 || ""} onChange={e => updRow(idx, "성명", e.target.value)} /></td>
                      <td><input value={rows[idx]?.서명 || ""} onChange={e => updRow(idx, "서명", e.target.value)} /></td>
                    </React.Fragment>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── 사진 대지 (위험성평가 RiskMeetingPhotosView와 동일 구조) ──
const EducationPhotoBoard = ({ onNav }) => {
  const SAVE_KEY = "wv_edu_photoboard";
  const _saved = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch { return null; } })();

  const [title, setTitle] = React.useState(_saved?.title || "안전보건교육");
  const [site,  setSite]  = React.useState(_saved?.site  || "");
  const [date,  setDate]  = React.useState(_saved?.date  || new Date().toISOString().slice(0, 10));
  const [photos, setPhotos] = React.useState(_saved?.photos || []);
  const [savedAt, setSavedAt] = React.useState(_saved?._savedAt || "");
  const [draggingOver, setDraggingOver] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const readFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotos(prev => [...prev, { id: Date.now() + Math.random(), src: e.target.result, name: file.name, caption: "" }]);
      };
      reader.readAsDataURL(file);
    });
  };
  const onDrop = (e) => { e.preventDefault(); setDraggingOver(false); readFiles(e.dataTransfer.files); };
  const onDragOver = (e) => { e.preventDefault(); setDraggingOver(true); };
  const onDragLeave = () => setDraggingOver(false);
  const removePhoto = (id) => setPhotos(prev => prev.filter(p => p.id !== id));
  const updateCaption = (id, caption) => setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption } : p));
  const movePhoto = (idx, dir) => {
    setPhotos(prev => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };
  const handleSave = () => {
    const at = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ title, site, date, photos, _savedAt: at }));
      setSavedAt(at);
    } catch (e) { alert("저장 실패: " + e.message); }
  };

  return (
    <div className="content" style={{ maxWidth: 900 }}>
      <style>{`
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden; }
          .eduphoto-print-area, .eduphoto-print-area * { visibility: visible; }
          .content, .content > *, main, #root, .app, .app-main, .layout, .layout-main {
            max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important;
            background: transparent !important; box-shadow: none !important; border: none !important;
          }
          .eduphoto-print-area {
            position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important;
            width: 100% !important; max-width: none !important; margin: 0 !important;
            padding: 18mm 20mm !important;
            background: #fff !important; box-shadow: none !important;
            border: 1.5px solid #000 !important; border-radius: 0 !important; box-sizing: border-box !important;
            min-height: 267mm !important; font-size: 11pt !important; color: #000 !important;
          }
          .eduphoto-no-print { display: none !important; }
          .eduphoto-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .eduphoto-item img { max-height: 220px !important; }
          .eduphoto-item .remove-btn { display: none !important; }
          .eduphoto-item .move-btn { display: none !important; }
        }
        .eduphoto-drop {
          border: 2px dashed #cbd5e1; border-radius: 12px; padding: 30px;
          text-align: center; color: #94a3b8; cursor: pointer; transition: all 0.15s;
          background: #f8fafc;
        }
        .eduphoto-drop.drag-over { border-color: #3b82f6; background: #eff6ff; color: #1e40af; }
        .eduphoto-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px;
        }
        .eduphoto-item {
          border: 1px solid #333; border-radius: 6px; overflow: hidden; background: #fff;
          display: flex; flex-direction: column;
        }
        .eduphoto-item .img-wrap {
          background: #f5f5f5; display: flex; align-items: center; justify-content: center;
          min-height: 180px; position: relative;
        }
        .eduphoto-item img { max-width: 100%; max-height: 240px; object-fit: contain; display: block; }
        .eduphoto-item .caption-area {
          border-top: 1px solid #333; padding: 6px 10px; background: #fafafa;
          display: flex; align-items: center; gap: 6px;
        }
        .eduphoto-item .caption-area input {
          flex: 1; border: none; background: transparent; outline: none; font-size: 12px; padding: 2px 0;
        }
      `}</style>

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm eduphoto-no-print" onClick={() => onNav({ name: "education-log" })}>
          <Icon name="arrow-left" size={14} /> 돌아가기
        </button>
        <span style={{ fontWeight: 700, fontSize: 15 }}>안전보건교육 사진대지</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-primary btn-sm eduphoto-no-print" onClick={handleSave}>
            <Icon name="check" size={13} /> 저장{savedAt && ` · ${savedAt}`}
          </button>
          <PrintButton className="eduphoto-no-print" />
        </div>
      </div>

      {/* 인쇄 영역 */}
      <div className="card eduphoto-print-area" style={{ padding: 30, border: "1.5px solid #000", borderRadius: 0, background: "#fff", minHeight: 1100 }}>
        {/* 제목 */}
        <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: 700, marginBottom: 16, letterSpacing: 2 }}>사 진 대 지</h2>

        {/* 메타 정보 (교육내용/사업장명/일자) */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 14 }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #333", background: "#f0f0f0", fontWeight: 600, textAlign: "center", padding: "8px 12px", width: 100 }}>교육내용</td>
              <td style={{ border: "1px solid #333", padding: "6px 10px" }}>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 정기 안전보건교육"
                  style={{ width: "100%", border: "none", background: "transparent", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              </td>
              <td style={{ border: "1px solid #333", background: "#f0f0f0", fontWeight: 600, textAlign: "center", padding: "8px 12px", width: 90 }}>일자</td>
              <td style={{ border: "1px solid #333", padding: "6px 10px", width: 160 }}>
                <KDate block value={date} onChange={e => setDate(e.target.value)}
                  style={{ width: "100%", border: "none", background: "transparent", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #333", background: "#f0f0f0", fontWeight: 600, textAlign: "center", padding: "8px 12px" }}>사업장명</td>
              <td colSpan={3} style={{ border: "1px solid #333", padding: "6px 10px" }}>
                <input value={site} onChange={e => setSite(e.target.value)} placeholder="사업장명"
                  style={{ width: "100%", border: "none", background: "transparent", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* 사진 업로드 영역 (편집 화면만) */}
        <div
          className={"eduphoto-no-print eduphoto-drop" + (draggingOver ? " drag-over" : "")}
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
          <Icon name="image" size={36} />
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>사진 첨부</div>
          <div style={{ marginTop: 4, fontSize: 11 }}>클릭하여 선택하거나 드래그·드롭으로 추가</div>
          <input type="file" accept="image/*" multiple ref={fileInputRef}
            onChange={e => { readFiles(e.target.files); e.target.value = ""; }}
            style={{ display: "none" }} />
        </div>

        {/* 사진 grid */}
        {photos.length === 0 ? (
          <div className="eduphoto-no-print" style={{ textAlign: "center", padding: "40px 20px", color: "#999", fontSize: 13, border: "1px dashed #ddd", borderRadius: 8, marginTop: 16 }}>
            아직 첨부된 사진이 없습니다. 위 영역에 사진을 추가해주세요.
          </div>
        ) : (
          <div className="eduphoto-grid">
            {photos.map((p, i) => (
              <div key={p.id} className="eduphoto-item">
                <div className="img-wrap">
                  <img src={p.src} alt={p.name} />
                  <button className="remove-btn eduphoto-no-print" type="button" onClick={() => removePhoto(p.id)}
                    title="삭제"
                    style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 99, width: 24, height: 24, cursor: "pointer", fontSize: 12 }}>✕</button>
                </div>
                <div className="caption-area">
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#555", minWidth: 28 }}>#{i + 1}</span>
                  <input value={p.caption} onChange={e => updateCaption(p.id, e.target.value)}
                    placeholder="사진 설명 (예: 강사 교육 진행 모습)" />
                  <span className="move-btn eduphoto-no-print" style={{ display: "flex", gap: 2 }}>
                    {i > 0 && <button type="button" onClick={() => movePhoto(i, -1)} title="앞으로"
                      style={{ background: "none", border: "1px solid #ddd", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 10 }}>↑</button>}
                    {i < photos.length - 1 && <button type="button" onClick={() => movePhoto(i, 1)} title="뒤로"
                      style={{ background: "none", border: "1px solid #ddd", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 10 }}>↓</button>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 교육 종류 관리 모달 (admin/안전관리자 전용)
// 신규 추가 / 인라인 편집 / 삭제 / 숨김 토글 / 정렬값 변경
// 숨김: 우리 회사에서 안 쓰는 교육을 사용자 화면에서 가리되, 필요할 때 다시 표시 가능
// ─────────────────────────────────────────────────────────────
const EducationTypesManageModal = ({ onClose }) => {
  // 자체 로드 — 항상 includeHidden=true (숨김 포함 전체)
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [hiddenFilter, setHiddenFilter] = React.useState("all"); // all | visible | hidden
  const [editingId, setEditingId] = React.useState(null);
  const [draft, setDraft] = React.useState({ id: "", label: "", hours: "", content: "", sortOrder: 999 });
  const [showAdd, setShowAdd] = React.useState(false);
  const [adding, setAdding] = React.useState({ id: "", label: "", hours: "2시간", content: "", sortOrder: 999 });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await window.WV_API.getEduTypes({ includeHidden: true });
      setItems(list || []);
    } catch (e) {
      setErr(e.message || "로딩 실패");
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { reload(); }, [reload]);

  const startEdit = (it) => {
    setEditingId(it.id);
    setDraft({ id: it.id, label: it.label || "", hours: it.hours || "", content: it.content || "", sortOrder: it.sortOrder ?? 999 });
    setErr("");
  };

  const saveEdit = async () => {
    setBusy(true); setErr("");
    try {
      await window.WV_API.updateEduType(editingId, {
        label: draft.label,
        hours: draft.hours,
        content: draft.content,
        sortOrder: parseInt(draft.sortOrder) || 999,
      });
      setEditingId(null);
      await reload();
    } catch (e) {
      setErr(e.message || "저장 실패");
    }
    setBusy(false);
  };

  // 숨김 ↔ 표시 토글 (삭제 대신)
  const toggleHidden = async (it) => {
    setBusy(true); setErr("");
    try {
      await window.WV_API.updateEduType(it.id, { hidden: !it.hidden });
      await reload();
    } catch (e) {
      setErr(e.message || "변경 실패");
    }
    setBusy(false);
  };

  const remove = async (id, label) => {
    if (!window.confirm(
      `"${label}" 교육 종류를 영구 삭제하시겠습니까?\n\n` +
      `💡 임시로 사용 안 하실 거라면 "숨김" 버튼을 사용하세요.\n` +
      `삭제하면 복구할 수 없습니다 (기존 교육일지는 보존됨).`
    )) return;
    setBusy(true); setErr("");
    try {
      await window.WV_API.deleteEduType(id);
      await reload();
    } catch (e) {
      setErr(e.message || "삭제 실패");
    }
    setBusy(false);
  };

  const addNew = async () => {
    if (!adding.id.trim() || !adding.label.trim()) {
      setErr("ID와 교육명을 입력하세요.");
      return;
    }
    setBusy(true); setErr("");
    try {
      await window.WV_API.addEduType({
        id: adding.id.trim(),
        label: adding.label.trim(),
        hours: adding.hours,
        content: adding.content,
        sortOrder: parseInt(adding.sortOrder) || 999,
      });
      setShowAdd(false);
      setAdding({ id: "", label: "", hours: "2시간", content: "", sortOrder: 999 });
      await reload();
    } catch (e) {
      setErr(e.message || "추가 실패");
    }
    setBusy(false);
  };

  // 필터 적용
  const filtered = items.filter(it => {
    if (hiddenFilter === "visible") return !it.hidden;
    if (hiddenFilter === "hidden") return !!it.hidden;
    return true;
  });
  const counts = {
    all:     items.length,
    visible: items.filter(it => !it.hidden).length,
    hidden:  items.filter(it => !!it.hidden).length,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg)", borderRadius: 12, width: "100%", maxWidth: 1100, maxHeight: "92vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>교육 종류 관리</h2>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>
              산업안전보건법 시행규칙 [별표 5] 기준 · 회사 미사용 교육은 숨김 처리 가능
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}>
              <Icon name="plus" size={12} /> {showAdd ? "취소" : "새 교육종류 추가"}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>닫기</button>
          </div>
        </div>

        {/* 필터 탭 */}
        <div style={{ display: "flex", gap: 4, padding: "10px 20px", borderBottom: "1px solid var(--line)", background: "var(--bg-sunk)" }}>
          {[
            { id: "all",     label: "전체",   count: counts.all,     color: "var(--fg-2)" },
            { id: "visible", label: "사용 중", count: counts.visible, color: "var(--success)" },
            { id: "hidden",  label: "숨김",   count: counts.hidden,  color: "var(--fg-3)" },
          ].map(t => (
            <button key={t.id} onClick={() => setHiddenFilter(t.id)}
              style={{
                padding: "6px 14px", border: "1px solid var(--line)",
                background: hiddenFilter === t.id ? "var(--primary)" : "var(--bg)",
                color: hiddenFilter === t.id ? "#fff" : t.color,
                borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
              {t.label} <span style={{ opacity: 0.7, marginLeft: 4 }}>({t.count})</span>
            </button>
          ))}
        </div>

        {/* 에러 / 추가 폼 */}
        {err && (
          <div style={{ background: "#fef2f2", color: "#b71c1c", padding: "10px 20px", borderBottom: "1px solid #fecaca", fontSize: 13 }}>
            ❌ {err}
          </div>
        )}
        {showAdd && (
          <div style={{ background: "var(--bg-sunk)", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 100px 90px auto", gap: 8, marginBottom: 8 }}>
              <input className="field-input" placeholder="ID (영문/숫자, 예: 특별교육_화학)"
                value={adding.id} onChange={e => setAdding({ ...adding, id: e.target.value })} />
              <input className="field-input" placeholder="교육명 (예: 특별교육 (제40호 화학물질))"
                value={adding.label} onChange={e => setAdding({ ...adding, label: e.target.value })} />
              <input className="field-input" placeholder="교육시간"
                value={adding.hours} onChange={e => setAdding({ ...adding, hours: e.target.value })} />
              <input className="field-input" type="number" placeholder="정렬"
                value={adding.sortOrder} onChange={e => setAdding({ ...adding, sortOrder: e.target.value })} />
              <button className="btn btn-primary btn-sm" onClick={addNew} disabled={busy}>저장</button>
            </div>
            <textarea className="field-input" rows={4}
              placeholder="교육 내용 (법령 조문 + 항목 목록)"
              value={adding.content} onChange={e => setAdding({ ...adding, content: e.target.value })}
              style={{ width: "100%", fontFamily: "inherit", fontSize: 12, lineHeight: 1.6, resize: "vertical" }} />
          </div>
        )}

        {/* 목록 */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-sunk)", borderBottom: "2px solid var(--line)" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", width: 50 }}>정렬</th>
                <th style={{ padding: "10px 12px", textAlign: "left", width: 180 }}>ID</th>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>교육명</th>
                <th style={{ padding: "10px 12px", textAlign: "left", width: 90 }}>시간</th>
                <th style={{ padding: "10px 12px", textAlign: "center", width: 160 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--fg-3)" }}>
                  <span className="login-spinner" style={{ width: 20, height: 20 }} /> 불러오는 중...
                </td></tr>
              ) : filtered.map(it => (
                <React.Fragment key={it.id}>
                  <tr style={{ borderBottom: "1px solid var(--line-2)", opacity: it.hidden ? 0.55 : 1, background: it.hidden ? "rgba(0,0,0,0.02)" : "transparent" }}>
                    <td style={{ padding: "10px 12px", color: "var(--fg-3)", fontSize: 12 }}>
                      {editingId === it.id
                        ? <input className="field-input" type="number" style={{ width: 60, padding: 4 }}
                            value={draft.sortOrder} onChange={e => setDraft({ ...draft, sortOrder: e.target.value })} />
                        : (it.sortOrder ?? "-")}
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "var(--fg-3)", fontSize: 12 }}>{it.id}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                      {editingId === it.id ? (
                        <input className="field-input" style={{ width: "100%", padding: 4 }}
                          value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} />
                      ) : (
                        <span>
                          {it.label}
                          {it.hidden && (
                            <span style={{
                              marginLeft: 8, padding: "2px 8px", borderRadius: 10, fontSize: 10,
                              background: "var(--fg-3)", color: "#fff", fontWeight: 600,
                            }}>숨김</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {editingId === it.id
                        ? <input className="field-input" style={{ width: 80, padding: 4 }}
                            value={draft.hours} onChange={e => setDraft({ ...draft, hours: e.target.value })} />
                        : it.hours}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {editingId === it.id ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={busy}>저장</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>취소</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => startEdit(it)} disabled={busy}>
                            <Icon name="edit" size={11} /> 수정
                          </button>
                          {it.hidden ? (
                            <button className="btn btn-sm" onClick={() => toggleHidden(it)} disabled={busy}
                              style={{ background: "var(--success)", color: "#fff", border: "none" }}>
                              <Icon name="eye" size={11} /> 표시
                            </button>
                          ) : (
                            <button className="btn btn-sm" onClick={() => toggleHidden(it)} disabled={busy}
                              style={{ background: "var(--bg-sunk)", color: "var(--fg-2)", border: "1px solid var(--line)" }}>
                              <Icon name="eye-off" size={11} /> 숨김
                            </button>
                          )}
                          <button className="btn btn-danger btn-sm" onClick={() => remove(it.id, it.label)} disabled={busy}>
                            <Icon name="trash" size={11} /> 삭제
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {editingId === it.id && (
                    <tr style={{ background: "var(--bg-sunk)" }}>
                      <td colSpan={5} style={{ padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>교육 내용 (법령 조문 + 항목 목록)</div>
                        <textarea className="field-input" rows={8}
                          value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })}
                          style={{ width: "100%", fontFamily: "inherit", fontSize: 12, lineHeight: 1.6, resize: "vertical" }} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--fg-3)" }}>
                  {hiddenFilter === "hidden" ? "숨김 처리된 교육이 없습니다." : "등록된 교육 종류가 없습니다."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 푸터 */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--fg-3)", lineHeight: 1.6 }}>
          💡 <b>숨김</b>은 사용자 화면에서만 가려요. 언제든 "표시"로 다시 활성화 가능 (권장).<br />
          🗑 <b>삭제</b>는 영구 제거이며 복구 불가. 회사 미사용 교육은 숨김을 사용하세요.
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { EducationLogView, EducationLogForm, EducationLogList, EducationAttendeeSheet, EducationPhotoBoard, EducationTypesManageModal });
