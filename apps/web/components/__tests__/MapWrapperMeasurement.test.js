import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import MapWrapper from "../MapWrapper";

jest.mock("next/dynamic", () => () => {
  const MockMap = (props) => (
    <div
      data-testid="mock-map"
      data-measurement-mode={props.measurementState?.mode || "idle"}
      data-measurement-points={props.measurementState?.points?.length || 0}
    />
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

describe("MapWrapper measurement tools", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders measurement tools and passes mode to Map when permission is present", async () => {
    render(<MapWrapper permissions={["measurement.use"]} />);

    expect(screen.getByText("Measurement tools")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /distance/i }));

    await waitFor(() => {
      expect(screen.getByTestId("mock-map")).toHaveAttribute("data-measurement-mode", "distance");
    });
  });

  it("hides measurement tools when permission is missing", () => {
    render(<MapWrapper permissions={[]} />);

    expect(screen.queryByText("Measurement tools")).not.toBeInTheDocument();
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-measurement-mode", "idle");
  });
});
