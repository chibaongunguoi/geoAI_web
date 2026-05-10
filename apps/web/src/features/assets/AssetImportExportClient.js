"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeAssetFilters, STATUS_OPTIONS, PROPERTY_TYPE_OPTIONS } from "@/features/filters/filter-state";
import {
  ASSET_IMPORT_FIELDS,
  addImportExportHistory,
  assetRowsToCsv,
  assetRowsToGeoJson,
  assetRowsToShapefileBlob,
  assetRowsToWorkbook,
  buildImportTemplateCsv,
  downloadBlob,
  exportQueryString,
  importRowsPayload,
  normalizeImportRows,
  parseCsvText,
  parseGeoJsonText,
  parseShapefileArrayBuffer,
  parseXlsxArrayBuffer,
  readImportExportState,
  writeImportExportState,
} from "./import-export-state";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusLabel(row) {
  if (row.valid) return "Valid";
  return row.errors.join(" ");
}

function initialMapping(rows) {
  const first = rows[0]?.raw || {};
  return Object.fromEntries(Object.keys(first).map((key) => [key, ""]));
}

export default function AssetImportExportClient({ initialFilters, canImport, canExport }) {
  const csvInputRef = useRef(null);
  const xlsxInputRef = useRef(null);
  const geoInputRef = useRef(null);
  const shpInputRef = useRef(null);

  const [filters, setFilters] = useState(() => normalizeAssetFilters(initialFilters || {}));
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [rows, setRows] = useState([]);
  const [failedRows, setFailedRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [lastConfig, setLastConfig] = useState({ format: "csv" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = readImportExportState(window.localStorage);
    setHistory(stored.history);
    setLogs(stored.logs);
    setLastConfig(stored.lastConfig);
  }, []);

  const persist = useCallback((nextHistory, nextLogs, nextConfig = lastConfig) => {
    writeImportExportState(window.localStorage, {
      history: nextHistory,
      logs: nextLogs,
      lastConfig: nextConfig,
    });
  }, [lastConfig]);

  const record = useCallback((action, detail = {}) => {
    setHistory((current) => {
      const next = addImportExportHistory(current, action, detail);
      persist(next, logs);
      return next;
    });
  }, [logs, persist]);

  const previewRows = useMemo(() => rows.slice(0, 10), [rows]);
  const validRows = useMemo(() => rows.filter((row) => row.valid), [rows]);
  const invalidCount = rows.length - validRows.length;

  function updateRawRows(nextRawRows, format) {
    const nextMapping = initialMapping(nextRawRows);
    const nextRows = normalizeImportRows(nextRawRows, nextMapping);
    setRawRows(nextRawRows);
    setMapping(nextMapping);
    setRows(nextRows);
    setFailedRows([]);
    setStatus(`${nextRows.length} rows ready for preview.`);
    const config = { format };
    setLastConfig(config);
    persist(history, logs, config);
    record("preview", { format, rows: nextRows.length });
  }

  async function handleFile(event, format) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLoading(true);
    setStatus("");
    try {
      if (format === "csv") {
        updateRawRows(parseCsvText(await file.text()), "csv");
      } else if (format === "xlsx") {
        updateRawRows(await parseXlsxArrayBuffer(await file.arrayBuffer()), "xlsx");
      } else if (format === "geojson") {
        const parsed = parseGeoJsonText(await file.text());
        setRawRows(parsed.map((row) => row.raw));
        setMapping({});
        setRows(parsed);
        record("preview", { format: "geojson", rows: parsed.length });
      } else if (format === "shapefile") {
        const parsed = await parseShapefileArrayBuffer(await file.arrayBuffer());
        setRawRows(parsed.map((row) => row.raw));
        setMapping({});
        setRows(parsed);
        record("preview", { format: "shapefile", rows: parsed.length });
      }
    } catch (error) {
      setStatus(error.message || "Import file could not be parsed.");
    } finally {
      setLoading(false);
    }
  }

  function changeMapping(header, field) {
    const nextMapping = { ...mapping, [header]: field };
    setMapping(nextMapping);
    setRows(normalizeImportRows(rawRows, nextMapping));
    record("mapping.change", { header, field });
  }

  async function confirmImport(targetRows = rows) {
    if (!canImport || targetRows.length === 0) return;
    const payloadRows = importRowsPayload(targetRows);
    if (payloadRows.length === 0) {
      setStatus("No valid rows to import.");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/properties/import/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payloadRows, sourceVersion: `admin-import-${today()}` }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Asset import failed.");
      setFailedRows(Array.isArray(data.failedRows) ? data.failedRows : []);
      const nextLogs = [
        { id: `${Date.now()}`, action: "import", status: "complete", imported: data.imported, skipped: data.skipped, createdAt: new Date().toISOString() },
        ...logs,
      ].slice(0, 30);
      setLogs(nextLogs);
      const nextHistory = addImportExportHistory(history, "import.confirm", { imported: data.imported, skipped: data.skipped });
      setHistory(nextHistory);
      persist(nextHistory, nextLogs);
      setStatus(`Imported ${data.imported} rows. ${data.skipped} rows need review.`);
    } catch (error) {
      setStatus(error.message || "Asset import failed.");
    } finally {
      setLoading(false);
    }
  }

  function retryFailedRows() {
    const retryRows = rows.filter((row) => failedRows.some((failed) => failed.code === row.code));
    confirmImport(retryRows);
  }

  function cancelPreview() {
    setRawRows([]);
    setRows([]);
    setFailedRows([]);
    setMapping({});
    setStatus("Import preview cancelled.");
    record("preview.cancel");
  }

  async function fetchExportRows() {
    const query = exportQueryString(filters);
    const response = await fetch(`/api/properties${query ? `?${query}` : ""}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Export query failed.");
    const data = await response.json();
    return Array.isArray(data?.items) ? data.items : [];
  }

  async function exportAssets(format) {
    if (!canExport) return;
    setLoading(true);
    setStatus("");
    try {
      const assets = await fetchExportRows();
      const name = `geoai-assets-${today()}`;
      if (format === "csv") {
        downloadBlob(assetRowsToCsv(assets), `${name}.csv`, "text/csv");
      } else if (format === "xlsx") {
        downloadBlob(await assetRowsToWorkbook(assets), `${name}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      } else if (format === "geojson") {
        downloadBlob(JSON.stringify(assetRowsToGeoJson(assets), null, 2), `${name}.geojson`, "application/geo+json");
      } else if (format === "shapefile") {
        downloadBlob(await assetRowsToShapefileBlob(assets), `${name}.zip`, "application/zip");
      }
      const nextLogs = [
        { id: `${Date.now()}`, action: `export.${format}`, status: "complete", exported: assets.length, createdAt: new Date().toISOString() },
        ...logs,
      ].slice(0, 30);
      setLogs(nextLogs);
      const nextHistory = addImportExportHistory(history, `export.${format}`, { rows: assets.length });
      setHistory(nextHistory);
      persist(nextHistory, nextLogs, { format });
      setLastConfig({ format });
      setStatus(`Exported ${assets.length} assets.`);
    } catch (error) {
      setStatus(error.message || "Export failed.");
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(field, value) {
    setFilters((current) => normalizeAssetFilters({ ...current, [field]: value }));
  }

  return (
    <div className="import-export-page">
      <header className="dashboard-heading">
        <div>
          <p>Admin data exchange</p>
          <h1>Asset import/export</h1>
        </div>
        {loading ? <span className="dashboard-pill">Working</span> : null}
      </header>

      {status ? <p className="dashboard-error" role="status">{status}</p> : null}
      {!canImport ? <p className="dashboard-empty">Import requires asset import and property management permissions.</p> : null}
      {!canExport ? <p className="dashboard-empty">Export requires export permission.</p> : null}

      <section className="import-export-panel" aria-label="Import controls">
        <h2>Import assets</h2>
        <div className="import-export-actions">
          <button type="button" disabled={!canImport} onClick={() => csvInputRef.current?.click()}>Import CSV</button>
          <button type="button" disabled={!canImport} onClick={() => xlsxInputRef.current?.click()}>Import Excel</button>
          <button type="button" disabled={!canImport} onClick={() => geoInputRef.current?.click()}>Import GeoJSON</button>
          <button type="button" disabled={!canImport} onClick={() => shpInputRef.current?.click()}>Import Shapefile</button>
          <button type="button" onClick={() => downloadBlob(buildImportTemplateCsv(), "geoai-asset-import-template.csv", "text/csv")}>Download Template</button>
        </div>
        <input ref={csvInputRef} className="visually-hidden" aria-label="CSV file" type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event, "csv")} />
        <input ref={xlsxInputRef} className="visually-hidden" aria-label="Excel file" type="file" accept=".xlsx,.xls" onChange={(event) => handleFile(event, "xlsx")} />
        <input ref={geoInputRef} className="visually-hidden" aria-label="GeoJSON file" type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={(event) => handleFile(event, "geojson")} />
        <input ref={shpInputRef} className="visually-hidden" aria-label="Shapefile zip" type="file" accept=".zip,application/zip" onChange={(event) => handleFile(event, "shapefile")} />
      </section>

      {rows.length > 0 ? (
        <section className="import-export-panel" aria-label="Import preview">
          <div className="asset-page-heading">
            <h2>Preview and mapping</h2>
            <span>{validRows.length} valid · {invalidCount} invalid</span>
          </div>
          {Object.keys(mapping).length > 0 ? (
            <div className="import-mapping-grid">
              {Object.keys(mapping).map((header) => (
                <label key={header}>
                  {header}
                  <select value={mapping[header]} onChange={(event) => changeMapping(header, event.target.value)}>
                    <option value="">Auto</option>
                    {ASSET_IMPORT_FIELDS.map((field) => <option key={field} value={field}>{field}</option>)}
                  </select>
                </label>
              ))}
            </div>
          ) : null}
          <div className="asset-list-table" role="table" aria-label="Import preview rows">
            <div className="asset-list-row asset-list-header" role="row">
              <span>Code</span><span>Name</span><span>Location</span><span>Status</span><span>Validation</span>
            </div>
            {previewRows.map((row) => (
              <div className="asset-list-row" role="row" key={`${row.rowNumber}-${row.code}`}>
                <strong>{row.code || "-"}</strong>
                <span>{row.name || "-"}</span>
                <span>{[row.centroidLat, row.centroidLng].filter((value) => value !== undefined).join(", ") || "-"}</span>
                <span>{row.status || "-"}</span>
                <span className={row.valid ? "validation-ok" : "validation-error"}>{statusLabel(row)}</span>
              </div>
            ))}
          </div>
          <div className="import-export-actions">
            <button type="button" disabled={!canImport || validRows.length === 0 || loading} onClick={() => confirmImport()}>Confirm Import</button>
            <button type="button" onClick={cancelPreview}>Cancel</button>
          </div>
        </section>
      ) : null}

      {failedRows.length > 0 ? (
        <section className="import-export-panel" aria-label="Failed rows">
          <h2>Rows needing review</h2>
          {failedRows.map((row) => (
            <p key={`${row.rowNumber}-${row.code}`} className="dashboard-error">{row.code || `Row ${row.rowNumber}`}: {row.errors.join(" ")}</p>
          ))}
          <button type="button" disabled={!canImport || loading} onClick={retryFailedRows}>Retry Failed Rows</button>
        </section>
      ) : null}

      <section className="import-export-panel" aria-label="Export controls">
        <h2>Export current filters</h2>
        <div className="dashboard-filter-grid">
          <label>Search<input value={filters.query} onChange={(event) => updateFilter("query", event.target.value)} /></label>
          <label>Status<select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}><option value="">All</option>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>Type<select value={filters.propertyType} onChange={(event) => updateFilter("propertyType", event.target.value)}><option value="">All</option>{PROPERTY_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>District<input value={filters.district} onChange={(event) => updateFilter("district", event.target.value)} /></label>
          <label>Ward<input value={filters.ward} onChange={(event) => updateFilter("ward", event.target.value)} /></label>
        </div>
        <div className="import-export-actions">
          <button type="button" disabled={!canExport || loading} onClick={() => exportAssets("csv")}>Export CSV</button>
          <button type="button" disabled={!canExport || loading} onClick={() => exportAssets("xlsx")}>Export Excel</button>
          <button type="button" disabled={!canExport || loading} onClick={() => exportAssets("geojson")}>Export GeoJSON</button>
          <button type="button" disabled={!canExport || loading} onClick={() => exportAssets("shapefile")}>Export Shapefile</button>
        </div>
        <p className="dashboard-muted">Last format: {lastConfig.format || "csv"}</p>
      </section>

      <section className="dashboard-history" aria-label="Import export logs">
        <h2>Import/export logs</h2>
        {logs.length === 0 ? <p className="dashboard-muted">No import/export logs yet.</p> : null}
        <ol>
          {logs.slice(0, 6).map((log) => (
            <li key={log.id}><span>{log.action}</span><time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString()}</time></li>
          ))}
        </ol>
      </section>

      <section className="dashboard-history" aria-label="Import export history">
        <h2>Recent activity</h2>
        {history.length === 0 ? <p className="dashboard-muted">No local import/export operations yet.</p> : null}
        <ol>
          {history.slice(0, 6).map((item) => (
            <li key={item.id}><span>{item.action}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></li>
          ))}
        </ol>
      </section>
    </div>
  );
}
