import {
  buildSpatialDrawExport,
  buildSpatialDrawGeoJson,
  getSpatialDrawResult,
  normalizeCoordinate,
  validateSpatialGeometry,
} from "./spatial-draw-utils";

describe("spatial-draw-utils", () => {
  it("normalizes valid coordinates and rejects invalid values", () => {
    expect(normalizeCoordinate({ lat: "16.05", lng: "108.2" })).toEqual({
      lat: 16.05,
      lng: 108.2,
    });
    expect(normalizeCoordinate({ lat: "x", lng: 108.2 })).toBeNull();
  });

  it("validates point, line, and polygon draft geometry", () => {
    expect(validateSpatialGeometry("point", [{ lat: 16, lng: 108 }])).toEqual(
      expect.objectContaining({ valid: true, type: "point" }),
    );
    expect(validateSpatialGeometry("line", [{ lat: 16, lng: 108 }])).toEqual(
      expect.objectContaining({ valid: false, error: "Add at least 2 points for a line." }),
    );
    expect(
      validateSpatialGeometry("polygon", [
        { lat: 16, lng: 108 },
        { lat: 16, lng: 108.01 },
        { lat: 16.01, lng: 108.01 },
      ]),
    ).toEqual(expect.objectContaining({ valid: true, type: "polygon" }));
  });

  it("builds GeoJSON and closes polygon rings", () => {
    const geojson = buildSpatialDrawGeoJson({
      mode: "polygon",
      coordinates: [
        { lat: 16, lng: 108 },
        { lat: 16, lng: 108.01 },
        { lat: 16.01, lng: 108.01 },
      ],
      attributes: { name: "Impact area", type: "inspection", description: "Draft" },
      createdAt: "2026-05-10T00:00:00.000Z",
    });

    expect(geojson).toEqual(
      expect.objectContaining({
        type: "Feature",
        properties: expect.objectContaining({
          name: "Impact area",
          source: "geoai-spatial-draw",
        }),
        geometry: expect.objectContaining({ type: "Polygon" }),
      }),
    );
    expect(geojson.geometry.coordinates[0][0]).toEqual(
      geojson.geometry.coordinates[0][geojson.geometry.coordinates[0].length - 1],
    );
  });

  it("returns validation status and export payloads", () => {
    const result = getSpatialDrawResult({
      mode: "line",
      coordinates: [
        { lat: 16, lng: 108 },
        { lat: 16.01, lng: 108.02 },
      ],
      attributes: { name: "Route", type: "line", description: "" },
    });

    expect(result).toEqual(
      expect.objectContaining({
        type: "line",
        error: null,
        geojson: expect.objectContaining({
          geometry: expect.objectContaining({ type: "LineString" }),
        }),
      }),
    );

    expect(
      buildSpatialDrawExport({
        mode: "point",
        coordinates: [{ lat: 16, lng: 108 }],
        createdAt: "2026-05-10T00:00:00.000Z",
      }),
    ).toEqual(expect.objectContaining({ type: "point", createdAt: "2026-05-10T00:00:00.000Z" }));
  });
});
