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

const DISTRICT_OPTIONS = [
  "Hai Chau",
  "Thanh Khe",
  "Son Tra",
  "Ngu Hanh Son",
  "Lien Chieu",
  "Cam Le",
  "Hoa Vang"
];

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
    <section className="filter-panel" aria-label="Advanced filters">
      {!canUseFilters ? (
        <p className="filter-alert" role="alert">
          You do not have permission to use filters.
        </p>
      ) : null}

      <div className="filter-summary">
        <span>{resultCount === undefined || resultCount === null ? "No result count" : `${resultCount} results`}</span>
        <span>{activeFilterCount(draft)} active filters</span>
      </div>

      {warning ? (
        <p className="filter-alert" role="status">
          {warning}
        </p>
      ) : null}

      <div className="filter-grid">
        <label>
          Status
          <select
            value={draft.status}
            disabled={!canUseFilters}
            onChange={(event) => updateDraft({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Type
          <select
            value={draft.propertyType}
            disabled={!canUseFilters}
            onChange={(event) => updateDraft({ propertyType: event.target.value })}
          >
            <option value="">All types</option>
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          District
          <input
            list="filter-district-options"
            value={draft.district}
            disabled={!canUseFilters}
            onChange={(event) => updateDraft({ district: event.target.value })}
          />
          <datalist id="filter-district-options">
            {DISTRICT_OPTIONS.map((district) => (
              <option key={district} value={district} />
            ))}
          </datalist>
        </label>

        <label>
          Ward
          <input
            value={draft.ward}
            disabled={!canUseFilters}
            onChange={(event) => updateDraft({ ward: event.target.value })}
          />
        </label>

        <label>
          Updated from
          <input
            type="date"
            value={draft.updatedFrom}
            disabled={!canUseFilters}
            onChange={(event) => updateDraft({ updatedFrom: event.target.value })}
          />
        </label>

        <label>
          Updated to
          <input
            type="date"
            value={draft.updatedTo}
            disabled={!canUseFilters}
            onChange={(event) => updateDraft({ updatedTo: event.target.value })}
          />
        </label>
      </div>

      <div className="filter-chip-row" aria-label="Quick filters">
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
          Apply filters
        </button>
        <button
          type="button"
          disabled={!canUseFilters}
          onClick={() => apply(DEFAULT_ASSET_FILTERS, "filters.reset")}
        >
          Reset filters
        </button>
        <button
          type="button"
          disabled={!canUseFilters}
          onClick={onExport}
        >
          Export filtered data
        </button>
      </div>

      <div className="filter-presets">
        <label>
          Preset name
          <input
            value={presetName}
            disabled={!canUseFilters}
            onChange={(event) => setPresetName(event.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!canUseFilters || !presetName.trim()}
          onClick={() => {
            onSavePreset?.(presetName.trim(), draft);
            setPresetName("");
          }}
        >
          Save preset
        </button>
        <label>
          Saved presets
          <select
            value=""
            disabled={!canUseFilters || presets.length === 0}
            onChange={(event) => {
              const preset = presets.find((item) => item.name === event.target.value);
              if (preset) apply(preset.filters, "filters.preset.load");
            }}
          >
            <option value="">Choose preset</option>
            {presets.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {history.length > 0 ? (
        <div className="filter-history" aria-label="Filter history">
          <h3>Filter history</h3>
          <ul>
            {history.slice(0, 5).map((item) => (
              <li key={item.id || item.createdAt}>
                <span>{item.action}</span>
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
