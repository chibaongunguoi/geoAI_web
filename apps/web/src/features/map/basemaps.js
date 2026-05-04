export const BASEMAP_STORAGE_KEY = "geoai.selectedBasemap";

export const BASEMAPS = [
  {
    id: "osm",
    label: "Đường phố",
    description: "OpenStreetMap tiêu chuẩn, phù hợp xem đường và địa danh.",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    minZoom: 2,
    maxZoom: 19,
    maxNativeZoom: 19,
    source: "OpenStreetMap"
  },
  {
    id: "satellite",
    label: "Vệ tinh",
    description: "Ảnh vệ tinh Esri, phù hợp kiểm tra bề mặt và hiện trạng.",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    minZoom: 2,
    maxZoom: 19,
    maxNativeZoom: 18,
    source: "Esri World Imagery"
  },
  {
    id: "terrain",
    label: "Địa hình",
    description: "OpenTopoMap, phù hợp xem địa hình và cao độ tương đối.",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap",
    minZoom: 2,
    maxZoom: 17,
    maxNativeZoom: 17,
    source: "OpenTopoMap"
  }
];

export function getBasemap(id) {
  return BASEMAPS.find((basemap) => basemap.id === id) || BASEMAPS[1];
}

export function readStoredBasemap(storage) {
  const storedValue = storage?.getItem(BASEMAP_STORAGE_KEY);
  return getBasemap(storedValue).id;
}

export function writeStoredBasemap(storage, basemapId) {
  storage?.setItem(BASEMAP_STORAGE_KEY, getBasemap(basemapId).id);
}
