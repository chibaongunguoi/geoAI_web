import Papa from "papaparse";
import ExcelJS from "exceljs";
import { assetFilterQueryString, normalizeAssetFilters } from "@/features/filters/filter-state";

export const IMPORT_EXPORT_STORAGE_KEY = "geoai.assetImportExport.v1";

export const ASSET_IMPORT_FIELDS = [
  "code",
  "name",
  "addressLine",
  "street",
  "ward",
  "district",
  "city",
  "propertyType",
  "status",
  "sourceVersion",
  "level",
  "height",
  "floors",
  "areaSqm",
  "centroidLat",
  "centroidLng",
  "geometry",
];

const FIELD_ALIASES = {
  code: ["code", "asset code", "asset_code", "ma tai san", "mã tài sản"],
  name: ["name", "asset name", "asset_name", "ten tai san", "tên tài sản"],
  addressLine: ["address", "addressline", "address line", "dia chi", "địa chỉ"],
  street: ["street", "duong", "đường"],
  ward: ["ward", "phuong", "phường"],
  district: ["district", "quan", "quận"],
  city: ["city", "thanh pho", "thành phố"],
  propertyType: ["propertytype", "property type", "type", "loai", "loại"],
  status: ["status", "trang thai", "trạng thái"],
  sourceVersion: ["sourceversion", "source version", "version"],
  level: ["level", "cap", "cấp"],
  height: ["height", "chieu cao", "chiều cao"],
  floors: ["floors", "num_floors", "num floors", "so tang", "số tầng"],
  areaSqm: ["areasqm", "area_sqm", "area sqm", "dien tich", "diện tích"],
  centroidLat: ["centroidlat", "centroid lat", "latitude", "lat", "vi do", "vĩ độ"],
  centroidLng: ["centroidlng", "centroid lng", "longitude", "lng", "lon", "kinh do", "kinh độ"],
  geometry: ["geometry", "geojson"],
};

const ALIAS_TO_FIELD = new Map(
  Object.entries(FIELD_ALIASES).flatMap(([field, aliases]) =>
    aliases.map((alias) => [normalizeHeader(alias), field]),
  ),
);

function text(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function normalizeHeader(value) {
  return text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberOrUndefined(value) {
  const raw = text(value);
  if (!raw) return undefined;
  const number = Number(raw);
  return Number.isFinite(number) ? number : undefined;
}

function integerOrUndefined(value) {
  const number = numberOrUndefined(value);
  return number === undefined ? undefined : Math.trunc(number);
}

function parseGeometry(value) {
  if (!value) return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function pointFromGeometry(geometry) {
  if (geometry?.type === "Point" && Array.isArray(geometry.coordinates)) {
    const [lng, lat] = geometry.coordinates;
    return { centroidLat: numberOrUndefined(lat), centroidLng: numberOrUndefined(lng) };
  }
  if (geometry?.type === "Polygon" && Array.isArray(geometry.coordinates?.[0])) {
    const points = geometry.coordinates[0]
      .map(([lng, lat]) => ({ lng: Number(lng), lat: Number(lat) }))
      .filter((point) => Number.isFinite(point.lng) && Number.isFinite(point.lat));
    if (points.length === 0) return {};
    return {
      centroidLat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
      centroidLng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
    };
  }
  return {};
}

export function parseCsvText(content) {
  const result = Papa.parse(content || "", {
    header: true,
    skipEmptyLines: true,
    transform: (value) => text(value),
  });
  return Array.isArray(result.data) ? result.data : [];
}

export async function parseXlsxArrayBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const headers = [];
  worksheet.getRow(1).eachCell((cell, columnIndex) => {
    headers[columnIndex - 1] = text(cell.value);
  });
  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const item = {};
    headers.forEach((header, index) => {
      item[header] = text(row.getCell(index + 1).value);
    });
    rows.push(item);
  });
  return rows;
}

export function normalizeImportRows(rawRows = [], mapping = {}) {
  const rows = Array.isArray(rawRows) ? rawRows : [];
  const normalized = rows.map((raw, index) => {
    const source = raw && typeof raw === "object" ? raw : {};
    const row = { rowNumber: index + 2, raw: source, errors: [] };

    Object.entries(source).forEach(([header, value]) => {
      const field = mapping[header] || ALIAS_TO_FIELD.get(normalizeHeader(header));
      if (field && row[field] === undefined) row[field] = text(value);
    });

    row.code = text(row.code);
    row.name = text(row.name);
    row.status = text(row.status) || "ACTIVE";
    row.propertyType = text(row.propertyType) || "building";
    row.city = text(row.city) || "Da Nang";
    row.centroidLat = numberOrUndefined(row.centroidLat);
    row.centroidLng = numberOrUndefined(row.centroidLng);
    row.height = numberOrUndefined(row.height);
    row.level = numberOrUndefined(row.level);
    row.areaSqm = numberOrUndefined(row.areaSqm);
    row.floors = integerOrUndefined(row.floors);
    row.geometry = parseGeometry(row.geometry);

    const geometryPoint = pointFromGeometry(row.geometry);
    row.centroidLat ??= geometryPoint.centroidLat;
    row.centroidLng ??= geometryPoint.centroidLng;

    if (!row.code) row.errors.push("Code is required.");
    if (!row.name) row.errors.push("Name is required.");
    if (!Number.isFinite(row.centroidLat) || !Number.isFinite(row.centroidLng)) {
      row.errors.push("Latitude/longitude or valid geometry is required.");
    }

    row.valid = row.errors.length === 0;
    return row;
  });

  markDuplicateCodes(normalized);
  return normalized;
}

function markDuplicateCodes(rows) {
  const counts = new Map();
  rows.forEach((row) => {
    if (row.code) counts.set(row.code, (counts.get(row.code) || 0) + 1);
  });
  rows.forEach((row) => {
    if (row.code && counts.get(row.code) > 1 && !row.errors.includes("Duplicate code in file.")) {
      row.errors.push("Duplicate code in file.");
      row.valid = false;
    }
  });
}

export function detectDuplicateCodes(rows = []) {
  const seen = new Set();
  const duplicates = new Set();
  rows.forEach((row) => {
    if (!row?.code) return;
    if (seen.has(row.code)) duplicates.add(row.code);
    seen.add(row.code);
  });
  return [...duplicates];
}

export function rowsFromGeoJson(geojson) {
  const features = geojson?.type === "FeatureCollection" ? geojson.features : [geojson];
  return normalizeImportRows(
    (Array.isArray(features) ? features : []).map((feature) => {
      const props = feature?.properties || {};
      const geometry = feature?.geometry;
      const point = pointFromGeometry(geometry);
      return {
        ...props,
        geometry,
        centroidLat: props.centroidLat ?? point.centroidLat,
        centroidLng: props.centroidLng ?? point.centroidLng,
      };
    }),
  );
}

export function parseGeoJsonText(content) {
  return rowsFromGeoJson(JSON.parse(content));
}

export async function parseShapefileArrayBuffer(buffer) {
  const shp = await import("shpjs");
  const geojson = await (shp.default || shp)(buffer);
  return rowsFromGeoJson(geojson);
}

function exportValue(row, field) {
  if (field === "geometry" && row.geometry) return JSON.stringify(row.geometry);
  return row[field] ?? "";
}

export function buildImportTemplateCsv() {
  return [ASSET_IMPORT_FIELDS.join(","), "DN-BLD-000001,Sample asset,,,,Da Nang,building,ACTIVE,,,,,,16.07,108.22,"].join("\n");
}

export function assetRowsToCsv(rows = []) {
  const output = [ASSET_IMPORT_FIELDS];
  rows.forEach((row) => output.push(ASSET_IMPORT_FIELDS.map((field) => exportValue(row, field))));
  return Papa.unparse(output);
}

export async function assetRowsToWorkbook(rows = []) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Assets");
  worksheet.columns = ASSET_IMPORT_FIELDS.map((field) => ({ header: field, key: field }));
  rows.forEach((row) => {
    worksheet.addRow(Object.fromEntries(ASSET_IMPORT_FIELDS.map((field) => [field, exportValue(row, field)])));
  });
  return workbook.xlsx.writeBuffer();
}

export function assetRowsToGeoJson(rows = []) {
  return {
    type: "FeatureCollection",
    features: rows.map((row) => {
      const geometry =
        row.geometry ||
        (Number.isFinite(Number(row.centroidLat)) && Number.isFinite(Number(row.centroidLng))
          ? { type: "Point", coordinates: [Number(row.centroidLng), Number(row.centroidLat)] }
          : null);
      return {
        type: "Feature",
        properties: Object.fromEntries(
          ASSET_IMPORT_FIELDS.filter((field) => field !== "geometry").map((field) => [field, row[field] ?? ""]),
        ),
        geometry,
      };
    }),
  };
}

export async function assetRowsToShapefileBlob(rows = []) {
  const shpwrite = await import("@mapbox/shp-write");
  const zipData = await (shpwrite.default?.zip || shpwrite.zip)(assetRowsToGeoJson(rows));
  return zipData instanceof Blob ? zipData : new Blob([zipData], { type: "application/zip" });
}

export function importRowsPayload(rows = []) {
  return rows
    .filter((row) => row.valid)
    .map((row) =>
      Object.fromEntries(
        ASSET_IMPORT_FIELDS.filter((field) => row[field] !== undefined && row[field] !== "").map((field) => [
          field,
          row[field],
        ]),
      ),
    );
}

export function exportQueryString(filters = {}) {
  return assetFilterQueryString({ ...normalizeAssetFilters(filters), limit: 100 });
}

export function addImportExportHistory(history = [], action, detail = {}) {
  return [
    { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, action, detail, createdAt: new Date().toISOString() },
    ...(Array.isArray(history) ? history : []),
  ].slice(0, 30);
}

export function readImportExportState(storage) {
  if (!storage?.getItem) return { lastConfig: { format: "csv" }, history: [], logs: [] };
  try {
    const raw = storage.getItem(IMPORT_EXPORT_STORAGE_KEY);
    if (!raw) return { lastConfig: { format: "csv" }, history: [], logs: [] };
    const parsed = JSON.parse(raw);
    return {
      lastConfig: parsed.lastConfig && typeof parsed.lastConfig === "object" ? parsed.lastConfig : { format: "csv" },
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 30) : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 30) : [],
    };
  } catch {
    return { lastConfig: { format: "csv" }, history: [], logs: [] };
  }
}

export function writeImportExportState(storage, payload) {
  if (!storage?.setItem) return false;
  try {
    storage.setItem(
      IMPORT_EXPORT_STORAGE_KEY,
      JSON.stringify({
        lastConfig: payload?.lastConfig || { format: "csv" },
        history: Array.isArray(payload?.history) ? payload.history.slice(0, 30) : [],
        logs: Array.isArray(payload?.logs) ? payload.logs.slice(0, 30) : [],
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(content, filename, type = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
