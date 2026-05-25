import { clusterPoiMarkers, createClusterIconHtml, shouldShowPoiLayer } from "./poi-markers";

function poi(index) {
  return {
    id: `poi-${index}`,
    latitude: 16.05 + index * 0.00001,
    longitude: 108.2 + index * 0.00001
  };
}

describe("poi marker rendering", () => {
  it("keeps the standard auto-search result size as individual markers", () => {
    const rendered = clusterPoiMarkers(Array.from({ length: 120 }, (_, index) => poi(index)));

    expect(rendered).toHaveLength(120);
    expect(rendered.every((entry) => entry.kind === "poi")).toBe(true);
  });

  it("labels clustered markers as places rather than exposing POI terminology", () => {
    expect(createClusterIconHtml(3)).toContain("3");
    expect(createClusterIconHtml(3)).not.toContain("POI");
  });

  it("only shows POI markers from zoom level 12 upward", () => {
    expect(shouldShowPoiLayer(11.99)).toBe(false);
    expect(shouldShowPoiLayer(12)).toBe(true);
    expect(shouldShowPoiLayer(16)).toBe(true);
  });
});
