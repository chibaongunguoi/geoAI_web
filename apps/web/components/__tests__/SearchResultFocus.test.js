import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import MapWrapper from "../MapWrapper";

jest.mock("next/dynamic", () => () => {
  const DynamicComponent = (props) => (
    <div data-testid="mock-map" data-focused={props.focusedProperty?.code || ""} />
  );
  return DynamicComponent;
});

jest.mock("../../src/features/auth/auth-client", () => ({
  canAccess: () => true
}));

jest.mock("../../src/features/map/assets", () => ({
  createDefaultAssetDisplayConfig: () => ({}),
  readStoredAssetDisplayConfig: () => ({}),
  writeStoredAssetDisplayConfig: jest.fn(),
  normalizeAssetDisplayConfig: (config) => config
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
  toggleLayerVisibility: (state) => state
}));

jest.mock("../../src/features/map/basemaps", () => ({
  BASEMAPS: [{ id: "satellite", label: "Satellite" }],
  getBasemap: () => ({ id: "satellite", label: "Satellite" }),
  readStoredBasemap: () => "satellite",
  writeStoredBasemap: jest.fn()
}));

global.fetch = jest.fn((url) => {
  if (url.includes("/api/properties?query=")) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          answer: { type: "search", text: "Tim thay 1 ket qua" },
          items: [
            {
              id: "1",
              code: "DN-OVT-FOCUS",
              name: "Focus Building",
              ward: "Hoa Khanh Bac",
              district: "Lien Chieu",
              status: "ACTIVE",
              areaSqm: 1250,
              centroidLat: 16.05,
              centroidLng: 108.2
            }
          ],
          meta: {}
        })
    });
  }

  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
});

describe("SearchResultFocus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  function runSearch(query = "focus building") {
    fireEvent.change(screen.getByRole("textbox", { name: /câu hỏi/i }), {
      target: { value: query }
    });
    fireEvent.click(screen.getByRole("button", { name: "Tìm kiếm", exact: true }));
  }

  it("passes focusedProperty to Map when a result is clicked", async () => {
    render(<MapWrapper permissions={["layers.view"]} />);

    runSearch();

    await waitFor(() => {
      expect(screen.getByText("Focus Building")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Focus Building").closest("li"));

    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-focused", "DN-OVT-FOCUS");
  });

  it("switches normal query results to table view", async () => {
    render(<MapWrapper permissions={["layers.view"]} />);

    runSearch();

    await waitFor(() => {
      expect(screen.getByText("Focus Building")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Bảng" }));

    expect(screen.getByRole("columnheader", { name: "Mã" })).toBeInTheDocument();
    expect(screen.getByText("DN-OVT-FOCUS")).toBeInTheDocument();
  });

  it("runs a sample Vietnamese question", async () => {
    render(<MapWrapper permissions={["layers.view"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Nhà ở đường Nguyễn Lương Bằng" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("Nhà ở đường Nguyễn Lương Bằng")),
        { cache: "no-store" }
      );
    });
  });
});
