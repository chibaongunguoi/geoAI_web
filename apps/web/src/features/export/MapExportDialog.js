"use client";

export default function MapExportDialog({
  canExport = false,
  canShare = false,
  metadata,
  templates = [],
  history = [],
  status,
  onMetadataChange,
  onExportPng,
  onExportPdf,
  onShare,
  onSaveTemplate,
  onLoadTemplate,
}) {
  const current = metadata || {};

  const update = (patch) => {
    onMetadataChange?.({ ...current, ...patch });
  };

  return (
    <div className="map-export-dialog">
      <div className="export-field-grid">
        <label>
          Tiêu đề
          <input
            value={current.title || ""}
            onChange={(event) => update({ title: event.target.value })}
          />
        </label>
        <label>
          Tổ chức
          <input
            value={current.organization || ""}
            onChange={(event) => update({ organization: event.target.value })}
          />
        </label>
        <label>
          Định dạng
          <select value={current.format || "png"} onChange={(event) => update({ format: event.target.value })}>
            <option value="png">PNG</option>
            <option value="pdf">PDF</option>
          </select>
        </label>
        <label>
          Khổ giấy
          <select value={current.paperSize || "A4"} onChange={(event) => update({ paperSize: event.target.value })}>
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
        </label>
        <label>
          Hướng giấy
          <select
            value={current.orientation || "landscape"}
            onChange={(event) => update({ orientation: event.target.value })}
          >
            <option value="landscape">Khổ ngang</option>
            <option value="portrait">Khổ dọc</option>
          </select>
        </label>
        <label>
          Hạn chia sẻ (giờ)
          <input
            type="number"
            min="1"
            max="720"
            value={current.shareExpiryHours || 72}
            onChange={(event) => update({ shareExpiryHours: event.target.value })}
          />
        </label>
      </div>

      <div className="export-toggle-grid">
        <label>
          <input
            type="checkbox"
            checked={current.includeLegend !== false}
            onChange={(event) => update({ includeLegend: event.target.checked })}
          />
          Chú giải
        </label>
        <label>
          <input
            type="checkbox"
            checked={current.includeScale !== false}
            onChange={(event) => update({ includeScale: event.target.checked })}
          />
          Tỉ lệ
        </label>
        <label>
          <input
            type="checkbox"
            checked={current.includeTimestamp !== false}
            onChange={(event) => update({ includeTimestamp: event.target.checked })}
          />
          Thời gian
        </label>
        <label>
          <input
            type="checkbox"
            checked={current.includeWatermark !== false}
            onChange={(event) => update({ includeWatermark: event.target.checked })}
          />
          Đóng dấu bản quyền
        </label>
      </div>

      <div className="export-action-grid">
        <button type="button" disabled={!canExport} onClick={onExportPng}>
          Xuất PNG
        </button>
        <button type="button" disabled={!canExport} onClick={onExportPdf}>
          Xuất PDF
        </button>
        <button type="button" disabled={!canShare} onClick={onShare}>
          Sao chép liên kết chia sẻ
        </button>
        <button type="button" disabled={!canExport} onClick={onSaveTemplate}>
          Lưu mẫu
        </button>
      </div>

      {templates.length > 0 ? (
        <div className="export-template-list" aria-label="Mẫu xuất">
          {templates.slice(0, 4).map((template) => (
            <button key={template.name} type="button" onClick={() => onLoadTemplate?.(template)}>
              {template.name}
            </button>
          ))}
        </div>
      ) : null}

      {status ? <p className="export-status">{status}</p> : null}

      {history.length > 0 ? (
        <ol className="export-history" aria-label="Lịch sử xuất">
          {history.slice(0, 4).map((item) => (
            <li key={item.id || `${item.createdAt}-${item.format}`}>
              <span>{item.format}</span>
              <span>{item.status}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
