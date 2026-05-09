import { calculateDistance, normalizePoint } from "./measurement-utils";

export const MEASUREMENT_STORAGE_KEY = "geoai.measurement.v1";

export const DEFAULT_MEASUREMENT_STATE = {
  mode: "idle",
  points: [],
  snapEnabled: true,
  label: "",
};

const VALID_MODES = new Set(["idle", "distance", "area"]);

export function normalizeMeasurementState(value) {
  const input = value && typeof value === "object" ? value : {};
  const mode = VALID_MODES.has(input.mode) ? input.mode : "idle";
  const points = Array.isArray(input.points)
    ? input.points.map(normalizePoint).filter(Boolean)
    : [];

  return {
    mode,
    points,
    snapEnabled: input.snapEnabled !== false,
    label: typeof input.label === "string" ? input.label : "",
  };
}

export function measurementReducer(state, action) {
  const current = normalizeMeasurementState(state);

  switch (action?.type) {
    case "set-mode":
      return {
        ...current,
        mode: VALID_MODES.has(action.mode) ? action.mode : "idle",
      };
    case "add-point": {
      const point = normalizePoint(action.point);
      if (!point || current.mode === "idle") return current;
      return {
        ...current,
        points: [...current.points, point],
      };
    }
    case "edit-point": {
      const point = normalizePoint(action.point);
      if (!point || action.index < 0 || action.index >= current.points.length) return current;
      return {
        ...current,
        points: current.points.map((existing, index) =>
          index === action.index ? point : existing,
        ),
      };
    }
    case "undo":
      return {
        ...current,
        points: current.points.slice(0, -1),
      };
    case "clear":
      return {
        ...DEFAULT_MEASUREMENT_STATE,
        snapEnabled: current.snapEnabled,
      };
    case "toggle-snap":
      return {
        ...current,
        snapEnabled:
          typeof action.enabled === "boolean" ? action.enabled : !current.snapEnabled,
      };
    case "set-label":
      return {
        ...current,
        label: typeof action.label === "string" ? action.label : "",
      };
    default:
      return current;
  }
}

export function addMeasurementHistory(history, action, detail = {}) {
  const item = {
    action,
    detail,
    createdAt: new Date().toISOString(),
  };
  const current = Array.isArray(history) ? history : [];
  return [item, ...current].slice(0, 30);
}

export function readMeasurementStorage(storage) {
  if (!storage?.getItem) {
    return { state: DEFAULT_MEASUREMENT_STATE, history: [] };
  }

  try {
    const raw = storage.getItem(MEASUREMENT_STORAGE_KEY);
    if (!raw) return { state: DEFAULT_MEASUREMENT_STATE, history: [] };
    const parsed = JSON.parse(raw);
    return {
      state: normalizeMeasurementState(parsed.state),
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 30) : [],
    };
  } catch {
    return { state: DEFAULT_MEASUREMENT_STATE, history: [] };
  }
}

export function writeMeasurementStorage(storage, payload) {
  if (!storage?.setItem) return false;

  try {
    storage.setItem(
      MEASUREMENT_STORAGE_KEY,
      JSON.stringify({
        state: normalizeMeasurementState(payload?.state),
        history: Array.isArray(payload?.history) ? payload.history.slice(0, 30) : [],
      }),
    );
    return true;
  } catch {
    return false;
  }
}

function featurePoint(feature) {
  if (feature?.geometry?.type === "Point" && Array.isArray(feature.geometry.coordinates)) {
    const [lng, lat] = feature.geometry.coordinates;
    return normalizePoint({ lat, lng });
  }

  return normalizePoint({
    lat: feature?.centroidLat ?? feature?.properties?.centroidLat,
    lng: feature?.centroidLng ?? feature?.properties?.centroidLng,
  });
}

export function snapPointToVisibleAssets(point, visibleAssets, options = {}) {
  const origin = normalizePoint(point);
  if (!origin) return { ...point, snapped: false };

  const thresholdMeters = Number.isFinite(Number(options.thresholdMeters))
    ? Number(options.thresholdMeters)
    : 25;
  const candidates = Array.isArray(visibleAssets)
    ? visibleAssets.map(featurePoint).filter(Boolean)
    : [];

  const closest = candidates.reduce(
    (best, candidate) => {
      const distance = calculateDistance(origin, candidate);
      if (!best || distance < best.distance) {
        return { point: candidate, distance };
      }
      return best;
    },
    null,
  );

  if (!closest || closest.distance > thresholdMeters) {
    return { ...origin, snapped: false };
  }

  return {
    ...closest.point,
    snapped: true,
    snapDistanceMeters: closest.distance,
  };
}
