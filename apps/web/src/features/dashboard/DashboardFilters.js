"use client";

import { useState } from "react";

export default function DashboardFilters({
  filters,
  canExport = false,
  autoRefresh = false,
  lastRefreshedAt,
  onApply,
  onReset,
  onRefresh,
  onExportJson,
  onExportCsv,
  onViewMap,
  onAutoRefreshChange
}) {
  const [draft, setDraft] = useState(filters || {});
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="dashboard-controls" aria-label="Dashboard controls">
      <div className="dashboard-filter-grid">
        <label>
          Status
          <select value={draft.status || ""} onChange={(event) => update("status", event.target.value)}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="REVIEW">Review</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label>
          Type
          <select value={draft.propertyType || ""} onChange={(event) => update("propertyType", event.target.value)}>
            <option value="">All</option>
            <option value="building">Building</option>
          </select>
        </label>
        <label>
          District
          <input value={draft.district || ""} onChange={(event) => update("district", event.target.value)} />
        </label>
        <label>
          Ward
          <input value={draft.ward || ""} onChange={(event) => update("ward", event.target.value)} />
        </label>
        <label>
          Updated from
          <input type="date" value={draft.updatedFrom || ""} onChange={(event) => update("updatedFrom", event.target.value)} />
        </label>
        <label>
          Updated to
          <input type="date" value={draft.updatedTo || ""} onChange={(event) => update("updatedTo", event.target.value)} />
        </label>
      </div>

      <div className="dashboard-action-grid">
        <button type="button" onClick={() => onApply?.(draft)}>Apply</button>
        <button type="button" onClick={onReset}>Reset</button>
        <button type="button" onClick={onRefresh}>Refresh</button>
        <button type="button" disabled={!canExport} onClick={onExportJson}>Export JSON</button>
        <button type="button" disabled={!canExport} onClick={onExportCsv}>Export CSV</button>
        <button type="button" onClick={onViewMap}>View on map</button>
      </div>

      <label className="dashboard-auto-refresh">
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={(event) => onAutoRefreshChange?.(event.target.checked)}
        />
        Auto refresh
      </label>
      {lastRefreshedAt ? <p className="dashboard-muted">Last refreshed: {new Date(lastRefreshedAt).toLocaleString()}</p> : null}
    </section>
  );
}
