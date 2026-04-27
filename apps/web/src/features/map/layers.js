export const DEFAULT_LAYER_STORAGE_KEY = "geoai.dataLayers";

export const DATA_LAYERS = [
  {
    id: "admin-boundaries",
    label: "Ranh giới hành chính",
    group: "Tham chiếu",
    sourceType: "GeoJSON",
    source: "/api/admin-boundaries",
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
    defaultVisible: true,
    defaultOpacity: 0.85,
    minZoom: 11,
    maxZoom: 19,
    legend: [{ label: "Điểm tài sản", color: "#f59e0b" }],
    keywords: ["asset", "geojson", "point", "tai san"]
  },
  {
    id: "analysis-results",
    label: "Kết quả AI",
    group: "GeoAI",
    sourceType: "Thời gian thực",
    source: "Vùng quét hiện tại",
    defaultVisible: true,
    defaultOpacity: 0.75,
    minZoom: 12,
    maxZoom: 19,
    legend: [{ label: "Đối tượng nhận diện", color: "#ef4444" }],
    keywords: ["ai", "runtime", "scan", "result", "ket qua"]
  }
];

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

export function createDefaultLayerState(layers = DATA_LAYERS) {
  return {
    visible: Object.fromEntries(
      layers.map((layer) => [layer.id, Boolean(layer.defaultVisible)])
    ),
    opacity: Object.fromEntries(
      layers.map((layer) => [layer.id, clampOpacity(layer.defaultOpacity)])
    ),
    order: layerIds(layers)
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

  return {
    visible,
    opacity,
    order: [...storedOrder, ...missingIds]
  };
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
  return {
    ...state,
    visible: {
      ...state.visible,
      [layerId]: !state.visible[layerId]
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

  return {
    ...state,
    visible: {
      ...state.visible,
      ...Object.fromEntries(groupLayerIds.map((id) => [id, Boolean(visible)]))
    }
  };
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
