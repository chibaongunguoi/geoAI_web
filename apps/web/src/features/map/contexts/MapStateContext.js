"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  const [adminArea, setAdminArea] = useState("all_da_nang");
  const [scanMode, setScanMode] = useState("overture");
  const [selectedBasemapId, setSelectedBasemapId] = useState("satellite");
  const [layers, setLayers] = useState([]);
  const [layerState, setLayerState] = useState(() => createDefaultLayerState([]));
  const [layerStatuses, setLayerStatuses] = useState({});
  const [layerRefreshRequests, setLayerRefreshRequests] = useState({});
  const [layerHistory, setLayerHistory] = useState([]);
  const [layerConfigStatus, setLayerConfigStatus] = useState(null);
  const [hasLoadedLayerConfig, setHasLoadedLayerConfig] = useState(false);
  const [assetDisplayConfig, setAssetDisplayConfig] = useState(() => createDefaultAssetDisplayConfig());
  const [assetDisplayStatus, setAssetDisplayStatus] = useState(null);
  const [assetDisplayError, setAssetDisplayError] = useState(null);
  const [assetHistory, setAssetHistory] = useState([]);
  const [visibleAssets, setVisibleAssets] = useState([]);
  const [hasLoadedAssetConfig, setHasLoadedAssetConfig] = useState(false);
  const [buildingHeatmap, setBuildingHeatmap] = useState(null);
  const [isHeatmapLoading, setIsHeatmapLoading] = useState(false);
  const [riskZones, setRiskZones] = useState(null);
  const [isRiskZonesLoading, setIsRiskZonesLoading] = useState(false);

  const skipNextLayerPersistRef = useRef(false);
  const skipNextAssetPersistRef = useRef(false);

  const canViewLayers = canAccess(permissions, "layers.view");
  const canManageLayers = canAccess(permissions, "layers.manage");
  const canExportAssets = canAccess(permissions, "assets.importExport");

  const loadLayerHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/map/layers/history", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setLayerHistory(data.history || []);
    } catch (error) {
      console.warn("Could not load layer history:", error);
    }
  }, []);

  const loadAssetHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/map/assets/history", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setAssetHistory(data.history || []);
    } catch (error) {
      console.warn("Could not load asset display history:", error);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const sharedParams = new URLSearchParams(hash);
    const sharedData = sharedParams.get("state")
      ? decodeShareState(sharedParams.get("state"))
      : null;

    let initialLayerState = createDefaultLayerState([]);
    let initialBasemap = "satellite";

    if (sharedData?.basemap) {
      initialBasemap = sharedData.basemap;
      skipNextLayerPersistRef.current = true;
    } else {
      initialBasemap = readStoredBasemap(window.localStorage, "satellite");
    }
    setSelectedBasemapId(initialBasemap);

    if (sharedData?.layers) {
      initialLayerState = sharedData.layers;
      skipNextLayerPersistRef.current = true;
    } else {
      const storedLayerState = readStoredLayerState(window.localStorage, initialLayerState);
      if (storedLayerState) initialLayerState = storedLayerState;
    }

    setLayerState(initialLayerState);
    setHasLoadedLayerConfig(true);

    if (canManageLayers) {
      loadLayerHistory();
    }

    // Fetch layers configuration from json
    fetch("/data/layers.json", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        setLayers(data);
        const defaultState = createDefaultLayerState(data);
        
        if (sharedData?.layers) {
          setLayerState(sharedData.layers);
        } else {
          const storedLayerState = readStoredLayerState(window.localStorage, data);
          setLayerState(storedLayerState || defaultState);
        }
      })
      .catch(err => {
        console.error("Failed to load layers.json", err);
      });

    if (sharedData?.filters) {
      skipNextAssetPersistRef.current = true;
    }

    const storedAssetConfig = readStoredAssetDisplayConfig(
      window.localStorage,
      createDefaultAssetDisplayConfig()
    );
    setAssetDisplayConfig(storedAssetConfig);
    setHasLoadedAssetConfig(true);

    if (canExportAssets) {
      loadAssetHistory();
    }
  }, [canExportAssets, canManageLayers, loadAssetHistory, loadLayerHistory]);

  useEffect(() => {
    if (!hasLoadedLayerConfig) return;
    if (skipNextLayerPersistRef.current) {
      skipNextLayerPersistRef.current = false;
      return;
    }
    const saved = writeStoredLayerState(window.localStorage, layerState);
    if (!saved) setLayerConfigStatus("Local layer config save failed.");
    else setLayerConfigStatus(null);
  }, [layerState, hasLoadedLayerConfig]);

  useEffect(() => {
    if (!hasLoadedLayerConfig) return;
    writeStoredBasemap(window.localStorage, selectedBasemapId);
  }, [selectedBasemapId, hasLoadedLayerConfig]);

  useEffect(() => {
    if (!hasLoadedAssetConfig) return;
    if (skipNextAssetPersistRef.current) {
      skipNextAssetPersistRef.current = false;
      return;
    }
    const saved = writeStoredAssetDisplayConfig(window.localStorage, assetDisplayConfig);
    if (!saved) setAssetDisplayError("Local asset display save failed.");
    else setAssetDisplayError(null);
  }, [assetDisplayConfig, hasLoadedAssetConfig]);

  const updateLayerVisibility = useCallback((layerId, visible) => {
    setLayerState((current) => toggleLayerVisibility(current, layerId, visible));
  }, []);

  const updateLayerGroupVisibility = useCallback((groupId, visible) => {
    setLayerState((current) => setLayerGroupVisibility(current, layers, groupId, visible));
  }, [layers]);

  const updateLayerOpacity = useCallback((layerId, opacity) => {
    setLayerState((current) => setLayerOpacity(current, layerId, opacity));
  }, []);

  const updateLayerOrder = useCallback((dragIndex, hoverIndex) => {
    setLayerState((current) => moveLayer(current, dragIndex, hoverIndex));
  }, []);

  const updateLayerReorder = useCallback((activeId, overId) => {
    setLayerState((current) => reorderLayer(current, activeId, overId));
  }, []);

  const handleLayerStatusChange = useCallback((layerId, status) => {
    setLayerStatuses((current) => {
      const existing = current[layerId];
      if (existing && existing.state === status.state && existing.message === status.message) {
        return current;
      }
      return { ...current, [layerId]: status };
    });
  }, []);

  const setVisibleAssetsSafe = useCallback((newAssets) => {
    setVisibleAssets((current) => {
      const next = typeof newAssets === "function" ? newAssets(current) : newAssets;
      if (current.length === 0 && next.length === 0) return current;
      return next;
    });
  }, []);

  const toggleBuildingHeatmap = useCallback(() => {
    if (buildingHeatmap) {
      setBuildingHeatmap(null);
      return;
    }
    setIsHeatmapLoading(true);
    fetch("/api/properties/heatmap?source=all&limit=1800&gridSize=0.0012")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setBuildingHeatmap(data);
        setIsHeatmapLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load heatmap", err);
        setIsHeatmapLoading(false);
      });
  }, [buildingHeatmap]);

  const toggleRiskZones = useCallback(() => {
    if (riskZones) {
      setRiskZones(null);
      return;
    }
    setIsRiskZonesLoading(true);
    fetch("/api/risk-zones")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setRiskZones(data);
        setIsRiskZonesLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load risk zones", err);
        setIsRiskZonesLoading(false);
      });
  }, [riskZones]);

  const selectedBasemap = getBasemap(selectedBasemapId);
  const visibleLayers = useMemo(() => visibleLayerIds(layerState), [layerState]);

  const value = useMemo(() => ({
    layers, adminArea, setAdminArea, scanMode, setScanMode, selectedBasemapId, setSelectedBasemapId,
    layerState, setLayerState, layerStatuses, layerRefreshRequests, setLayerRefreshRequests,
    layerHistory, layerConfigStatus, hasLoadedLayerConfig, assetDisplayConfig, setAssetDisplayConfig,
    assetDisplayStatus, assetDisplayError, setAssetDisplayError, assetHistory, visibleAssets,
    setVisibleAssets: setVisibleAssetsSafe, hasLoadedAssetConfig, buildingHeatmap, setBuildingHeatmap, isHeatmapLoading,
    riskZones, setRiskZones, isRiskZonesLoading, toggleRiskZones,
    canViewLayers, canManageLayers, canExportAssets,
    toggleBuildingHeatmap, updateLayerVisibility, updateLayerGroupVisibility, updateLayerOpacity,
    updateLayerOrder, updateLayerReorder, handleLayerStatusChange,
    selectedBasemap, visibleLayers
  }), [
    layers, adminArea, scanMode, selectedBasemapId, layerState, layerStatuses, layerRefreshRequests,
    layerHistory, layerConfigStatus, hasLoadedLayerConfig, assetDisplayConfig, assetDisplayStatus,
    assetDisplayError, assetHistory, visibleAssets, setVisibleAssetsSafe, hasLoadedAssetConfig, buildingHeatmap, isHeatmapLoading,
    riskZones, isRiskZonesLoading, toggleRiskZones,
    canViewLayers, canManageLayers, canExportAssets, toggleBuildingHeatmap, updateLayerVisibility,
    updateLayerGroupVisibility, updateLayerOpacity, updateLayerOrder, updateLayerReorder,
    handleLayerStatusChange, selectedBasemap, visibleLayers
  ]);

  return <MapStateContext.Provider value={value}>{children}</MapStateContext.Provider>;
}
