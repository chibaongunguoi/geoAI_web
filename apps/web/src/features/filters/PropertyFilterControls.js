import React from "react";
import { STATUS_OPTIONS, PROPERTY_TYPE_OPTIONS } from "./filter-state";

export function PropertyFilterControls({ filters, updateFilter, showSearch = false, showDateRange = false }) {
  return (
    <>
      {showSearch && (
        <label>
          Tìm kiếm
          <input 
            value={filters.query || ""} 
            onChange={(event) => updateFilter("query", event.target.value)} 
          />
        </label>
      )}
      <label>
        Trạng thái
        <select 
          value={filters.status || ""} 
          onChange={(event) => updateFilter("status", event.target.value)}
        >
          <option value="">Tất cả</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        Loại
        <select 
          value={filters.propertyType || ""} 
          onChange={(event) => updateFilter("propertyType", event.target.value)}
        >
          <option value="">Tất cả</option>
          {PROPERTY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        Quận/huyện
        <input 
          value={filters.district || ""} 
          onChange={(event) => updateFilter("district", event.target.value)} 
        />
      </label>
      <label>
        Phường/xã
        <input 
          value={filters.ward || ""} 
          onChange={(event) => updateFilter("ward", event.target.value)} 
        />
      </label>
      {showDateRange && (
        <>
          <label>
            Từ ngày
            <input 
              type="date" 
              value={filters.updatedFrom || ""} 
              onChange={(event) => updateFilter("updatedFrom", event.target.value)} 
            />
          </label>
          <label>
            Đến ngày
            <input 
              type="date" 
              value={filters.updatedTo || ""} 
              onChange={(event) => updateFilter("updatedTo", event.target.value)} 
            />
          </label>
        </>
      )}
    </>
  );
}
