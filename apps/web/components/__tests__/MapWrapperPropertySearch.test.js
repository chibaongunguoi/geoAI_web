import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import MapWrapper from "../MapWrapper";

jest.mock("next/dynamic", () => () => {
  const MockMap = () => <div data-testid="mock-map" />;
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

describe("MapWrapper property search stability", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("aborts an in-flight property search when a new one starts", async () => {
    const signals = [];
    global.fetch = jest.fn((url, init = {}) => {
      if (String(url).startsWith("/api/properties?")) {
        signals.push(init.signal);
        if (signals.length === 1) {
          return new Promise(() => {});
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ id: "property-2" }], meta: {} })
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(<MapWrapper permissions={[]} />);
    const textbox = screen.getByRole("textbox", { name: /c/i });
    const searchButton = screen.getByRole("button", { name: /^Tìm kiếm$/i });

    fireEvent.change(textbox, { target: { value: "nha o hai chau" } });
    fireEvent.click(searchButton);

    fireEvent.change(textbox, { target: { value: "nha o lien chieu" } });
    fireEvent.click(searchButton);

    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0].aborted).toBe(true);
  });

  it("shows a timeout status and aborts a property search after the UI deadline", async () => {
    const signals = [];
    global.fetch = jest.fn((url, init = {}) => {
      if (String(url).startsWith("/api/properties?")) {
        signals.push(init.signal);
        return new Promise(() => {});
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(<MapWrapper permissions={[]} />);

    fireEvent.change(screen.getByRole("textbox", { name: /c/i }), {
      target: { value: "vung nao nhieu nha nhat" }
    });
    fireEvent.click(screen.getByRole("button", { name: /^Tìm kiếm$/i }));

    await waitFor(() => expect(signals).toHaveLength(1));

    act(() => {
      jest.advanceTimersByTime(8200);
    });

    expect(signals[0].aborted).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent(/Tìm kiếm quá lâu/i);
  });
});
