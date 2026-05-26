"use client";

import { useState } from "react";
import { PropertyFilterControls } from "@/features/filters/PropertyFilterControls";

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
    <section className="dashboard-controls" aria-label="Bộ lọc bảng điều khiển">
      <div className="dashboard-filter-grid">
        <PropertyFilterControls 
          filters={draft} 
          updateFilter={update} 
          showDateRange={true} 
        />
      </div>

      <div className="dashboard-action-grid">
        <div className="dashboard-action-primary">
          <button type="button" onClick={() => onApply?.(draft)}>Áp dụng</button>
          <button type="button" onClick={onReset}>Đặt lại</button>
          <button type="button" onClick={onRefresh}>Làm mới</button>
        </div>
        <div className="dashboard-action-export">
          <button type="button" disabled={!canExport} onClick={onExportJson}>Xuất JSON</button>
          <button type="button" disabled={!canExport} onClick={onExportCsv}>Xuất CSV</button>
        </div>
        <div className="dashboard-action-nav">
          <button type="button" onClick={onViewMap}>Xem trên bản đồ</button>
        </div>
      </div>

      <label className="dashboard-auto-refresh">
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={(event) => onAutoRefreshChange?.(event.target.checked)}
        />
        Tự động làm mới
      </label>
      {lastRefreshedAt ? <p className="dashboard-muted">Cập nhật lần cuối: {new Date(lastRefreshedAt).toLocaleString("vi-VN")}</p> : null}
    </section>
  );
}
