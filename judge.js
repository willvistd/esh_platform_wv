// ────────────────────────────────────────────────────────────────
//  규제 판정 엔진 (작업환경측정·특수건강진단·관리대상 등)
//  - 판정은 로컬 테이블(data/substances.json)로만 수행. 외부 API 의존 없음.
//  - 순수 함수 모듈. I/O는 로드 시 1회(JSON)만.
// ────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let DB = { meta: {}, substances: [], substance_groups: [] };
let CAS_INDEX = new Map();     // 정규화 CAS → record
try {
  DB = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'substances.json'), 'utf8'));
  for (const s of DB.substances) {
    CAS_INDEX.set(s.cas, s);
  }
} catch (e) {
  console.error('[judge] substances.json 로드 실패:', e.message);
}

// ── CAS 정규화 ──
function normalizeCas(raw) {
  if (!raw) return null;
  // 전각→반각, 유사문자 정리 후 숫자·하이픈만
  let s = String(raw)
    .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
    .replace(/[‐‑‒–—―−]/g, '-')   // 각종 대시 → 하이픈
    .replace(/[^\d-]/g, '');
  const m = s.match(/^(\d{2,7})-(\d{2})-(\d)$/);
  return m ? s : null;
}

// ── CAS 체크디짓 검증 ──
function casCheckDigitOk(cas) {
  const m = (cas || '').match(/^(\d{2,7})-(\d{2})-(\d)$/);
  if (!m) return false;
  const digits = (m[1] + m[2]).split('').reverse();
  const sum = digits.reduce((acc, d, i) => acc + Number(d) * (i + 1), 0);
  return sum % 10 === Number(m[3]);
}

// ── 함유량 파싱 → {max, exclusive, raw, undetermined} ──
//  "30~40%", "1-5%", "<1%", "≤1", "≥0.5", "1% 이상", "미공개" 등 처리.
function parseContent(raw) {
  const r = { raw: raw == null ? '' : String(raw).trim(), max: null, exclusive: false, undetermined: false };
  const s = r.raw.replace(/\s/g, '');
  if (!s || /영업비밀|비공개|미공개|미기재|tradesecret|confidential|n\/?a/i.test(s)) {
    r.undetermined = true; return r;
  }
  const num = str => { const m = str.match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : null; };
  let m;
  if ((m = s.match(/(\d+(?:\.\d+)?)\s*[~\-–]\s*(\d+(?:\.\d+)?)/))) {      // 범위 A~B → 상한 B
    r.max = parseFloat(m[2]);
  } else if (/(<|미만|초과미만)/.test(s) && !/이상|초과/.test(s)) {       // <X, X미만
    r.max = num(s); r.exclusive = true;
  } else if (/(≤|이하)/.test(s)) {                                        // ≤X, X이하
    r.max = num(s);
  } else if (/(≥|>|이상|초과)/.test(s)) {                                 // ≥X, X이상 → 상한 개방
    r.max = 100;
  } else if ((m = s.match(/^(\d+(?:\.\d+)?)%?$/))) {                       // 단일 수치
    r.max = parseFloat(m[1]);
  } else {
    const n = num(s);
    if (n == null) { r.undetermined = true; } else { r.max = n; }
  }
  return r;
}

// ── 이름 키워드로 group fallback ──
function matchGroup(name) {
  if (!name) return null;
  const nm = String(name).replace(/\s/g, '');
  for (const g of DB.substance_groups) {
    const kws = g.match_keywords || [];
    const ex = g.exclude_keywords || [];
    if (ex.some(k => nm.includes(k.replace(/\s/g, '')))) continue;
    if (kws.some(k => k && nm.includes(k.replace(/\s/g, '')))) return g;
  }
  return null;
}

// ── 단일 성분 판정 ──
//  comp: { name, cas, content }
function judgeComponent(comp) {
  const nameRaw = (comp.name || '').trim();
  const casRaw = (comp.cas || '').trim();
  const content = parseContent(comp.content);
  const out = {
    name: nameRaw, cas_raw: casRaw, cas: null,
    content_raw: content.raw, content_max_pct: content.max,
    match_method: null,
    wem: { result: 'NOT_LISTED', reason: '', basis: '' },
    she: { result: 'NOT_LISTED', basis: '' },
    flags: [], exposure_limit: null,
  };

  // 1) CAS 정규화·검증
  let cas = normalizeCas(casRaw);
  if (casRaw && !cas) {
    out.wem = { result: 'UNDETERMINED', reason: 'CAS 형식 오류', basis: '' };
    out.she = { result: 'UNDETERMINED', basis: '' };
    out.note = 'CAS 번호 형식 오류 — 수동 확인 필요';
    return out;
  }
  if (cas && !casCheckDigitOk(cas)) {
    out.cas = cas;
    out.wem = { result: 'UNDETERMINED', reason: 'CAS 체크디짓 불일치', basis: '' };
    out.she = { result: 'UNDETERMINED', basis: '' };
    out.note = 'CAS 번호 오류 의심 (체크디짓 불일치) — 수동 확인 필요';
    return out;
  }

  // 2) 물질 조회 (CAS 우선, 실패 시 이름 키워드 group)
  let rec = cas ? CAS_INDEX.get(cas) : null;
  let group = null;
  if (rec) { out.match_method = 'cas'; out.cas = cas; }
  else {
    group = matchGroup(nameRaw);
    if (group && group.represent_cas) rec = CAS_INDEX.get(group.represent_cas);
    if (group) { out.match_method = 'keyword'; out.cas = cas; }
  }

  if (!rec && !group) {
    out.wem = { result: 'NOT_LISTED', reason: '법정 목록에 없음', basis: '' };
    out.she = { result: 'NOT_LISTED', basis: '' };
    return out;
  }

  // 3) 성분 미공개/함유량 미기재 → UNDETERMINED (등재는 됐으나 판정 근거 부족)
  const src = rec || {};
  const wem = src.wem || (group && group.wem) || { listed: false };
  const she = src.she || (group && group.she) || { listed: false };

  // ── 작업환경측정(wem) 판정 ──
  if (wem.listed) {
    const th = wem.threshold_pct; // null=하한없음(분진)
    out.exposure_limit = src.exposure_limit || null;
    if (th == null) {
      out.wem = { result: 'TARGET', reason: `별표21 ${wem.category} 등재 — 함유량 하한 없음`, basis: '산업안전보건법 시행규칙 별표21' };
    } else if (content.undetermined || content.max == null) {
      out.wem = { result: 'UNDETERMINED', reason: '함유량 미기재/미공개 — 판정 불가', basis: '산업안전보건법 시행규칙 별표21' };
    } else {
      const isTarget = content.exclusive ? content.max > th : content.max >= th;
      if (isTarget) {
        out.wem = { result: 'TARGET', reason: `별표21 ${wem.category} 등재, 함유량 ${content.raw}${content.max!=null?` (상한 ${content.max}%)`:''} ≥ 기준 ${th}%`, basis: '산업안전보건법 시행규칙 별표21' };
      } else {
        out.wem = { result: 'BELOW_THRESHOLD', reason: `별표21 ${wem.category} 등재이나 함유량 ${content.raw} < 기준 ${th}%`, basis: '산업안전보건법 시행규칙 별표21' };
      }
    }
  } else {
    out.wem = { result: 'NOT_LISTED', reason: '별표21 미등재', basis: '' };
  }

  // ── 특수건강진단(she) 판정 ── (물질 취급 시 대상 — 함유량 하한 규정 없음)
  if (she.listed) {
    out.she = { result: 'TARGET', reason: `별표22 ${she.category||''} 등재`.trim(), basis: '산업안전보건법 시행규칙 별표22' };
  } else {
    out.she = { result: 'NOT_LISTED', basis: '' };
  }

  // ── 플래그 ──
  const managed = src.managed || (group && group.managed) || {};
  if (managed.listed) out.flags.push('관리대상유해물질');
  if (managed.special) out.flags.push('특별관리물질');
  if (src.permit_required || (group && group.permit_required)) out.flags.push('허가대상물질');
  if (src.allowable_std && src.allowable_std.listed) out.flags.push('허용기준설정물질');
  if (out.match_method === 'keyword') out.flags.push('이름매칭(신뢰도 낮음)');

  return out;
}

// ── 여러 성분 일괄 판정 + 요약 ──
function judgeAll(components, product) {
  const comps = (components || []).map(judgeComponent);
  const summary = {
    wem_target_count: comps.filter(c => c.wem.result === 'TARGET').length,
    wem_below_count: comps.filter(c => c.wem.result === 'BELOW_THRESHOLD').length,
    she_target_count: comps.filter(c => c.she.result === 'TARGET').length,
    special_substance: comps.some(c => c.flags.includes('특별관리물질')),
    permit_substance: comps.some(c => c.flags.includes('허가대상물질')),
    undetermined_count: comps.filter(c => c.wem.result === 'UNDETERMINED').length,
    not_listed_count: comps.filter(c => c.wem.result === 'NOT_LISTED').length,
  };
  return {
    product_name: (product && product.name) || '',
    manufacturer: (product && product.manufacturer) || '',
    msds_revision_date: (product && product.revisionDate) || '',
    judged_at: new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10),
    data_baseline: DB.meta && DB.meta.기준일 || '',
    summary,
    components: comps,
    notices: [
      '본 판정은 물질의 법정 목록 등재 여부에 대한 것이며, 실제 측정 의무는 취급량·작업시간 등 취급 실태에 따라 달라질 수 있습니다.',
      '측정 제외 가능: ① 관리대상 유해물질 허용소비량 이내 작업장 ② 임시작업·단시간작업 ③ 분진작업 적용제외 작업장 ④ 노출수준이 노출기준 대비 현저히 낮아 고시된 작업장(시행규칙 제186조 단서).',
      '소음(8시간 TWA 80dB 이상)·고열 등 물리적 인자는 MSDS로 판정할 수 없어 본 결과에서 제외됩니다. 해당 작업 여부는 별도 확인이 필요합니다.',
    ],
  };
}

module.exports = { normalizeCas, casCheckDigitOk, parseContent, judgeComponent, judgeAll, meta: () => DB.meta };
