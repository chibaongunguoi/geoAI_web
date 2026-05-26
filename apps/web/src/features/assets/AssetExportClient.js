"use client";

import { useState } from "react";
import { PropertyFilterControls } from "@/features/filters/PropertyFilterControls";
import { normalizeAssetFilters, STATUS_OPTIONS, PROPERTY_TYPE_OPTIONS } from "@/features/filters/filter-state";
import {
  assetRowsToCsv,
  assetRowsToGeoJson,
  assetRowsToShapefileBlob,
  assetRowsToWorkbook,
  downloadBlob,
  exportQueryString,
} from "./import-export-state";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AssetExportClient({ initialFilters, canExport, lastFormat, onExportSuccess, recordActivity }) {
  const [filters, setFilters] = useState(() => normalizeAssetFilters(initialFilters || {}));
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

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
      onExportSuccess(format, assets.length);
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
    <>
      {status ? <p className="dashboard-error" role="status">{status}</p> : null}
      {!canExport ? <p className="dashboard-empty">Cần có quyền xuất dữ liệu để thực hiện.</p> : null}

      <section className="import-export-panel" aria-label="Export controls">
        <h2>Xuất dữ liệu theo bộ lọc</h2>
        <div className="dashboard-filter-grid">
          <PropertyFilterControls 
            filters={filters} 
            updateFilter={updateFilter} 
            showSearch={true} 
            showDateRange={false} 
          />
        </div>
        <div className="import-export-actions">
          <button type="button" disabled={!canExport || loading} onClick={() => exportAssets("csv")}>Xuất CSV</button>
          <button type="button" disabled={!canExport || loading} onClick={() => exportAssets("xlsx")}>Xuất Excel</button>
          <button type="button" disabled={!canExport || loading} onClick={() => exportAssets("geojson")}>Xuất GeoJSON</button>
          <button type="button" disabled={!canExport || loading} onClick={() => exportAssets("shapefile")}>Xuất Shapefile</button>
        </div>
        <p className="dashboard-muted">Định dạng gần nhất: {lastFormat || "csv"}</p>
      </section>
    </>
  );
}
