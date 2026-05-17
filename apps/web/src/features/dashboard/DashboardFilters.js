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
    <section className="dashboard-controls" aria-label="Bộ lọc bảng điều khiển">
      <div className="dashboard-filter-grid">
        <label>
          Trạng thái
          <select value={draft.status || ""} onChange={(event) => update("status", event.target.value)}>
            <option value="">Tất cả</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Không hoạt động</option>
            <option value="REVIEW">Cần xem xét</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
        </label>
        <label>
          Loại
          <select value={draft.propertyType || ""} onChange={(event) => update("propertyType", event.target.value)}>
            <option value="">Tất cả</option>
            <option value="building">Tòa nhà</option>
          </select>
        </label>
        <label>
          Quận/huyện
          <input value={draft.district || ""} onChange={(event) => update("district", event.target.value)} />
        </label>
        <label>
          Phường/xã
          <input value={draft.ward || ""} onChange={(event) => update("ward", event.target.value)} />
        </label>
        <label>
          Từ ngày
          <input type="date" value={draft.updatedFrom || ""} onChange={(event) => update("updatedFrom", event.target.value)} />
        </label>
        <label>
          Đến ngày
          <input type="date" value={draft.updatedTo || ""} onChange={(event) => update("updatedTo", event.target.value)} />
        </label>
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
