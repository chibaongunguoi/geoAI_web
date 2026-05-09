"use client";

import { useState } from "react";

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

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function pickMapCenter() {
    setForm((current) => ({
      ...current,
      centroidLat: current.centroidLat || "16.0471",
      centroidLng: current.centroidLng || "108.2068"
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
          <input name="propertyType" value={form.propertyType} onChange={updateField} />
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
          <input name="ward" value={form.ward} onChange={updateField} />
        </label>
        <label>
          Quận
          <input name="district" value={form.district} onChange={updateField} />
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
      <button className="asset-map-picker" type="button" onClick={pickMapCenter}>
        Chọn trên bản đồ
      </button>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={saving}>
        {isEdit ? "Cập nhật tài sản" : "Lưu tài sản"}
      </button>
    </form>
  );
}
