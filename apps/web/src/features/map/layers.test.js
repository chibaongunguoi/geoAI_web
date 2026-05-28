import {
  createDefaultLayerState,
  filterLayersByQuery,
  focusLayerVisibility,
  hideAllLayerVisibility,
  layerIsVisibleAtZoom,
  moveLayer,
  readStoredLayerState,
  reorderLayer,
  selectLayerVisibility,
  setLayerGroupVisibility,
  setLayerOpacity,
  toggleLayerVisibility,
  validateGeoJsonPayload,
  validateLayerConfig,
  visibleLayerIds
} from "./layers";
import DATA_LAYERS from "../../../public/data/layers.json";
import { DEFAULT_LAYER_STORAGE_KEY } from "./layers";

describe("data layers", () => {
  it("creates default visibility, opacity, and order from the catalog", () => {
    const state = createDefaultLayerState(DATA_LAYERS);

    expect(state.order).toEqual(DATA_LAYERS.map((layer) => layer.id));
    expect(state.visible["admin-boundaries"]).toBe(true);
    expect(state.visible["analysis-results"]).toBe(true);
  });

  it("filters layers by label, group, source type, and keywords", () => {
    const filtered = filterLayersByQuery(DATA_LAYERS, "scan");

    expect(filtered.map((layer) => layer.id)).toEqual(["analysis-results"]);
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
    expect(state.visible["demo-wms-states"]).toBe(true);
    expect(visibleLayerIds(state)).toEqual([
      "admin-boundaries",
      "demo-wms-states",
      "analysis-results"
    ]);
  });

  it("focuses one scan layer without keeping unrelated layers visible", () => {
    const state = focusLayerVisibility(
      createDefaultLayerState(DATA_LAYERS),
      "analysis-results",
      ["admin-boundaries"]
    );

    expect(state.visible["admin-boundaries"]).toBe(true);
    expect(state.visible["demo-wms-states"]).toBe(false);
    expect(state.visible["osm-template-overlay"]).toBe(false);
    expect(state.visible["analysis-results"]).toBe(true);
    expect(visibleLayerIds(state)).toEqual(["admin-boundaries", "analysis-results"]);
  });

  it("hides noisy catalog layers while preserving reference layers for standalone query overlays", () => {
    const state = hideAllLayerVisibility(createDefaultLayerState(DATA_LAYERS), [
      "admin-boundaries"
    ]);

    expect(state.visible["admin-boundaries"]).toBe(true);
    expect(state.visible["analysis-results"]).toBe(false);
    expect(visibleLayerIds(state)).toEqual(["admin-boundaries"]);
  });

  it("toggles layer visibility independently", () => {
    const state = toggleLayerVisibility(
      createDefaultLayerState(DATA_LAYERS),
      "analysis-results"
    );

    expect(state.visible["admin-boundaries"]).toBe(true);
    expect(state.visible["analysis-results"]).toBe(false);
    expect(visibleLayerIds(state)).toEqual(["admin-boundaries"]);
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
    const low = setLayerOpacity(createDefaultLayerState(DATA_LAYERS), "admin-boundaries", 0);
    const high = setLayerOpacity(low, "admin-boundaries", 2);

    expect(low.opacity["admin-boundaries"]).toBe(0.1);
    expect(high.opacity["admin-boundaries"]).toBe(1);
  });

  it("moves layers without losing ids", () => {
    const state = createDefaultLayerState(DATA_LAYERS);
    const moved = moveLayer(state, "admin-boundaries", -1);

    expect(moved.order[0]).toBe("admin-boundaries");
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
          visible: { "analysis-results": false, unknown: true },
          opacity: { "analysis-results": 0.4 },
          order: ["analysis-results", "unknown", "admin-boundaries"]
        })
      )
    };

    const state = readStoredLayerState(storage, DATA_LAYERS);

    expect(storage.getItem).toHaveBeenCalledWith(DEFAULT_LAYER_STORAGE_KEY);
    expect(state.visible.unknown).toBeUndefined();
    expect(state.visible["analysis-results"]).toBe(false);
    expect(state.visible["admin-boundaries"]).toBe(true);
    expect(state.opacity["analysis-results"]).toBe(0.4);
    expect(state.order).toEqual([
      "analysis-results",
      "admin-boundaries",
      "demo-wms-states",
      "osm-template-overlay"
    ]);
  });

  it("preserves stored state with multiple visible layers", () => {
    const storage = {
      getItem: jest.fn().mockReturnValue(
        JSON.stringify({
          visible: { "admin-boundaries": true, "analysis-results": true },
          order: ["analysis-results", "admin-boundaries"]
        })
      )
    };

    const state = readStoredLayerState(storage, DATA_LAYERS);

    expect(visibleLayerIds(state)).toEqual([
      "analysis-results",
      "admin-boundaries"
    ]);
  });
});
