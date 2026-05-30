import { densityHeatPoint, densityHeatRatio } from "./map-helpers";

describe("map heatmap helpers", () => {
  it("keeps dense-but-not-maximum building regions visible with logarithmic scaling", () => {
    const ratio = densityHeatRatio({ count: 100 }, 10000);

    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.6);
  });

  it("uses the scaled ratio as heat layer intensity", () => {
    expect(densityHeatPoint({ center: { lat: 16.07, lng: 108.22 }, count: 100 }, 10000)).toEqual([
      16.07,
      108.22,
      expect.any(Number),
    ]);
    expect(densityHeatPoint({ center: { lat: 16.07, lng: 108.22 }, count: 100 }, 10000)[2]).toBeGreaterThan(0.45);
  });
});
