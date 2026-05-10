export const SPATIAL_DRAW_SOURCE = "geoai-spatial-draw";

const VALID_GEOMETRY_MODES = new Set(["point", "line", "polygon"]);

export function normalizeCoordinate(point) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function normalizeCoordinates(points) {
  return Array.isArray(points) ? points.map(normalizeCoordinate).filter(Boolean) : [];
}

function simpleRingArea(points) {
  const normalized = normalizeCoordinates(points);
  if (normalized.length < 3) return 0;

  return Math.abs(
    normalized.reduce((total, point, index) => {
      const next = normalized[(index + 1) % normalized.length];
      return total + point.lng * next.lat - next.lng * point.lat;
    }, 0) / 2,
  );
}

export function validateSpatialGeometry(mode, coordinates) {
  const type = VALID_GEOMETRY_MODES.has(mode) ? mode : "idle";
  const points = normalizeCoordinates(coordinates);

  if (type === "point") {
    return points.length >= 1
      ? { valid: true, type, points: points.slice(0, 1), error: null }
      : { valid: false, type, points, error: "Add 1 point for a point feature." };
  }

  if (type === "line") {
    return points.length >= 2
      ? { valid: true, type, points, error: null }
      : { valid: false, type, points, error: "Add at least 2 points for a line." };
  }

  if (type === "polygon") {
    if (points.length < 3) {
      return { valid: false, type, points, error: "Add at least 3 points for a polygon." };
    }

    return simpleRingArea(points) > 0
      ? { valid: true, type, points, error: null }
      : { valid: false, type, points, error: "Polygon geometry is invalid." };
  }

  return {
    valid: false,
    type,
    points,
    error: "Choose Point, Line, or Polygon to start drawing.",
  };
}

function baseProperties(attributes = {}, createdAt) {
  return {
    name: attributes.name || "",
    type: attributes.type || "",
    description: attributes.description || "",
    createdAt,
    source: SPATIAL_DRAW_SOURCE,
  };
}

export function buildSpatialDrawGeoJson({
  mode,
  coordinates,
  attributes,
  createdAt = new Date().toISOString(),
} = {}) {
  const validation = validateSpatialGeometry(mode, coordinates);
  const properties = baseProperties(attributes, createdAt);

  if (!validation.valid) {
    return {
      type: "FeatureCollection",
      features: [],
      properties,
    };
  }

  if (validation.type === "point") {
    const point = validation.points[0];
    return {
      type: "Feature",
      properties,
      geometry: {
        type: "Point",
        coordinates: [point.lng, point.lat],
      },
    };
  }

  if (validation.type === "line") {
    return {
      type: "Feature",
      properties,
      geometry: {
        type: "LineString",
        coordinates: validation.points.map((point) => [point.lng, point.lat]),
      },
    };
  }

  const ring = validation.points.map((point) => [point.lng, point.lat]);
  ring.push([...ring[0]]);
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

export function getSpatialDrawResult(state = {}) {
  const mode = state.mode === "edit" ? inferModeFromCoordinateCount(state.coordinates) : state.mode;
  const validation = validateSpatialGeometry(mode, state.coordinates);
  const geojson = buildSpatialDrawGeoJson({
    mode,
    coordinates: validation.points,
    attributes: state.attributes,
  });

  return {
    type: validation.type,
    formattedType: validation.type === "idle" ? "No draft" : validation.type,
    coordinates: validation.points,
    geojson,
    error: validation.error,
  };
}

export function buildSpatialDrawExport({
  mode,
  coordinates,
  attributes,
  createdAt = new Date().toISOString(),
} = {}) {
  const result = getSpatialDrawResult({ mode, coordinates, attributes });
  return {
    type: result.type,
    coordinates: result.coordinates,
    geojson: buildSpatialDrawGeoJson({ mode: result.type, coordinates, attributes, createdAt }),
    createdAt,
    attributes: {
      name: attributes?.name || "",
      type: attributes?.type || "",
      description: attributes?.description || "",
    },
  };
}

export function inferModeFromCoordinateCount(coordinates) {
  const count = normalizeCoordinates(coordinates).length;
  if (count === 1) return "point";
  if (count === 2) return "line";
  if (count >= 3) return "polygon";
  return "idle";
}
