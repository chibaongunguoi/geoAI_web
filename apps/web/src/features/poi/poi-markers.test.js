import { clusterPoiMarkers, createClusterIconHtml, shouldShowPoiLayer } from "./poi-markers";

function poi(index) {
  return {
    id: `poi-${index}`,
    latitude: 16.05 + index * 0.00001,
    longitude: 108.2 + index * 0.00001
  };
}

describe("poi marker rendering", () => {
  it("clusters 120 closely placed markers into a single cluster", () => {
    const rendered = clusterPoiMarkers(Array.from({ length: 120 }, (_, index) => poi(index)));

    expect(rendered).toHaveLength(1);
    expect(rendered[0].kind).toBe("cluster");
    expect(rendered[0].count).toBe(120);
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
