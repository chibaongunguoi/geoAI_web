import {
  buildMeasurementExport,
  calculateCentroid,
  calculatePolygonArea,
  calculateTotalDistance,
  formatArea,
  formatDistance,
  getMeasurementResult,
} from "./measurement-utils";

describe("measurement-utils", () => {
  it("calculates total distance across multiple points", () => {
    const points = [
      { lat: 10.762622, lng: 106.660172 },
      { lat: 10.762622, lng: 106.670172 },
      { lat: 10.772622, lng: 106.670172 },
    ];

    expect(calculateTotalDistance(points)).toBeGreaterThan(2000);
    expect(calculateTotalDistance(points)).toBeLessThan(2300);
  });

  it("calculates approximate polygon area and centroid", () => {
    const points = [
      { lat: 10, lng: 106 },
      { lat: 10, lng: 106.01 },
      { lat: 10.01, lng: 106.01 },
      { lat: 10.01, lng: 106 },
    ];

    expect(calculatePolygonArea(points)).toBeGreaterThan(1_100_000);
    expect(calculatePolygonArea(points)).toBeLessThan(1_300_000);
    expect(calculateCentroid(points)).toEqual(
      expect.objectContaining({ lat: expect.any(Number), lng: expect.any(Number) }),
    );
  });

  it("formats distance and area units for map display", () => {
    expect(formatDistance(950)).toBe("950 m");
    expect(formatDistance(1234)).toBe("1.23 km");
    expect(formatArea(9500)).toBe("9,500 m²");
    expect(formatArea(12345)).toBe("1.23 ha");
  });

  it("returns validation errors for incomplete measurements", () => {
    expect(getMeasurementResult("distance", [{ lat: 10, lng: 106 }])).toEqual(
      expect.objectContaining({ error: "Add at least 2 points to measure distance." }),
    );
    expect(getMeasurementResult("area", [{ lat: 10, lng: 106 }, { lat: 10, lng: 107 }])).toEqual(
      expect.objectContaining({ error: "Add at least 3 points to measure area." }),
    );
  });

  it("builds a GeoJSON export payload", () => {
    const payload = buildMeasurementExport({
      mode: "distance",
      points: [
        { lat: 10, lng: 106 },
        { lat: 10.01, lng: 106.01 },
      ],
      createdAt: "2026-05-09T00:00:00.000Z",
      label: "Site walk",
    });

    expect(payload).toEqual(
      expect.objectContaining({
        type: "distance",
        value: expect.any(Number),
        formattedValue: expect.any(String),
        createdAt: "2026-05-09T00:00:00.000Z",
        label: "Site walk",
      }),
    );
    expect(payload.geojson).toEqual(
      expect.objectContaining({
        type: "Feature",
        geometry: expect.objectContaining({ type: "LineString" }),
      }),
    );
  });
});
