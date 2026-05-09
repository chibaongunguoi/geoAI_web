import { normalizeAssetFilters } from "@/features/filters/filter-state";

export const EXPORT_STORAGE_KEY = "geoai.mapExport.v1";

export const DEFAULT_EXPORT_METADATA = {
  title: "GeoAI Map Export",
  organization: "GeoAI Da Nang",
  format: "png",
  paperSize: "A4",
  orientation: "landscape",
  includeLegend: true,
  includeScale: true,
  includeTimestamp: true,
  includeWatermark: true,
  shareExpiryHours: 72,
};

const VALID_FORMATS = new Set(["png", "pdf"]);
const VALID_PAPER_SIZES = new Set(["A4", "Letter"]);
const VALID_ORIENTATIONS = new Set(["portrait", "landscape"]);

function cleanText(value, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function finiteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeViewport(viewport = {}) {
  const center = viewport.center || {};
  const bounds = viewport.bounds || {};

  return {
    center: {
      lat: finiteNumber(center.lat, 16.0544),
      lng: finiteNumber(center.lng, 108.2022),
    },
    zoom: finiteNumber(viewport.zoom, 12),
    bounds: {
      west: finiteNumber(bounds.west),
      south: finiteNumber(bounds.south),
      east: finiteNumber(bounds.east),
      north: finiteNumber(bounds.north),
    },
  };
}

export function normalizeExportMetadata(metadata = {}) {
  const format = cleanText(metadata.format);
  const paperSize = cleanText(metadata.paperSize);
  const orientation = cleanText(metadata.orientation);
  const shareExpiryHours = finiteNumber(metadata.shareExpiryHours, DEFAULT_EXPORT_METADATA.shareExpiryHours);

  return {
    ...DEFAULT_EXPORT_METADATA,
    title: cleanText(metadata.title, DEFAULT_EXPORT_METADATA.title),
    organization: cleanText(metadata.organization, DEFAULT_EXPORT_METADATA.organization),
    format: VALID_FORMATS.has(format) ? format : DEFAULT_EXPORT_METADATA.format,
    paperSize: VALID_PAPER_SIZES.has(paperSize) ? paperSize : DEFAULT_EXPORT_METADATA.paperSize,
    orientation: VALID_ORIENTATIONS.has(orientation)
      ? orientation
      : DEFAULT_EXPORT_METADATA.orientation,
    includeLegend: metadata.includeLegend !== false,
    includeScale: metadata.includeScale !== false,
    includeTimestamp: metadata.includeTimestamp !== false,
    includeWatermark: metadata.includeWatermark !== false,
    shareExpiryHours:
      shareExpiryHours > 0 && shareExpiryHours <= 720
        ? shareExpiryHours
        : DEFAULT_EXPORT_METADATA.shareExpiryHours,
  };
}

export function buildMapExportState({
  viewport,
  basemap,
  visibleLayers,
  filters,
  focusedProperty,
  propertySearchResult,
  measurement,
  metadata,
} = {}) {
  const normalizedMetadata = normalizeExportMetadata(metadata);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    viewport: normalizeViewport(viewport),
    basemap: {
      id: cleanText(basemap?.id, "satellite"),
      label: cleanText(basemap?.label, "Satellite"),
    },
    visibleLayers: Array.isArray(visibleLayers) ? visibleLayers.filter(Boolean) : [],
    filters: normalizeAssetFilters(filters),
    selectedResult: focusedProperty
      ? {
          code: focusedProperty.code || "",
          name: focusedProperty.name || "",
          centroidLat: finiteNumber(focusedProperty.centroidLat),
          centroidLng: finiteNumber(focusedProperty.centroidLng),
        }
      : null,
    searchSummary: propertySearchResult
      ? {
          answer: propertySearchResult.answer || null,
          total: propertySearchResult.meta?.total ?? propertySearchResult.items?.length ?? 0,
          mapType: propertySearchResult.map?.type || null,
        }
      : null,
    measurement: measurement?.type && measurement.type !== "idle" ? measurement : null,
    metadata: normalizedMetadata,
  };
}

export function addExportHistory(history = [], format, metadata, status = "success") {
  return [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      format,
      metadata: normalizeExportMetadata(metadata),
      status,
      createdAt: new Date().toISOString(),
    },
    ...(Array.isArray(history) ? history : []),
  ].slice(0, 20);
}

export function readExportStorage(storage) {
  if (!storage?.getItem) return { templates: [], history: [] };

  try {
    const raw = storage.getItem(EXPORT_STORAGE_KEY);
    if (!raw) return { templates: [], history: [] };
    const parsed = JSON.parse(raw);
    return {
      templates: Array.isArray(parsed.templates)
        ? parsed.templates
            .map((template) => ({
              name: cleanText(template?.name),
              metadata: normalizeExportMetadata(template?.metadata),
            }))
            .filter((template) => template.name)
            .slice(0, 20)
        : [],
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 20) : [],
    };
  } catch {
    return { templates: [], history: [] };
  }
}

export function writeExportStorage(storage, payload) {
  if (!storage?.setItem) return false;

  try {
    storage.setItem(
      EXPORT_STORAGE_KEY,
      JSON.stringify({
        templates: Array.isArray(payload?.templates) ? payload.templates.slice(0, 20) : [],
        history: Array.isArray(payload?.history) ? payload.history.slice(0, 20) : [],
      }),
    );
    return true;
  } catch {
    return false;
  }
}
