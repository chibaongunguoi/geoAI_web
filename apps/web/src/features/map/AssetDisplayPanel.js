"use client";

import { POPUP_FIELD_CATALOG, popupFieldsForPermissions, userHasPermission } from "./assets";

export default function AssetDisplayPanel({
  config,
  permissions = [],
  status,
  error,
  history = [],
  visibleAssetCount = 0,
  onConfigChange,
  onExport
}) {
  const canExportAssets = userHasPermission(permissions, "assets.importExport");
  const availableFields = POPUP_FIELD_CATALOG.filter(
    (field) => !field.permission || userHasPermission(permissions, field.permission)
  );
  const selectedFields = popupFieldsForPermissions(config.popupFields, permissions);

  const updateConfig = (patch) => {
    onConfigChange({ ...config, ...patch });
  };

  const togglePopupField = (fieldId) => {
    const current = new Set(config.popupFields);
    if (current.has(fieldId)) {
      current.delete(fieldId);
    } else {
      current.add(fieldId);
    }
    updateConfig({ popupFields: [...current] });
  };

  return (
    <section className="asset-display-panel" aria-label="Hiển thị tài sản">
      <div className="asset-display-summary">
        <span>{visibleAssetCount} tài sản trong vùng xem</span>
        {status ? <span role="status">{status}</span> : null}
      </div>
      {error ? (
        <div className="layer-alerts" role="alert">
          {error}
        </div>
      ) : null}
      <label className="layer-search">
        Nhãn tài sản
        <select
          value={config.labelMode}
          onChange={(event) => updateConfig({ labelMode: event.target.value })}
        >
          <option value="off">Tắt nhãn</option>
          <option value="code">Mã tài sản</option>
          <option value="name">Tên tài sản</option>
        </select>
      </label>
      <label className="layer-search">
        Tô màu
        <select
          value={config.colorMode}
          onChange={(event) => updateConfig({ colorMode: event.target.value })}
        >
          <option value="type">Theo loại</option>
          <option value="priority">Theo mức ưu tiên</option>
        </select>
      </label>
      <fieldset className="asset-field-list">
        <legend>Trường popup</legend>
        {availableFields.map((field) => (
          <label key={field.id}>
            <input
              type="checkbox"
              checked={selectedFields.includes(field.id)}
              onChange={() => togglePopupField(field.id)}
            />
            {field.label}
          </label>
        ))}
      </fieldset>
      <button
        className="asset-export-button"
        type="button"
        disabled={!canExportAssets}
        onClick={onExport}
      >
        Xuất tài sản
      </button>
      {history.length > 0 ? (
        <div className="layer-history" aria-label="Lịch sử hiển thị tài sản">
          <h3>Lịch sử thao tác</h3>
          <ul>
            {history.map((item) => (
              <li key={item.id}>
                <span>{item.action}</span>
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </time>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
