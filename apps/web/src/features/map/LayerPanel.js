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
  layerStatuses = {}
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
          summary: `${visibleCount}/${groupLayers.length}`
        };
      }),
    [layers, state.visible]
  );

  return (
    <section className="layer-panel" aria-label="Lớp dữ liệu">
      <div className="layer-panel-heading">
        <h2>Lớp dữ liệu</h2>
        <span>{displayLayers.length}</span>
      </div>
      <div className="layer-group-controls" aria-label="Nhóm lớp">
        {groups.map((group) => (
          <button
            key={group.name}
            type="button"
            aria-pressed={group.visible}
            onClick={() => onToggleGroup(group.name, !group.visible)}
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

          return (
            <article
              className="layer-row"
              draggable
              key={layer.id}
              onDragStart={() => setDragLayerId(layer.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragLayerId && dragLayerId !== layer.id) {
                  onReorder(dragLayerId, layer.id);
                }
                setDragLayerId(null);
              }}
              onDragEnd={() => setDragLayerId(null)}
            >
              <div className="layer-row-main">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(state.visible[layer.id])}
                    aria-label={`Hiển thị ${layer.label}`}
                    onChange={() => onToggle(layer.id)}
                  />
                  <span>{layer.label}</span>
                </label>
                <small>
                  {layer.group} | {layer.sourceType} | z{layer.minZoom}-{layer.maxZoom}
                </small>
                <small>{layerStatuses[layer.id] || "Chưa tải"}</small>
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
                  onChange={(event) =>
                    onOpacityChange(layer.id, Number(event.target.value) / 100)
                  }
                />
              </label>
              <div className="layer-order-controls">
                <button
                  type="button"
                  aria-label={`Đưa ${layer.label} lên`}
                  disabled={index === 0}
                  onClick={() => onMove(layer.id, -1)}
                >
                  Lên
                </button>
                <button
                  type="button"
                  aria-label={`Đưa ${layer.label} xuống`}
                  disabled={index === displayLayers.length - 1}
                  onClick={() => onMove(layer.id, 1)}
                >
                  Xuống
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
