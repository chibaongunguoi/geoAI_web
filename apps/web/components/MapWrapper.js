"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { canAccess } from "@/features/auth/auth-client";
import {
  propertySearchAnswerText
} from "@/features/map/property-search";
import useSearchHistory from "@/features/map/useSearchHistory";
import {
  createDefaultAssetDisplayConfig,
  normalizeAssetDisplayConfig,
  readStoredAssetDisplayConfig,
  writeStoredAssetDisplayConfig
} from "@/features/map/assets";
import {
  DATA_LAYERS,
  createDefaultLayerState,
  focusLayerVisibility,
  hideAllLayerVisibility,
  moveLayer,
  opacityForLayer,
  readStoredLayerState,
  reorderLayer,
  setLayerOpacity,
  setLayerGroupVisibility,
  toggleLayerVisibility,
  visibleLayerIds,
  writeStoredLayerState
} from "@/features/map/layers";
import {
  BASEMAPS,
  getBasemap,
  readStoredBasemap,
  writeStoredBasemap
} from "@/features/map/basemaps";
import {
  DEFAULT_ASSET_FILTERS,
  addFilterHistory,
  assetFilterQueryString,
  normalizeAssetFilters,
  readFilterState,
  writeFilterState
} from "@/features/filters/filter-state";
import {
  DEFAULT_EXPORT_METADATA,
  addExportHistory,
  buildMapExportState,
  normalizeExportMetadata,
  readExportStorage,
  writeExportStorage
} from "@/features/export/map-export-state";
import { captureElementPng, downloadDataUrl, exportPrintablePdf } from "@/features/export/map-capture";
import { decodeShareState, shareUrlFromState } from "@/features/export/share-state";
import PoiSearchPanel from "@/features/poi/PoiSearchPanel";
import { buildMeasurementExport, getMeasurementResult } from "@/features/measurement/measurement-utils";
import {
  DEFAULT_MEASUREMENT_STATE,
  addMeasurementHistory,
  measurementReducer,
  readMeasurementStorage,
  writeMeasurementStorage
} from "@/features/measurement/measurement-state";
import { buildSpatialDrawExport, getSpatialDrawResult } from "@/features/spatial-draw/spatial-draw-utils";
import {
  DEFAULT_SPATIAL_DRAW_STATE,
  addSpatialDrawHistory,
  readSpatialDrawStorage,
  spatialDrawReducer,
  writeSpatialDrawStorage
} from "@/features/spatial-draw/spatial-draw-state";
import styles from "./MapWrapper.module.css";
import MapResultsOverlay from "./map-workspace/MapResultsOverlay";
import MapToolPopover from "./map-workspace/MapToolPopover";
import MapToolRail from "./map-workspace/MapToolRail";
import MapTopSearchBar from "./map-workspace/MapTopSearchBar";
import {
  AssetDisplayToolPanel,
  BasemapToolPanel,
  ExportShareToolPanel,
  FilterToolPanel,
  LayerToolPanel,
  MeasurementToolPanel,
  ScanToolPanel,
  SpatialDrawToolPanel
} from "./map-workspace/ToolPanels";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <p className={styles.loading}>Đang tải bản đồ...</p>
});

const ADMIN_OPTIONS = [
  { value: "all_da_nang", label: "Toàn Đà Nẵng" },
  { value: "hai_chau", label: "Hải Châu" },
  { value: "thanh_khe", label: "Thanh Khê" },
  { value: "son_tra", label: "Sơn Trà" },
  { value: "ngu_hanh_son", label: "Ngũ Hành Sơn" },
  { value: "lien_chieu", label: "Liên Chiểu" },
  { value: "cam_le", label: "Cẩm Lệ" },
  { value: "hoa_vang", label: "Hòa Vang" }
];

const SCAN_MODE_OPTIONS = [
  // GeoAI runtime scanning is disabled by backend flags; keep the UI option
  // present but disabled so it can be re-enabled without rebuilding the flow.
  {
    value: "geoai-disabled",
    disabled: true,
    label: "GeoAI + GeoTIFF",
    description: "Quét vùng đã chọn bằng backend GeoAI."
  },
  {
    value: "overture",
    label: "Overture Maps",
    description: "Dùng footprint công trình đã cache từ Overture."
  }
];
const REFERENCE_LAYER_IDS = ["admin-boundaries"];
const TOTAL_UI_DEADLINE_MS = 8000;
const SEMANTIC_SEARCH_SAMPLE_QUERIES = [
  "Vùng nào nhiều nhà nhất ở Hòa Khánh Bắc",
  "Vùng nào thưa thớt nhất ở Liên Chiểu",
  "Cho tôi danh sách nhà ở Hải Châu",
  "Có bao nhiêu tòa nhà ở Hòa Khánh Bắc, Liên Chiểu?",
  "Tìm nhà đang hoạt động ở Sơn Trà",
  "16.08828, 108.21860"
];

const TOOL_TEXT = {
  scan: "Thao t\u00e1c qu\u00e9t",
  basemap: "B\u1ea3n \u0111\u1ed3 n\u1ec1n",
  layers: "L\u1edbp d\u1eef li\u1ec7u",
  assets: "Hi\u1ec3n th\u1ecb t\u00e0i s\u1ea3n",
  poi: "\u0110i\u1ec3m quan t\u00e2m",
  heatmap: "Heatmap m\u1eadt \u0111\u1ed9 nh\u00e0",
  filters: "B\u1ed9 l\u1ecdc n\u00e2ng cao",
  measurement: "\u0110o kho\u1ea3ng c\u00e1ch/di\u1ec7n t\u00edch",
  draw: "Spatial draw/edit",
  exportShare: "Export & share",
  exitFullscreen: "Tho\u00e1t to\u00e0n m\u00e0n h\u00ecnh",
  fullscreen: "To\u00e0n m\u00e0n h\u00ecnh"
};

const POI_QUERY_TERMS = [
  "quan ca phe",
  "cafe",
  "coffee",
  "nha hang",
  "quan an",
  "khach san",
  "benh vien",
  "phong kham",
  "nha thuoc",
  "truong hoc",
  "sieu thi",
  "cho",
  "cua hang tien loi",
  "cong vien",
  "ho boi"
];

function normalizeSearchQuery(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isPoiSemanticQuery(query) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return false;
  const hasPoiTerm = POI_QUERY_TERMS.some((term) => normalized.includes(term));
  const asksForBuilding =
    /\b(danh sach nha|toa nha|cong trinh|bat dong san|tai san)\b/.test(normalized) &&
    !/\b(nha hang|nha thuoc)\b/.test(normalized);
  if (asksForBuilding) return false;
  return hasPoiTerm;
}

export default function MapWrapper({ permissions = [] }) {
  const abortControllerRef = useRef(null);
  const propertySearchAbortRef = useRef(null);
  const poiAutoCacheRef = useRef(new globalThis.Map());
  const lastPoiAutoKeyRef = useRef(null);
  const workspaceRef = useRef(null);
  const mapCanvasRef = useRef(null);
  const [adminArea, setAdminArea] = useState("all_da_nang");
  const [scanMode, setScanMode] = useState("overture");
  const [selectedBasemapId, setSelectedBasemapId] = useState("satellite");
  const [layerState, setLayerState] = useState(() =>
    createDefaultLayerState(DATA_LAYERS)
  );
  const [cursorPosition, setCursorPosition] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rectangleCoords, setRectangleCoords] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectRequestId, setSelectRequestId] = useState(0);
  const [captureRequestId, setCaptureRequestId] = useState(0);
  const [clearRequestId, setClearRequestId] = useState(0);
  const [layerStatuses, setLayerStatuses] = useState({});
  const [layerRefreshRequests, setLayerRefreshRequests] = useState({});
  const [layerHistory, setLayerHistory] = useState([]);
  const [layerConfigStatus, setLayerConfigStatus] = useState(null);
  const [hasLoadedLayerConfig, setHasLoadedLayerConfig] = useState(false);
  const [assetDisplayConfig, setAssetDisplayConfig] = useState(() =>
    createDefaultAssetDisplayConfig()
  );
  const [assetDisplayStatus, setAssetDisplayStatus] = useState(null);
  const [assetDisplayError, setAssetDisplayError] = useState(null);
  const [assetHistory, setAssetHistory] = useState([]);
  const [visibleAssets, setVisibleAssets] = useState([]);
  const [poiResults, setPoiResults] = useState([]);
  const [poiMode, setPoiMode] = useState("auto");
  const [poiEnabled, setPoiEnabled] = useState(true);
  const [buildingHeatmap, setBuildingHeatmap] = useState(null);
  const [isHeatmapLoading, setIsHeatmapLoading] = useState(false);
  const [hasLoadedAssetConfig, setHasLoadedAssetConfig] = useState(false);
  const [propertyQuery, setPropertyQuery] = useState(
    "Vùng nào ở phường Thuận Phước có mật độ nhà nhiều nhất?"
  );
  const [propertySearchResult, setPropertySearchResult] = useState(null);
  const [propertySearchStatus, setPropertySearchStatus] = useState(null);
  const [isSearchingProperties, setIsSearchingProperties] = useState(false);
  const [focusedProperty, setFocusedProperty] = useState(null);
  const [propertyResultView, setPropertyResultView] = useState("list");
  const [suggestions, setSuggestions] = useState([]);
  const [assetFilters, setAssetFilters] = useState(() => ({ ...DEFAULT_ASSET_FILTERS }));
  const [filterPresets, setFilterPresets] = useState([]);
  const [filterHistory, setFilterHistory] = useState([]);
  const [filterStatus, setFilterStatus] = useState(null);
  const [measurementState, setMeasurementState] = useState(DEFAULT_MEASUREMENT_STATE);
  const [measurementHistory, setMeasurementHistory] = useState([]);
  const [measurementStatus, setMeasurementStatus] = useState(null);
  const [spatialDrawState, setSpatialDrawState] = useState(DEFAULT_SPATIAL_DRAW_STATE);
  const [spatialDrawHistory, setSpatialDrawHistory] = useState([]);
  const [spatialDrawStatus, setSpatialDrawStatus] = useState(null);
  const [exportMetadata, setExportMetadata] = useState(DEFAULT_EXPORT_METADATA);
  const [exportTemplates, setExportTemplates] = useState([]);
  const [exportHistory, setExportHistory] = useState([]);
  const [exportStatus, setExportStatus] = useState(null);
  const [mapViewport, setMapViewport] = useState(null);
  const [activeTool, setActiveTool] = useState("scan");
  const { addSearch } = useSearchHistory();
  const skipNextLayerPersistRef = useRef(false);
  const skipNextAssetPersistRef = useRef(false);

  const canViewLayers = canAccess(permissions, "layers.view");
  const canManageLayers = canAccess(permissions, "layers.manage");
  const canExportAssets = canAccess(permissions, "assets.importExport");
  const canUseFilters = canAccess(permissions, "filters.use");
  const canMeasure = canAccess(permissions, "measurement.use");
  const canDrawSpatial = canAccess(permissions, "properties.manage");
  const canExportMap = canAccess(permissions, "export.use");
  const canShareMap = canAccess(permissions, "share.create");

  useEffect(() => {
    if (!poiEnabled || poiMode !== "auto" || !mapViewport?.bounds || mapViewport.zoom < 12) {
      return undefined;
    }

    const roundCoord = (value) => (Math.round(Number(value) * 1000) / 1000).toFixed(3);
    const viewportKey = [
      Math.floor(mapViewport.zoom),
      roundCoord(mapViewport.bounds.south),
      roundCoord(mapViewport.bounds.west),
      roundCoord(mapViewport.bounds.north),
      roundCoord(mapViewport.bounds.east)
    ].join(":");

    if (lastPoiAutoKeyRef.current === viewportKey) {
      return undefined;
    }

    const cachedItems = poiAutoCacheRef.current.get(viewportKey);
    if (cachedItems) {
      lastPoiAutoKeyRef.current = viewportKey;
      setPoiResults(cachedItems);
      return undefined;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          limit: "120",
          south: String(mapViewport.bounds.south),
          west: String(mapViewport.bounds.west),
          north: String(mapViewport.bounds.north),
          east: String(mapViewport.bounds.east)
        });
        const response = await fetch(`/api/poi/search?${params}`, {
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) return;
        const data = await response.json();
        const items = Array.isArray(data.items) ? data.items : [];
        poiAutoCacheRef.current.set(viewportKey, items);
        if (poiAutoCacheRef.current.size > 60) {
          const oldestKey = poiAutoCacheRef.current.keys().next().value;
          poiAutoCacheRef.current.delete(oldestKey);
        }
        lastPoiAutoKeyRef.current = viewportKey;
        setPoiResults(items);
      } catch (error) {
        if (error.name !== "AbortError") {
          setPoiResults((current) => (current.length > 0 ? [] : current));
        }
      }
    }, 450);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [mapViewport, poiEnabled, poiMode]);

  const loadLayerHistory = useCallback(async () => {
    if (!canViewLayers) return;

    try {
      const response = await fetch("/api/map/layers/history?take=20", {
        cache: "no-store"
      });
      if (!response.ok) return;
      const data = await response.json();
      setLayerHistory(Array.isArray(data.items) ? data.items : []);
    } catch {
      setLayerHistory([]);
    }
  }, [canViewLayers]);

  const loadAssetHistory = useCallback(async () => {
    if (!canViewLayers) return;

    try {
      const response = await fetch("/api/map/assets/history?take=20", {
        cache: "no-store"
      });
      if (!response.ok) return;
      const data = await response.json();
      setAssetHistory(Array.isArray(data.items) ? data.items : []);
    } catch {
      setAssetHistory([]);
    }
  }, [canViewLayers]);

  useEffect(() => {
    setSelectedBasemapId(readStoredBasemap(window.localStorage));
    const storedFilters = readFilterState(window.localStorage);
    setAssetFilters(storedFilters.lastFilters);
    setFilterPresets(storedFilters.presets);
    setFilterHistory(storedFilters.history);
    const storedMeasurement = readMeasurementStorage(window.localStorage);
    setMeasurementState(storedMeasurement.state);
    setMeasurementHistory(storedMeasurement.history);
    const storedSpatialDraw = readSpatialDrawStorage(window.localStorage);
    setSpatialDrawState(storedSpatialDraw.state);
    setSpatialDrawHistory(storedSpatialDraw.history);
    const storedExport = readExportStorage(window.localStorage);
    setExportTemplates(storedExport.templates);
    setExportHistory(storedExport.history);

    const shareParam = new URLSearchParams(window.location.search).get("share");
    if (shareParam) {
      const shared = decodeShareState(shareParam);
      if (shared.error) {
        setExportStatus(shared.error);
      } else if (shared.state) {
        if (shared.state.filters && canUseFilters) {
          setAssetFilters(normalizeAssetFilters(shared.state.filters));
        }
        if (shared.state.metadata) {
          setExportMetadata(normalizeExportMetadata(shared.state.metadata));
        }
        if (shared.state.viewport) {
          setMapViewport(shared.state.viewport);
        }
        setExportStatus("Shared map state loaded.");
      }
    }
    const localLayerState = readStoredLayerState(window.localStorage, DATA_LAYERS);
    setLayerState(localLayerState);

    if (!canViewLayers) {
      setHasLoadedLayerConfig(true);
      return;
    }

    let isMounted = true;

    fetch("/api/map/layers/config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!isMounted) return;

        if (data?.state) {
          skipNextLayerPersistRef.current = true;
          setLayerState(
            readStoredLayerState(
              { getItem: () => JSON.stringify(data.state) },
              DATA_LAYERS
            )
          );
        }
      })
      .catch(() => {
        if (isMounted) {
          setLayerConfigStatus("Không tải được cấu hình lớp từ máy chủ.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setHasLoadedLayerConfig(true);
        }
      });

    loadLayerHistory();

    return () => {
      isMounted = false;
    };
  }, [canViewLayers, loadLayerHistory]);

  useEffect(() => {
    writeStoredBasemap(window.localStorage, selectedBasemapId);
  }, [selectedBasemapId]);

  useEffect(() => {
    setAssetDisplayConfig(readStoredAssetDisplayConfig(window.localStorage));

    if (!canViewLayers) {
      setHasLoadedAssetConfig(true);
      return;
    }

    let isMounted = true;

    fetch("/api/map/assets/config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!isMounted) return;

        if (data?.state) {
          skipNextAssetPersistRef.current = true;
          setAssetDisplayConfig(normalizeAssetDisplayConfig(data.state));
        }
      })
      .catch(() => {
        if (isMounted) {
          setAssetDisplayError("Không tải được cấu hình hiển thị tài sản từ máy chủ.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setHasLoadedAssetConfig(true);
        }
      });

    loadAssetHistory();

    return () => {
      isMounted = false;
    };
  }, [canViewLayers, loadAssetHistory]);

  useEffect(() => {
    writeStoredLayerState(window.localStorage, layerState);
    if (!hasLoadedLayerConfig || !canManageLayers) return;

    if (skipNextLayerPersistRef.current) {
      skipNextLayerPersistRef.current = false;
      return;
    }

    const controller = new AbortController();

    fetch("/api/map/layers/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: layerState }),
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Layer config save failed");
        }
        setLayerConfigStatus("Đã lưu cấu hình lớp.");
        loadLayerHistory();
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setLayerConfigStatus("Không lưu được cấu hình lớp lên máy chủ.");
      });

    return () => controller.abort();
  }, [canManageLayers, hasLoadedLayerConfig, layerState, loadLayerHistory]);

  useEffect(() => {
    const hasAnalysisObjects = Boolean(analysisResults?.analysis?.objects?.length);
    if (!hasAnalysisObjects) return;

    setLayerState((current) =>
      focusLayerVisibility(current, "analysis-results", REFERENCE_LAYER_IDS)
    );
  }, [analysisResults]);

  useEffect(() => {
    writeStoredAssetDisplayConfig(window.localStorage, assetDisplayConfig);
    if (!hasLoadedAssetConfig || !canExportAssets) return;

    if (skipNextAssetPersistRef.current) {
      skipNextAssetPersistRef.current = false;
      return;
    }

    const controller = new AbortController();

    fetch("/api/map/assets/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: assetDisplayConfig }),
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Asset display config save failed");
        }
        setAssetDisplayStatus("Đã lưu cấu hình tài sản.");
        setAssetDisplayError(null);
        loadAssetHistory();
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setAssetDisplayError("Không lưu được cấu hình tài sản lên máy chủ.");
      });

    return () => controller.abort();
  }, [
    assetDisplayConfig,
    canExportAssets,
    hasLoadedAssetConfig,
    loadAssetHistory
  ]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === workspaceRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      propertySearchAbortRef.current?.abort();
      propertySearchAbortRef.current = null;
    };
  }, []);

  const clearWorkspace = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    propertySearchAbortRef.current?.abort();
    propertySearchAbortRef.current = null;
    setIsAnalyzing(false);
    setRectangleCoords(null);
    setAnalysisResults(null);
    setClearRequestId((requestId) => requestId + 1);
  }, []);

  const handleRectangleDrawn = useCallback((coordinates) => {
    setRectangleCoords(coordinates);
    setAnalysisResults(null);
  }, []);

  const requestSelection = () => {
    if (isAnalyzing) return;
    setAnalysisResults(null);
    setPropertySearchResult(null);
    setSelectRequestId((requestId) => requestId + 1);
  };

  const requestCapture = () => {
    if (!rectangleCoords || isAnalyzing) return;
    setCaptureRequestId((requestId) => requestId + 1);
  };

  const toggleFullscreen = async () => {
    const workspace = workspaceRef.current;

    if (!workspace) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await workspace.requestFullscreen();
  };

  const toggleBuildingHeatmap = useCallback(async () => {
    if (buildingHeatmap || isHeatmapLoading) {
      setBuildingHeatmap(null);
      return;
    }

    setIsHeatmapLoading(true);
    try {
      const response = await fetch("/api/properties/heatmap?limit=1200", {
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      setBuildingHeatmap(result);
      const regionCount = result?.map?.regions?.length || 0;
      setPropertySearchStatus(`Đã bật heatmap mật độ nhà. (${regionCount} khu vực)`);
    } catch (err) {
      setBuildingHeatmap(null);
      setPropertySearchStatus("Không tải được heatmap mật độ nhà.");
    } finally {
      setIsHeatmapLoading(false);
    }
  }, [buildingHeatmap, isHeatmapLoading]);

  const updateLayerVisibility = useCallback((layerId) => {
    setLayerState((current) => toggleLayerVisibility(current, layerId));
  }, []);

  const updateLayerGroupVisibility = useCallback((group, visible) => {
    setLayerState((current) =>
      setLayerGroupVisibility(current, DATA_LAYERS, group, visible)
    );
  }, []);

  const updateLayerOpacity = useCallback((layerId, opacity) => {
    setLayerState((current) => setLayerOpacity(current, layerId, opacity));
  }, []);

  const updateLayerOrder = useCallback((layerId, direction) => {
    setLayerState((current) => moveLayer(current, layerId, direction));
  }, []);

  const updateLayerReorder = useCallback((activeLayerId, targetLayerId) => {
    setLayerState((current) => reorderLayer(current, activeLayerId, targetLayerId));
  }, []);

  const handleLayerStatusChange = useCallback((layerId, status) => {
    const nextStatus =
      typeof status === "string" ? { state: "ready", message: status } : status;

    setLayerStatuses((current) =>
      current[layerId]?.state === nextStatus?.state &&
      current[layerId]?.message === nextStatus?.message
        ? current
        : { ...current, [layerId]: nextStatus }
    );
  }, []);

  const runPropertySearch = useCallback(async (overrideQuery) => {
    const query = typeof overrideQuery === "string" ? overrideQuery.trim() : propertyQuery.trim();
    if (!query) return;

    propertySearchAbortRef.current?.abort();
    const controller = new AbortController();
    propertySearchAbortRef.current = controller;
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      setPropertySearchStatus("Tìm kiếm quá lâu, vui lòng thu hẹp truy vấn");
      controller.abort();
    }, TOTAL_UI_DEADLINE_MS);

    if (typeof overrideQuery === "string") {
      setPropertyQuery(query);
    }

    addSearch(query);

    setIsSearchingProperties(true);
    setPropertySearchStatus(null);
    setAnalysisResults(null);
    setFocusedProperty(null);

    try {
      const filterParams = assetFilterQueryString({
        ...(canUseFilters ? assetFilters : DEFAULT_ASSET_FILTERS),
        limit: 10
      });
      const usePoiSemantic = isPoiSemanticQuery(query);
      const response = await fetch(usePoiSemantic
        ? `/api/poi/semantic-search?q=${encodeURIComponent(query)}&limit=20`
        : `/api/properties?query=${encodeURIComponent(query)}&${filterParams}`, {
        cache: "no-store",
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setPropertySearchResult(result);
      if (usePoiSemantic) {
        setPoiMode("manual");
        setPoiResults(Array.isArray(result.items) ? result.items : []);
      } else {
        setPoiMode("auto");
        setPoiResults([]);
      }
      setLayerState((current) => hideAllLayerVisibility(current, REFERENCE_LAYER_IDS));
      setPropertySearchStatus(
        propertySearchAnswerText(result) || (result.items?.length > 0 ? `${result.items.length} kết quả` : "")
      );

      if (result.meta?.ambiguityWarning) {
        setPropertySearchStatus(result.meta.ambiguityWarning);
      }

      if (result.map?.type === "focus" && result.map.center) {
        setFocusedProperty({
          code: "TỌA ĐỘ",
          name: "Vị trí được ghim",
          addressLine: `${result.map.center.lat.toFixed(5)}, ${result.map.center.lng.toFixed(5)}`,
          centroidLat: result.map.center.lat,
          centroidLng: result.map.center.lng
        });
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
      setPropertySearchResult(null);
      setPropertySearchStatus(
        didTimeout
          ? "Tìm kiếm quá lâu, vui lòng thu hẹp truy vấn"
          : "Khong tim kiem duoc du lieu nha/dat."
      );
    } finally {
      clearTimeout(timeoutId);
      if (propertySearchAbortRef.current === controller) {
        propertySearchAbortRef.current = null;
        setIsSearchingProperties(false);
      }
    }
  }, [addSearch, assetFilters, canUseFilters, propertyQuery]);

  const persistFilterState = useCallback((filters, presets, history) => {
    writeFilterState(window.localStorage, {
      filters,
      presets,
      history
    });
  }, []);

  const applyFilters = useCallback(
    (nextFilters, action = "filters.apply") => {
      if (!canUseFilters) return;
      const normalized = normalizeAssetFilters(nextFilters);
      const nextHistory = addFilterHistory(filterHistory, action, normalized);
      setAssetFilters(normalized);
      setFilterHistory(nextHistory);
      setFilterStatus("Đã cập nhật bộ lọc.");
      setPropertySearchResult(null);
      setFocusedProperty(null);
      persistFilterState(normalized, filterPresets, nextHistory);
    },
    [canUseFilters, filterHistory, filterPresets, persistFilterState]
  );

  const saveFilterPreset = useCallback(
    (name, filters) => {
      if (!canUseFilters) return;
      const preset = {
        name,
        filters: normalizeAssetFilters(filters)
      };
      const nextPresets = [
        preset,
        ...filterPresets.filter((item) => item.name !== name)
      ].slice(0, 20);
      const nextHistory = addFilterHistory(filterHistory, "filters.preset.save", preset.filters);
      setFilterPresets(nextPresets);
      setFilterHistory(nextHistory);
      setFilterStatus("Đã lưu bộ lọc.");
      persistFilterState(assetFilters, nextPresets, nextHistory);
    },
    [assetFilters, canUseFilters, filterHistory, filterPresets, persistFilterState]
  );

  const measurementResult = useMemo(
    () => getMeasurementResult(measurementState.mode, measurementState.points),
    [measurementState.mode, measurementState.points]
  );

  const persistMeasurementState = useCallback((nextState, nextHistory) => {
    const saved = writeMeasurementStorage(window.localStorage, {
      state: nextState,
      history: nextHistory
    });
    if (!saved) {
      setMeasurementStatus("Measurement history could not be saved locally.");
    }
  }, []);

  const updateMeasurement = useCallback(
    (action, historyAction, detail = {}) => {
      if (!canMeasure) return;

      setMeasurementState((current) => {
        const nextState = measurementReducer(current, action);
        setMeasurementHistory((currentHistory) => {
          const nextHistory = historyAction
            ? addMeasurementHistory(currentHistory, historyAction, {
                ...detail,
                points: nextState.points.length
              })
            : currentHistory;
          persistMeasurementState(nextState, nextHistory);
          return nextHistory;
        });
        return nextState;
      });
      setMeasurementStatus(null);
    },
    [canMeasure, persistMeasurementState]
  );

  const setMeasurementMode = useCallback(
    (mode) => {
      updateMeasurement({ type: "set-mode", mode }, "start", { mode });
    },
    [updateMeasurement]
  );

  const addMeasurementPoint = useCallback(
    (point) => {
      updateMeasurement({ type: "add-point", point }, "point.add", point);
    },
    [updateMeasurement]
  );

  const editMeasurementPoint = useCallback(
    (index, point) => {
      updateMeasurement({ type: "edit-point", index, point }, "point.edit", {
        index,
        ...point
      });
    },
    [updateMeasurement]
  );

  const undoMeasurement = useCallback(() => {
    updateMeasurement({ type: "undo" }, "undo");
  }, [updateMeasurement]);

  const clearMeasurement = useCallback(() => {
    updateMeasurement({ type: "clear" }, "clear");
  }, [updateMeasurement]);

  const toggleMeasurementSnap = useCallback(
    (enabled) => {
      updateMeasurement({ type: "toggle-snap", enabled }, "snap.toggle", { enabled });
    },
    [updateMeasurement]
  );

  const saveMeasurementSession = useCallback(() => {
    if (!canMeasure || measurementResult.error) return;
    const nextHistory = addMeasurementHistory(measurementHistory, "save", {
      type: measurementResult.type,
      value: measurementResult.value
    });
    setMeasurementHistory(nextHistory);
    persistMeasurementState(measurementState, nextHistory);
    setMeasurementStatus("Measurement session saved locally.");
  }, [canMeasure, measurementHistory, measurementResult, measurementState, persistMeasurementState]);

  const copyMeasurement = useCallback(async () => {
    if (!canMeasure || measurementResult.error) return;

    const lines = [
      `${measurementResult.type}: ${measurementResult.formattedValue}`,
      ...measurementState.points.map(
        (point, index) => `${index + 1}. ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`
      )
    ];

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(lines.join("\n"));
      const nextHistory = addMeasurementHistory(measurementHistory, "copy", {
        type: measurementResult.type
      });
      setMeasurementHistory(nextHistory);
      persistMeasurementState(measurementState, nextHistory);
      setMeasurementStatus("Measurement copied.");
    } catch {
      setMeasurementStatus("Clipboard copy failed.");
    }
  }, [canMeasure, measurementHistory, measurementResult, measurementState, persistMeasurementState]);

  const exportMeasurement = useCallback(() => {
    if (!canMeasure || measurementResult.error) return;

    try {
      const payload = buildMeasurementExport({
        mode: measurementState.mode,
        points: measurementState.points,
        label: measurementState.label
      });
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `geoai-measurement-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      const nextHistory = addMeasurementHistory(measurementHistory, "export", {
        type: payload.type,
        value: payload.value
      });
      setMeasurementHistory(nextHistory);
      persistMeasurementState(measurementState, nextHistory);
      setMeasurementStatus("Measurement exported as JSON.");
    } catch {
      setMeasurementStatus("Measurement export failed.");
    }
  }, [canMeasure, measurementHistory, measurementResult, measurementState, persistMeasurementState]);

  const spatialDrawResult = useMemo(
    () => getSpatialDrawResult(spatialDrawState),
    [spatialDrawState]
  );

  const persistSpatialDrawState = useCallback((nextState, nextHistory) => {
    const saved = writeSpatialDrawStorage(window.localStorage, {
      state: nextState,
      history: nextHistory
    });
    if (!saved) {
      setSpatialDrawStatus("Spatial draft could not be saved locally.");
    }
  }, []);

  const updateSpatialDraw = useCallback(
    (action, historyAction, detail = {}) => {
      if (!canDrawSpatial) return;

      setSpatialDrawState((current) => {
        const nextState = spatialDrawReducer(current, action);
        setSpatialDrawHistory((currentHistory) => {
          const nextHistory = historyAction
            ? addSpatialDrawHistory(currentHistory, historyAction, {
                ...detail,
                coordinates: nextState.coordinates.length
              })
            : currentHistory;
          persistSpatialDrawState(nextState, nextHistory);
          return nextHistory;
        });
        return nextState;
      });
      setSpatialDrawStatus(null);
    },
    [canDrawSpatial, persistSpatialDrawState]
  );

  const setSpatialDrawMode = useCallback(
    (mode) => {
      updateSpatialDraw({ type: "set-mode", mode }, "mode.change", { mode });
    },
    [updateSpatialDraw]
  );

  const addSpatialDrawCoordinate = useCallback(
    (point) => {
      updateSpatialDraw({ type: "add-coordinate", point }, "coordinate.add", point);
    },
    [updateSpatialDraw]
  );

  const editSpatialDrawCoordinate = useCallback(
    (index, point) => {
      updateSpatialDraw({ type: "edit-coordinate", index, point }, "coordinate.edit", {
        index,
        ...point
      });
    },
    [updateSpatialDraw]
  );

  const selectSpatialDrawVertex = useCallback(
    (index) => {
      updateSpatialDraw({ type: "select-vertex", index });
    },
    [updateSpatialDraw]
  );

  const deleteSpatialDrawVertex = useCallback(
    (index) => {
      updateSpatialDraw({ type: "delete-vertex", index }, "vertex.delete", { index });
    },
    [updateSpatialDraw]
  );

  const updateSpatialDrawAttributes = useCallback(
    (attributes) => {
      updateSpatialDraw({ type: "set-attributes", attributes }, "attributes.update");
    },
    [updateSpatialDraw]
  );

  const toggleSpatialDrawSnap = useCallback(
    (enabled) => {
      updateSpatialDraw({ type: "toggle-snap", enabled }, "snap.toggle", { enabled });
    },
    [updateSpatialDraw]
  );

  const undoSpatialDraw = useCallback(() => {
    updateSpatialDraw({ type: "undo" }, "undo");
  }, [updateSpatialDraw]);

  const redoSpatialDraw = useCallback(() => {
    updateSpatialDraw({ type: "redo" }, "redo");
  }, [updateSpatialDraw]);

  const cancelSpatialDraw = useCallback(() => {
    updateSpatialDraw({ type: "cancel" }, "cancel");
  }, [updateSpatialDraw]);

  const saveSpatialDrawDraft = useCallback(() => {
    if (!canDrawSpatial || spatialDrawResult.error) return;
    const savedState = spatialDrawReducer(spatialDrawState, { type: "mark-saved" });
    const nextHistory = addSpatialDrawHistory(spatialDrawHistory, "draft.save", {
      type: spatialDrawResult.type,
      state: savedState,
      geojson: spatialDrawResult.geojson
    });
    setSpatialDrawState(savedState);
    setSpatialDrawHistory(nextHistory);
    persistSpatialDrawState(savedState, nextHistory);
    setSpatialDrawStatus("Spatial draft saved locally.");
  }, [
    canDrawSpatial,
    persistSpatialDrawState,
    spatialDrawHistory,
    spatialDrawResult,
    spatialDrawState
  ]);

  const duplicateLatestSpatialDraft = useCallback(() => {
    if (!canDrawSpatial) return;
    const saved = spatialDrawHistory.find((item) => item.detail?.state);
    if (!saved?.detail?.state) {
      setSpatialDrawStatus("No saved spatial draft to copy.");
      return;
    }
    updateSpatialDraw(
      { type: "replace-draft", state: saved.detail.state },
      "draft.copy",
      { copiedAt: saved.createdAt }
    );
  }, [canDrawSpatial, spatialDrawHistory, updateSpatialDraw]);

  const exportSpatialDraw = useCallback(() => {
    if (!canDrawSpatial || spatialDrawResult.error) return;

    try {
      const payload = buildSpatialDrawExport({
        mode: spatialDrawResult.type,
        coordinates: spatialDrawState.coordinates,
        attributes: spatialDrawState.attributes
      });
      const blob = new Blob([JSON.stringify(payload.geojson, null, 2)], {
        type: "application/geo+json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `geoai-spatial-draft-${new Date().toISOString().slice(0, 10)}.geojson`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      const nextHistory = addSpatialDrawHistory(spatialDrawHistory, "export", {
        type: payload.type
      });
      setSpatialDrawHistory(nextHistory);
      persistSpatialDrawState(spatialDrawState, nextHistory);
      setSpatialDrawStatus("Spatial draft exported as GeoJSON.");
    } catch {
      setSpatialDrawStatus("Spatial draft export failed.");
    }
  }, [
    canDrawSpatial,
    persistSpatialDrawState,
    spatialDrawHistory,
    spatialDrawResult,
    spatialDrawState
  ]);

  const refreshLayer = useCallback((layerId) => {
    setLayerRefreshRequests((current) => ({
      ...current,
      [layerId]: (current[layerId] || 0) + 1
    }));
  }, []);

  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/properties/suggestions?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      }
    } catch {
      setSuggestions([]);
    }
  }, []);

  const analyzeImage = useCallback(
    async (imageBlob, bbox) => {
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsAnalyzing(true);
      setAnalysisResults(null);
      setPropertySearchResult(null);

      try {
        const formData = new FormData();
        formData.append("image", imageBlob, "captured_image.png");
        formData.append("bbox", JSON.stringify(bbox));
        formData.append("scanTypes", JSON.stringify(["building"]));
        formData.append("adminArea", adminArea);
        formData.append("scanMode", scanMode);

        const response = await axios.post("/api/analyze", formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          },
          signal: abortController.signal
        });

        if (response.data.success) {
          setAnalysisResults(response.data.results);
          return;
        }

        throw new Error(response.data.error || "Phân tích thất bại");
      } catch (error) {
        if (axios.isCancel(error) || error.name === "CanceledError") {
          return;
        }

        console.error("Error analyzing image:", error);
        const errorMessage = error.response?.data?.error || error.message;
        alert(`Không thể phân tích ảnh:\n${errorMessage}`);
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        setIsAnalyzing(false);
      }
    },
    [adminArea, scanMode]
  );

  const selectedScanMode = SCAN_MODE_OPTIONS.find(
    (option) => option.value === scanMode
  );
  const selectedBasemap = getBasemap(selectedBasemapId);
  const visibleLayers = useMemo(() => visibleLayerIds(layerState), [layerState]);
  const layerOpacities = useMemo(
    () =>
      Object.fromEntries(
        DATA_LAYERS.map((layer) => [layer.id, opacityForLayer(layerState, layer.id)])
      ),
    [layerState]
  );
  const activeAnalysisObjects = useMemo(
    () => analysisResults?.analysis?.objects || [],
    [analysisResults]
  );

  const exportLayerConfig = useCallback(async () => {
    if (!canManageLayers) return;

    try {
      const response = await fetch("/api/map/layers/export", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Layer export failed");
      }
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `geoai-layer-config-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setLayerConfigStatus("Không xuất được cấu hình lớp.");
    }
  }, [canManageLayers]);

  const exportVisibleAssets = useCallback(async () => {
    if (!canExportAssets) return;

    try {
      await fetch("/api/map/assets/export", { cache: "no-store" });
      const payload = {
        exportedAt: new Date().toISOString(),
        config: assetDisplayConfig,
        assets: visibleAssets
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `geoai-assets-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setAssetDisplayError("Không xuất được dữ liệu tài sản.");
    }
  }, [assetDisplayConfig, canExportAssets, visibleAssets]);

  const exportFilteredPropertyResults = useCallback(() => {
    if (!canUseFilters) return;

    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        filters: assetFilters,
        result: propertySearchResult || { items: [] }
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `geoai-filtered-properties-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      const nextHistory = addFilterHistory(filterHistory, "filters.export", assetFilters);
      setFilterHistory(nextHistory);
      setFilterStatus("Đã xuất dữ liệu đã lọc.");
      persistFilterState(assetFilters, filterPresets, nextHistory);
    } catch {
      setFilterStatus("Không thể xuất dữ liệu đã lọc.");
    }
  }, [
    assetFilters,
    canUseFilters,
    filterHistory,
    filterPresets,
    persistFilterState,
    propertySearchResult
  ]);

  const persistExportState = useCallback((templates, history) => {
    const saved = writeExportStorage(window.localStorage, { templates, history });
    if (!saved) {
      setExportStatus("Export history could not be saved locally.");
    }
  }, []);

  const currentExportState = useCallback(
    (metadata = exportMetadata) =>
      buildMapExportState({
        viewport: mapViewport,
        basemap: selectedBasemap,
        visibleLayers,
        filters: assetFilters,
        focusedProperty,
        propertySearchResult,
        measurement: measurementResult.error ? null : measurementResult,
        metadata
      }),
    [
      assetFilters,
      exportMetadata,
      focusedProperty,
      mapViewport,
      measurementResult,
      propertySearchResult,
      selectedBasemap,
      visibleLayers
    ]
  );

  const recordExportHistory = useCallback(
    (format, metadata, status = "success") => {
      const nextHistory = addExportHistory(exportHistory, format, metadata, status);
      setExportHistory(nextHistory);
      persistExportState(exportTemplates, nextHistory);
      return nextHistory;
    },
    [exportHistory, exportTemplates, persistExportState]
  );

  const updateExportMetadata = useCallback((metadata) => {
    setExportMetadata(normalizeExportMetadata(metadata));
  }, []);

  const saveExportTemplate = useCallback(() => {
    if (!canExportMap) return;
    const template = {
      name: exportMetadata.title || `Template ${exportTemplates.length + 1}`,
      metadata: normalizeExportMetadata(exportMetadata)
    };
    const nextTemplates = [
      template,
      ...exportTemplates.filter((item) => item.name !== template.name)
    ].slice(0, 20);
    setExportTemplates(nextTemplates);
    persistExportState(nextTemplates, exportHistory);
    setExportStatus("Export template saved.");
  }, [canExportMap, exportHistory, exportMetadata, exportTemplates, persistExportState]);

  const loadExportTemplate = useCallback((template) => {
    setExportMetadata(normalizeExportMetadata(template?.metadata));
    setExportStatus(`Loaded template: ${template?.name}`);
  }, []);

  const exportMapPng = useCallback(async () => {
    if (!canExportMap) return;

    const metadata = normalizeExportMetadata({ ...exportMetadata, format: "png" });
    try {
      const image = await captureElementPng(mapCanvasRef.current);
      downloadDataUrl(image, `geoai-map-${new Date().toISOString().slice(0, 10)}.png`);
      recordExportHistory("png", metadata, "success");
      setExportStatus("Map exported as PNG.");
    } catch (error) {
      recordExportHistory("png", metadata, "error");
      setExportStatus(error.message || "PNG export failed.");
    }
  }, [canExportMap, exportMetadata, recordExportHistory]);

  const exportMapPdf = useCallback(async () => {
    if (!canExportMap) return;

    const metadata = normalizeExportMetadata({ ...exportMetadata, format: "pdf" });
    try {
      const image = await captureElementPng(mapCanvasRef.current);
      exportPrintablePdf({
        imageDataUrl: image,
        metadata
      });
      recordExportHistory("pdf", metadata, "success");
      setExportStatus("PDF export opened in a print window.");
    } catch (error) {
      recordExportHistory("pdf", metadata, "error");
      setExportStatus(error.message || "PDF export failed.");
    }
  }, [canExportMap, exportMetadata, recordExportHistory]);

  const copyShareLink = useCallback(async () => {
    if (!canShareMap) return;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      const state = currentExportState(exportMetadata);
      const url = shareUrlFromState(state, window.location.href, {
        expiresInHours: exportMetadata.shareExpiryHours
      });
      await navigator.clipboard.writeText(url);
      recordExportHistory("share", exportMetadata, "success");
      setExportStatus("Share link copied.");
    } catch (error) {
      recordExportHistory("share", exportMetadata, "error");
      setExportStatus(error.message || "Share link copy failed.");
    }
  }, [canShareMap, currentExportState, exportMetadata, recordExportHistory]);

  const leftTools = useMemo(
    () =>
      [
        { id: "scan", label: TOOL_TEXT.scan, icon: "scan", badge: rectangleCoords ? "1" : null },
        { id: "basemap", label: TOOL_TEXT.basemap, icon: "basemap" },
        canViewLayers
          ? { id: "layers", label: TOOL_TEXT.layers, icon: "layers", badge: visibleLayers.length || null }
          : null,
        canViewLayers
          ? { id: "assets", label: TOOL_TEXT.assets, icon: "assets", badge: poiResults.length || visibleAssets.length || null }
          : null,
        {
          id: "heatmap",
          label: TOOL_TEXT.heatmap,
          icon: "heatmap",
          badge: buildingHeatmap ? "ON" : isHeatmapLoading ? "..." : null,
          onClick: toggleBuildingHeatmap
        }
      ].filter(Boolean),
    [
      buildingHeatmap,
      canViewLayers,
      isHeatmapLoading,
      poiResults.length,
      rectangleCoords,
      toggleBuildingHeatmap,
      visibleAssets.length,
      visibleLayers.length
    ]
  );

  const rightTools = useMemo(
    () =>
      [
        canUseFilters ? { id: "filters", label: TOOL_TEXT.filters, icon: "filters" } : null,
        canMeasure ? { id: "measurement", label: TOOL_TEXT.measurement, icon: "measurement" } : null,
        canDrawSpatial ? { id: "draw", label: TOOL_TEXT.draw, icon: "draw" } : null,
        canExportMap || canShareMap ? { id: "export", label: TOOL_TEXT.exportShare, icon: "export" } : null,
        { id: "fullscreen", label: isFullscreen ? TOOL_TEXT.exitFullscreen : TOOL_TEXT.fullscreen, icon: "fullscreen", onClick: toggleFullscreen }
      ].filter(Boolean),
    [canDrawSpatial, canExportMap, canMeasure, canShareMap, canUseFilters, isFullscreen]
  );

  const activeToolConfig = [...leftTools, ...rightTools].find((tool) => tool.id === activeTool);
  const activeToolSide = rightTools.some((tool) => tool.id === activeTool) ? "right" : "left";

  const renderActiveToolPanel = () => {
    switch (activeTool) {
      case "scan":
        return (
          <ScanToolPanel
            styles={styles}
            adminOptions={ADMIN_OPTIONS}
            scanModeOptions={SCAN_MODE_OPTIONS}
            adminArea={adminArea}
            scanMode={scanMode}
            selectedScanMode={selectedScanMode}
            rectangleCoords={rectangleCoords}
            isAnalyzing={isAnalyzing}
            isFullscreen={isFullscreen}
            onAdminAreaChange={(value) => {
              setAdminArea(value);
              setAnalysisResults(null);
            }}
            onScanModeChange={(value) => {
              setScanMode(value);
              setAnalysisResults(null);
            }}
            onRequestSelection={requestSelection}
            onRequestCapture={requestCapture}
            onClearWorkspace={clearWorkspace}
            onToggleFullscreen={toggleFullscreen}
          />
        );
      case "basemap":
        return (
          <BasemapToolPanel
            styles={styles}
            basemaps={BASEMAPS}
            selectedBasemapId={selectedBasemapId}
            selectedBasemap={selectedBasemap}
            onChange={setSelectedBasemapId}
          />
        );
      case "layers":
        return canViewLayers ? (
          <LayerToolPanel
            styles={styles}
            layers={DATA_LAYERS}
            state={layerState}
            onToggle={updateLayerVisibility}
            onToggleGroup={updateLayerGroupVisibility}
            onOpacityChange={updateLayerOpacity}
            onMove={updateLayerOrder}
            onReorder={updateLayerReorder}
            onRefresh={refreshLayer}
            layerStatuses={layerStatuses}
            canToggle={canViewLayers}
            canManage={canManageLayers}
            history={layerHistory}
            onExport={exportLayerConfig}
            status={layerConfigStatus}
          />
        ) : null;
      case "assets":
        return canViewLayers ? (
          <div className={styles.toolPanelStack}>
            <label className={styles.poiLayerToggle}>
              <input
                type="checkbox"
                checked={poiEnabled}
                onChange={(event) => setPoiEnabled(event.target.checked)}
              />
              <span>Hiển thị tài sản trên bản đồ</span>
            </label>
            <PoiSearchPanel
              mapBounds={mapViewport?.bounds}
              onResults={(items) => {
                setPoiEnabled(true);
                setPoiMode("manual");
                setPoiResults(items);
              }}
              onClear={() => {
                setPoiMode("auto");
                setPoiResults([]);
              }}
            />
          </div>
        ) : null;
      case "filters":
        return canUseFilters ? (
          <FilterToolPanel
            styles={styles}
            filters={assetFilters}
            resultCount={propertySearchResult?.meta?.total ?? propertySearchResult?.items?.length ?? 0}
            presets={filterPresets}
            history={filterHistory}
            canUseFilters={canUseFilters}
            onApply={applyFilters}
            onSavePreset={saveFilterPreset}
            onExport={exportFilteredPropertyResults}
            status={filterStatus}
          />
        ) : null;
      case "measurement":
        return canMeasure ? (
          <MeasurementToolPanel
            styles={styles}
            canMeasure={canMeasure}
            state={measurementState}
            result={measurementResult}
            history={measurementHistory}
            status={measurementStatus}
            onModeChange={setMeasurementMode}
            onUndo={undoMeasurement}
            onClear={clearMeasurement}
            onCopy={copyMeasurement}
            onSave={saveMeasurementSession}
            onExport={exportMeasurement}
            onToggleSnap={toggleMeasurementSnap}
          />
        ) : null;
      case "draw":
        return canDrawSpatial ? (
          <SpatialDrawToolPanel
            styles={styles}
            canDraw={canDrawSpatial}
            state={spatialDrawState}
            result={spatialDrawResult}
            history={spatialDrawHistory}
            status={spatialDrawStatus}
            onModeChange={setSpatialDrawMode}
            onUndo={undoSpatialDraw}
            onRedo={redoSpatialDraw}
            onSaveDraft={saveSpatialDrawDraft}
            onCancel={cancelSpatialDraw}
            onExport={exportSpatialDraw}
            onToggleSnap={toggleSpatialDrawSnap}
            onAddCoordinate={addSpatialDrawCoordinate}
            onUpdateCoordinate={editSpatialDrawCoordinate}
            onDeleteVertex={deleteSpatialDrawVertex}
            onSelectVertex={selectSpatialDrawVertex}
            onAttributesChange={updateSpatialDrawAttributes}
            onDuplicateLatest={duplicateLatestSpatialDraft}
          />
        ) : null;
      case "export":
        return canExportMap || canShareMap ? (
          <ExportShareToolPanel
            styles={styles}
            canExport={canExportMap}
            canShare={canShareMap}
            metadata={exportMetadata}
            templates={exportTemplates}
            history={exportHistory}
            status={exportStatus}
            onMetadataChange={updateExportMetadata}
            onExportPng={exportMapPng}
            onExportPdf={exportMapPdf}
            onShare={copyShareLink}
            onSaveTemplate={saveExportTemplate}
            onLoadTemplate={loadExportTemplate}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className={styles.mapWorkspace} ref={workspaceRef}>
      <div className={styles.mapCanvas} ref={mapCanvasRef}>
        <MapTopSearchBar
          styles={styles}
          query={propertyQuery}
          suggestions={suggestions}
          sampleQueries={SEMANTIC_SEARCH_SAMPLE_QUERIES}
          isSearching={isSearchingProperties}
          status={propertySearchStatus}
          onQueryChange={setPropertyQuery}
          onFetchSuggestions={fetchSuggestions}
          onSearch={runPropertySearch}
        />
        <MapToolRail
          styles={styles}
          side="left"
          tools={leftTools}
          activeTool={activeTool}
          onSelect={setActiveTool}
        />
        <MapToolRail
          styles={styles}
          side="right"
          tools={rightTools}
          activeTool={activeTool}
          onSelect={setActiveTool}
        />
        {activeToolConfig && activeTool !== "fullscreen" ? (
          <MapToolPopover
            styles={styles}
            title={activeToolConfig.label}
            side={activeToolSide}
            onClose={() => setActiveTool(null)}
          >
            {renderActiveToolPanel()}
          </MapToolPopover>
        ) : null}
        <MapResultsOverlay
          styles={styles}
          propertySearchResult={propertySearchResult}
          propertyResultView={propertyResultView}
          onPropertyResultViewChange={setPropertyResultView}
          onSelectProperty={setFocusedProperty}
          analysisResults={analysisResults}
        />
        <div className={styles.mapModeBadge} data-mode={scanMode}>
          {selectedScanMode?.label}
        </div>
        <Map
          onRectangleDrawn={handleRectangleDrawn}
          onAnalyzeImage={analyzeImage}
          analysisObjects={activeAnalysisObjects}
          selectedBasemap={selectedBasemap}
          onCursorMove={setCursorPosition}
          selectRequestId={selectRequestId}
          captureRequestId={captureRequestId}
          clearRequestId={clearRequestId}
          selectedAdminArea={adminArea}
          visibleLayerIds={visibleLayers}
          layerOpacities={layerOpacities}
          layerOrder={layerState.order}
          layerRefreshRequests={layerRefreshRequests}
          onLayerStatusChange={handleLayerStatusChange}
          assetDisplayConfig={assetDisplayConfig}
          permissions={permissions}
          onAssetLoad={setVisibleAssets}
          onAssetError={setAssetDisplayError}
          propertySearchResult={propertySearchResult}
          focusedProperty={focusedProperty}
          measurementState={measurementState}
          measurementResult={measurementResult}
          visibleAssets={visibleAssets}
          onMeasurementPointAdd={addMeasurementPoint}
          onMeasurementPointEdit={editMeasurementPoint}
          spatialDrawState={canDrawSpatial ? spatialDrawState : DEFAULT_SPATIAL_DRAW_STATE}
          spatialDrawResult={spatialDrawResult}
          onSpatialDrawMapPointAdd={addSpatialDrawCoordinate}
          onSpatialDrawVertexEdit={editSpatialDrawCoordinate}
          onSpatialDrawVertexSelect={selectSpatialDrawVertex}
          onViewportChange={setMapViewport}
          poiResults={poiEnabled ? poiResults : []}
          buildingHeatmap={buildingHeatmap}
        />
      </div>
    </div>
  );
}
