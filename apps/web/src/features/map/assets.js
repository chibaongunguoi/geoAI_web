export const ASSET_DISPLAY_STORAGE_KEY = "geoai.assetDisplay";

export const POPUP_FIELD_CATALOG = [
  { id: "code", label: "Mã tài sản" },
  { id: "name", label: "Tên tài sản" },
  { id: "status", label: "Trạng thái" },
  { id: "type", label: "Loại" },
  { id: "priority", label: "Mức ưu tiên" },
  { id: "updatedAt", label: "Cập nhật" },
  { id: "ownerUnit", label: "Đơn vị quản lý", permission: "assets.importExport" },
  { id: "category", label: "Nhóm" }
];

const DEFAULT_ASSET_DISPLAY_CONFIG = {
  labelMode: "off",
  colorMode: "type",
  popupFields: ["code", "name", "status", "type", "updatedAt"]
};

const TYPE_COLORS = {
  lighting: "#f59e0b",
  road: "#2563eb",
  drainage: "#06b6d4",
  park: "#16a34a"
};

const PRIORITY_COLORS = {
  low: "#22c55e",
  normal: "#f59e0b",
  high: "#ef4444",
  critical: "#b91c1c"
};

const STATUS_LABELS = {
  active: "Đang vận hành",
  maintenance: "Bảo trì",
  review: "Cần rà soát",
  inactive: "Ngưng vận hành"
};

const VALID_LABEL_MODES = new Set(["off", "code", "name"]);
const VALID_COLOR_MODES = new Set(["type", "priority"]);
const VALID_POPUP_FIELDS = new Set(POPUP_FIELD_CATALOG.map((field) => field.id));

export function createDefaultAssetDisplayConfig() {
  return {
    ...DEFAULT_ASSET_DISPLAY_CONFIG,
    popupFields: [...DEFAULT_ASSET_DISPLAY_CONFIG.popupFields]
  };
}

export function normalizeAssetDisplayConfig(config) {
  const defaults = createDefaultAssetDisplayConfig();
  const popupFields = Array.isArray(config?.popupFields)
    ? config.popupFields.filter((field) => VALID_POPUP_FIELDS.has(field))
    : defaults.popupFields;

  return {
    labelMode: VALID_LABEL_MODES.has(config?.labelMode)
      ? config.labelMode
      : defaults.labelMode,
    colorMode: VALID_COLOR_MODES.has(config?.colorMode)
      ? config.colorMode
      : defaults.colorMode,
    popupFields: popupFields.length > 0 ? [...new Set(popupFields)] : defaults.popupFields
  };
}

export function readStoredAssetDisplayConfig(storage) {
  const storedValue = storage?.getItem(ASSET_DISPLAY_STORAGE_KEY);

  if (!storedValue) {
    return createDefaultAssetDisplayConfig();
  }

  try {
    return normalizeAssetDisplayConfig(JSON.parse(storedValue));
  } catch {
    return createDefaultAssetDisplayConfig();
  }
}

export function writeStoredAssetDisplayConfig(storage, config) {
  storage?.setItem(
    ASSET_DISPLAY_STORAGE_KEY,
    JSON.stringify(normalizeAssetDisplayConfig(config))
  );
}

export function userHasPermission(permissions, permission) {
  return new Set(permissions || []).has(permission);
}

export function popupFieldsForPermissions(fieldIds, permissions) {
  return fieldIds.filter((fieldId) => {
    const field = POPUP_FIELD_CATALOG.find((item) => item.id === fieldId);
    if (!field) return false;
    return !field.permission || userHasPermission(permissions, field.permission);
  });
}

export function filterAssetsByBbox(features, bbox) {
  if (!Array.isArray(features) || !Array.isArray(bbox) || bbox.length !== 4) {
    return [];
  }

  const [minLng, minLat, maxLng, maxLat] = bbox;
  return features.filter((feature) => {
    const coordinates = feature?.geometry?.coordinates;
    if (feature?.geometry?.type !== "Point" || !Array.isArray(coordinates)) {
      return false;
    }

    const [lng, lat] = coordinates;
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  });
}

export function parseBbox(value) {
  const parts = String(value || "")
    .split(",")
    .map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLng >= maxLng || minLat >= maxLat) {
    return null;
  }

  return parts;
}

export function assetMarkerStyle(feature, colorMode = "type") {
  const properties = feature?.properties || {};
  const type = String(properties.type || properties.category || "").toLowerCase();
  const priority = String(properties.priority || "normal").toLowerCase();
  const status = String(properties.status || "active").toLowerCase();
  const color =
    colorMode === "priority"
      ? PRIORITY_COLORS[priority] || PRIORITY_COLORS.normal
      : TYPE_COLORS[type] || "#f59e0b";

  return {
    color,
    statusClass: status,
    statusLabel: STATUS_LABELS[status] || properties.status || "Không rõ",
    isRecentlyUpdated: isRecentlyUpdated(properties.updatedAt)
  };
}

export function assetLabel(feature, labelMode) {
  if (labelMode === "off") return "";
  const properties = feature?.properties || {};
  return properties[labelMode] || "";
}

export function clusterAssets(features, zoom) {
  if (zoom >= 13) {
    return features.map((feature) => ({ kind: "asset", feature }));
  }

  const cellSize = zoom <= 11 ? 1 : 0.04;
  const clusters = new Map();

  features.forEach((feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const key = `${Math.floor(lng / cellSize)}:${Math.floor(lat / cellSize)}`;
    const cluster = clusters.get(key) || {
      kind: "cluster",
      count: 0,
      features: [],
      lat: 0,
      lng: 0
    };
    cluster.count += 1;
    cluster.features.push(feature);
    cluster.lat += lat;
    cluster.lng += lng;
    clusters.set(key, cluster);
  });

  return [...clusters.values()].map((cluster) => {
    if (cluster.count === 1) {
      return { kind: "asset", feature: cluster.features[0] };
    }

    return {
      ...cluster,
      lat: cluster.lat / cluster.count,
      lng: cluster.lng / cluster.count
    };
  });
}

export function assetDetailUrl(feature) {
  const code = feature?.properties?.code;
  return feature?.properties?.detailUrl || (code ? `/assets/${encodeURIComponent(code)}` : "#");
}

export function assetPopupRows(feature, config, permissions) {
  const properties = feature?.properties || {};
  return popupFieldsForPermissions(config.popupFields, permissions).map((fieldId) => {
    const field = POPUP_FIELD_CATALOG.find((item) => item.id === fieldId);
    return {
      id: fieldId,
      label: field?.label || fieldId,
      value: fieldId === "status" ? STATUS_LABELS[properties[fieldId]] || properties[fieldId] : properties[fieldId]
    };
  }).filter((row) => row.value);
}

function isRecentlyUpdated(value) {
  if (!value) return false;

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;

  return Date.now() - time <= 1000 * 60 * 60 * 24 * 30;
}
