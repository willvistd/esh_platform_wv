/*
 * concise.js - 존댓말 → 개조식 치환 (화면 표시용)
 * 적용: 안내 문구, 점검 코멘트, 카드/표 설명, AI 생성 문장 후처리
 * 제외: 법령 원문, PDF 원문, 데이터 (URL, 제N조, 따옴표 인용은 자동 보호)
 */
(function (root) {
  // 1) 자주 나오는 표현: [바꾸기 전, 바꾼 후]. 순서는 상관없음(길이순 자동 정렬)
  const PHRASES = [
    ['사진상 미확인은 미설치 판정이 아닙니다', '사진상 미확인 ≠ 미설치 판정'],
    ['확인하지 못했습니다', '확인 불가'],
    ['확인되지 않았습니다', '미확인'],
    ['확인되지 않습니다', '미확인'],
    ['확인해 주세요', '확인 필요'],
    ['확인 부탁드립니다', '확인 필요'],
    ['검토 부탁드립니다', '검토 필요'],
    ['조치 부탁드립니다', '조치 필요'],
    ['협조 부탁드립니다', '협조 요청'],
    ['참고하시기 바랍니다', '참고'],
    ['참고해 주세요', '참고'],
    ['주의하시기 바랍니다', '주의'],
    ['주의해 주세요', '주의'],
    ['해서는 안 됩니다', '금지'],
    ['하지 않도록 해야 합니다', '방지 필요'],
    ['되어야 합니다', '필요'],
    ['진행 중입니다', '진행 중'],
    ['준비 중입니다', '준비 중'],
    ['조치 완료되었습니다', '조치 완료'],
    ['설치되어 있습니다', '설치됨'],
    ['설치되어 있지 않습니다', '미설치'],
    ['달라질 수 있습니다', '변동 가능'],
    ['할 수 있습니다', '가능'],
    ['할 수 없습니다', '불가'],
    ['필요합니다', '필요'],
    ['제공됩니다', '제공'],
  ];

  // 2) 어미 규칙: 정규식 [패턴, 치환]. 위에서부터 순서대로 적용
  //    END = 절/문장 끝 경계 (공백, 문장부호, 문장 끝)
  const END = '(?=$|[\\s.,;:!?)\\]」』"\'])';
  const K = '([가-힣A-Za-z0-9]+)';
  const ENDINGS = [
    [new RegExp(K + '하지 마세요' + END, 'g'), '$1 금지'],
    [new RegExp(K + '(?:하시기 바랍니다|해 주시기 바랍니다|해 주세요|하세요|해야 합니다|해야 한다)' + END, 'g'), '$1 필요'],
    [new RegExp('(않|못)(?:았|았었)?습니다' + END, 'g'), '$1음'],
    [new RegExp('(않|못)했습니다' + END, 'g'), '$1함'],
    [new RegExp('(?:했|하였)습니다' + END, 'g'), '함'],
    [new RegExp('(?:되었|됐)습니다' + END, 'g'), '됨'],
    [new RegExp('됩니다' + END, 'g'), '됨'],
    [new RegExp('합니다' + END, 'g'), '함'],
    [new RegExp(K + '(?:하실|할) 수 있습니다' + END, 'g'), '$1 가능'],
    [new RegExp(K + '(?:하실|할) 수 없습니다' + END, 'g'), '$1 불가'],
    [new RegExp('있습니다' + END, 'g'), '있음'],
    [new RegExp('없습니다' + END, 'g'), '없음'],
    [new RegExp('아닙니다' + END, 'g'), '아님'],
    [new RegExp('입니다' + END, 'g'), '임'],
    [new RegExp('([았었겠])습니다' + END, 'g'), '$1음'],
  ];

  // 3) 보호 대상: 치환하지 않고 그대로 둘 부분
  const PROTECT = [
    /https?:\/\/\S+/g,                       // URL
    /제\s?\d+조(?:의\s?\d+)?(?:\s?제\s?\d+항)?(?:\s?제\s?\d+호)?/g, // 조문 번호
    /"[^"\n]*"|“[^”\n]*”|「[^」\n]*」|『[^』\n]*』/g, // 인용문
  ];

  const sortedPhrases = PHRASES.slice().sort((a, b) => b[0].length - a[0].length);

  function concise(value) {
    let text = String(value == null ? '' : value);
    const saved = [];
    for (const re of PROTECT) {
      text = text.replace(re, (m) => {
        saved.push(m);
        return '\uE000' + (saved.length - 1) + '\uE001';
      });
    }
    for (const [from, to] of sortedPhrases) text = text.split(from).join(to);
    for (const [re, to] of ENDINGS) text = text.replace(re, to);
    text = text.replace(/([가-힣A-Za-z0-9])[을를] ([가-힣A-Za-z0-9]+ (?:필요|금지|요청|불가|가능))/g, '$1 $2');
    text = text.replace(/[ \t]{2,}/g, ' ').replace(/ +([.,])/g, '$1');
    text = text.replace(/\uE000(\d+)\uE001/g, (_, i) => saved[Number(i)]);
    return text.trim();
  }

  root.Concise = { concise, PHRASES, ENDINGS };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Concise;
})(typeof window !== 'undefined' ? window : globalThis);

// node concise.js 로 실행하면 샘플 테스트가 돌아감
if (typeof require !== 'undefined' && require.main === module) {
  const { concise } = module.exports;
  const samples = [
    '소화기 압력 게이지를 확인해 주세요.',
    '비상구 앞 적치물은 즉시 정리하시기 바랍니다.',
    '사진상 미확인은 미설치 판정이 아닙니다.',
    '현재 개선 조치를 진행 중입니다.',
    '안전관리자는 월 1회 점검을 실시합니다.',
    '산업안전보건법 제36조에 따라 위험성평가를 실시했습니다.',
    '해당 구역에는 감지기가 없습니다.',
    '자세한 내용은 https://www.kosha.or.kr 에서 확인하실 수 있습니다.',
    '관리감독자는 보호구를 착용하지 않았습니다.',
  ];
  for (const s of samples) console.log(s + '\n  → ' + concise(s));
}
