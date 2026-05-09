import {
  DEFAULT_MEASUREMENT_STATE,
  addMeasurementHistory,
  measurementReducer,
  readMeasurementStorage,
  snapPointToVisibleAssets,
  writeMeasurementStorage,
} from "./measurement-state";

describe("measurement-state", () => {
  it("changes mode, adds points, edits vertices, undoes, and clears", () => {
    let state = measurementReducer(DEFAULT_MEASUREMENT_STATE, {
      type: "set-mode",
      mode: "distance",
    });
    state = measurementReducer(state, { type: "add-point", point: { lat: 10, lng: 106 } });
    state = measurementReducer(state, { type: "add-point", point: { lat: 11, lng: 107 } });
    state = measurementReducer(state, { type: "edit-point", index: 1, point: { lat: 12, lng: 108 } });

    expect(state.mode).toBe("distance");
    expect(state.points).toEqual([
      { lat: 10, lng: 106 },
      { lat: 12, lng: 108 },
    ]);

    state = measurementReducer(state, { type: "undo" });
    expect(state.points).toEqual([{ lat: 10, lng: 106 }]);

    state = measurementReducer(state, { type: "clear" });
    expect(state).toEqual(expect.objectContaining({ mode: "idle", points: [] }));
  });

  it("snaps to visible asset centroids within threshold", () => {
    const visibleAssets = [
      {
        type: "Feature",
        properties: { id: "asset-1", name: "Asset 1" },
        geometry: { type: "Point", coordinates: [106.0001, 10.0001] },
      },
    ];

    expect(
      snapPointToVisibleAssets({ lat: 10, lng: 106 }, visibleAssets, { thresholdMeters: 25 }),
    ).toEqual(expect.objectContaining({ lat: 10.0001, lng: 106.0001, snapped: true }));
    expect(
      snapPointToVisibleAssets({ lat: 10, lng: 106 }, visibleAssets, { thresholdMeters: 1 }),
    ).toEqual(expect.objectContaining({ lat: 10, lng: 106, snapped: false }));
  });

  it("persists state and history with localStorage fallback", () => {
    const storage = {
      data: {},
      getItem(key) {
        return this.data[key] ?? null;
      },
      setItem(key, value) {
        this.data[key] = value;
      },
    };
    const history = addMeasurementHistory([], "point.add", { points: 1 });
    const persisted = writeMeasurementStorage(storage, {
      state: { ...DEFAULT_MEASUREMENT_STATE, mode: "area" },
      history,
    });

    expect(persisted).toBe(true);
    expect(readMeasurementStorage(storage)).toEqual(
      expect.objectContaining({
        state: expect.objectContaining({ mode: "area" }),
        history: expect.arrayContaining([expect.objectContaining({ action: "point.add" })]),
      }),
    );

    expect(writeMeasurementStorage(null, { state: DEFAULT_MEASUREMENT_STATE, history: [] })).toBe(false);
    expect(readMeasurementStorage(null)).toEqual(
      expect.objectContaining({ state: DEFAULT_MEASUREMENT_STATE, history: [] }),
    );
  });
});
