import { resolveDensityObjectLimit } from "./density-config";
import { Delegate, PropertiesPrisma, PropertyStatus, BuildingPropertyRow, PropertyDensityRegion, PropertySearchMap, PropertyDensityObject, PropertySearchAnswer, SearchIntent, DensityRegionRow, PropertySearchInput, PropertyHeatmapInput, PropertyMutationInput, AssetImportResult, ImportOptions, OvertureFeature, DEFAULT_CITY, DEFAULT_PROPERTY_TYPE, DEFAULT_STATUS, DEFAULT_SOURCE, OVERTURE_SOURCE, MAX_LIMIT, DEFAULT_LIMIT, DEFAULT_DENSITY_GRID_SIZE, DEFAULT_DENSITY_REGION_LIMIT, DEFAULT_DENSITY_OBJECT_LIMIT, DENSITY_BACKEND_TIMEOUT_MS, SEMANTIC_PROVIDER_TIMEOUT_MS, LIST_SEARCH_TIMEOUT_MS, DEFAULT_EMBEDDING_MODEL, VALID_STATUSES, STOP_WORDS_FOR_TOKENS, LOWEST_DENSITY_PHRASES, HIGHEST_DENSITY_PHRASES, DENSITY_INTENT_KEYWORDS, INTENT_KEYWORDS, STATIC_LOCATIONS, DANANG_DISTRICTS, PropertiesServiceOptions, PROPERTIES_SERVICE_OPTIONS } from "./properties.types";

describe("resolveDensityObjectLimit", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns 1500 when envValue is undefined", () => {
    expect(resolveDensityObjectLimit(undefined)).toBe(1500);
  });

  it("returns 1500 when envValue is empty string", () => {
    expect(resolveDensityObjectLimit("")).toBe(1500);
  });

  it("returns 1500 when envValue is non-numeric", () => {
    expect(resolveDensityObjectLimit("abc")).toBe(1500);
    expect(resolveDensityObjectLimit("not-a-number")).toBe(1500);
    expect(resolveDensityObjectLimit("12abc")).toBe(1500);
  });

  it("returns the parsed value when within [500, 2000]", () => {
    expect(resolveDensityObjectLimit("500")).toBe(500);
    expect(resolveDensityObjectLimit("1000")).toBe(1000);
    expect(resolveDensityObjectLimit("1500")).toBe(1500);
    expect(resolveDensityObjectLimit("2000")).toBe(2000);
  });

  it("clamps to 500 when value is below minimum", () => {
    expect(resolveDensityObjectLimit("100")).toBe(500);
    expect(resolveDensityObjectLimit("0")).toBe(500);
    expect(resolveDensityObjectLimit("-50")).toBe(500);
    expect(resolveDensityObjectLimit("499")).toBe(500);
  });

  it("clamps to 2000 when value exceeds maximum", () => {
    expect(resolveDensityObjectLimit("2001")).toBe(2000);
    expect(resolveDensityObjectLimit("5000")).toBe(2000);
    expect(resolveDensityObjectLimit("99999")).toBe(2000);
  });

  it("logs a warning when clamping below minimum", () => {
    resolveDensityObjectLimit("100");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("below minimum")
    );
  });

  it("logs a warning when clamping above maximum", () => {
    resolveDensityObjectLimit("3000");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("exceeds maximum")
    );
  });

  it("does not log a warning for valid values", () => {
    resolveDensityObjectLimit("1500");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not log a warning for undefined or non-numeric values", () => {
    resolveDensityObjectLimit(undefined);
    resolveDensityObjectLimit("");
    resolveDensityObjectLimit("abc");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("rounds decimal values to nearest integer", () => {
    expect(resolveDensityObjectLimit("1500.7")).toBe(1501);
    expect(resolveDensityObjectLimit("999.4")).toBe(999);
  });

  it("returns 1500 for Infinity and -Infinity", () => {
    expect(resolveDensityObjectLimit("Infinity")).toBe(1500);
    expect(resolveDensityObjectLimit("-Infinity")).toBe(1500);
  });
});
