import {
  DEFAULT_ASSET_FILTERS,
  FILTER_STORAGE_KEY,
  activeFilterCount,
  assetFilterQueryString,
  filterWarning,
  normalizeAssetFilters,
  readFilterState,
  writeFilterState
} from "./filter-state";

function memoryStorage(initialValue) {
  const values = new Map(initialValue ? [[FILTER_STORAGE_KEY, initialValue]] : []);

  return {
    getItem: jest.fn((key) => values.get(key) || null),
    setItem: jest.fn((key, value) => values.set(key, value))
  };
}

describe("filter-state", () => {
  it("normalizes unsupported filter values back to defaults", () => {
    expect(
      normalizeAssetFilters({
        status: "BROKEN",
        propertyType: "building",
        district: "Lien Chieu",
        ward: "Hoa Khanh Bac",
        updatedFrom: "2026-05-09",
        updatedTo: "bad"
      })
    ).toEqual({
      ...DEFAULT_ASSET_FILTERS,
      propertyType: "building",
      district: "Lien Chieu",
      ward: "Hoa Khanh Bac",
      updatedFrom: "2026-05-09"
    });
  });

  it("serializes active filters into property query params", () => {
    expect(
      assetFilterQueryString({
        query: "Nguyen",
        status: "ACTIVE",
        propertyType: "building",
        district: "Lien Chieu",
        ward: "Hoa Khanh Bac",
        updatedFrom: "2026-05-01",
        updatedTo: "2026-05-09",
        limit: 50
      })
    ).toBe(
      "query=Nguyen&status=ACTIVE&propertyType=building&district=Lien+Chieu&ward=Hoa+Khanh+Bac&updatedFrom=2026-05-01&updatedTo=2026-05-09&limit=50"
    );
  });

  it("persists last filters, presets, and history locally", () => {
    const storage = memoryStorage();
    writeFilterState(storage, {
      filters: { status: "ACTIVE" },
      presets: [{ name: "Active", filters: { status: "ACTIVE" } }],
      history: [{ action: "filters.apply", filters: { status: "ACTIVE" } }]
    });

    const state = readFilterState(storage);

    expect(state.lastFilters.status).toBe("ACTIVE");
    expect(state.presets[0].name).toBe("Active");
    expect(state.history[0].action).toBe("filters.apply");
    expect(storage.setItem).toHaveBeenCalledWith(
      FILTER_STORAGE_KEY,
      expect.stringContaining("filters.apply")
    );
  });

  it("returns broad and narrow result warnings", () => {
    expect(activeFilterCount({ status: "ACTIVE", district: "Lien Chieu" })).toBe(2);
    expect(filterWarning(DEFAULT_ASSET_FILTERS, 100)).toContain("too broad");
    expect(filterWarning({ status: "ACTIVE" }, 0)).toContain("too narrow");
  });
});
