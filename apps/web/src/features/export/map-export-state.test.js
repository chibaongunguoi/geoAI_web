import {
  DEFAULT_EXPORT_METADATA,
  addExportHistory,
  buildMapExportState,
  normalizeExportMetadata,
  readExportStorage,
  writeExportStorage,
} from "./map-export-state";

describe("map-export-state", () => {
  it("builds a normalized map export state", () => {
    const state = buildMapExportState({
      viewport: {
        center: { lat: 16.05, lng: 108.2 },
        zoom: 14,
        bounds: { west: 108.1, south: 16, east: 108.3, north: 16.1 },
      },
      basemap: { id: "satellite", label: "Satellite" },
      visibleLayers: ["sample-assets"],
      filters: { district: "Lien Chieu", status: "ACTIVE" },
      focusedProperty: { code: "DN-001", centroidLat: 16.05, centroidLng: 108.2 },
      measurement: { type: "distance", value: 123, formattedValue: "123 m" },
      metadata: { title: "Inspection map", format: "pdf", orientation: "landscape" },
    });

    expect(state).toEqual(
      expect.objectContaining({
        version: 1,
        viewport: expect.objectContaining({ zoom: 14 }),
        basemap: { id: "satellite", label: "Satellite" },
        visibleLayers: ["sample-assets"],
        filters: expect.objectContaining({ district: "Lien Chieu", status: "ACTIVE" }),
        selectedResult: expect.objectContaining({ code: "DN-001" }),
        measurement: expect.objectContaining({ type: "distance" }),
        metadata: expect.objectContaining({ title: "Inspection map", format: "pdf" }),
      }),
    );
  });

  it("normalizes metadata defaults and rejects unsupported options", () => {
    expect(normalizeExportMetadata({ format: "docx", paperSize: "A3", includeLegend: false })).toEqual(
      expect.objectContaining({
        ...DEFAULT_EXPORT_METADATA,
        includeLegend: false,
      }),
    );
    expect(normalizeExportMetadata({ title: "  My Map  ", format: "png" })).toEqual(
      expect.objectContaining({ title: "My Map", format: "png" }),
    );
  });

  it("persists templates and export history with fallback", () => {
    const storage = {
      data: {},
      getItem(key) {
        return this.data[key] ?? null;
      },
      setItem(key, value) {
        this.data[key] = value;
      },
    };
    const history = addExportHistory([], "png", { title: "Map" }, "success");

    expect(writeExportStorage(storage, { templates: [{ name: "Report", metadata: { title: "Report" } }], history })).toBe(
      true,
    );
    expect(readExportStorage(storage)).toEqual(
      expect.objectContaining({
        templates: expect.arrayContaining([expect.objectContaining({ name: "Report" })]),
        history: expect.arrayContaining([expect.objectContaining({ format: "png", status: "success" })]),
      }),
    );
    expect(writeExportStorage(null, { templates: [], history: [] })).toBe(false);
    expect(readExportStorage(null)).toEqual({ templates: [], history: [] });
  });
});
