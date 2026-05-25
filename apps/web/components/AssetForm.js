"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PROPERTY_TYPE_OPTIONS } from "@/features/filters/filter-state";
import { DISTRICTS, getWardsForDistrict } from "@/features/filters/district-ward-data";

const MiniMapPicker = dynamic(() => import("./MiniMapPicker"), { ssr: false });

const STATUS_OPTIONS = [
  ["ACTIVE", "Đang hoạt động"],
  ["INACTIVE", "Không hoạt động"],
  ["REVIEW", "Cần xem xét"],
  ["ARCHIVED", "Lưu trữ"]
];

function fieldValue(property, field, fallback = "") {
  return property?.[field] ?? fallback;
}

function parseNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cleanPayload(form) {
  const payload = {
    code: form.code.trim(),
    name: form.name.trim(),
    propertyType: form.propertyType.trim() || "building",
    status: form.status,
    addressLine: form.addressLine.trim(),
    street: form.street.trim(),
    ward: form.ward.trim(),
    district: form.district.trim(),
    city: form.city.trim() || "Da Nang",
    areaSqm: parseNumber(form.areaSqm),
    centroidLat: parseNumber(form.centroidLat),
    centroidLng: parseNumber(form.centroidLng)
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value !== undefined)
  );
}

export default function AssetForm({ mode = "create", property = null, onSaved }) {
  const [form, setForm] = useState({
    code: fieldValue(property, "code"),
    name: fieldValue(property, "name"),
    propertyType: fieldValue(property, "propertyType", "building"),
    status: fieldValue(property, "status", "ACTIVE"),
    addressLine: fieldValue(property, "addressLine"),
    street: fieldValue(property, "street"),
    ward: fieldValue(property, "ward"),
    district: fieldValue(property, "district"),
    city: fieldValue(property, "city", "Da Nang"),
    areaSqm: fieldValue(property, "areaSqm"),
    centroidLat: fieldValue(property, "centroidLat"),
    centroidLng: fieldValue(property, "centroidLng")
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = mode === "edit";
  const wards = getWardsForDistrict(form.district);
  const wardOptions = form.ward && !wards.includes(form.ward) ? [form.ward, ...wards] : wards;
  const propertyTypeOptions = form.propertyType && !PROPERTY_TYPE_OPTIONS.some((option) => option.value === form.propertyType)
    ? [{ value: form.propertyType, label: form.propertyType }, ...PROPERTY_TYPE_OPTIONS]
    : PROPERTY_TYPE_OPTIONS;

  function updateField(event) {
    if (event.target.name === "district") {
      setForm((current) => ({
        ...current,
        district: event.target.value,
        ward: ""
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function pickMapCenter(location) {
    setForm((current) => ({
      ...current,
      centroidLat: String(location.lat.toFixed(6)),
      centroidLng: String(location.lng.toFixed(6))
    }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const endpoint = isEdit ? `/api/properties/${encodeURIComponent(property.id)}` : "/api/properties";
      const response = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload(form))
      });

      if (!response.ok) {
        throw new Error("Không lưu được tài sản.");
      }

      const saved = await response.json();
      const identifier = saved.code || saved.id || form.code || property?.code || property?.id;
      const nextPath = `/assets/${encodeURIComponent(identifier)}`;
      if (onSaved) {
        onSaved(nextPath);
        return;
      }
      window.location.assign(nextPath);
    } catch (submitError) {
      setError(submitError.message);
      setSaving(false);
    }
  }

  return (
    <form className="asset-form" onSubmit={onSubmit}>
      <div className="asset-form-grid">
        <label>
          Mã tài sản
          <input name="code" value={form.code} onChange={updateField} required />
        </label>
        <label>
          Tên tài sản
          <input name="name" value={form.name} onChange={updateField} required />
        </label>
        <label>
          Loại
          <select name="propertyType" value={form.propertyType} onChange={updateField}>
            {propertyTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trạng thái
          <select name="status" value={form.status} onChange={updateField}>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="asset-form-wide">
          Địa chỉ
          <input name="addressLine" value={form.addressLine} onChange={updateField} />
        </label>
        <label>
          Đường
          <input name="street" value={form.street} onChange={updateField} />
        </label>
        <label>
          Phường
          <select name="ward" value={form.ward} onChange={updateField} disabled={!form.district}>
            <option value="">Tất cả</option>
            {wardOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quận
          <select name="district" value={form.district} onChange={updateField}>
            <option value="">Tất cả</option>
            {DISTRICTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Thành phố
          <input name="city" value={form.city} onChange={updateField} />
        </label>
        <label>
          Diện tích m2
          <input name="areaSqm" type="number" step="0.01" value={form.areaSqm} onChange={updateField} />
        </label>
        <label>
          Vĩ độ
          <input name="centroidLat" type="number" step="0.000001" value={form.centroidLat} onChange={updateField} />
        </label>
        <label>
          Kinh độ
          <input name="centroidLng" type="number" step="0.000001" value={form.centroidLng} onChange={updateField} />
        </label>
      </div>
      <div className="asset-form-map-section" style={{ gridColumn: "1 / -1", marginBottom: "1rem" }}>
        <p style={{ fontWeight: 500, marginBottom: "8px" }}>Chọn vị trí trên bản đồ</p>
        <MiniMapPicker 
          lat={form.centroidLat} 
          lng={form.centroidLng} 
          onLocationSelected={pickMapCenter} 
        />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={saving}>
        {isEdit ? "Cập nhật tài sản" : "Lưu tài sản"}
      </button>
    </form>
  );
}
