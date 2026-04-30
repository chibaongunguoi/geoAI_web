export const DEFAULT_LAYER_STORAGE_KEY = "geoai.dataLayers";

export const DATA_LAYERS = [
  {
    id: "admin-boundaries",
    label: "Ranh giới hành chính",
    group: "Tham chiếu",
    sourceType: "GeoJSON",
    source: "/api/admin-boundaries",
    sourceKind: "geojson",
    url: "/api/admin-boundaries",
    renderer: "admin-boundaries",
    defaultVisible: true,
    defaultOpacity: 0.9,
    minZoom: 9,
    maxZoom: 16,
    legend: [{ label: "Ranh giới quận", color: "#ef4444" }],
    keywords: ["district", "boundary", "reference", "ranh gioi", "hanh chinh"]
  },
  {
    id: "sample-assets",
    label: "Tài sản mẫu",
    group: "Tài sản",
    sourceType: "GeoJSON",
    source: "/data/sample-assets.geojson",
    sourceKind: "geojson",
    url: "/data/sample-assets.geojson",
    defaultVisible: true,
    defaultOpacity: 0.85,
    minZoom: 11,
    maxZoom: 19,
    legend: [{ label: "Điểm tài sản", color: "#f59e0b" }],
    keywords: ["asset", "geojson", "point", "tai san"]
  },
  {
    id: "demo-wms-states",
    label: "WMS demo",
    group: "Dịch vụ ngoài",
    sourceType: "WMS",
    source: "GeoServer demo WMS",
    sourceKind: "wms",
    url: "https://ahocevar.com/geoserver/wms",
    wmsOptions: {
      layers: "topp:states",
      format: "image/png",
      transparent: true
    },
    defaultVisible: false,
    defaultOpacity: 0.65,
    minZoom: 2,
    maxZoom: 19,
    legend: [{ label: "WMS", color: "#38bdf8" }],
    keywords: ["wms", "external", "service"]
  },
  {
    id: "osm-template-overlay",
    label: "WMTS/XYZ demo",
    group: "Dịch vụ ngoài",
    sourceType: "WMTS",
    source: "OpenStreetMap tile template",
    sourceKind: "wmts",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    defaultVisible: false,
    defaultOpacity: 1,
    minZoom: 2,
    maxZoom: 19,
    legend: [{ label: "WMTS/XYZ", color: "#22c55e" }],
    keywords: ["wmts", "xyz", "external", "tiles"]
  },
  {
    id: "analysis-results",
    label: "Kết quả AI",
    group: "GeoAI",
    sourceType: "Thời gian thực",
    source: "Vùng quét hiện tại",
    sourceKind: "runtime",
    renderer: "analysis-results",
    defaultVisible: true,
    defaultOpacity: 0.75,
    minZoom: 12,
    maxZoom: 19,
    legend: [{ label: "Đối tượng nhận diện", color: "#ef4444" }],
    keywords: ["ai", "runtime", "scan", "result", "ket qua"]
  }
];

const VALID_SOURCE_KINDS = new Set(["geojson", "wms", "wmts", "runtime"]);

function layerIds(layers = DATA_LAYERS) {
  return layers.map((layer) => layer.id);
}

function layerById(layers = DATA_LAYERS) {
  return new Map(layers.map((layer) => [layer.id, layer]));
}

function clampOpacity(value) {
  const opacity = Number(value);

  if (Number.isNaN(opacity)) {
    return 1;
  }

  return Math.min(1, Math.max(0.1, opacity));
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasTilePlaceholders(url) {
  return ["{z}", "{x}", "{y}"].every((placeholder) => url.includes(placeholder));
}

export function validateLayerConfig(layer) {
  if (!layer || !VALID_SOURCE_KINDS.has(layer.sourceKind)) {
    return {
      valid: false,
      message: "Layer sourceKind must be geojson, wms, wmts, or runtime."
    };
  }

  if (layer.sourceKind === "runtime") {
    return { valid: true };
  }

  if (layer.sourceKind === "geojson") {
    return hasText(layer.url)
      ? { valid: true }
      : { valid: false, message: "GeoJSON layers require a URL." };
  }

  if (layer.sourceKind === "wms") {
    return hasText(layer.url) && hasText(layer.wmsOptions?.layers)
      ? { valid: true }
      : { valid: false, message: "WMS layers require a URL and wmsOptions.layers." };
  }

  if (layer.sourceKind === "wmts") {
    return hasText(layer.url) && hasTilePlaceholders(layer.url)
      ? { valid: true }
      : { valid: false, message: "WMTS layers require a URL template with {z}, {x}, and {y}." };
  }

  return { valid: false, message: "Unsupported layer sourceKind." };
}

export function validateGeoJsonPayload(payload) {
  if (payload?.type === "FeatureCollection" && Array.isArray(payload.features)) {
    return { valid: true };
  }

  if (payload?.type === "Feature" && Object.hasOwn(payload, "geometry")) {
    return { valid: true };
  }

  return {
    valid: false,
    message: "GeoJSON response must be a Feature or FeatureCollection."
  };
}

export function createDefaultLayerState(layers = DATA_LAYERS) {
  return normalizeSingleVisibleLayer({
    visible: Object.fromEntries(
      layers.map((layer) => [layer.id, Boolean(layer.defaultVisible)])
    ),
    opacity: Object.fromEntries(
      layers.map((layer) => [layer.id, clampOpacity(layer.defaultOpacity)])
    ),
    order: layerIds(layers)
  });
}

function normalizeSingleVisibleLayer(state) {
  const selectedLayerId = state.order.find((id) => state.visible[id]) || state.order[0];

  return {
    ...state,
    visible: Object.fromEntries(
      state.order.map((id) => [id, selectedLayerId ? id === selectedLayerId : false])
    )
  };
}

function cleanStoredState(storedState, layers = DATA_LAYERS) {
  const defaults = createDefaultLayerState(layers);
  const validIds = new Set(layerIds(layers));
  const visible = { ...defaults.visible };
  const opacity = { ...defaults.opacity };

  Object.entries(storedState?.visible || {}).forEach(([id, value]) => {
    if (validIds.has(id)) {
      visible[id] = Boolean(value);
    }
  });

  Object.entries(storedState?.opacity || {}).forEach(([id, value]) => {
    if (validIds.has(id)) {
      opacity[id] = clampOpacity(value);
    }
  });

  const storedOrder = Array.isArray(storedState?.order)
    ? storedState.order.filter((id) => validIds.has(id))
    : [];
  const missingIds = defaults.order.filter((id) => !storedOrder.includes(id));

  return normalizeSingleVisibleLayer({
    visible,
    opacity,
    order: [...storedOrder, ...missingIds]
  });
}

export function readStoredLayerState(storage, layers = DATA_LAYERS) {
  const storedValue = storage?.getItem(DEFAULT_LAYER_STORAGE_KEY);

  if (!storedValue) {
    return createDefaultLayerState(layers);
  }

  try {
    return cleanStoredState(JSON.parse(storedValue), layers);
  } catch {
    return createDefaultLayerState(layers);
  }
}

export function writeStoredLayerState(storage, state) {
  storage?.setItem(DEFAULT_LAYER_STORAGE_KEY, JSON.stringify(state));
}

export function toggleLayerVisibility(state, layerId) {
  return selectLayerVisibility(state, layerId);
}

export function selectLayerVisibility(state, layerId) {
  if (!state.order.includes(layerId)) {
    return state;
  }

  return {
    ...state,
    visible: {
      ...state.visible,
      ...Object.fromEntries(state.order.map((id) => [id, id === layerId]))
    }
  };
}

export function setLayerGroupVisibility(state, layers, group, visible) {
  const groupLayerIds = layers
    .filter((layer) => layer.group === group)
    .map((layer) => layer.id);

  if (groupLayerIds.length === 0) {
    return state;
  }

  if (!visible) {
    return state;
  }

  return selectLayerVisibility(state, groupLayerIds[0]);
}

export function setLayerOpacity(state, layerId, opacity) {
  return {
    ...state,
    opacity: {
      ...state.opacity,
      [layerId]: clampOpacity(opacity)
    }
  };
}

export function reorderLayer(state, activeLayerId, targetLayerId) {
  const activeIndex = state.order.indexOf(activeLayerId);
  const targetIndex = state.order.indexOf(targetLayerId);

  if (activeIndex < 0 || targetIndex < 0 || activeIndex === targetIndex) {
    return state;
  }

  const nextOrder = [...state.order];
  nextOrder.splice(activeIndex, 1);
  nextOrder.splice(targetIndex, 0, activeLayerId);

  return {
    ...state,
    order: nextOrder
  };
}

export function moveLayer(state, layerId, direction) {
  const currentIndex = state.order.indexOf(layerId);

  if (currentIndex < 0) {
    return state;
  }

  const nextIndex = Math.min(
    state.order.length - 1,
    Math.max(0, currentIndex + direction)
  );

  if (nextIndex === currentIndex) {
    return state;
  }

  const nextOrder = [...state.order];
  nextOrder.splice(currentIndex, 1);
  nextOrder.splice(nextIndex, 0, layerId);

  return {
    ...state,
    order: nextOrder
  };
}

export function visibleLayerIds(state) {
  return state.order.filter((id) => state.visible[id]);
}

export function layerIsVisibleAtZoom(layer, zoom) {
  if (!layer) {
    return false;
  }

  return zoom >= layer.minZoom && zoom <= layer.maxZoom;
}

export function opacityForLayer(state, layerId) {
  return state.opacity[layerId] ?? 1;
}

export function orderedLayers(layers, state) {
  const byId = layerById(layers);

  return state.order.map((id) => byId.get(id)).filter(Boolean);
}

export function filterLayersByQuery(layers, query) {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) {
    return layers;
  }

  return layers.filter((layer) => {
    const haystack = [
      layer.label,
      layer.group,
      layer.sourceType,
      layer.source,
      ...(layer.keywords || [])
    ]
      .join(" ")
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}
