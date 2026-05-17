"use client";

import AssetDisplayPanel from "@/features/map/AssetDisplayPanel";
import LayerPanel from "@/features/map/LayerPanel";
import FilterPanel from "@/features/filters/FilterPanel";
import MapExportDialog from "@/features/export/MapExportDialog";
import MeasurementToolbar from "@/features/measurement/MeasurementToolbar";
import SpatialDrawToolbar from "@/features/spatial-draw/SpatialDrawToolbar";

const TEXT = {
  area: "Khu v\u1ef1c",
  scanType: "Ki\u1ec3u qu\u00e9t",
  selectScanBox: "Ch\u1ecdn khung qu\u00e9t",
  scanning: "\u0110ang qu\u00e9t...",
  scanSelected: "Qu\u00e9t v\u00f9ng \u0111\u00e3 ch\u1ecdn",
  clearRegion: "X\u00f3a v\u00f9ng",
  exitFullscreen: "Tho\u00e1t to\u00e0n m\u00e0n h\u00ecnh",
  fullscreen: "To\u00e0n m\u00e0n h\u00ecnh",
  scanHint: "Di\u1ec7n t\u00edch qu\u00e9t h\u1ee3p l\u1ec7 t\u1ed1i \u0111a 25 ha.",
  source: "Ngu\u1ed3n"
};

export function ScanToolPanel({
  styles,
  adminOptions,
  scanModeOptions,
  adminArea,
  scanMode,
  selectedScanMode,
  rectangleCoords,
  isAnalyzing,
  isFullscreen,
  onAdminAreaChange,
  onScanModeChange,
  onRequestSelection,
  onRequestCapture,
  onClearWorkspace,
  onToggleFullscreen
}) {
  return (
    <div className={styles.toolPanelStack}>
      <div className={styles.compactControlGroup}>
        <label>
          {TEXT.area}
          <select
            className={styles.selectInput}
            value={adminArea}
            disabled={isAnalyzing}
            onChange={(event) => onAdminAreaChange(event.target.value)}
          >
            {adminOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {TEXT.scanType}
          <select
            className={styles.selectInput}
            value={scanMode}
            disabled={isAnalyzing}
            onChange={(event) => onScanModeChange(event.target.value)}
          >
            {scanModeOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.actionHint}>{selectedScanMode?.description}</p>
      </div>
      <div className={styles.actionGroup}>
        <button className={styles.secondaryAction} type="button" disabled={isAnalyzing} onClick={onRequestSelection}>
          {TEXT.selectScanBox}
        </button>
        <button className={styles.primaryAction} type="button" disabled={!rectangleCoords || isAnalyzing} onClick={onRequestCapture}>
          {isAnalyzing ? TEXT.scanning : TEXT.scanSelected}
        </button>
        <button
          className={styles.dangerAction}
          type="button"
          disabled={!rectangleCoords && !isAnalyzing}
          onClick={onClearWorkspace}
        >
          {TEXT.clearRegion}
        </button>
        <button className={styles.secondaryAction} type="button" onClick={onToggleFullscreen}>
          {isFullscreen ? TEXT.exitFullscreen : TEXT.fullscreen}
        </button>
      </div>
      {rectangleCoords ? (
        <div className={styles.coordinateList}>
          <span>NE {rectangleCoords.northEast[0].toFixed(5)}, {rectangleCoords.northEast[1].toFixed(5)}</span>
          <span>SW {rectangleCoords.southWest[0].toFixed(5)}, {rectangleCoords.southWest[1].toFixed(5)}</span>
        </div>
      ) : (
        <p className={styles.actionHint}>{TEXT.scanHint}</p>
      )}
    </div>
  );
}

export function BasemapToolPanel({ styles, basemaps, selectedBasemapId, selectedBasemap, onChange }) {
  return (
    <div className={styles.toolPanelStack}>
      <select className={styles.selectInput} value={selectedBasemapId} onChange={(event) => onChange(event.target.value)}>
        {basemaps.map((basemap) => (
          <option key={basemap.id} value={basemap.id}>
            {basemap.label}
          </option>
        ))}
      </select>
      <p className={styles.actionHint}>{selectedBasemap.description}</p>
      <dl className={styles.mapMetaList}>
        <div>
          <dt>{TEXT.source}</dt>
          <dd>{selectedBasemap.source}</dd>
        </div>
        <div>
          <dt>Zoom</dt>
          <dd>{selectedBasemap.minZoom}-{selectedBasemap.maxZoom}</dd>
        </div>
      </dl>
    </div>
  );
}

export function LayerToolPanel(props) {
  const { styles, status, ...panelProps } = props;
  return (
    <div className={styles.toolPanelStack}>
      <LayerPanel {...panelProps} />
      {status ? <p className={styles.actionHint} role="status">{status}</p> : null}
    </div>
  );
}

export function AssetDisplayToolPanel({ styles, ...panelProps }) {
  return (
    <div className={styles.toolPanelStack}>
      <AssetDisplayPanel {...panelProps} />
    </div>
  );
}

export function FilterToolPanel({ styles, status, ...panelProps }) {
  return (
    <div className={styles.toolPanelStack}>
      <FilterPanel {...panelProps} />
      {status ? <p className={styles.actionHint} role="status">{status}</p> : null}
    </div>
  );
}

export function MeasurementToolPanel({ styles, ...panelProps }) {
  return (
    <div className={styles.toolPanelStack}>
      <MeasurementToolbar {...panelProps} />
    </div>
  );
}

export function SpatialDrawToolPanel({ styles, ...panelProps }) {
  return (
    <div className={styles.toolPanelStack}>
      <SpatialDrawToolbar {...panelProps} />
    </div>
  );
}

export function ExportShareToolPanel({ styles, ...panelProps }) {
  return (
    <div className={styles.toolPanelStack}>
      <MapExportDialog {...panelProps} />
    </div>
  );
}
