# 별표 PDF 텍스트 → data/substances.json 시드 생성 + 건수 대조 리포트
import re, json, sys
from collections import OrderedDict

LAW = "law"
CAS_RE = r'\d{2,7}-\d{2}-\d'

def read(f): return open(f"{LAW}/{f}.txt", encoding="utf-8").read()

def clean(txt):
    for p in [r'■산업안전보건[^\n]*', r'(작업환경측정|특수건강진단)대상유해인자[^\n]*',
              r'관리대상\s*유해물질의?\s*종류[^\n]*', r'<개정[^>]*>',
              r'유해인자별노출농도의허용기준[^\n]*']:
        txt = re.sub(p, '', txt)
    # 줄바꿈으로 쪼개진 CAS 꼬리 재결합 (예: '12179-04-\n3)' → '12179-04-3)')
    txt = re.sub(r'(\d{2,7}-\d{2}-)\s*\n\s*(\d)', r'\1\2', txt)
    return txt

def norm_cas(raw):
    """공백/전각 제거 후 CAS 형식 재조립. 유효하지 않으면 None."""
    if not raw: return None
    s = re.sub(r'[^\d\-]', '', raw)
    m = re.match(r'^(\d{2,7})-(\d{2})-(\d)$', s)
    return s if m else None

def cas_check_digit_ok(cas):
    """CAS 체크디짓 검증."""
    m = re.match(r'^(\d{2,7})-(\d{2})-(\d)$', cas or '')
    if not m: return False
    digits = (m.group(1) + m.group(2))[::-1]
    total = sum(int(d) * (i + 1) for i, d in enumerate(digits))
    return total % 10 == int(m.group(3))

def parse_entry(body):
    """'글루타르알데히드(Glutaraldehyde; 111-30-8)' / '아닐린[62-53-3] 및 그 동족체(...)' → dict"""
    body = re.sub(r'\s+', ' ', body).strip()
    special = '특별관리물질' in body
    b = body.replace('(특별관리물질)', '').strip()
    cas_list = [c for c in (norm_cas(x) for x in re.findall(CAS_RE, b)) if c]
    ko = re.split(r'[\(\[]', b)[0].strip()
    ko = re.sub(r'\s*및\s*그.*$', '', ko).strip()  # '및 그 염/화합물/동족체' 제거한 대표명
    en_m = re.search(r'[\(\[]([A-Za-z][^;\]\)]*)', b)
    en = en_m.group(1).strip() if en_m else ''
    is_group = bool(re.search(r'및\s*그\s*(염|화합물|동족체|무기화합물|유기화합물)', body)) or ('화합물' in ko and not cas_list)
    return dict(ko=ko, en=en, cas=cas_list, special=special, is_group=is_group, raw=body)

def all_headers(txt):
    """(pos, level, name, decl) — 가./나. 및 1./2. 및 (N종) 헤더."""
    hs = []
    for m in re.finditer(r'(?:^|\n)\s*([가-힣]|\d{1,2})\.\s*([^\n(]{1,40}?)\s*\((\d+)\s*종\)', txt):
        hs.append((m.start(), m.end(), m.group(2).strip(), int(m.group(3))))
    return sorted(hs)

def parse_list_table(txt, want_cats):
    """화학적 인자 소분류별 N) 품목 파싱. want_cats: {정규화헤더키: 표준카테고리명}
    반환: {표준카테고리명: {'declared','subs':[entry], 'threshold_raw'}}"""
    hs = all_headers(txt)
    out = OrderedDict()
    for i, (s, e, name, decl) in enumerate(hs):
        key = re.sub(r'\s', '', name)
        matched = None
        for wk, std in want_cats.items():
            if wk in key:
                matched = std; break
        if not matched:
            continue
        end = hs[i + 1][0] if i + 1 < len(hs) else len(txt)
        seg = txt[e:end]
        # 줄 시작 N) 품목 (연속행 흡수)
        raw = re.findall(r'(?:^|\n)\s*(\d{1,3})\)\s*([^\n]*(?:\n(?!\s*\d{1,3}\)|\s*[가-힣]\.|\s*[가-힣]\))[^\n]*)*)', seg)
        subs = []; threshold_raw = None
        for n, body in raw:
            flat = re.sub(r'\s+', '', body)
            is_threshold = bool(re.search(r'함유한?혼합물', flat)) or bool(re.search(r'\)(부터|의).*함유', flat))
            if is_threshold:
                threshold_raw = (threshold_raw or '') + flat + ' | '
            else:
                subs.append(parse_entry(body))
        out[matched] = dict(declared=decl, subs=subs, threshold_raw=threshold_raw)
    return out

def parse_dust(txt):
    """분진(7종): 가)/나)/다) 중첩 CAS 품목. 하한 없음."""
    m = re.search(r'분진\s*\(7종\)', txt)
    if not m: return []
    seg = txt[m.end():]
    seg = re.split(r'\n\s*4\.\s', seg)[0]  # 다음 대분류 전까지
    subs = []
    for mm in re.finditer(r'(?:^|\n)\s*[가-힣]\)\s*([^\n]*)', seg):
        body = mm.group(1)
        if re.search(CAS_RE, body):
            subs.append(parse_entry(body))
    # 최상위 가.~사. 광물성분진 등 명칭(하한없음 대상 7종)도 기록
    return subs

# ── 1) 별표21 작업환경측정 ──
wem_txt = clean(read("byeolpyo21_wem"))
WEM_CATS = OrderedDict([('유기화합물','유기화합물'),('금속류','금속류'),
    ('산및알칼리류','산·알칼리류'),('가스상태물질류','가스상태물질류'),
    ('허가대상유해물질','허가대상유해물질')])
wem = parse_list_table(wem_txt, WEM_CATS)
wem_dust = parse_dust(wem_txt)

# ── 2) 별표22 특수건강진단 ──
she_txt = clean(read("byeolpyo22_she"))
SHE_CATS = OrderedDict([('유기화합물','유기화합물'),('금속류','금속류'),
    ('산및알카리류','산·알칼리류'),('가스상태물질류','가스상태물질류'),
    ('허가대상유해물질','허가대상유해물질')])
she = parse_list_table(she_txt, SHE_CATS)
she_dust = parse_dust(she_txt)

# ── 3) 별표12 관리대상/특별관리 ──
managed_txt = clean(read("byeolpyo12_managed"))
MNG_CATS = OrderedDict([('유기화합물','유기화합물'),('금속류','금속류'),
    ('산ㆍ알칼리류','산·알칼리류'),('가스상태물질류','가스상태물질류')])
managed = parse_list_table(managed_txt, MNG_CATS)

def report(title, tbl, extra_dust=None):
    print(f"\n=== {title} ===")
    tot_d = tot_p = 0
    for cat, d in tbl.items():
        mark = '✓' if d['declared'] == len(d['subs']) else '✗'
        print(f"  {mark} {cat}: 선언 {d['declared']} / 추출 {len(d['subs'])}")
        tot_d += d['declared']; tot_p += len(d['subs'])
    if extra_dust is not None:
        print(f"  · 분진(중첩 CAS): 추출 {len(extra_dust)}건 (하한없음)")
    print(f"  합계(화학 소분류): 선언 {tot_d} / 추출 {tot_p}")

report("별표21 작업환경측정", wem, wem_dust)
report("별표22 특수건강진단", she, she_dust)
report("별표12 관리대상유해물질", managed)

# 결과를 다음 단계(병합)에서 쓰도록 pickle 대신 json 중간 저장
import pickle
pickle.dump(dict(wem=wem, wem_dust=wem_dust, she=she, she_dust=she_dust, managed=managed),
            open("parsed_tables.pkl","wb"))
print("\n[중간 저장] parsed_tables.pkl")

# ══════════════════════════════════════════════════════════════
#  병합 → data/substances.json
# ══════════════════════════════════════════════════════════════
BENZOTRICHLORIDE = "98-07-7"

def kw_from_name(ko):
    base = re.sub(r'\s*및\s*그.*$', '', ko).strip()
    base = re.sub(r'(화합물|무기화합물|유기화합물|동족체|류)$', '', base).strip()
    return base

substances = OrderedDict()   # cas → record
groups = []                  # 비CAS 그룹

def ensure(cas, ko, en):
    if cas not in substances:
        substances[cas] = dict(cas=cas, name_ko=ko, name_en=en, aliases=[],
            cas_valid=cas_check_digit_ok(cas),
            wem=dict(listed=False), she=dict(listed=False),
            managed=dict(listed=False, special=False),
            permit_required=False, allowable_std=dict(listed=False),
            exposure_limit=dict(twa=None, stel=None, c=None))
    r = substances[cas]
    if ko and ko != r['name_ko'] and ko not in r['aliases']:
        r['aliases'].append(ko)
    return r

def add_table(tbl, kind, dust=None):
    for cat, d in tbl.items():
        for s in d['subs']:
            threshold = 1.0
            if BENZOTRICHLORIDE in s['cas']: threshold = 0.5
            permit = (cat == '허가대상유해물질')
            if not s['cas']:
                # CAS 없는 그룹/공정 → substance_groups
                g = dict(group_name=s['ko'], match_keywords=[kw_from_name(s['ko'])],
                         exclude_keywords=[], category=cat)
                g[kind] = dict(listed=True, category=cat,
                               **({'threshold_pct': threshold} if kind=='wem' else {}))
                if kind=='managed': g[kind]['special']=s['special']
                if permit: g['permit_required']=True
                groups.append(g)
                continue
            for i, cas in enumerate(s['cas']):
                r = ensure(cas, s['ko'], s['en'])
                if kind == 'wem':
                    r['wem'] = dict(listed=True, category=cat, threshold_pct=threshold)
                elif kind == 'she':
                    r['she'] = dict(listed=True, category=cat)
                elif kind == 'managed':
                    r['managed'] = dict(listed=True, special=s['special'])
                if permit: r['permit_required'] = True
                if s['is_group'] and s['ko'] not in [g['group_name'] for g in groups]:
                    groups.append(dict(group_name=s['ko'],
                        match_keywords=[kw_from_name(s['ko'])], exclude_keywords=[],
                        represent_cas=s['cas'][0], note='대표 CAS 보유 그룹'))

add_table(wem, 'wem')
add_table(she, 'she')
add_table(managed, 'managed')

# 분진(하한 없음) → wem.listed, threshold_pct=None
for s in wem_dust:
    for cas in s['cas']:
        r = ensure(cas, s['ko'], s['en'])
        r['wem'] = dict(listed=True, category='분진', threshold_pct=None)

# 별표19 허용기준 → allowable_std + exposure_limit(raw)
allow_txt = clean(read("byeolpyo19_allowable"))
for m in re.finditer(r'(?:^|\n)\s*(\d{1,2})\.\s*([^\n\[]+)\[(' + CAS_RE + r')\]', allow_txt):
    cas = norm_cas(m.group(3))
    if not cas: continue
    r = ensure(cas, m.group(2).strip(), '')
    r['allowable_std'] = dict(listed=True)
# 별표19에 [CAS] 대신 (English; CAS)로 적힌 항목도
for m in re.finditer(r'(?:^|\n)\s*(\d{1,2})\.\s*([^\n(]+)\([^;]*;\s*(' + CAS_RE + r')', allow_txt):
    cas = norm_cas(m.group(3))
    if cas: ensure(cas, m.group(2).strip(), '')['allowable_std'] = dict(listed=True)

# ── 출력 ──
data = dict(
    meta=dict(
        기준일="2026-06-01",
        생성일="2026-09-01",
        출처=[
            "산업안전보건법 시행규칙 별표21 작업환경측정 대상 유해인자 (제186조제1항)",
            "산업안전보건법 시행규칙 별표22 특수건강진단 대상 유해인자 (제201조)",
            "산업안전보건기준에 관한 규칙 별표12 관리대상 유해물질 (제420조·제439조·제440조)",
            "산업안전보건법 시행규칙 별표19 유해인자별 노출농도의 허용기준 (제145조제1항)",
        ],
        건수=dict(총_CAS물질=len(substances), 그룹=len(groups))
    ),
    substances=list(substances.values()),
    substance_groups=groups,
)
import os
os.makedirs("out", exist_ok=True)
json.dump(data, open("out/substances.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)

# 통계
wem_n=sum(1 for r in substances.values() if r['wem']['listed'])
she_n=sum(1 for r in substances.values() if r['she']['listed'])
mng_n=sum(1 for r in substances.values() if r['managed']['listed'])
spc_n=sum(1 for r in substances.values() if r['managed']['special'])
alw_n=sum(1 for r in substances.values() if r['allowable_std']['listed'])
inv=sum(1 for r in substances.values() if not r['cas_valid'])
print("\n════ substances.json 생성 완료 ════")
print(f"  고유 CAS 물질: {len(substances)}")
print(f"  substance_groups: {len(groups)}")
print(f"  작업환경측정(wem) 등재: {wem_n}")
print(f"  특수건강진단(she) 등재: {she_n}")
print(f"  관리대상(managed) 등재: {mng_n}  / 특별관리물질: {spc_n}")
print(f"  허용기준(별표19) 등재: {alw_n}")
print(f"  ⚠ 체크디짓 불일치 CAS: {inv}건")
