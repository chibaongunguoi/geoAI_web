"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ASSET_FILTERS,
  PROPERTY_TYPE_OPTIONS,
  STATUS_OPTIONS,
  activeFilterCount,
  filterWarning,
  normalizeAssetFilters
} from "./filter-state";
import { DISTRICTS, getWardsForDistrict } from "./district-ward-data";

const FILTER_ACTION_LABELS = {
  "filters.apply": "Áp dụng bộ lọc",
  "filters.reset": "Đặt lại bộ lọc",
  "filters.quick.status": "Lọc nhanh theo trạng thái",
  "filters.quick.type": "Lọc nhanh theo loại",
  "filters.preset.save": "Lưu bộ lọc",
  "filters.preset.load": "Dùng bộ lọc đã lưu",
  "filters.export": "Xuất dữ liệu đã lọc"
};

export default function FilterPanel({
  filters,
  resultCount,
  presets = [],
  history = [],
  canUseFilters = false,
  onApply,
  onSavePreset,
  onExport
}) {
  const [draft, setDraft] = useState(() => normalizeAssetFilters(filters));
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    setDraft(normalizeAssetFilters(filters));
  }, [filters]);

  const warning = useMemo(
    () => filterWarning(draft, resultCount),
    [draft, resultCount]
  );

  const updateDraft = (patch) => {
    setDraft((current) => normalizeAssetFilters({ ...current, ...patch }));
  };

  const apply = (nextFilters, action = "filters.apply") => {
    onApply?.(normalizeAssetFilters(nextFilters), action);
  };

  return (
    <section className="filter-panel" aria-label="Bộ lọc nâng cao">
      {!canUseFilters ? (
        <p className="filter-alert" role="alert">
          Bạn không có quyền dùng bộ lọc.
        </p>
      ) : null}

      <div className="filter-summary">
        <span>
          {resultCount === undefined || resultCount === null
            ? "Chưa có số lượng kết quả"
            : `${resultCount.toLocaleString("vi-VN")} kết quả`}
        </span>
        <span>{activeFilterCount(draft)} điều kiện đang bật</span>
      </div>

      {warning ? (
        <p className="filter-alert" role="status">
          {warning}
        </p>
      ) : null}

      <div className="filter-grid">
        <label>
          Trạng thái
          <select
            value={draft.status}
            disabled={!canUseFilters}
            onChange={(event) => updateDraft({ status: event.target.value })}
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Loại tài sản
          <select
            value={draft.propertyType}
            disabled={!canUseFilters}
            onChange={(event) => updateDraft({ propertyType: event.target.value })}
          >
            <option value="">Tất cả loại</option>
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Quận/huyện
          <select
            value={draft.district}
            disabled={!canUseFilters}
            onChange={(event) => {
              const newDistrict = event.target.value;
              updateDraft({ district: newDistrict, ward: "" });
            }}
          >
            <option value="">Tất cả quận/huyện</option>
            {DISTRICTS.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </label>

        <label>
          Phường/xã
          <select
            value={draft.ward}
            disabled={!canUseFilters || !draft.district}
            onChange={(event) => updateDraft({ ward: event.target.value })}
          >
            <option value="">
              {draft.district ? "Tất cả phường/xã" : "Chọn quận/huyện trước"}
            </option>
            {getWardsForDistrict(draft.district).map((ward) => (
              <option key={ward} value={ward}>
                {ward}
              </option>
            ))}
          </select>
        </label>

        <label>
          Cập nhật từ ngày
          <input
            type="date"
            value={draft.updatedFrom}
            disabled={!canUseFilters}
            onChange={(event) => updateDraft({ updatedFrom: event.target.value })}
          />
        </label>

        <label>
          Cập nhật đến ngày
          <input
            type="date"
            value={draft.updatedTo}
            disabled={!canUseFilters}
            onChange={(event) => updateDraft({ updatedTo: event.target.value })}
          />
        </label>
      </div>

      <div className="filter-chip-row" aria-label="Lọc nhanh">
        {STATUS_OPTIONS.slice(0, 3).map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={!canUseFilters}
            onClick={() => apply({ ...draft, status: option.value }, "filters.quick.status")}
          >
            {option.label}
          </button>
        ))}
        {PROPERTY_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={!canUseFilters}
            onClick={() => apply({ ...draft, propertyType: option.value }, "filters.quick.type")}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="filter-actions">
        <button
          type="button"
          disabled={!canUseFilters}
          onClick={() => apply(draft, "filters.apply")}
        >
          Áp dụng
        </button>
        <button
          type="button"
          disabled={!canUseFilters}
          onClick={() => apply(DEFAULT_ASSET_FILTERS, "filters.reset")}
        >
          Đặt lại
        </button>
        <button
          type="button"
          disabled={!canUseFilters}
          onClick={onExport}
        >
          Xuất dữ liệu đã lọc
        </button>
      </div>

      <div className="filter-presets">
        <label>
          Tên bộ lọc đã lưu
          <input
            value={presetName}
            disabled={!canUseFilters}
            placeholder="Ví dụ: Nhà đang hoạt động ở Liên Chiểu"
            onChange={(event) => setPresetName(event.target.value)}
          />
        </label>
        <p className="filter-alert">
          Bộ lọc đã lưu giúp lưu các điều kiện hiện tại để dùng lại sau.
        </p>
        <button
          type="button"
          disabled={!canUseFilters || !presetName.trim()}
          onClick={() => {
            onSavePreset?.(presetName.trim(), draft);
            setPresetName("");
          }}
        >
          Lưu bộ lọc
        </button>
        <label>
          Dùng bộ lọc đã lưu
          <select
            value=""
            disabled={!canUseFilters || presets.length === 0}
            onChange={(event) => {
              const preset = presets.find((item) => item.name === event.target.value);
              if (preset) apply(preset.filters, "filters.preset.load");
            }}
          >
            <option value="">Chọn bộ lọc đã lưu</option>
            {presets.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {history.length > 0 ? (
        <div className="filter-history" aria-label="Lịch sử bộ lọc">
          <h3>Lịch sử bộ lọc</h3>
          <ul>
            {history.slice(0, 5).map((item) => (
              <li key={item.id || item.createdAt}>
                <span>{FILTER_ACTION_LABELS[item.action] || item.action}</span>
                {item.createdAt ? (
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </time>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
