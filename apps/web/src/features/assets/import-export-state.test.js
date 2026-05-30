import {
  assetRowsToCsv,
  assetRowsToGeoJson,
  buildImportTemplateCsv,
  detectDuplicateCodes,
  normalizeImportRows,
  parseCsvText,
  rowsFromGeoJson,
} from "./import-export-state";

describe("asset import/export state", () => {
  it("parses CSV headers, quoted values, and empty cells", () => {
    const parsed = parseCsvText('Asset Code,Name,Ward\nDN-001,"Office, main",Hai Chau\nDN-002,,');

    expect(parsed).toEqual([
      { "Asset Code": "DN-001", Name: "Office, main", Ward: "Hai Chau" },
      { "Asset Code": "DN-002", Name: "", Ward: "" },
    ]);
  });

  it("normalizes aliases and validates required fields", () => {
    const rows = normalizeImportRows([
      {
        "Asset Code": "DN-001",
        "Asset Name": "Main Office",
        Latitude: "16.07",
        Longitude: "108.22",
      },
      { code: "DN-002", name: "", centroidLat: "16", centroidLng: "108" },
    ]);

    expect(rows[0]).toEqual(
      expect.objectContaining({
        code: "DN-001",
        name: "Main Office",
        centroidLat: 16.07,
        centroidLng: 108.22,
        valid: true,
      }),
    );
    expect(rows[1].valid).toBe(false);
    expect(rows[1].errors).toContain("Name is required.");
  });

  it("detects duplicate codes inside an import file", () => {
    const rows = normalizeImportRows([
      { code: "DN-001", name: "A", centroidLat: 16, centroidLng: 108 },
      { code: "DN-001", name: "B", centroidLat: 16.1, centroidLng: 108.1 },
    ]);

    expect(detectDuplicateCodes(rows)).toEqual(["DN-001"]);
    expect(rows.every((row) => row.valid)).toBe(false);
  });

  it("normalizes GeoJSON features into import rows", () => {
    const rows = rowsFromGeoJson({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { code: "DN-GEO-1", name: "Geo Asset" },
          geometry: { type: "Point", coordinates: [108.22, 16.07] },
        },
      ],
    });

    expect(rows[0]).toEqual(
      expect.objectContaining({
        code: "DN-GEO-1",
        name: "Geo Asset",
        centroidLat: 16.07,
        centroidLng: 108.22,
        valid: true,
      }),
    );
  });

  it("builds template, CSV, and GeoJSON exports", () => {
    const rows = [{ code: "DN-001", name: "Asset", status: "ACTIVE", centroidLat: 16, centroidLng: 108 }];

    const templateCsv = buildImportTemplateCsv();
    const exportCsv = assetRowsToCsv(rows);

    expect(templateCsv.startsWith("\uFEFF")).toBe(true);
    expect(templateCsv).toContain("code,name,addressLine");
    expect(exportCsv.startsWith("\uFEFF")).toBe(true);
    expect(exportCsv).toContain("DN-001");
    expect(assetRowsToGeoJson(rows).features[0]).toEqual(
      expect.objectContaining({
        type: "Feature",
        geometry: { type: "Point", coordinates: [108, 16] },
      }),
    );
  });
});
