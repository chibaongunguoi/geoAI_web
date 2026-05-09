const EARTH_RADIUS_METERS = 6371008.8;

export function normalizePoint(point) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function normalizePoints(points) {
  return Array.isArray(points) ? points.map(normalizePoint).filter(Boolean) : [];
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function calculateDistance(pointA, pointB) {
  const a = normalizePoint(pointA);
  const b = normalizePoint(pointB);
  if (!a || !b) return 0;

  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const value =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function calculateTotalDistance(points) {
  const normalized = normalizePoints(points);
  return normalized.reduce((total, point, index) => {
    if (index === 0) return 0;
    return total + calculateDistance(normalized[index - 1], point);
  }, 0);
}

function projectedPoints(points) {
  const normalized = normalizePoints(points);
  if (normalized.length === 0) return [];
  const originLat = toRadians(
    normalized.reduce((total, point) => total + point.lat, 0) / normalized.length,
  );

  return normalized.map((point) => ({
    x: EARTH_RADIUS_METERS * toRadians(point.lng) * Math.cos(originLat),
    y: EARTH_RADIUS_METERS * toRadians(point.lat),
  }));
}

export function calculatePolygonArea(points) {
  const projected = projectedPoints(points);
  if (projected.length < 3) return 0;

  const doubleArea = projected.reduce((total, point, index) => {
    const next = projected[(index + 1) % projected.length];
    return total + point.x * next.y - next.x * point.y;
  }, 0);

  return Math.abs(doubleArea) / 2;
}

export function calculateCentroid(points) {
  const normalized = normalizePoints(points);
  if (normalized.length === 0) return null;

  const totals = normalized.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: totals.lat / normalized.length,
    lng: totals.lng / normalized.length,
  };
}

export function formatDistance(meters) {
  const value = Number(meters);
  if (!Number.isFinite(value)) return "0 m";
  if (Math.abs(value) < 1000) {
    return `${Math.round(value).toLocaleString("en-US")} m`;
  }
  return `${(value / 1000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} km`;
}

export function formatArea(squareMeters) {
  const value = Number(squareMeters);
  if (!Number.isFinite(value)) return "0 m²";
  if (Math.abs(value) < 10000) {
    return `${Math.round(value).toLocaleString("en-US")} m²`;
  }
  return `${(value / 10000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ha`;
}

export function getMeasurementResult(mode, points) {
  const normalized = normalizePoints(points);
  if (mode === "distance") {
    if (normalized.length < 2) {
      return {
        type: "distance",
        points: normalized,
        value: 0,
        formattedValue: "0 m",
        error: "Add at least 2 points to measure distance.",
      };
    }

    const value = calculateTotalDistance(normalized);
    return {
      type: "distance",
      points: normalized,
      value,
      formattedValue: formatDistance(value),
      segments: normalized.slice(1).map((point, index) => ({
        from: normalized[index],
        to: point,
        value: calculateDistance(normalized[index], point),
      })),
      error: null,
    };
  }

  if (mode === "area") {
    if (normalized.length < 3) {
      return {
        type: "area",
        points: normalized,
        value: 0,
        formattedValue: "0 m²",
        error: "Add at least 3 points to measure area.",
      };
    }

    const value = calculatePolygonArea(normalized);
    return {
      type: "area",
      points: normalized,
      value,
      formattedValue: formatArea(value),
      centroid: calculateCentroid(normalized),
      error: value > 0 ? null : "Area polygon is invalid.",
    };
  }

  return {
    type: "idle",
    points: normalized,
    value: 0,
    formattedValue: "No measurement",
    error: null,
  };
}

export function buildMeasurementGeoJson(mode, points, properties = {}) {
  const normalized = normalizePoints(points);
  if (mode === "distance") {
    return {
      type: "Feature",
      properties,
      geometry: {
        type: "LineString",
        coordinates: normalized.map((point) => [point.lng, point.lat]),
      },
    };
  }

  if (mode === "area") {
    const ring = normalized.map((point) => [point.lng, point.lat]);
    if (ring.length > 0) {
      ring.push([...ring[0]]);
    }
    return {
      type: "Feature",
      properties,
      geometry: {
        type: "Polygon",
        coordinates: [ring],
      },
    };
  }

  return {
    type: "FeatureCollection",
    features: [],
  };
}

export function buildMeasurementExport({ mode, points, createdAt, label } = {}) {
  const result = getMeasurementResult(mode, points);
  const timestamp = createdAt || new Date().toISOString();
  const properties = {
    label: label || "",
    createdAt: timestamp,
    formattedValue: result.formattedValue,
  };

  return {
    type: result.type,
    points: result.points,
    value: result.value,
    formattedValue: result.formattedValue,
    geojson: buildMeasurementGeoJson(result.type, result.points, properties),
    createdAt: timestamp,
    ...(label ? { label } : {}),
  };
}
