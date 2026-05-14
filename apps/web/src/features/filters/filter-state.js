export const FILTER_STORAGE_KEY = "geoai.assetFilters";

export const DEFAULT_ASSET_FILTERS = {
  query: "",
  status: "",
  propertyType: "",
  district: "",
  ward: "",
  updatedFrom: "",
  updatedTo: ""
};

export const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
  { value: "REVIEW", label: "Cần rà soát" },
  { value: "ARCHIVED", label: "Đã lưu trữ" }
];

export const PROPERTY_TYPE_OPTIONS = [
  { value: "building", label: "Tòa nhà" }
];

const VALID_STATUSES = new Set(STATUS_OPTIONS.map((option) => option.value));
const VALID_PROPERTY_TYPES = new Set(PROPERTY_TYPE_OPTIONS.map((option) => option.value));

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validDate(value) {
  const text = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  return Number.isNaN(new Date(`${text}T00:00:00.000Z`).getTime()) ? "" : text;
}

export function normalizeAssetFilters(filters = {}) {
  const status = cleanText(filters.status);
  const propertyType = cleanText(filters.propertyType);

  return {
    query: cleanText(filters.query),
    status: VALID_STATUSES.has(status) ? status : "",
    propertyType: VALID_PROPERTY_TYPES.has(propertyType) ? propertyType : "",
    district: cleanText(filters.district),
    ward: cleanText(filters.ward),
    updatedFrom: validDate(filters.updatedFrom),
    updatedTo: validDate(filters.updatedTo)
  };
}

export function activeFilterCount(filters = {}) {
  const normalized = normalizeAssetFilters(filters);
  return Object.entries(normalized).filter(
    ([key, value]) => key !== "query" && Boolean(value)
  ).length;
}

export function assetFilterQueryString(filters = {}) {
  const normalized = normalizeAssetFilters(filters);
  const query = new URLSearchParams();

  for (const key of [
    "query",
    "status",
    "propertyType",
    "district",
    "ward",
    "updatedFrom",
    "updatedTo"
  ]) {
    if (normalized[key]) query.set(key, normalized[key]);
  }

  if (filters.limit) query.set("limit", String(filters.limit));
  if (filters.sort) query.set("sort", String(filters.sort));
  if (filters.page) query.set("page", String(filters.page));

  return query.toString();
}

export function filterWarning(filters = {}, resultCount = null) {
  const count = activeFilterCount(filters);
  if (resultCount === 0 && count > 0) {
    return "Bộ lọc có thể quá hẹp. Hãy thử bỏ bớt một điều kiện.";
  }
  if (count === 0 && Number(resultCount) >= 100) {
    return "Bộ lọc đang quá rộng. Hãy thêm quận, trạng thái hoặc loại tài sản.";
  }
  return "";
}

export function readFilterState(storage) {
  const fallback = {
    lastFilters: { ...DEFAULT_ASSET_FILTERS },
    presets: [],
    history: []
  };
  const raw = storage?.getItem(FILTER_STORAGE_KEY);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return {
      lastFilters: normalizeAssetFilters(parsed.lastFilters || parsed.filters || {}),
      presets: Array.isArray(parsed.presets)
        ? parsed.presets
            .filter((preset) => typeof preset?.name === "string")
            .map((preset) => ({
              name: preset.name.trim(),
              filters: normalizeAssetFilters(preset.filters)
            }))
            .filter((preset) => preset.name)
        : [],
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 20) : []
    };
  } catch {
    return fallback;
  }
}

export function writeFilterState(storage, state) {
  const payload = {
    lastFilters: normalizeAssetFilters(state.filters || state.lastFilters || {}),
    presets: Array.isArray(state.presets) ? state.presets.slice(0, 20) : [],
    history: Array.isArray(state.history) ? state.history.slice(0, 20) : []
  };
  storage?.setItem(FILTER_STORAGE_KEY, JSON.stringify(payload));
}

export function addFilterHistory(history = [], action, filters) {
  return [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      action,
      filters: normalizeAssetFilters(filters),
      createdAt: new Date().toISOString()
    },
    ...history
  ].slice(0, 20);
}
