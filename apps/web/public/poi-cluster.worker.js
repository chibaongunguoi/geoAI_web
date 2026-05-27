/**
 * poi-cluster.worker.js
 * 
 * Runs clustering math off the main thread.
 * Input:  { items: PoiItem[], cellSize: number }
 * Output: { clusters: ClusteredEntry[] }
 * 
 * NOTE: This worker has no DOM access — only pure data computation.
 */

self.onmessage = function (event) {
  const { items, cellSize = 0.005 } = event.data;

  if (!Array.isArray(items) || items.length === 0) {
    self.postMessage({ clusters: [] });
    return;
  }

  const CLUSTER_THRESHOLD = 30;

  if (items.length <= CLUSTER_THRESHOLD) {
    // No clustering needed — return items as-is
    self.postMessage({
      clusters: items.map((item) => ({ kind: "poi", item }))
    });
    return;
  }

  const clusterMap = new Map();

  for (const item of items) {
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const key = `${Math.floor(lat / cellSize)}:${Math.floor(lng / cellSize)}`;
    let cluster = clusterMap.get(key);
    if (!cluster) {
      cluster = { kind: "cluster", items: [], lat: 0, lng: 0, count: 0 };
      clusterMap.set(key, cluster);
    }
    cluster.items.push(item);
    cluster.count++;
    cluster.lat += lat;
    cluster.lng += lng;
  }

  const clusters = [];
  for (const cluster of clusterMap.values()) {
    if (cluster.count === 1) {
      clusters.push({ kind: "poi", item: cluster.items[0] });
    } else {
      clusters.push({
        kind: "cluster",
        lat: cluster.lat / cluster.count,
        lng: cluster.lng / cluster.count,
        count: cluster.count,
        items: cluster.items
      });
    }
  }

  self.postMessage({ clusters });
};
