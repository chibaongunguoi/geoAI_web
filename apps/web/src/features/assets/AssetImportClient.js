"use client";

import { useMemo, useRef, useState } from "react";
import {
  ASSET_IMPORT_FIELDS,
  buildImportTemplateCsv,
  downloadBlob,
  importRowsPayload,
  normalizeImportRows,
  parseCsvText,
  parseGeoJsonText,
  parseShapefileArrayBuffer,
  parseXlsxArrayBuffer,
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

export default function AssetImportClient({ canImport, onImportSuccess, recordActivity }) {
  const csvInputRef = useRef(null);
  const xlsxInputRef = useRef(null);
  const geoInputRef = useRef(null);
  const shpInputRef = useRef(null);

  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [rows, setRows] = useState([]);
  const [failedRows, setFailedRows] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

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
    recordActivity("preview", { format, rows: nextRows.length }, { format });
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
        recordActivity("preview", { format: "geojson", rows: parsed.length }, { format: "geojson" });
      } else if (format === "shapefile") {
        const parsed = await parseShapefileArrayBuffer(await file.arrayBuffer());
        setRawRows(parsed.map((row) => row.raw));
        setMapping({});
        setRows(parsed);
        recordActivity("preview", { format: "shapefile", rows: parsed.length }, { format: "shapefile" });
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
    recordActivity("mapping.change", { header, field });
  }

  async function confirmImport(targetRows = rows) {
    if (!canImport || targetRows.length === 0) return;
    const payloadRows = importRowsPayload(targetRows);
    if (payloadRows.length === 0) {
      setStatus("Không có dòng hợp lệ để nhập.");
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
      if (!response.ok) throw new Error(data?.message || "Nhập tài sản thất bại.");
      setFailedRows(Array.isArray(data.failedRows) ? data.failedRows : []);
      onImportSuccess(data);
      setStatus(`Đã nhập ${data.imported} dòng. ${data.skipped} dòng cần rà soát.`);
    } catch (error) {
      setStatus(error.message || "Nhập tài sản thất bại.");
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
    recordActivity("preview.cancel");
  }

  return (
    <>
      {status ? <p className="dashboard-error" role="status">{status}</p> : null}
      {!canImport ? <p className="dashboard-empty">Cần có quyền nhập tài sản và quản lý để thực hiện.</p> : null}

      <section className="import-export-panel" aria-label="Import controls">
        <h2>Nhập dữ liệu</h2>
        <div className="import-export-actions">
          <button type="button" disabled={!canImport || loading} onClick={() => csvInputRef.current?.click()}>Nhập CSV</button>
          <button type="button" disabled={!canImport || loading} onClick={() => xlsxInputRef.current?.click()}>Nhập Excel</button>
          <button type="button" disabled={!canImport || loading} onClick={() => geoInputRef.current?.click()}>Nhập GeoJSON</button>
          <button type="button" disabled={!canImport || loading} onClick={() => shpInputRef.current?.click()}>Nhập Shapefile</button>
          <button type="button" onClick={() => downloadBlob(buildImportTemplateCsv(), "geoai-asset-import-template.csv", "text/csv")}>Tải mẫu</button>
        </div>
        <input ref={csvInputRef} className="visually-hidden" aria-label="CSV file" type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event, "csv")} />
        <input ref={xlsxInputRef} className="visually-hidden" aria-label="Excel file" type="file" accept=".xlsx,.xls" onChange={(event) => handleFile(event, "xlsx")} />
        <input ref={geoInputRef} className="visually-hidden" aria-label="GeoJSON file" type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={(event) => handleFile(event, "geojson")} />
        <input ref={shpInputRef} className="visually-hidden" aria-label="Shapefile zip" type="file" accept=".zip,application/zip" onChange={(event) => handleFile(event, "shapefile")} />
      </section>

      {rows.length > 0 ? (
        <section className="import-export-panel" aria-label="Import preview">
          <div className="asset-page-heading">
            <h2>Xem trước và Ánh xạ</h2>
            <span>{validRows.length} hợp lệ · {invalidCount} không hợp lệ</span>
          </div>
          {Object.keys(mapping).length > 0 ? (
            <div className="import-mapping-grid">
              {Object.keys(mapping).map((header) => (
                <label key={header}>
                  {header}
                  <select value={mapping[header]} onChange={(event) => changeMapping(header, event.target.value)}>
                    <option value="">Tự động</option>
                    {ASSET_IMPORT_FIELDS.map((field) => <option key={field} value={field}>{field}</option>)}
                  </select>
                </label>
              ))}
            </div>
          ) : null}
          <div className="asset-list-table" role="table" aria-label="Import preview rows">
            <div className="asset-list-row asset-list-header" role="row">
              <span>Mã</span><span>Tên</span><span>Vị trí</span><span>Trạng thái</span><span>Kiểm tra</span>
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
            <button type="button" disabled={!canImport || validRows.length === 0 || loading} onClick={() => confirmImport()}>Xác nhận nhập</button>
            <button type="button" onClick={cancelPreview}>Hủy</button>
          </div>
        </section>
      ) : null}

      {failedRows.length > 0 ? (
        <section className="import-export-panel" aria-label="Failed rows">
          <h2>Dòng cần rà soát</h2>
          {failedRows.map((row) => (
            <p key={`${row.rowNumber}-${row.code}`} className="dashboard-error">{row.code || `Dòng ${row.rowNumber}`}: {row.errors.join(" ")}</p>
          ))}
          <button type="button" disabled={!canImport || loading} onClick={retryFailedRows}>Thử lại các dòng lỗi</button>
        </section>
      ) : null}
    </>
  );
}
