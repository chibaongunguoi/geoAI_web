import { fireEvent, render, screen } from "@testing-library/react";

import MapWrapper from "../MapWrapper";

beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve([]),
    })
  );
});

afterAll(() => {
  delete global.fetch;
});

jest.mock("next/dynamic", () => () => {
  const MockMap = (props) => (
    <div
      data-testid="mock-map"
      data-layer-count={props.visibleLayerIds?.length || 0}
      data-has-viewport-callback={typeof props.onViewportChange === "function" ? "yes" : "no"}
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
  BASEMAPS: [{ id: "osm", label: "OSM", minZoom: 2, maxZoom: 19 }],
  getBasemap: () => ({ id: "osm", label: "OSM", minZoom: 2, maxZoom: 19 }),
  readStoredBasemap: () => "osm",
  writeStoredBasemap: jest.fn(),
}));

jest.mock("../../src/features/export/map-capture", () => ({
  captureElementPng: jest.fn(() => Promise.resolve("data:image/png;base64,abc")),
  downloadDataUrl: jest.fn(),
  exportPrintablePdf: jest.fn(() => true),
}));

describe("MapWrapper export and share tools", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn(() => Promise.resolve()) },
    });
  });

  it("renders export/share tools when permissions are present", () => {
    render(<MapWrapper permissions={["export.use", "share.create"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Xuất & Chia sẻ" }));
    expect(screen.getByRole("heading", { name: "Xuất & Chia sẻ" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /sao chép liên kết chia sẻ/i }));
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-has-viewport-callback", "yes");
  });

  it("hides export/share tools without permissions", () => {
    render(<MapWrapper permissions={[]} />);

    expect(screen.queryByText("Xuất & Chia sẻ")).not.toBeInTheDocument();
  });
});
