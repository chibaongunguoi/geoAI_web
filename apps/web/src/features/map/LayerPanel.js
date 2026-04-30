"use client";

import { useMemo, useState } from "react";
import { filterLayersByQuery, orderedLayers } from "./layers";

function LayerLegend({ legend }) {
  if (!legend?.length) {
    return null;
  }

  return (
    <div className="layer-legend">
      {legend.map((item) => (
        <span key={item.label}>
          <i style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export default function LayerPanel({
  layers,
  state,
  onToggle,
  onToggleGroup,
  onOpacityChange,
  onMove,
  onReorder,
  onRefresh = () => {},
  layerStatuses = {},
  canManage = true,
  history = [],
  onExport = () => {}
}) {
  const [query, setQuery] = useState("");
  const [dragLayerId, setDragLayerId] = useState(null);
  const displayLayers = useMemo(
    () => filterLayersByQuery(orderedLayers(layers, state), query),
    [layers, query, state]
  );
  const groups = useMemo(
    () =>
      [...new Set(layers.map((layer) => layer.group))].map((group) => {
        const groupLayers = layers.filter((layer) => layer.group === group);
        const visibleCount = groupLayers.filter((layer) => state.visible[layer.id]).length;

        return {
          name: group,
          visible: visibleCount > 0,
          summary: visibleCount > 0 ? "Đang chọn" : "Chọn"
        };
      }),
    [layers, state.visible]
  );
  const visibleErrors = displayLayers
    .filter((layer) => state.visible[layer.id] && layerStatuses[layer.id]?.state === "error")
    .map((layer) => ({
      id: layer.id,
      label: layer.label,
      message: layerStatuses[layer.id]?.message || "Lỗi lớp dữ liệu"
    }));

  return (
    <section className="layer-panel" aria-label="Lớp dữ liệu">
      <div className="layer-panel-heading">
        <h2>Lớp dữ liệu</h2>
        <span>{displayLayers.length}</span>
      </div>
      <div className="layer-panel-actions">
        <button type="button" disabled={!canManage} onClick={onExport}>
          Xuất cấu hình lớp
        </button>
      </div>
      {visibleErrors.length > 0 ? (
        <div className="layer-alerts" role="alert">
          {visibleErrors.map((error) => (
            <p key={error.id}>
              {error.label}: {error.message}
            </p>
          ))}
        </div>
      ) : null}
      <div className="layer-group-controls" aria-label="Nhóm lớp">
        {groups.map((group) => (
          <button
            key={group.name}
            type="button"
            aria-pressed={group.visible}
            disabled={!canManage}
            onClick={() => onToggleGroup(group.name, true)}
          >
            {group.name} {group.summary}
          </button>
        ))}
      </div>
      <label className="layer-search">
        Tìm lớp
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="layer-list">
        {displayLayers.map((layer, index) => {
          const opacityValue = Math.round((state.opacity[layer.id] ?? 1) * 100);
          const status = layerStatuses[layer.id];
          const statusText = status?.message || status || "Chưa tải";

          return (
            <article
              className="layer-row"
              draggable={canManage}
              key={layer.id}
              onDragStart={() => setDragLayerId(layer.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (canManage && dragLayerId && dragLayerId !== layer.id) {
                  onReorder(dragLayerId, layer.id);
                }
                setDragLayerId(null);
              }}
              onDragEnd={() => setDragLayerId(null)}
            >
              <div className="layer-row-main">
                <label>
                  <input
                    type="radio"
                    name="geoai-visible-layer"
                    checked={Boolean(state.visible[layer.id])}
                    aria-label={`Hiển thị ${layer.label}`}
                    disabled={!canManage}
                    onChange={() => onToggle(layer.id)}
                  />
                  <span>{layer.label}</span>
                </label>
                <small>
                  {layer.group} | {layer.sourceType} | z{layer.minZoom}-{layer.maxZoom}
                </small>
                <small data-state={status?.state || "idle"}>{statusText}</small>
              </div>
              <LayerLegend legend={layer.legend} />
              <label className="layer-opacity">
                Độ mờ {layer.label}
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={opacityValue}
                  disabled={!canManage}
                  onChange={(event) =>
                    onOpacityChange(layer.id, Number(event.target.value) / 100)
                  }
                />
              </label>
              <div className="layer-order-controls">
                <button
                  type="button"
                  aria-label={`Tải lại ${layer.label}`}
                  disabled={!canManage}
                  onClick={() => onRefresh(layer.id)}
                >
                  Tải lại
                </button>
                <button
                  type="button"
                  aria-label={`Đưa ${layer.label} lên`}
                  disabled={!canManage || index === 0}
                  onClick={() => onMove(layer.id, -1)}
                >
                  Lên
                </button>
                <button
                  type="button"
                  aria-label={`Đưa ${layer.label} xuống`}
                  disabled={!canManage || index === displayLayers.length - 1}
                  onClick={() => onMove(layer.id, 1)}
                >
                  Xuống
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {history.length > 0 ? (
        <div className="layer-history" aria-label="Lịch sử lớp dữ liệu">
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
