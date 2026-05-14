"use client";

export function MeasurementToolbar({
  canMeasure = false,
  state,
  result,
  history = [],
  status,
  onModeChange,
  onUndo,
  onClear,
  onCopy,
  onSave,
  onExport,
  onToggleSnap,
}) {
  const disabled = !canMeasure;
  const mode = state?.mode || "idle";
  const pointCount = state?.points?.length || 0;
  const summary = result?.formattedValue || "Chưa có kết quả";
  const message = status || result?.error;
  const modeLabel = {
    distance: "Đang đo khoảng cách",
    area: "Đang đo diện tích",
    idle: "Đã tắt đo"
  }[mode] || "Đã tắt đo";
  const actionLabels = {
    "measurement.save": "Lưu phép đo",
    "measurement.copy": "Sao chép kết quả",
    "measurement.export": "Xuất JSON",
    "measurement.clear": "Xóa phép đo"
  };

  return (
    <div className="measurement-toolbar">
      <div className="measurement-mode-grid" aria-label="Chế độ đo">
        <button
          type="button"
          className={mode === "distance" ? "active" : ""}
          disabled={disabled}
          title="Bật chế độ đo khoảng cách, sau đó bấm các điểm trên bản đồ."
          onClick={() => onModeChange?.("distance")}
        >
          Đo khoảng cách
        </button>
        <button
          type="button"
          className={mode === "area" ? "active" : ""}
          disabled={disabled}
          title="Bật chế độ đo diện tích, sau đó bấm từ ba điểm trở lên trên bản đồ."
          onClick={() => onModeChange?.("area")}
        >
          Đo diện tích
        </button>
        <button
          type="button"
          className={mode === "idle" ? "active" : ""}
          disabled={disabled}
          title="Tắt chế độ đo để thao tác bản đồ bình thường."
          onClick={() => onModeChange?.("idle")}
        >
          Tắt đo
        </button>
      </div>

      <div className="measurement-summary" aria-live="polite">
        <span>{modeLabel}</span>
        <strong>{summary}</strong>
        <small>{pointCount} điểm đo</small>
      </div>

      {message ? <p className="measurement-alert">{message}</p> : null}

      <label className="measurement-toggle">
        <input
          type="checkbox"
          checked={state?.snapEnabled !== false}
          disabled={disabled}
          onChange={(event) => onToggleSnap?.(event.target.checked)}
        />
        Bám vào điểm tài sản đang hiển thị
      </label>

      <div className="measurement-action-grid">
        <button type="button" disabled={disabled || pointCount === 0} onClick={onUndo}>
          Hoàn tác
        </button>
        <button type="button" disabled={disabled || pointCount === 0} onClick={onClear}>
          Xóa
        </button>
        <button type="button" disabled={disabled || Boolean(result?.error)} onClick={onCopy}>
          Sao chép
        </button>
        <button type="button" disabled={disabled || Boolean(result?.error)} onClick={onSave}>
          Lưu
        </button>
        <button type="button" disabled={disabled || Boolean(result?.error)} onClick={onExport}>
          Xuất JSON
        </button>
      </div>

      {history.length > 0 ? (
        <ol className="measurement-history" aria-label="Lịch sử đo">
          {history.slice(0, 4).map((item, index) => (
            <li key={`${item.createdAt}-${item.action}-${index}`}>
              <span>{actionLabels[item.action] || item.action}</span>
              <time dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleTimeString("vi-VN")}
              </time>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export default MeasurementToolbar;
