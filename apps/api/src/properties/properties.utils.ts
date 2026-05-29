import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional
} from "@nestjs/common";
// import removed
import { PrismaService } from "../prisma/prisma.service";
import { DENSITY_OBJECT_LIMIT } from "./density-config";
import { ElasticsearchPropertySearchProvider } from "./elasticsearch-property-search.provider";
import { PropertySearchProvider } from "./property-search-provider";
import { Delegate, PropertiesPrisma, PropertyStatus, BuildingPropertyRow, PropertyDensityRegion, PropertySearchMap, PropertyDensityObject, PropertySearchAnswer, SearchIntent, DensityRegionRow, PropertySearchInput, PropertyHeatmapInput, PropertyMutationInput, AssetImportResult, ImportOptions, OvertureFeature, DEFAULT_CITY, DEFAULT_PROPERTY_TYPE, DEFAULT_STATUS, DEFAULT_SOURCE, OVERTURE_SOURCE, MAX_LIMIT, DEFAULT_LIMIT, DEFAULT_DENSITY_GRID_SIZE, DEFAULT_DENSITY_REGION_LIMIT, DEFAULT_DENSITY_OBJECT_LIMIT, DENSITY_BACKEND_TIMEOUT_MS, SEMANTIC_PROVIDER_TIMEOUT_MS, LIST_SEARCH_TIMEOUT_MS, DEFAULT_EMBEDDING_MODEL, VALID_STATUSES, STOP_WORDS_FOR_TOKENS, LOWEST_DENSITY_PHRASES, HIGHEST_DENSITY_PHRASES, DENSITY_INTENT_KEYWORDS, INTENT_KEYWORDS, STATIC_LOCATIONS, DANANG_DISTRICTS, PropertiesServiceOptions, PROPERTIES_SERVICE_OPTIONS } from "./properties.types";

export function isExplicitListQuery(query?: string) {
if (!query || query.trim() === "") {
  return true;
}
const normalizedQuery = normalizeSearchText(query || "");
return /\b(danh sach|liet ke|hien thi|xem)\b/.test(normalizedQuery);
}

export function withSemanticProviderTimeout<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
const controller = new AbortController();

return new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => {
    controller.abort();
    reject(
      new Error(`Semantic provider timed out after ${SEMANTIC_PROVIDER_TIMEOUT_MS}ms`)
    );
  }, SEMANTIC_PROVIDER_TIMEOUT_MS);

  const promise = operation(controller.signal);

  promise.then(
    (value) => {
      clearTimeout(timer);
      resolve(value);
    },
    (error) => {
      clearTimeout(timer);
      reject(error);
    }
  );
});
}

export function withListSearchTimeout<T>(promise: Promise<T>): Promise<T> {
return new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => {
    reject(new Error(`PostgreSQL list search timed out after ${LIST_SEARCH_TIMEOUT_MS}ms`));
  }, LIST_SEARCH_TIMEOUT_MS);

  promise.then(
    (value) => {
      clearTimeout(timer);
      resolve(value);
    },
    (error) => {
      clearTimeout(timer);
      reject(error);
    }
  );
});
}

export function semanticSearchFallbackWarning(error: unknown) {
const message = error instanceof Error ? error.message : "";
if (message.includes("Embedding service timed out after")) {
  return "MiniLM embedding timed out; used PostgreSQL fallback.";
}
if (message.includes("Semantic provider timed out after")) {
  return "Elasticsearch/MiniLM search timed out; used PostgreSQL fallback.";
}
if (message.includes("Elasticsearch search timed out after")) {
  return "Elasticsearch search timed out; used PostgreSQL fallback.";
}
return "Elasticsearch/MiniLM search unavailable; used PostgreSQL fallback.";
}

export function searchSource(source?: string): string | undefined {
  if (source === "all") {
    return undefined;
  }
  return source || "overture";
}

export function minimumSearchScore(tokens: string[]) {
return tokens.length > 1 ? 1.5 : 0.5;
}

export function bestFuzzyTokenScore(text: string, token: string) {
if (token.length < 4) {
  return 0;
}

const words = text.split(" ").filter((word) => Math.abs(word.length - token.length) <= 1);
const bestDistance = words.reduce(
  (best, word) => Math.min(best, levenshteinDistance(word, token)),
  Number.POSITIVE_INFINITY
);

return bestDistance <= 1 ? 0.65 : 0;
}

export function isDensityQuestion(normalizedQuery: string) {
if (!normalizedQuery) {
  return false;
}

const asksForDensity = /\b(nhieu|day dac|mat do|dong|thua thot|it)\b/.test(normalizedQuery) || DENSITY_INTENT_KEYWORDS.some((phrase) =>
  normalizedQuery.includes(phrase)
);
const asksForArea = /\b(vung|khu|noi|cho|khu vuc)\b/.test(normalizedQuery);
const asksForBuildings = /\b(toa nha|can nha|nha|building|bat dong san|truong hoc|truong|benh vien|khach san|nha hang|quan cafe|tram|co so|dia diem)\b/.test(
  normalizedQuery
);

return asksForDensity && (asksForArea || asksForBuildings);
}

export function densityDirection(normalizedQuery: string): "highest" | "lowest" {
return LOWEST_DENSITY_PHRASES.some((phrase) => normalizedQuery.includes(phrase))
? "lowest"
: "highest";
}

export function isCountQuestion(normalizedQuery: string) {
if (!normalizedQuery) {
  return false;
}

const asksForCount =
  /\b(so|dem|tong|bao nhieu|may)\b/.test(normalizedQuery) ||
  normalizedQuery.includes("bao nhieu");
const asksForBuildings = /\b(toa nha|can nha|nha|building|bat dong san|truong hoc|truong|benh vien|khach san|nha hang|quan cafe|tram|co so|dia diem)\b/.test(
  normalizedQuery
);

return asksForCount && asksForBuildings;
}

export function extractPhraseAfter(normalizedQuery: string, marker: string, stopMarkers: string[]) {
const padded = ` ${normalizedQuery} `;
const markerText = ` ${marker} `;
const markerIndex = padded.indexOf(markerText);

if (markerIndex < 0) {
  return undefined;
}

const phraseStart = markerIndex + markerText.length;
const remainder = padded.slice(phraseStart);
const stopIndex = stopMarkers
  .map((stopMarker) => remainder.indexOf(` ${stopMarker} `))
  .filter((index) => index >= 0)
  .sort((a, b) => a - b)[0];
const phrase = (stopIndex === undefined ? remainder : remainder.slice(0, stopIndex)).trim();
const tokens = phrase
  .split(" ")
  .filter((token) => token && !STOP_WORDS_FOR_TOKENS.has(token));

return tokens.length > 0 ? tokens.join(" ") : undefined;
}

export function matchKnownDistrict(normalizedQuery: string, districts: Map<string, string>) {
const knownDistrict = [...districts.keys()]
  .filter((district) => normalizedQuery.includes(district))
  .sort((a, b) => b.length - a.length)[0];

if (knownDistrict) {
  return districts.get(knownDistrict);
}

// Khớp theo từ đầu tiên của quận (ví dụ: "lien chieu" khớp "lien chieu")
const matchedKey = [...districts.keys()].find(
  (dist) => normalizedQuery.includes(dist.split(" ")[0]) && dist.length > 4
);
if (matchedKey) {
  return districts.get(matchedKey);
}

return DANANG_DISTRICTS.find((district) => normalizedQuery.includes(district));
}

export function matchKnownWard(normalizedQuery: string, wards: Map<string, string>) {
// Helper: check if wardKey appears as a whole-word match in the query
// Prevents 'hai chau' from matching 'Hải Châu I' (key='hai chau i')
const containsAsWords = (query: string, phrase: string): boolean => {
  const regex = new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`);
  return regex.test(query);
};

// 1. Exact phrase match with word boundaries (longest first)
const knownWard = [...wards.keys()]
  .filter((ward) => containsAsWords(normalizedQuery, ward))
  .sort((a, b) => b.length - a.length)[0];

if (knownWard) {
  return wards.get(knownWard);
}

// 2. Prefix 2-word match (e.g. "hoa khanh" matches "Hòa Khánh Bắc")
// Only if the query does NOT contain a district name that could be parent
for (const [key, value] of wards.entries()) {
  const words = key.split(" ");
  if (words.length >= 3) {
    const suffix = words[words.length - 1];
    if (suffix === "i" || suffix === "ii") {
      continue;
    }

    // Only do prefix match for 3+ word wards (e.g. "hoa khanh bac" → prefix "hoa khanh")
    const prefix2Words = words.slice(0, 2).join(" ");
    if (DANANG_DISTRICTS.includes(prefix2Words)) {
      continue;
    }

    if (containsAsWords(normalizedQuery, prefix2Words)) {
      return value;
    }
  }
}

return undefined;
}

export function matchStatus(normalizedQuery: string): PropertyStatus | undefined {
if (/\b(khong hoat dong|ngung hoat dong)\b/.test(normalizedQuery)) {
  return "INACTIVE";
}

if (/\b(can xem xet|cho xem xet|review)\b/.test(normalizedQuery)) {
  return "REVIEW";
}

if (/\b(luu tru|archived)\b/.test(normalizedQuery)) {
  return "ARCHIVED";
}

if (/\b(dang hoat dong|hoat dong|active)\b/.test(normalizedQuery)) {
  return "ACTIVE";
}

return undefined;
}

export function matchPropertyType(normalizedQuery: string) {
return /\b(building|toa nha|can nha|nha)\b/.test(normalizedQuery)
? DEFAULT_PROPERTY_TYPE
: undefined;
}

export function searchStatus(status: string | undefined, intent: SearchIntent) {
return VALID_STATUSES.has(status as PropertyStatus)
? (status as PropertyStatus)
: intent.filters.status;
}

export function isNaturalLanguageQuestion(normalizedQuery: string) {
return /\b(cho toi|tim|danh sach|co bao nhieu|bao nhieu|vung nao|noi nao|hay cho biet)\b/.test(
  normalizedQuery
);
}

export function densitySearchTerms(intent: SearchIntent, tokens: string[]) {
  // Build a set of normalized location-name tokens to exclude
  const locationWords = new Set<string>();
  for (const [wardName, districtName] of STATIC_LOCATIONS) {
    for (const part of normalizeSearchText(wardName).split(" ")) locationWords.add(part);
    for (const part of normalizeSearchText(districtName).split(" ")) locationWords.add(part);
  }
  for (const dist of DANANG_DISTRICTS) {
    for (const part of dist.split(" ")) locationWords.add(part);
  }

  const terms = tokens.filter(
    (term): term is string =>
      Boolean(term && term.length >= 2) && !locationWords.has(normalizeSearchText(term))
  );

  return [...new Set(terms.map((term) => normalizeSearchText(term)))];
}

export function densityObjectAllocations(regions: PropertyDensityRegion[]) {
const total = regions.reduce((sum, region) => sum + Math.max(0, region.count), 0);
if (total <= 0) {
  return [];
}

const allocations = regions.map((region) => ({
  region,
  take:
    region.count > 0
      ? Math.max(1, Math.floor((DEFAULT_DENSITY_OBJECT_LIMIT * region.count) / total))
      : 0
}));
const allocated = allocations.reduce((sum, allocation) => sum + allocation.take, 0);
if (allocations[0]) {
  allocations[0].take += DEFAULT_DENSITY_OBJECT_LIMIT - allocated;
}

return allocations.filter((allocation) => allocation.take > 0);
}

export function selectLightPropertyFields() {
return {
  id: true,
  code: true,
  overtureId: true,
  name: true,
  addressLine: true,
  street: true,
  ward: true,
  district: true,
  city: true,
  propertyType: true,
  status: true,
  source: true,
  sourceVersion: true,
  level: true,
  height: true,
  floors: true,
  areaSqm: true,
  centroidLat: true,
  centroidLng: true,
  bbox: true,
  searchText: true,
  searchTextNormalized: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
};
}

export function validGeoJsonGeometry(geometry: unknown) {
if (!geometry || typeof geometry !== "object" || Array.isArray(geometry)) {
  return undefined;
}

const candidate = geometry as { type?: unknown; coordinates?: unknown };
if (typeof candidate.type !== "string" || !Array.isArray(candidate.coordinates)) {
  return undefined;
}

return geometry;
}

export function propertyObjectBbox(row: BuildingPropertyRow): [number, number, number, number] | undefined {
const bbox = row.bbox;

if (Array.isArray(bbox) && bbox.length === 4) {
  const values = bbox.map((value) => Number(value));
  return values.every(Number.isFinite)
    ? (values as [number, number, number, number])
    : undefined;
}

if (bbox && typeof bbox === "object") {
  const objectBbox = bbox as { xmin?: unknown; ymin?: unknown; xmax?: unknown; ymax?: unknown };
  const values = [objectBbox.xmin, objectBbox.ymin, objectBbox.xmax, objectBbox.ymax].map((value) => Number(value));
  return values.every(Number.isFinite)
    ? (values as [number, number, number, number])
    : undefined;
}

if (row.centroidLat !== undefined && row.centroidLng !== undefined) {
  const lat = Number(row.centroidLat);
  const lng = Number(row.centroidLng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const delta = 0.00004;
    return [lng - delta, lat - delta, lng + delta, lat + delta];
  }
}

return undefined;
}

export function searchAnswer(count: number, intent: SearchIntent, densityRegions: PropertyDensityRegion[] = []): PropertySearchAnswer {
const answerFilters = {
  ward: intent.filters.ward,
  district: intent.filters.district
};
const filterText = [
  intent.filters.ward ? `phường ${intent.filters.ward}` : undefined,
  intent.filters.district ? `quận/huyện ${intent.filters.district}` : undefined
]
  .filter(Boolean)
  .join(", ");
const topRegion = densityRegions[0];

if (intent.type === "density") {
  return {
    type: "density",
    count,
    filters: answerFilters,
    topRegion,
    text: topRegion
      ? intent.direction === "lowest"
        ? `Vung thua thot nhat co ${topRegion.count.toLocaleString("vi-VN")} toa nha tai ${topRegion.label}.`
        : `Vung day dac nhat co ${topRegion.count.toLocaleString("vi-VN")} toa nha tai ${topRegion.label}.`
      : `Khong tim thay vung mat do nha phu hop${filterText ? ` tai ${filterText}` : ""}.`
  };
}

return {
  type: "count",
  count,
  filters: answerFilters,
  text: `Có ${count.toLocaleString("vi-VN")} tòa nhà${filterText ? ` tại ${filterText}` : ""}.`
};
}

export function isSameSearchTokenFilter(filter: Record<string, unknown>, token: string) {
const normalizedFilter = filter.searchTextNormalized as { contains?: string } | undefined;
return normalizedFilter?.contains === token;
}

export function featureProperties(feature: OvertureFeature) {
return {
  ...feature,
  ...(feature.properties || {})
} as Record<string, unknown>;
}

export function validBbox(bbox: { xmin: number; ymin: number; xmax: number; ymax: number }) {
if (
  [bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax].every(Number.isFinite) &&
  bbox.xmin <= bbox.xmax &&
  bbox.ymin <= bbox.ymax
) {
  return bbox;
}

return undefined;
}

export function withoutCode(data: Record<string, unknown>) {
const { code, ...rest } = data;
void code;
return rest;
}

export function searchableText(property: Record<string, unknown>) {
return [
  property.code,
  property.overtureId,
  property.name,
  property.addressLine,
  property.street,
  property.ward,
  property.district,
  property.city,
  property.propertyType,
  property.status,
  property.source
]
  .filter((value) => typeof value === "string" && value.trim().length > 0)
  .join(" ");
}

export function searchTokens(query?: string) {
return normalizeSearchText(query || "")
.replace(/\bso luong\b/g, " ")
.split(" ")
.filter((token) => token.length > 1 && !STOP_WORDS_FOR_TOKENS.has(token));
}

export async function withDensityTimeout<T>(operation: Promise<T>) {
let timeoutId: NodeJS.Timeout | undefined;
try {
  return await Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("Density query timed out")),
        DENSITY_BACKEND_TIMEOUT_MS
      );
    })
  ]);
} finally {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
}
}

export function validLimit(limit?: number) {
const numericLimit = Number(limit || DEFAULT_LIMIT);

if (!Number.isFinite(numericLimit)) {
  return DEFAULT_LIMIT;
}

return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(numericLimit)));
}

export function validDensityGridSize(value?: number) {
const numericValue = Number(value || DEFAULT_DENSITY_GRID_SIZE);
if (!Number.isFinite(numericValue)) {
  return DEFAULT_DENSITY_GRID_SIZE;
}
return Math.min(0.01, Math.max(0.0008, numericValue));
}

export function validLatitude(value: unknown) {
if (value === undefined || value === null) {
  return undefined;
}

const numericValue = Number(value);
if (Number.isFinite(numericValue) && numericValue >= -90 && numericValue <= 90) {
  return numericValue;
}

throw new BadRequestException("Property latitude is invalid");
}

export function validLongitude(value: unknown) {
if (value === undefined || value === null) {
  return undefined;
}

const numericValue = Number(value);
if (Number.isFinite(numericValue) && numericValue >= -180 && numericValue <= 180) {
  return numericValue;
}

throw new BadRequestException("Property longitude is invalid");
}

export function validOptionalNumber(value: unknown, field: string) {
if (value === undefined || value === null) {
  return undefined;
}

const numericValue = Number(value);
if (Number.isFinite(numericValue) && numericValue >= 0) {
  return numericValue;
}

throw new BadRequestException(`Property ${field} is invalid`);
}

export function numberValue(value: unknown) {
if (value === undefined || value === null || value === "") {
  return undefined;
}

const numericValue = Number(value);
return Number.isFinite(numericValue) ? numericValue : undefined;
}

export function cleanString(value: unknown) {
if (typeof value !== "string" && typeof value !== "number") {
  return undefined;
}

const text = String(value).trim();
return text.length > 0 ? text : undefined;
}

export function formatCode(sequence?: number) {
  return `DN-BLD-${String(sequence || 0).padStart(6, "0")}`;
}

export function roundCoordinate(value: number) {
return Number(value.toFixed(6));
}

export function integerValue(value: unknown) {
const numericValue = numberValue(value);
return numericValue === undefined ? undefined : Math.trunc(numericValue);
}

export function validOptionalInteger(value: unknown, field: string) {
const numericValue = validOptionalNumber(value, field);

if (numericValue === undefined) {
  return undefined;
}

if (Number.isInteger(numericValue)) {
  return numericValue;
}

throw new BadRequestException(`Property ${field} must be an integer`);
}

export function validDateRange(updatedFrom?: string, updatedTo?: string) {
const range: Record<string, Date> = {};
const from = validDateBoundary(updatedFrom, false);
const to = validDateBoundary(updatedTo, true);

if (from) range.gte = from;
if (to) range.lte = to;

return Object.keys(range).length > 0 ? range : null;
}

export function validDateBoundary(value?: string, endOfDay = false) {
const text = cleanString(value);
if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
  return null;
}

const date = new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
return Number.isNaN(date.getTime()) ? null : date;
}


export function normalizeSearchText(value: string) {
  return addCaseSpaces(value)
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function addCaseSpaces(value: string) {
  const chars: string[] = [];
  let previous = "";

  for (const char of value) {
    if (previous && isLowercaseLetter(previous) && isUppercaseLetter(char)) {
      chars.push(" ");
    }

    chars.push(char);
    previous = char;
  }

  return chars.join("");
}

function isLowercaseLetter(value: string) {
  return value.toLocaleLowerCase("vi") === value && value.toLocaleUpperCase("vi") !== value;
}

function isUppercaseLetter(value: string) {
  return value.toLocaleUpperCase("vi") === value && value.toLocaleLowerCase("vi") !== value;
}

export function levenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    let lastDiagonal = previous[0];
    previous[0] = leftIndex + 1;

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const oldDiagonal = previous[rightIndex + 1];
      const cost = left[leftIndex] === right[rightIndex] ? 0 : 1;
      previous[rightIndex + 1] = Math.min(
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + 1,
        lastDiagonal + cost
      );
      lastDiagonal = oldDiagonal;
    }
  }

  return previous[right.length];
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function calculateBoundingBox(lat: number, lng: number, radiusMeters: number) {
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (40075000 * Math.cos(lat * Math.PI / 180) / 360);
  
  return {
    south: lat - latDelta,
    north: lat + latDelta,
    west: lng - lngDelta,
    east: lng + lngDelta
  };
}
