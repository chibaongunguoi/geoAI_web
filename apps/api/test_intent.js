// Simulate the full intent parsing for various queries
const STATIC_LOCATIONS = [
  ["An Hải Bắc", "Sơn Trà"],["An Hải Tây", "Sơn Trà"],["An Hải Đông", "Sơn Trà"],
  ["An Khê", "Thanh Khê"],["Bình Hiên", "Hải Châu"],["Bình Thuận", "Hải Châu"],
  ["Chính Gián", "Thanh Khê"],["Hoà Hải", "Ngũ Hành Sơn"],["Hoà Quý", "Ngũ Hành Sơn"],
  ["Hòa An", "Cẩm Lệ"],["Hòa Bắc", "Hòa Vang"],["Hòa Châu", "Hòa Vang"],
  ["Hòa Cường Bắc", "Hải Châu"],["Hòa Cường Nam", "Hải Châu"],["Hòa Hiệp Bắc", "Liên Chiểu"],
  ["Hòa Hiệp Nam", "Liên Chiểu"],["Hòa Khánh Bắc", "Liên Chiểu"],["Hòa Khánh Nam", "Liên Chiểu"],
  ["Hòa Khê", "Thanh Khê"],["Hòa Khương", "Hòa Vang"],["Hòa Liên", "Hòa Vang"],
  ["Hòa Minh", "Liên Chiểu"],["Hòa Nhơn", "Hòa Vang"],["Hòa Ninh", "Hòa Vang"],
  ["Hòa Phong", "Hòa Vang"],["Hòa Phát", "Cẩm Lệ"],["Hòa Phú", "Hòa Vang"],
  ["Hòa Phước", "Hòa Vang"],["Hòa Sơn", "Hòa Vang"],["Hòa Thuận Tây", "Hải Châu"],
  ["Hòa Thuận Đông", "Hải Châu"],["Hòa Thọ Tây", "Cẩm Lệ"],["Hòa Thọ Đông", "Cẩm Lệ"],
  ["Hòa Tiến", "Hòa Vang"],["Hòa Xuân", "Cẩm Lệ"],["Hải Châu I", "Hải Châu"],
  ["Hải Châu II", "Hải Châu"],["Khuê Mỹ", "Ngũ Hành Sơn"],["Khuê Trung", "Cẩm Lệ"],
  ["Mân Thái", "Sơn Trà"],["Mỹ An", "Ngũ Hành Sơn"],["Nam Dương", "Hải Châu"],
  ["Nại Hiên Đông", "Sơn Trà"],["Phước Mỹ", "Sơn Trà"],["Phước Ninh", "Hải Châu"],
  ["Tam Thuận", "Thanh Khê"],["Thanh Bình", "Hải Châu"],["Thanh Khê Tây", "Thanh Khê"],
  ["Thanh Khê Đông", "Thanh Khê"],["Thuận Phước", "Hải Châu"],["Thạc Gián", "Thanh Khê"],
  ["Thạch Thang", "Hải Châu"],["Thọ Quang", "Sơn Trà"],["Tân Chính", "Thanh Khê"],
  ["Vĩnh Trung", "Thanh Khê"],["Xuân Hà", "Thanh Khê"]
];
const DANANG_DISTRICTS = ["cam le","hai chau","hoa vang","lien chieu","ngu hanh son","son tra","thanh khe"];
const HIGHEST_DENSITY_PHRASES = ["day dac","mat do","dong nhat","nhieu nhat","dong duc","nhieu nha nhat","cao nhat"];
const LOWEST_DENSITY_PHRASES = ["thua thot","it nha","it nhat","vang nha","vang","thap nhat"];
const DENSITY_INTENT_KEYWORDS = [...HIGHEST_DENSITY_PHRASES, ...LOWEST_DENSITY_PHRASES];
const STOP_WORDS_FOR_TOKENS = new Set([
  "cho","toi","danh","sach","cac","can","nha","o","duong","tai",
  "phuong","quan","huyen","thanh","pho","tp","va","co","nhung",
  "theo","ve","du","lieu","biet","vung","nao","so","toa","cua",
  "thuoc","la","bao","nhieu","dem","tong","may","mat","nhat",
  "tim","dang","hoat","dong","khong","xem","xet","luu","tru","building","khu","vuc"
]);

function normalizeSearchText(value = "") {
  return (value || "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function isDensityQuestion(q) {
  return DENSITY_INTENT_KEYWORDS.some(kw => q.includes(kw));
}

// Build location maps
const wards = new Map();
const districts = new Map();
for (const [w, d] of STATIC_LOCATIONS) {
  wards.set(normalizeSearchText(w), w);
  districts.set(normalizeSearchText(d), d);
}

function matchKnownDistrict(q) {
  const found = [...districts.keys()].filter(d => q.includes(d)).sort((a,b) => b.length - a.length)[0];
  if (found) return districts.get(found);
  const matched = [...districts.keys()].find(d => q.includes(d.split(" ")[0]) && d.length > 4);
  if (matched) return districts.get(matched);
  return DANANG_DISTRICTS.find(d => q.includes(d));
}

function matchKnownWard(q) {
  const found = [...wards.keys()].filter(w => q.includes(w)).sort((a,b) => b.length - a.length)[0];
  if (found) return wards.get(found);
  for (const [key, value] of wards.entries()) {
    const words = key.split(" ");
    if (words.length >= 2 && q.includes(words.slice(0,2).join(" "))) return value;
  }
  return undefined;
}

function extractPhraseAfter(q, marker, stops) {
  const idx = q.indexOf(` ${marker} `);
  if (idx < 0) return undefined;
  let remainder = q.slice(idx + marker.length + 2).trim();
  const stopIndex = stops.map(s => remainder.indexOf(` ${s} `)).filter(i => i >= 0).sort((a,b)=>a-b)[0];
  const phrase = (stopIndex === undefined ? remainder : remainder.slice(0, stopIndex)).trim();
  const tokens = phrase.split(" ").filter(t => t && !STOP_WORDS_FOR_TOKENS.has(t));
  return tokens.length > 0 ? tokens.join(" ") : undefined;
}

function searchTokens(query = "") {
  return normalizeSearchText(query)
    .replace(/\bso luong\b/g, " ")
    .split(" ")
    .filter(t => t.length > 1 && !STOP_WORDS_FOR_TOKENS.has(t));
}

function densitySearchTerms(tokens) {
  const locationWords = new Set();
  for (const [w, d] of STATIC_LOCATIONS) {
    for (const p of normalizeSearchText(w).split(" ")) locationWords.add(p);
    for (const p of normalizeSearchText(d).split(" ")) locationWords.add(p);
  }
  for (const d of DANANG_DISTRICTS) for (const p of d.split(" ")) locationWords.add(p);
  
  return [...new Set(
    tokens.filter(t => t && t.length >= 2 && !locationWords.has(normalizeSearchText(t)))
      .map(t => normalizeSearchText(t))
  )];
}

function parseQuery(query) {
  const nq = normalizeSearchText(query);
  const knownWard = matchKnownWard(nq);
  const knownDistrict = matchKnownDistrict(nq);
  const locationAfterAt = extractPhraseAfter(nq, "o", ["co","la","thuoc","quan","huyen","bao","so","mat","day"]);
  const districtFromMarker = extractPhraseAfter(nq, "quan", ["la","co","bao","so"]) ||
    extractPhraseAfter(nq, "huyen", ["la","co","bao","so"]) ||
    extractPhraseAfter(nq, "thuoc", ["la","co","bao","so"]);
  const wardFromMarker = extractPhraseAfter(nq, "phuong", ["thuoc","quan","huyen","tai","o","la","co","bao","so"]);
  
  const locationIsKnownDistrict = locationAfterAt 
    ? districts.has(locationAfterAt) || DANANG_DISTRICTS.includes(locationAfterAt)
    : false;
  
  const district = knownDistrict || districtFromMarker || (locationIsKnownDistrict ? locationAfterAt : undefined);
  const ward = knownWard || wardFromMarker || (locationIsKnownDistrict ? undefined : locationAfterAt);
  
  const isDensity = isDensityQuestion(nq);
  const tokens = searchTokens(query);
  const terms = densitySearchTerms(tokens);
  
  return { query, nq, isDensity, district, ward, tokens, terms, knownDistrict, knownWard, locationAfterAt, locationIsKnownDistrict };
}

const queries = [
  "khu vực có khách sạn nhiều nhất hải châu",
  "khu vực dày đặc nhất thạch thăng, hải châu",
  "Vùng nào ở phường Thuận Phước có mật độ nhà nhiều nhất?",
  "khu vực có khách sạn nhiều nhất thạch thăng, hải châu",
];

for (const q of queries) {
  const r = parseQuery(q);
  console.log(`\nQuery: "${q}"`);
  console.log(`  isDensity: ${r.isDensity}`);
  console.log(`  ward: "${r.ward}", district: "${r.district}"`);
  console.log(`  terms: [${r.terms.join(', ')}]`);
  console.log(`  knownDistrict: "${r.knownDistrict}", knownWard: "${r.knownWard}"`);
  console.log(`  locationAfterAt: "${r.locationAfterAt}", isKnownDistrict: ${r.locationIsKnownDistrict}`);
}
