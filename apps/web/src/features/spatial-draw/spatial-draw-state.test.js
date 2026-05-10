import {
  DEFAULT_SPATIAL_DRAW_STATE,
  addSpatialDrawHistory,
  readSpatialDrawStorage,
  spatialDrawReducer,
  writeSpatialDrawStorage,
} from "./spatial-draw-state";

describe("spatial-draw-state", () => {
  it("changes modes, stores draft coordinates, and tracks selected vertex", () => {
    let state = spatialDrawReducer(DEFAULT_SPATIAL_DRAW_STATE, {
      type: "set-mode",
      mode: "line",
    });
    state = spatialDrawReducer(state, { type: "add-coordinate", point: { lat: 16, lng: 108 } });
    state = spatialDrawReducer(state, { type: "add-coordinate", point: { lat: 16.1, lng: 108.1 } });
    state = spatialDrawReducer(state, { type: "select-vertex", index: 1 });
    state = spatialDrawReducer(state, { type: "edit-coordinate", index: 1, point: { lat: 16.2, lng: 108.2 } });

    expect(state.mode).toBe("line");
    expect(state.coordinates).toEqual([
      { lat: 16, lng: 108 },
      { lat: 16.2, lng: 108.2 },
    ]);
    expect(state.selectedVertexIndex).toBe(1);
    expect(state.hasUnsavedChanges).toBe(true);
  });

  it("supports add/delete vertex plus undo and redo", () => {
    let state = spatialDrawReducer(
      { ...DEFAULT_SPATIAL_DRAW_STATE, mode: "polygon" },
      { type: "add-coordinate", point: { lat: 16, lng: 108 } },
    );
    state = spatialDrawReducer(state, { type: "add-coordinate", point: { lat: 16, lng: 108.1 } });
    state = spatialDrawReducer(state, { type: "add-coordinate", point: { lat: 16.1, lng: 108.1 } });
    state = spatialDrawReducer(state, { type: "delete-vertex", index: 1 });
    expect(state.coordinates).toHaveLength(2);

    state = spatialDrawReducer(state, { type: "undo" });
    expect(state.coordinates).toHaveLength(3);
    state = spatialDrawReducer(state, { type: "redo" });
    expect(state.coordinates).toHaveLength(2);
  });

  it("updates attributes, toggles snap, marks saved, and cancels", () => {
    let state = spatialDrawReducer(DEFAULT_SPATIAL_DRAW_STATE, {
      type: "set-attributes",
      attributes: { name: "A", type: "inspection", description: "B" },
    });
    state = spatialDrawReducer(state, { type: "toggle-snap", enabled: false });
    state = spatialDrawReducer(state, { type: "mark-saved" });

    expect(state.attributes).toEqual({ name: "A", type: "inspection", description: "B" });
    expect(state.snapEnabled).toBe(false);
    expect(state.hasUnsavedChanges).toBe(false);

    state = spatialDrawReducer(state, { type: "cancel" });
    expect(state).toEqual(expect.objectContaining({ mode: "idle", coordinates: [] }));
  });

  it("persists draft and history with localStorage fallback", () => {
    const storage = {
      data: {},
      getItem(key) {
        return this.data[key] ?? null;
      },
      setItem(key, value) {
        this.data[key] = value;
      },
    };
    const history = addSpatialDrawHistory([], "draft.save", { type: "point" });
    const state = {
      ...DEFAULT_SPATIAL_DRAW_STATE,
      mode: "point",
      coordinates: [{ lat: 16, lng: 108 }],
    };

    expect(writeSpatialDrawStorage(storage, { state, history })).toBe(true);
    expect(readSpatialDrawStorage(storage)).toEqual(
      expect.objectContaining({
        state: expect.objectContaining({ mode: "point", coordinates: [{ lat: 16, lng: 108 }] }),
        history: expect.arrayContaining([expect.objectContaining({ action: "draft.save" })]),
      }),
    );

    expect(writeSpatialDrawStorage(null, { state, history })).toBe(false);
    expect(readSpatialDrawStorage(null)).toEqual(
      expect.objectContaining({ state: DEFAULT_SPATIAL_DRAW_STATE, history: [] }),
    );
  });
});
