import React from "react";
import ReactDOMServer from "react-dom/server";
import L from "leaflet";
import { assetDetailUrl, assetMarkerStyle, assetPopupRows } from "@/features/map/assets";
import { snapPointToVisibleAssets } from "@/features/measurement/measurement-state";
import { AssetPopup } from "./popups/AssetPopup";
import { PoiPopup, PoiTooltip } from "./popups/PoiPopup";
import { GeoJsonPopup, PropertyDensityPopup, PropertyDensityObjectPopup } from "./popups/OtherPopups";

const DANANG_CENTER = [16.0544, 108.2022];
const DANANG_BOUNDS = [
  [15.88, 107.82],
  [16.2, 108.35],
];
const MAP_VIEW_BOUNDS = [
  [15.74, 107.62],
  [16.36, 108.55],
];
const OBJECT_COLORS = {
  building: "#ef4444",
  density_region: "#2563eb",
};
const ADMIN_ALIASES = {
  hai_chau: "haichau",
  thanh_khe: "thanhkhe",
  son_tra: "sontra",
  ngu_hanh_son: "nguhanhson",
  lien_chieu: "lienchieu",
  cam_le: "camle",
  hoa_vang: "hoavang",
};
const DISTRICT_LABELS = {
  all_da_nang: "To\u00e0n \u0110\u00e0 N\u1eb5ng",
  camle: "C\u1ea9m L\u1ec7",
  haichau: "H\u1ea3i Ch\u00e2u",
  hoavang: "H\u00f2a Vang",
  lienchieu: "Li\u00ean Chi\u1ec3u",
  nguhanhson: "Ng\u0169 H\u00e0nh S\u01a1n",
  sontra: "S\u01a1n Tr\u00e0",
  thanhkhe: "Thanh Kh\u00ea",
};
const WORLD_RING = [
  [-89, -179],
  [-89, 179],
  [89, 179],
  [89, -179],
];

function boundsToCoordinates(bounds) {
  return {
    northEast: [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
    southWest: [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
    northWest: [bounds.getNorthWest().lat, bounds.getNorthWest().lng],
    southEast: [bounds.getSouthEast().lat, bounds.getSouthEast().lng],
  };
}

function objectColor(type) {
  return OBJECT_COLORS[type] || OBJECT_COLORS.building;
}

function normalizedAdminArea(adminArea) {
  return ADMIN_ALIASES[adminArea] || adminArea || "all_da_nang";
}

function districtDisplayName(feature) {
  const adminId = feature?.properties?.admin_id;
  return DISTRICT_LABELS[adminId] || feature?.properties?.name || "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function polygonExteriorRings(geometry) {
  if (!geometry) return [];

  if (geometry.type === "Polygon") {
    return [geometry.coordinates[0].map(([lng, lat]) => [lat, lng])];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon) =>
      polygon[0].map(([lng, lat]) => [lat, lng]),
    );
  }

  return [];
}

function featureCenter(feature) {
  const bounds = L.geoJSON(feature).getBounds();
  return bounds.isValid() ? bounds.getCenter() : null;
}

function cacheBustedUrl(url, refreshId) {
  if (!refreshId) return url;

  return `${url}${url.includes("?") ? "&" : "?"}_refresh=${refreshId}`;
}

function geoJsonPointLayer(feature, latlng, opacity) {
  return L.circleMarker(latlng, {
    radius: 7,
    color: "#ffffff",
    weight: 2,
    opacity,
    fillColor: feature?.properties?.color || "#f59e0b",
    fillOpacity: 0.9 * opacity,
  });
}

function geoJsonPopup(feature) {
  return ReactDOMServer.renderToString(<GeoJsonPopup feature={feature} />);
}

function assetTypeIcon(feature) {
  const type = String(feature?.properties?.type || feature?.properties?.category || "").toLowerCase();
  const icons = {
    lighting: "L",
    road: "R",
    drainage: "D",
    park: "P",
  };

  return icons[type] || "A";
}

function assetPopup(feature, config, permissions) {
  return ReactDOMServer.renderToString(
    <AssetPopup feature={feature} config={config} permissions={permissions} />
  );
}

function assetMarkerIcon(feature, config) {
  const style = assetMarkerStyle(feature, config.colorMode);
  const recentClass = style.isRecentlyUpdated ? " recent" : "";
  return L.divIcon({
    className: "",
    html: `<span class="asset-marker status-${escapeHtml(
      style.statusClass,
    )}${recentClass}" style="background:${escapeHtml(style.color)}">${escapeHtml(
      assetTypeIcon(feature),
    )}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

function poiPopup(place) {
  return ReactDOMServer.renderToString(<PoiPopup place={place} />);
}

function poiTooltip(place) {
  return ReactDOMServer.renderToString(<PoiTooltip place={place} />);
}

function propertyDensityPopup(region) {
  return ReactDOMServer.renderToString(<PropertyDensityPopup region={region} />);
}

function propertyDensityObjectPopup(object) {
  return ReactDOMServer.renderToString(<PropertyDensityObjectPopup object={object} />);
}

function propertyDensityBounds(region) {
  const bbox = region?.bbox;
  if (!bbox) return null;

  const bounds = [
    [Number(bbox.south), Number(bbox.west)],
    [Number(bbox.north), Number(bbox.east)],
  ];

  return bounds.every((pair) => pair.every(Number.isFinite)) ? bounds : null;
}

function propertyDensityCenter(region, fallbackBounds) {
  const lat = Number(region?.center?.lat);
  const lng = Number(region?.center?.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return L.latLng(lat, lng);
  }

  return fallbackBounds?.isValid?.() ? fallbackBounds.getCenter() : null;
}

function densityHeatRatio(region, maxCount) {
  const count = Number(region?.count || 0);
  const max = Number(maxCount || 0);
  if (!Number.isFinite(count) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, count / max));
}

function densityHeatColor(ratio) {
  if (ratio >= 0.82) return "#ef4444";
  if (ratio >= 0.62) return "#f97316";
  if (ratio >= 0.42) return "#facc15";
  if (ratio >= 0.22) return "#84cc16";
  return "#22c55e";
}

function densityHeatRadius(region, bounds, ratio) {
  const center = propertyDensityCenter(region, bounds);
  if (!center) return 220;

  const corner = bounds?.isValid?.() ? bounds.getNorthEast() : null;
  const boundsRadius = corner ? center.distanceTo(corner) : 260;
  const baseRadius = Math.max(180, Math.min(boundsRadius * 1.2, 760));
  return baseRadius * (0.65 + ratio * 0.75);
}

function densityHeatPoint(region, maxCount) {
  const lat = Number(region?.center?.lat);
  const lng = Number(region?.center?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const ratio = densityHeatRatio(region, maxCount);
  return [lat, lng, Math.max(0.08, ratio)];
}

function densityFocusLabel(direction) {
  return direction === "lowest" ? "Khu th\u01b0a th\u1edbt nh\u1ea5t" : "Khu d\u00e0y \u0111\u1eb7c nh\u1ea5t";
}

function deterministicAngle(seed) {
  const text = String(seed || "");
  const hash = Array.from(text).reduce(
    (value, char) => (value * 31 + char.charCodeAt(0)) % 9973,
    17,
  );

  return ((hash % 70) - 35) * (Math.PI / 180);
}

function rotatedFootprintPoints(bounds, seed) {
  const [[minLat, minLng], [maxLat, maxLng]] = bounds;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const halfLat = Math.max((maxLat - minLat) / 2, 0.000035);
  const halfLng = Math.max((maxLng - minLng) / 2, 0.000035);
  const angle = deterministicAngle(seed);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    [-halfLat, -halfLng],
    [-halfLat, halfLng],
    [halfLat, halfLng],
    [halfLat, -halfLng],
  ].map(([latOffset, lngOffset]) => [
    centerLat + latOffset * cos - lngOffset * sin,
    centerLng + latOffset * sin + lngOffset * cos,
  ]);
}

function clusterIcon(count) {
  return L.divIcon({
    className: "",
    html: `<span class="asset-cluster">${count}</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function labelIcon(label) {
  return L.divIcon({
    className: "asset-label",
    html: `<span>${escapeHtml(label)}</span>`,
    iconSize: [120, 22],
    iconAnchor: [60, -10],
  });
}

function measurementLabelIcon(label) {
  return L.divIcon({
    className: "measurement-label",
    html: `<span>${escapeHtml(label)}</span>`,
    iconSize: [132, 28],
    iconAnchor: [66, 34],
  });
}

function measurementVertexIcon(index) {
  return L.divIcon({
    className: "measurement-vertex",
    html: `<span>${index + 1}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function spatialDrawVertexIcon(index, selected) {
  return L.divIcon({
    className: selected ? "spatial-draw-vertex selected" : "spatial-draw-vertex",
    html: `<span>${index + 1}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function visibleAssetPoint(feature) {
  if (feature?.geometry?.type === "Point" && Array.isArray(feature.geometry.coordinates)) {
    const [lng, lat] = feature.geometry.coordinates;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      return { lat: Number(lat), lng: Number(lng) };
    }
  }

  const lat = Number(feature?.centroidLat ?? feature?.properties?.centroidLat);
  const lng = Number(feature?.centroidLng ?? feature?.properties?.centroidLng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function snapPointByPixel(rawPoint, visibleAssets, map, thresholdPixels = 14) {
  const clickPoint = map.latLngToContainerPoint([rawPoint.lat, rawPoint.lng]);
  const candidates = Array.isArray(visibleAssets)
    ? visibleAssets.map(visibleAssetPoint).filter(Boolean)
    : [];

  const closest = candidates.reduce((best, candidate) => {
    const candidatePoint = map.latLngToContainerPoint([candidate.lat, candidate.lng]);
    const distance = clickPoint.distanceTo(candidatePoint);
    if (!best || distance < best.distance) {
      return { point: candidate, distance };
    }
    return best;
  }, null);

  return closest && closest.distance <= thresholdPixels
    ? closest.point
    : snapPointToVisibleAssets(rawPoint, visibleAssets, { thresholdMeters: 25 });
}


export {
  DANANG_CENTER,
  DANANG_BOUNDS,
  MAP_VIEW_BOUNDS,
  OBJECT_COLORS,
  ADMIN_ALIASES,
  DISTRICT_LABELS,
  WORLD_RING,
  boundsToCoordinates,
  objectColor,
  normalizedAdminArea,
  districtDisplayName,
  escapeHtml,
  polygonExteriorRings,
  featureCenter,
  cacheBustedUrl,
  geoJsonPointLayer,
  geoJsonPopup,
  assetTypeIcon,
  assetPopup,
  assetMarkerIcon,
  poiPopup,
  poiTooltip,
  propertyDensityPopup,
  propertyDensityObjectPopup,
  propertyDensityBounds,
  propertyDensityCenter,
  densityHeatRatio,
  densityHeatColor,
  densityHeatRadius,
  densityHeatPoint,
  densityFocusLabel,
  deterministicAngle,
  rotatedFootprintPoints,
  clusterIcon,
  labelIcon,
  measurementLabelIcon,
  measurementVertexIcon,
  spatialDrawVertexIcon,
  visibleAssetPoint,
  snapPointByPixel
};
