import { normalizeCoordinate, normalizeCoordinates } from "./spatial-draw-utils";

export const SPATIAL_DRAW_STORAGE_KEY = "geoai.spatialDraw.v1";

export const DEFAULT_SPATIAL_DRAW_STATE = {
  mode: "idle",
  coordinates: [],
  selectedVertexIndex: null,
  attributes: {
    name: "",
    type: "",
    description: "",
  },
  snapEnabled: true,
  hasUnsavedChanges: false,
  past: [],
  future: [],
};

const VALID_MODES = new Set(["idle", "point", "line", "polygon", "edit"]);

function snapshot(state) {
  return {
    mode: state.mode,
    coordinates: state.coordinates,
    selectedVertexIndex: state.selectedVertexIndex,
    attributes: state.attributes,
    snapEnabled: state.snapEnabled,
    hasUnsavedChanges: state.hasUnsavedChanges,
  };
}

function withHistory(current, updates) {
  return normalizeSpatialDrawState({
    ...current,
    ...updates,
    hasUnsavedChanges: true,
    past: [...current.past, snapshot(current)].slice(-30),
    future: [],
  });
}

export function normalizeSpatialDrawState(value) {
  const input = value && typeof value === "object" ? value : {};
  const mode = VALID_MODES.has(input.mode) ? input.mode : "idle";
  const coordinates = normalizeCoordinates(input.coordinates);
  const selectedVertexIndex =
    Number.isInteger(input.selectedVertexIndex) &&
    input.selectedVertexIndex >= 0 &&
    input.selectedVertexIndex < coordinates.length
      ? input.selectedVertexIndex
      : null;
  const attributes = input.attributes && typeof input.attributes === "object" ? input.attributes : {};

  return {
    mode,
    coordinates: mode === "point" ? coordinates.slice(0, 1) : coordinates,
    selectedVertexIndex,
    attributes: {
      name: typeof attributes.name === "string" ? attributes.name : "",
      type: typeof attributes.type === "string" ? attributes.type : "",
      description: typeof attributes.description === "string" ? attributes.description : "",
    },
    snapEnabled: input.snapEnabled !== false,
    hasUnsavedChanges: Boolean(input.hasUnsavedChanges),
    past: Array.isArray(input.past) ? input.past.slice(-30) : [],
    future: Array.isArray(input.future) ? input.future.slice(-30) : [],
  };
}

export function spatialDrawReducer(state, action) {
  const current = normalizeSpatialDrawState(state);

  switch (action?.type) {
    case "set-mode":
      return withHistory(current, {
        mode: VALID_MODES.has(action.mode) ? action.mode : "idle",
        selectedVertexIndex: action.mode === "idle" ? null : current.selectedVertexIndex,
      });
    case "add-coordinate": {
      const point = normalizeCoordinate(action.point);
      if (!point || current.mode === "idle" || current.mode === "edit") return current;
      const coordinates = current.mode === "point" ? [point] : [...current.coordinates, point];
      return withHistory(current, {
        coordinates,
        selectedVertexIndex: coordinates.length - 1,
      });
    }
    case "insert-coordinate": {
      const point = normalizeCoordinate(action.point);
      if (!point) return current;
      const index = Number.isInteger(action.index)
        ? Math.min(Math.max(action.index, 0), current.coordinates.length)
        : current.coordinates.length;
      const coordinates = [
        ...current.coordinates.slice(0, index),
        point,
        ...current.coordinates.slice(index),
      ];
      return withHistory(current, { coordinates, selectedVertexIndex: index });
    }
    case "edit-coordinate": {
      const point = normalizeCoordinate(action.point);
      if (!point || action.index < 0 || action.index >= current.coordinates.length) return current;
      return withHistory(current, {
        coordinates: current.coordinates.map((existing, index) =>
          index === action.index ? point : existing,
        ),
        selectedVertexIndex: action.index,
      });
    }
    case "delete-vertex": {
      const index = Number.isInteger(action.index) ? action.index : current.selectedVertexIndex;
      if (index < 0 || index >= current.coordinates.length) return current;
      const coordinates = current.coordinates.filter((_, coordinateIndex) => coordinateIndex !== index);
      return withHistory(current, {
        coordinates,
        selectedVertexIndex: coordinates.length > 0 ? Math.min(index, coordinates.length - 1) : null,
      });
    }
    case "select-vertex":
      return {
        ...current,
        selectedVertexIndex:
          Number.isInteger(action.index) &&
          action.index >= 0 &&
          action.index < current.coordinates.length
            ? action.index
            : null,
      };
    case "set-attributes":
      return withHistory(current, {
        attributes: {
          ...current.attributes,
          ...(action.attributes && typeof action.attributes === "object" ? action.attributes : {}),
        },
      });
    case "toggle-snap":
      return {
        ...current,
        snapEnabled: typeof action.enabled === "boolean" ? action.enabled : !current.snapEnabled,
      };
    case "replace-draft":
      return normalizeSpatialDrawState({
        ...current,
        ...(action.state && typeof action.state === "object" ? action.state : {}),
        hasUnsavedChanges: true,
        past: [...current.past, snapshot(current)].slice(-30),
        future: [],
      });
    case "mark-saved":
      return {
        ...current,
        hasUnsavedChanges: false,
      };
    case "cancel":
      return {
        ...DEFAULT_SPATIAL_DRAW_STATE,
        snapEnabled: current.snapEnabled,
      };
    case "undo": {
      const previous = current.past[current.past.length - 1];
      if (!previous) return current;
      return normalizeSpatialDrawState({
        ...previous,
        past: current.past.slice(0, -1),
        future: [snapshot(current), ...current.future].slice(0, 30),
      });
    }
    case "redo": {
      const next = current.future[0];
      if (!next) return current;
      return normalizeSpatialDrawState({
        ...next,
        past: [...current.past, snapshot(current)].slice(-30),
        future: current.future.slice(1),
      });
    }
    default:
      return current;
  }
}

export function addSpatialDrawHistory(history, action, detail = {}) {
  const item = {
    action,
    detail,
    createdAt: new Date().toISOString(),
  };
  const current = Array.isArray(history) ? history : [];
  return [item, ...current].slice(0, 30);
}

export function readSpatialDrawStorage(storage) {
  if (!storage?.getItem) {
    return { state: DEFAULT_SPATIAL_DRAW_STATE, history: [] };
  }

  try {
    const raw = storage.getItem(SPATIAL_DRAW_STORAGE_KEY);
    if (!raw) return { state: DEFAULT_SPATIAL_DRAW_STATE, history: [] };
    const parsed = JSON.parse(raw);
    return {
      state: normalizeSpatialDrawState(parsed.state),
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 30) : [],
    };
  } catch {
    return { state: DEFAULT_SPATIAL_DRAW_STATE, history: [] };
  }
}

export function writeSpatialDrawStorage(storage, payload) {
  if (!storage?.setItem) return false;

  try {
    storage.setItem(
      SPATIAL_DRAW_STORAGE_KEY,
      JSON.stringify({
        state: normalizeSpatialDrawState(payload?.state),
        history: Array.isArray(payload?.history) ? payload.history.slice(0, 30) : [],
      }),
    );
    return true;
  } catch {
    return false;
  }
}
