const CATEGORY_GROUPS = {
  "food-drink": ["restaurant", "cafe", "bar"],
  education: ["school", "kindergarten", "university"],
  health: ["hospital", "pharmacy", "clinic"],
  shopping: ["supermarket", "market", "convenience_store"],
  services: ["bank", "atm", "post_office", "police", "fire_station", "gas_station", "hotel", "temple"]
};

const GROUP_COLORS = {
  "food-drink": "#f97316",
  education: "#3b82f6",
  health: "#ef4444",
  shopping: "#22c55e",
  services: "#a855f7"
};

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
  return `<div class="poi-marker" style="background:${color}"><span>📍</span></div>`;
}

export function createClusterIconHtml(count) {
  return `<div class="poi-cluster"><span>${count}</span></div>`;
}

export function shouldCluster(markers) {
  return markers.length > 100;
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
