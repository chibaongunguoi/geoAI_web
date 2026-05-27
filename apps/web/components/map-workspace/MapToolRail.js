"use client";

import {
  AlertTriangle,
  BoxSelect,
  Download,
  Expand,
  Filter,
  Flame,
  Layers,
  Map,
  MapPin,
  Maximize2,
  Move3D,
  PencilRuler,
  Ruler,
  ScanLine
} from "lucide-react";

const ICONS = {
  alert: AlertTriangle,
  scan: ScanLine,
  basemap: Map,
  layers: Layers,
  assets: BoxSelect,
  poi: MapPin,
  heatmap: Flame,
  filters: Filter,
  measurement: Ruler,
  draw: PencilRuler,
  export: Download,
  fullscreen: Maximize2,
  cursor: Move3D
};

function ToolButton({ tool, activeTool, styles, onSelect }) {
  const Icon = ICONS[tool.icon] || Layers;
  const isActive = activeTool === tool.id;

  return (
    <button
      type="button"
      className={isActive ? styles.activeMapToolButton : styles.mapToolButton}
      aria-label={tool.label}
      title={tool.label}
      aria-pressed={isActive}
      onClick={() => {
        if (tool.onClick) {
          tool.onClick();
          return;
        }
        onSelect(isActive ? null : tool.id);
      }}
    >
      <Icon size={20} aria-hidden="true" />
      {tool.badge ? <span className={styles.toolBadge}>{tool.badge}</span> : null}
    </button>
  );
}

export default function MapToolRail({ styles, side = "left", tools, activeTool, onSelect }) {
  return (
    <nav
      className={side === "right" ? styles.rightToolRail : styles.leftToolRail}
      aria-label={side === "right" ? "C\u00f4ng c\u1ee5 b\u1ea3n \u0111\u1ed3 b\u00ean ph\u1ea3i" : "C\u00f4ng c\u1ee5 b\u1ea3n \u0111\u1ed3 b\u00ean tr\u00e1i"}
    >
      {tools.map((tool) => (
        <ToolButton
          key={tool.id}
          tool={tool}
          activeTool={activeTool}
          styles={styles}
          onSelect={onSelect}
        />
      ))}
      <span className={styles.toolRailGrip} aria-hidden="true">
        <Expand size={14} />
      </span>
    </nav>
  );
}
