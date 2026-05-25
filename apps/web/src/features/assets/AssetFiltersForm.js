"use client";

import { useMemo, useState } from "react";
import { PROPERTY_TYPE_OPTIONS, STATUS_OPTIONS } from "@/features/filters/filter-state";
import { DISTRICTS, getWardsForDistrict } from "@/features/filters/district-ward-data";

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Mới cập nhật" },
  { value: "code", label: "Mã tài sản" },
  { value: "name", label: "Tên tài sản" },
  { value: "status", label: "Trạng thái" }
];

export default function AssetFiltersForm({ filters, sort = "updatedAt" }) {
  const [district, setDistrict] = useState(filters?.district || "");
  const [ward, setWard] = useState(filters?.ward || "");
  const wards = useMemo(() => getWardsForDistrict(district), [district]);
  const wardOptions = ward && !wards.includes(ward) ? [ward, ...wards] : wards;

  return (
    <form className="asset-filter-panel" role="search">
      <label className="asset-filter-search">
        Tìm kiếm
        <input
          name="query"
          defaultValue={filters?.query || ""}
          placeholder="Tìm theo mã, tên, đường hoặc địa chỉ"
        />
      </label>
      <label>
        Trạng thái
        <select name="status" defaultValue={filters?.status || ""}>
          <option value="">Tất cả</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Loại tài sản
        <select name="propertyType" defaultValue={filters?.propertyType || ""}>
          <option value="">Tất cả</option>
          {PROPERTY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Quận/Huyện
        <select
          name="district"
          value={district}
          onChange={(event) => {
            setDistrict(event.target.value);
            setWard("");
          }}
        >
          <option value="">Tất cả</option>
          {DISTRICTS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        Phường/Xã
        <select
          name="ward"
          value={ward}
          onChange={(event) => setWard(event.target.value)}
          disabled={!district}
        >
          <option value="">Tất cả</option>
          {wardOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sắp xếp
        <select name="sort" defaultValue={sort}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="asset-filter-actions">
        <button className="primary-button" type="submit">
          Lọc
        </button>
        <a className="text-button" href="/assets">
          Xóa lọc
        </a>
      </div>
    </form>
  );
}
