import {
  BASEMAP_STORAGE_KEY,
  BASEMAPS,
  getBasemap,
  readStoredBasemap,
} from "./basemaps";

describe("basemaps", () => {
  it("returns satellite as the fallback basemap", () => {
    expect(getBasemap("unknown").id).toBe("satellite");
  });

  it("defines the required OSM, satellite, and terrain basemaps", () => {
    expect(BASEMAPS.map((basemap) => basemap.id)).toEqual([
      "osm",
      "satellite",
      "terrain",
    ]);
  });

  it("reads a valid stored basemap from localStorage", () => {
    const storage = {
      getItem: jest.fn().mockReturnValue("terrain"),
    };

    expect(readStoredBasemap(storage)).toBe("terrain");
    expect(storage.getItem).toHaveBeenCalledWith(BASEMAP_STORAGE_KEY);
  });

  it("falls back when localStorage has an invalid basemap", () => {
    const storage = {
      getItem: jest.fn().mockReturnValue("bad-layer"),
    };

    expect(readStoredBasemap(storage)).toBe("satellite");
  });
});
