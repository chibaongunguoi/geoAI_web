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
  const summary = result?.formattedValue || "No measurement";
  const message = status || result?.error;

  return (
    <div className="measurement-toolbar">
      <div className="measurement-mode-grid" aria-label="Measurement mode">
        <button
          type="button"
          className={mode === "distance" ? "active" : ""}
          disabled={disabled}
          onClick={() => onModeChange?.("distance")}
        >
          Distance
        </button>
        <button
          type="button"
          className={mode === "area" ? "active" : ""}
          disabled={disabled}
          onClick={() => onModeChange?.("area")}
        >
          Area
        </button>
        <button
          type="button"
          className={mode === "idle" ? "active" : ""}
          disabled={disabled}
          onClick={() => onModeChange?.("idle")}
        >
          Idle
        </button>
      </div>

      <div className="measurement-summary" aria-live="polite">
        <span>Result</span>
        <strong>{summary}</strong>
        <small>{pointCount} point{pointCount === 1 ? "" : "s"}</small>
      </div>

      {message ? <p className="measurement-alert">{message}</p> : null}

      <label className="measurement-toggle">
        <input
          type="checkbox"
          checked={state?.snapEnabled !== false}
          disabled={disabled}
          onChange={(event) => onToggleSnap?.(event.target.checked)}
        />
        Snap to visible assets
      </label>

      <div className="measurement-action-grid">
        <button type="button" disabled={disabled || pointCount === 0} onClick={onUndo}>
          Undo
        </button>
        <button type="button" disabled={disabled || pointCount === 0} onClick={onClear}>
          Clear
        </button>
        <button type="button" disabled={disabled || Boolean(result?.error)} onClick={onCopy}>
          Copy
        </button>
        <button type="button" disabled={disabled || Boolean(result?.error)} onClick={onSave}>
          Save
        </button>
        <button type="button" disabled={disabled || Boolean(result?.error)} onClick={onExport}>
          Export JSON
        </button>
      </div>

      {history.length > 0 ? (
        <ol className="measurement-history" aria-label="Measurement history">
          {history.slice(0, 4).map((item) => (
            <li key={`${item.createdAt}-${item.action}`}>
              <span>{item.action}</span>
              <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleTimeString()}</time>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export default MeasurementToolbar;
