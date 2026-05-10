"use client";

import { useState } from "react";

const EMPTY_POINT = { lat: "", lng: "" };

export function SpatialDrawToolbar({
  canDraw = false,
  state,
  result,
  history = [],
  status,
  onModeChange,
  onUndo,
  onRedo,
  onSaveDraft,
  onCancel,
  onExport,
  onToggleSnap,
  onAddCoordinate,
  onUpdateCoordinate,
  onDeleteVertex,
  onSelectVertex,
  onAttributesChange,
  onDuplicateLatest,
}) {
  const [manualPoint, setManualPoint] = useState(EMPTY_POINT);
  const disabled = !canDraw;
  const mode = state?.mode || "idle";
  const coordinates = Array.isArray(state?.coordinates) ? state.coordinates : [];
  const selectedVertexIndex = state?.selectedVertexIndex ?? null;
  const message = status || result?.error;

  const submitManualPoint = () => {
    const lat = Number(manualPoint.lat);
    const lng = Number(manualPoint.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    onAddCoordinate?.({ lat, lng });
    setManualPoint(EMPTY_POINT);
  };

  return (
    <div className="spatial-draw-toolbar">
      <div className="spatial-draw-mode-grid" aria-label="Spatial draw mode">
        {[
          ["point", "Point"],
          ["line", "Line"],
          ["polygon", "Polygon"],
          ["edit", "Select/Edit"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={mode === value ? "active" : ""}
            disabled={disabled}
            onClick={() => onModeChange?.(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="spatial-draw-summary" aria-live="polite">
        <span>Draft</span>
        <strong>{result?.formattedType || "No draft"}</strong>
        <small>
          {coordinates.length} coordinate{coordinates.length === 1 ? "" : "s"}
          {state?.hasUnsavedChanges ? " | unsaved" : ""}
        </small>
      </div>

      {message ? <p className="spatial-draw-alert">{message}</p> : null}

      <label className="spatial-draw-toggle">
        <input
          type="checkbox"
          checked={state?.snapEnabled !== false}
          disabled={disabled}
          onChange={(event) => onToggleSnap?.(event.target.checked)}
        />
        Snap to visible assets
      </label>

      <div className="spatial-draw-field-grid">
        <label>
          Name
          <input
            type="text"
            value={state?.attributes?.name || ""}
            disabled={disabled}
            onChange={(event) =>
              onAttributesChange?.({ ...state?.attributes, name: event.target.value })
            }
          />
        </label>
        <label>
          Type
          <input
            type="text"
            value={state?.attributes?.type || ""}
            disabled={disabled}
            onChange={(event) =>
              onAttributesChange?.({ ...state?.attributes, type: event.target.value })
            }
          />
        </label>
        <label>
          Description
          <textarea
            rows={2}
            value={state?.attributes?.description || ""}
            disabled={disabled}
            onChange={(event) =>
              onAttributesChange?.({ ...state?.attributes, description: event.target.value })
            }
          />
        </label>
      </div>

      <div className="spatial-draw-coordinate-form">
        <label>
          Latitude
          <input
            type="number"
            step="0.000001"
            value={manualPoint.lat}
            disabled={disabled}
            onChange={(event) => setManualPoint((current) => ({ ...current, lat: event.target.value }))}
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            step="0.000001"
            value={manualPoint.lng}
            disabled={disabled}
            onChange={(event) => setManualPoint((current) => ({ ...current, lng: event.target.value }))}
          />
        </label>
        <button type="button" disabled={disabled} onClick={submitManualPoint}>
          Add coordinate
        </button>
      </div>

      {coordinates.length > 0 ? (
        <ol className="spatial-draw-vertices" aria-label="Spatial draw vertices">
          {coordinates.map((point, index) => (
            <li key={`${index}-${point.lat}-${point.lng}`}>
              <button
                type="button"
                className={selectedVertexIndex === index ? "active" : ""}
                disabled={disabled}
                onClick={() => onSelectVertex?.(index)}
              >
                Vertex {index + 1}
              </button>
              <input
                aria-label={`Vertex ${index + 1} latitude`}
                type="number"
                step="0.000001"
                value={point.lat}
                disabled={disabled}
                onChange={(event) =>
                  onUpdateCoordinate?.(index, { lat: Number(event.target.value), lng: point.lng })
                }
              />
              <input
                aria-label={`Vertex ${index + 1} longitude`}
                type="number"
                step="0.000001"
                value={point.lng}
                disabled={disabled}
                onChange={(event) =>
                  onUpdateCoordinate?.(index, { lat: point.lat, lng: Number(event.target.value) })
                }
              />
            </li>
          ))}
        </ol>
      ) : null}

      <div className="spatial-draw-action-grid">
        <button type="button" disabled={disabled || state?.past?.length === 0} onClick={onUndo}>
          Undo
        </button>
        <button type="button" disabled={disabled || state?.future?.length === 0} onClick={onRedo}>
          Redo
        </button>
        <button
          type="button"
          disabled={disabled || selectedVertexIndex === null}
          onClick={() => onDeleteVertex?.(selectedVertexIndex)}
        >
          Delete selected
        </button>
        <button type="button" disabled={disabled} onClick={onDuplicateLatest}>
          Copy latest
        </button>
        <button type="button" disabled={disabled || Boolean(result?.error)} onClick={onSaveDraft}>
          Save Draft
        </button>
        <button type="button" disabled={disabled || coordinates.length === 0} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" disabled={disabled || Boolean(result?.error)} onClick={onExport}>
          Export GeoJSON
        </button>
      </div>

      {history.length > 0 ? (
        <ol className="spatial-draw-history" aria-label="Spatial draw history">
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

export default SpatialDrawToolbar;
