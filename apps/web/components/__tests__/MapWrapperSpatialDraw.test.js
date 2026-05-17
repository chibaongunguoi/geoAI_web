import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import MapWrapper from "../MapWrapper";

jest.mock("next/dynamic", () => () => {
  const MockMap = (props) => (
    <button
      type="button"
      data-testid="mock-map"
      data-spatial-mode={props.spatialDrawState?.mode || "idle"}
      data-spatial-points={props.spatialDrawState?.coordinates?.length || 0}
      onClick={() => props.onSpatialDrawMapPointAdd?.({ lat: 16, lng: 108 })}
    >
      mock map
    </button>
  );
  MockMap.displayName = "MockMap";
  return MockMap;
});

jest.mock("../../src/features/auth/auth-client", () => ({
  canAccess: (permissions, permission) => Array.isArray(permissions) && permissions.includes(permission),
}));

jest.mock("../../src/features/map/assets", () => ({
  createDefaultAssetDisplayConfig: () => ({}),
  readStoredAssetDisplayConfig: () => ({}),
  writeStoredAssetDisplayConfig: jest.fn(),
  normalizeAssetDisplayConfig: (config) => config,
}));

jest.mock("../../src/features/map/layers", () => ({
  DATA_LAYERS: [],
  createDefaultLayerState: () => ({}),
  readStoredLayerState: () => ({}),
  writeStoredLayerState: jest.fn(),
  visibleLayerIds: () => [],
  hideAllLayerVisibility: (state) => state,
  focusLayerVisibility: (state) => state,
  moveLayer: (state) => state,
  opacityForLayer: () => 1,
  reorderLayer: (state) => state,
  setLayerOpacity: (state) => state,
  setLayerGroupVisibility: (state) => state,
  toggleLayerVisibility: (state) => state,
}));

jest.mock("../../src/features/map/basemaps", () => ({
  BASEMAPS: [{ id: "osm", label: "OSM" }],
  getBasemap: () => ({ id: "osm", label: "OSM" }),
  readStoredBasemap: () => "osm",
  writeStoredBasemap: jest.fn(),
}));

describe("MapWrapper spatial draw tools", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders spatial draw tools and passes mode to Map when permission is present", async () => {
    render(<MapWrapper permissions={["properties.manage"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Spatial draw/edit" }));
    expect(screen.getByRole("heading", { name: "Spatial draw/edit" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Line" }));
    fireEvent.click(screen.getByTestId("mock-map"));

    await waitFor(() => {
      expect(screen.getByTestId("mock-map")).toHaveAttribute("data-spatial-mode", "line");
      expect(screen.getByTestId("mock-map")).toHaveAttribute("data-spatial-points", "1");
    });
  });

  it("hides spatial draw tools when permission is missing", () => {
    render(<MapWrapper permissions={[]} />);

    expect(screen.queryByRole("button", { name: "Spatial draw/edit" })).not.toBeInTheDocument();
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-spatial-mode", "idle");
  });

  it("restores local spatial draft", async () => {
    window.localStorage.setItem(
      "geoai.spatialDraw.v1",
      JSON.stringify({
        state: {
          mode: "point",
          coordinates: [{ lat: 16, lng: 108 }],
          selectedVertexIndex: 0,
          attributes: { name: "Restored", type: "event", description: "" },
          snapEnabled: true,
          hasUnsavedChanges: true,
        },
        history: [],
      }),
    );

    render(<MapWrapper permissions={["properties.manage"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Spatial draw/edit" }));

    await waitFor(() => {
      expect(screen.getByTestId("mock-map")).toHaveAttribute("data-spatial-mode", "point");
      expect(screen.getByDisplayValue("Restored")).toBeInTheDocument();
    });
  });
});
