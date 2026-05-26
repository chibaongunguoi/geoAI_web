const fs = require('fs');
const path = require('path');

const mapJsPath = path.join(__dirname, 'MapWrapper.js.backup');
const lines = fs.readFileSync(mapJsPath, 'utf8').split('\n');

const stateContextContent = `"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { canAccess } from "@/features/auth/auth-client";
import {
  DATA_LAYERS, createDefaultLayerState, focusLayerVisibility, hideAllLayerVisibility,
  moveLayer, opacityForLayer, readStoredLayerState, reorderLayer, setLayerOpacity,
  setLayerGroupVisibility, toggleLayerVisibility, visibleLayerIds, writeStoredLayerState
} from "@/features/map/layers";
import { BASEMAPS, getBasemap, readStoredBasemap, writeStoredBasemap } from "@/features/map/basemaps";
import {
  createDefaultAssetDisplayConfig, normalizeAssetDisplayConfig,
  readStoredAssetDisplayConfig, writeStoredAssetDisplayConfig
} from "@/features/map/assets";
import { decodeShareState } from "@/features/export/share-state";

const MapStateContext = createContext(null);

export function useMapState() {
  const ctx = useContext(MapStateContext);
  if (!ctx) throw new Error("useMapState must be used within MapStateProvider");
  return ctx;
}

export function MapStateProvider({ children, permissions }) {
` + lines.slice(155, 161).join('\n') + `
` + lines.slice(168, 179).join('\n') + `
` + lines.slice(182, 185).join('\n') + `
  const skipNextLayerPersistRef = useRef(false);
  const skipNextAssetPersistRef = useRef(false);

  const canViewLayers = canAccess(permissions, "layers.view");
  const canManageLayers = canAccess(permissions, "layers.manage");
  const canExportAssets = canAccess(permissions, "assets.importExport");

` + lines.slice(284, 313).join('\n') + `

` + lines.slice(348, 389).join('\n') + `

` + lines.slice(391, 394).join('\n') + `

` + lines.slice(395, 432).join('\n') + `

` + lines.slice(433, 464).join('\n') + `

` + lines.slice(474, 511).join('\n') + `

` + lines.slice(571, 595).join('\n') + `

` + lines.slice(597, 630).join('\n') + `

  const value = {
    adminArea, setAdminArea, scanMode, setScanMode, selectedBasemapId, setSelectedBasemapId,
    layerState, setLayerState, layerStatuses, layerRefreshRequests, setLayerRefreshRequests,
    layerHistory, layerConfigStatus, hasLoadedLayerConfig, assetDisplayConfig, setAssetDisplayConfig,
    assetDisplayStatus, assetDisplayError, setAssetDisplayError, assetHistory, visibleAssets,
    setVisibleAssets, hasLoadedAssetConfig, buildingHeatmap, setBuildingHeatmap, isHeatmapLoading,
    canViewLayers, canManageLayers, canExportAssets,
    toggleBuildingHeatmap, updateLayerVisibility, updateLayerGroupVisibility, updateLayerOpacity,
    updateLayerOrder, updateLayerReorder, handleLayerStatusChange,
    selectedBasemap: BASEMAPS.find((b) => b.id === selectedBasemapId) || BASEMAPS[0],
    visibleLayers: visibleLayerIds(layerState)
  };

  return <MapStateContext.Provider value={value}>{children}</MapStateContext.Provider>;
}
`;

const destPath = path.join(__dirname, '../apps/web/src/features/map/contexts/MapStateContext.js');
fs.mkdirSync(path.dirname(destPath), { recursive: true });
fs.writeFileSync(destPath, stateContextContent);
console.log("Wrote MapStateContext.js");
