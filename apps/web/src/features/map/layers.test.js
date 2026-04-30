import {
  DATA_LAYERS,
  DEFAULT_LAYER_STORAGE_KEY,
  createDefaultLayerState,
  filterLayersByQuery,
  layerIsVisibleAtZoom,
  moveLayer,
  readStoredLayerState,
  reorderLayer,
  selectLayerVisibility,
  setLayerOpacity,
  setLayerGroupVisibility,
  toggleLayerVisibility,
  validateGeoJsonPayload,
  validateLayerConfig,
  visibleLayerIds
} from "./layers";

describe("data layers", () => {
  it("creates default visibility, opacity, and order from the catalog", () => {
    const state = createDefaultLayerState(DATA_LAYERS);

    expect(state.order).toEqual(DATA_LAYERS.map((layer) => layer.id));
    expect(state.visible["admin-boundaries"]).toBe(true);
    expect(state.visible["sample-assets"]).toBe(true);
    expect(state.visible["analysis-results"]).toBe(true);
    expect(state.opacity["sample-assets"]).toBe(0.85);
  });

  it("filters layers by label, group, source type, and keywords", () => {
    const filtered = filterLayersByQuery(DATA_LAYERS, "asset geojson");

    expect(filtered.map((layer) => layer.id)).toEqual(["sample-assets"]);
  });

  it("validates external layer source configs", () => {
    expect(
      validateLayerConfig({
        id: "districts",
        sourceKind: "geojson",
        url: "/data/districts.geojson"
      }).valid
    ).toBe(true);
    expect(
      validateLayerConfig({
        id: "wms-buildings",
        sourceKind: "wms",
        url: "https://example.test/wms",
        wmsOptions: { layers: "buildings" }
      }).valid
    ).toBe(true);
    expect(
      validateLayerConfig({
        id: "wmts-roads",
        sourceKind: "wmts",
        url: "https://example.test/tiles/{z}/{x}/{y}.png"
      }).valid
    ).toBe(true);
  });

  it("rejects incomplete external layer source configs", () => {
    expect(validateLayerConfig({ id: "bad-geojson", sourceKind: "geojson" })).toEqual({
      valid: false,
      message: "GeoJSON layers require a URL."
    });
    expect(
      validateLayerConfig({
        id: "bad-wms",
        sourceKind: "wms",
        url: "https://example.test/wms"
      })
    ).toEqual({
      valid: false,
      message: "WMS layers require a URL and wmsOptions.layers."
    });
    expect(
      validateLayerConfig({
        id: "bad-wmts",
        sourceKind: "wmts",
        url: "https://example.test/tiles"
      })
    ).toEqual({
      valid: false,
      message: "WMTS layers require a URL template with {z}, {x}, and {y}."
    });
  });

  it("validates GeoJSON payload shape", () => {
    expect(validateGeoJsonPayload({ type: "FeatureCollection", features: [] }).valid).toBe(true);
    expect(validateGeoJsonPayload({ type: "Feature", geometry: null, properties: {} }).valid).toBe(true);
    expect(validateGeoJsonPayload({ type: "GeometryCollection", geometries: [] })).toEqual({
      valid: false,
      message: "GeoJSON response must be a Feature or FeatureCollection."
    });
  });

  it("selects a layer without hiding other layers", () => {
    const state = selectLayerVisibility(
      createDefaultLayerState(DATA_LAYERS),
      "demo-wms-states"
    );

    expect(state.visible["admin-boundaries"]).toBe(true);
    expect(state.visible["sample-assets"]).toBe(true);
    expect(state.visible["demo-wms-states"]).toBe(true);
    expect(visibleLayerIds(state)).toEqual([
      "admin-boundaries",
      "sample-assets",
      "demo-wms-states",
      "analysis-results"
    ]);
  });

  it("toggles layer visibility independently", () => {
    const state = toggleLayerVisibility(
      createDefaultLayerState(DATA_LAYERS),
      "sample-assets"
    );

    expect(state.visible["admin-boundaries"]).toBe(true);
    expect(state.visible["sample-assets"]).toBe(false);
    expect(state.visible["analysis-results"]).toBe(true);
    expect(visibleLayerIds(state)).toEqual(["admin-boundaries", "analysis-results"]);
  });

  it("toggles all layers in a group", () => {
    const externalGroup = DATA_LAYERS.find((layer) => layer.id === "demo-wms-states").group;
    const state = setLayerGroupVisibility(
      createDefaultLayerState(DATA_LAYERS),
      DATA_LAYERS,
      externalGroup,
      true
    );

    expect(state.visible["admin-boundaries"]).toBe(true);
    expect(state.visible["demo-wms-states"]).toBe(true);
    expect(state.visible["osm-template-overlay"]).toBe(true);
  });

  it("clamps opacity between 0.1 and 1", () => {
    const low = setLayerOpacity(createDefaultLayerState(DATA_LAYERS), "sample-assets", 0);
    const high = setLayerOpacity(low, "sample-assets", 2);

    expect(low.opacity["sample-assets"]).toBe(0.1);
    expect(high.opacity["sample-assets"]).toBe(1);
  });

  it("moves layers without losing ids", () => {
    const state = createDefaultLayerState(DATA_LAYERS);
    const moved = moveLayer(state, "sample-assets", -1);

    expect(moved.order[0]).toBe("sample-assets");
    expect(moved.order.toSorted()).toEqual(state.order.toSorted());
  });

  it("reorders layers by dragging one layer onto another", () => {
    const state = createDefaultLayerState(DATA_LAYERS);
    const reordered = reorderLayer(state, "analysis-results", "admin-boundaries");

    expect(reordered.order[0]).toBe("analysis-results");
    expect(reordered.order.toSorted()).toEqual(state.order.toSorted());
  });

  it("checks layer zoom thresholds", () => {
    const layer = DATA_LAYERS.find((item) => item.id === "admin-boundaries");

    expect(layerIsVisibleAtZoom(layer, 8)).toBe(false);
    expect(layerIsVisibleAtZoom(layer, 12)).toBe(true);
  });

  it("reads valid stored state and ignores unknown layer ids", () => {
    const storage = {
      getItem: jest.fn().mockReturnValue(
        JSON.stringify({
          visible: { "sample-assets": false, unknown: true },
          opacity: { "sample-assets": 0.4 },
          order: ["sample-assets", "unknown", "admin-boundaries", "analysis-results"]
        })
      )
    };

    const state = readStoredLayerState(storage);

    expect(storage.getItem).toHaveBeenCalledWith(DEFAULT_LAYER_STORAGE_KEY);
    expect(state.visible.unknown).toBeUndefined();
    expect(state.visible["sample-assets"]).toBe(false);
    expect(state.visible["admin-boundaries"]).toBe(true);
    expect(state.opacity["sample-assets"]).toBe(0.4);
    expect(state.order).toEqual([
      "sample-assets",
      "admin-boundaries",
      "analysis-results",
      "demo-wms-states",
      "osm-template-overlay"
    ]);
  });

  it("preserves stored state with multiple visible layers", () => {
    const storage = {
      getItem: jest.fn().mockReturnValue(
        JSON.stringify({
          visible: { "admin-boundaries": true, "sample-assets": true },
          order: ["sample-assets", "admin-boundaries"]
        })
      )
    };

    const state = readStoredLayerState(storage);

    expect(visibleLayerIds(state)).toEqual([
      "sample-assets",
      "admin-boundaries",
      "analysis-results"
    ]);
  });
});
