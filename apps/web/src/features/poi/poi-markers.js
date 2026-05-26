const CATEGORY_GROUPS = {
  "food-drink": ["restaurant", "vietnamese_restaurant", "seafood_restaurant", "diner", "cafe", "coffee_shop", "desserts", "bar"],
  education: ["school", "elementary_school", "preschool", "kindergarten", "university"],
  health: ["hospital", "pharmacy", "clinic"],
  shopping: ["supermarket", "market", "convenience_store"],
  lodging: ["hotel", "accommodation"],
  civic: ["bank", "atm", "post_office", "police", "fire_station"],
  leisure: ["park", "playground", "swimming_pool", "sports_centre"],
  services: ["gas_station", "temple"]
};

const GROUP_COLORS = {
  "food-drink": "#f97316",
  education: "#3b82f6",
  health: "#ef4444",
  shopping: "#22c55e",
  lodging: "#8b5cf6",
  civic: "#0f766e",
  leisure: "#16a34a",
  services: "#a855f7"
};

const GROUP_ICONS = {
  "food-drink": '<path d="M7 3v7M10 3v7M7 7h3M9 10v11M16 3v18M16 3c2.2 1.7 3.2 4.1 3 7h-3"/>',
  education: '<path d="M4 6.5c2.6-1.4 5.3-1.4 8 0v13c-2.7-1.4-5.4-1.4-8 0z"/><path d="M12 6.5c2.6-1.4 5.3-1.4 8 0v13c-2.7-1.4-5.4-1.4-8 0z"/>',
  health: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>',
  shopping: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  lodging: '<path d="M4 11h16v8"/><path d="M4 19V6"/><path d="M8 11V8h5a3 3 0 0 1 3 3"/>',
  civic: '<path d="M4 10h16"/><path d="M6 10v9M10 10v9M14 10v9M18 10v9"/><path d="M3 19h18"/><path d="M12 4 4 10h16z"/>',
  leisure: '<path d="M12 4v16"/><path d="M7 9c2-5 8-5 10 0"/><path d="M5 15c3-2 5-2 7 0s4 2 7 0"/>',
  services: '<path d="M7 20V5a2 2 0 0 1 2-2h6v17"/><path d="M7 9h8"/><path d="M15 8h2a3 3 0 0 1 3 3v7a2 2 0 0 1-4 0v-3"/>'
};

export const POI_MIN_ZOOM = 12;

export function getCategoryGroup(category) {
  for (const [group, categories] of Object.entries(CATEGORY_GROUPS)) {
    if (categories.includes(category)) return group;
  }
  return "services";
}

export function getMarkerColor(category) {
  return GROUP_COLORS[getCategoryGroup(category)] || "#a855f7";
}

export function createPoiMarkerHtml(category) {
  const color = getMarkerColor(category);
  const group = getCategoryGroup(category);
  const paths = GROUP_ICONS[group] || GROUP_ICONS.services;
  return `<div class="poi-marker poi-marker-${group}" style="--poi-color:${color}"><svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg></div>`;
}

export function createClusterIconHtml(count) {
  return `<div class="poi-cluster" aria-label="${count} địa điểm"><span>${count}</span></div>`;
}

export function shouldCluster(markers) {
  return markers.length > 120;
}

export function shouldShowPoiLayer(zoom) {
  return Number(zoom) >= POI_MIN_ZOOM;
}

export function clusterPoiMarkers(items, cellSize = 0.005) {
  if (!shouldCluster(items)) {
    return items.map((item) => ({ kind: "poi", item }));
  }

  const clusters = new Map();
  for (const item of items) {
    const key = `${Math.floor(item.latitude / cellSize)}:${Math.floor(item.longitude / cellSize)}`;
    const cluster = clusters.get(key) || { kind: "cluster", items: [], lat: 0, lng: 0, count: 0 };
    cluster.items.push(item);
    cluster.count++;
    cluster.lat += item.latitude;
    cluster.lng += item.longitude;
    clusters.set(key, cluster);
  }

  return [...clusters.values()].map((cluster) => {
    if (cluster.count === 1) {
      return { kind: "poi", item: cluster.items[0] };
    }
    return {
      ...cluster,
      lat: cluster.lat / cluster.count,
      lng: cluster.lng / cluster.count
    };
  });
}
