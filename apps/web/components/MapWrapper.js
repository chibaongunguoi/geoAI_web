"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { canAccess } from "@/features/auth/auth-client";
import AssetDisplayPanel from "@/features/map/AssetDisplayPanel";
import CollapsibleSection from "@/features/map/CollapsibleSection";
import LayerPanel from "@/features/map/LayerPanel";
import {
  densitySummaryRows,
  hasDensityResult,
  propertySearchAnswerText
} from "@/features/map/property-search";
import {
  createDefaultAssetDisplayConfig,
  normalizeAssetDisplayConfig,
  readStoredAssetDisplayConfig,
  writeStoredAssetDisplayConfig
} from "@/features/map/assets";
import {
  DATA_LAYERS,
  createDefaultLayerState,
  moveLayer,
  opacityForLayer,
  readStoredLayerState,
  reorderLayer,
  selectLayerVisibility,
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
import styles from "./MapWrapper.module.css";

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
  {
    value: "geoai",
    label: "GeoAI + GeoTIFF",
    description: "Quét vùng đã chọn bằng backend GeoAI."
  },
  {
    value: "overture",
    label: "Overture Maps",
    description: "Dùng footprint công trình đã cache từ Overture."
  }
];

function selectedLabel(options, value) {
  return options.find((option) => option.value === value)?.label || "";
}

export default function MapWrapper({ permissions = [] }) {
  const abortControllerRef = useRef(null);
  const workspaceRef = useRef(null);
  const [adminArea, setAdminArea] = useState("all_da_nang");
  const [scanMode, setScanMode] = useState("geoai");
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
  const [hasLoadedAssetConfig, setHasLoadedAssetConfig] = useState(false);
  const [propertyQuery, setPropertyQuery] = useState(
    "vùng nào ở hòa khánh bắc có số lượng nhà dày đặc nhất"
  );
  const [propertySearchResult, setPropertySearchResult] = useState(null);
  const [propertySearchStatus, setPropertySearchStatus] = useState(null);
  const [isSearchingProperties, setIsSearchingProperties] = useState(false);
  const skipNextLayerPersistRef = useRef(false);
  const skipNextAssetPersistRef = useRef(false);

  const canViewLayers = canAccess(permissions, "layers.view");
  const canManageLayers = canAccess(permissions, "layers.manage");
  const canExportAssets = canAccess(permissions, "assets.importExport");

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

    setLayerState((current) => selectLayerVisibility(current, "analysis-results"));
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

  const clearWorkspace = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
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

  const runPropertySearch = useCallback(async () => {
    const query = propertyQuery.trim();
    if (!query || isSearchingProperties) return;

    setIsSearchingProperties(true);
    setPropertySearchStatus(null);

    try {
      const response = await fetch(
        `/api/properties?query=${encodeURIComponent(query)}&limit=10`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setPropertySearchResult(result);
      setPropertySearchStatus(
        propertySearchAnswerText(result) || `${result.items?.length || 0} ket qua`
      );
    } catch {
      setPropertySearchResult(null);
      setPropertySearchStatus("Khong tim kiem duoc du lieu nha/dat.");
    } finally {
      setIsSearchingProperties(false);
    }
  }, [isSearchingProperties, propertyQuery]);

  const refreshLayer = useCallback((layerId) => {
    setLayerRefreshRequests((current) => ({
      ...current,
      [layerId]: (current[layerId] || 0) + 1
    }));
  }, []);

  const analyzeImage = useCallback(
    async (imageBlob, bbox) => {
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsAnalyzing(true);
      setAnalysisResults(null);

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

  return (
    <div className={styles.mapWorkspace} ref={workspaceRef}>
      <aside className={styles.sidebar} aria-label="Bảng điều khiển GeoAI">
        <div className={styles.brandBlock}>
          <p className={styles.panelLabel}>GeoAI Đà Nẵng</p>
          <h1>Không gian phân tích bản đồ</h1>
          <p>Quét vùng, bật lớp dữ liệu và kiểm tra kết quả trong cùng một màn hình.</p>
        </div>

        <CollapsibleSection
          title="Thiết lập vùng quét"
          summary={`${selectedLabel(ADMIN_OPTIONS, adminArea)} | ${selectedScanMode?.label}`}
        >
          <div className={styles.compactControlGroup}>
            <label>
              Khu vực
              <select
                className={styles.selectInput}
                value={adminArea}
                disabled={isAnalyzing}
                onChange={(event) => {
                  setAdminArea(event.target.value);
                  setAnalysisResults(null);
                }}
              >
                {ADMIN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kiểu quét
              <select
                className={styles.selectInput}
                value={scanMode}
                disabled={isAnalyzing}
                onChange={(event) => {
                  setScanMode(event.target.value);
                  setAnalysisResults(null);
                }}
              >
                {SCAN_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className={styles.actionHint}>{selectedScanMode?.description}</p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Bản đồ nền"
          summary={`${selectedBasemap.label} | z${selectedBasemap.minZoom}-${selectedBasemap.maxZoom}`}
        >
          <div className={styles.compactControlGroup}>
            <select
              className={styles.selectInput}
              value={selectedBasemapId}
              onChange={(event) => {
                setSelectedBasemapId(event.target.value);
              }}
            >
              {BASEMAPS.map((basemap) => (
                <option key={basemap.id} value={basemap.id}>
                  {basemap.label}
                </option>
              ))}
            </select>

            <p className={styles.actionHint}>{selectedBasemap.description}</p>
            <dl className={styles.mapMetaList}>
              <div>
                <dt>Nguồn</dt>
                <dd>{selectedBasemap.source}</dd>
              </div>
              <div>
                <dt>Zoom</dt>
                <dd>
                  {selectedBasemap.minZoom}-{selectedBasemap.maxZoom}
                </dd>
              </div>
            </dl>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Tìm kiếm nhà đất"
          summary={propertySearchResult?.answer?.type === "density" ? "Mật độ nhà" : "Ngôn ngữ tự nhiên"}
          defaultOpen
        >
          <form
            className={styles.propertySearch}
            onSubmit={(event) => {
              event.preventDefault();
              runPropertySearch();
            }}
          >
            <label>
              Câu hỏi
              <textarea
                className={styles.textAreaInput}
                value={propertyQuery}
                rows={3}
                onChange={(event) => setPropertyQuery(event.target.value)}
              />
            </label>
            <button
              className={styles.primaryAction}
              type="submit"
              disabled={isSearchingProperties || !propertyQuery.trim()}
            >
              {isSearchingProperties ? "Đang tìm..." : "Tìm kiếm"}
            </button>
          </form>
          {propertySearchStatus ? (
            <p className={styles.actionHint} role="status">
              {propertySearchStatus}
            </p>
          ) : null}
          {hasDensityResult(propertySearchResult) ? (
            <ol className={styles.densityList}>
              {densitySummaryRows(propertySearchResult).map((region) => (
                <li key={region.id}>
                  <span>{region.label}</span>
                  <strong>{region.count.toLocaleString("vi-VN")}</strong>
                </li>
              ))}
            </ol>
          ) : null}
        </CollapsibleSection>

        {canViewLayers ? (
          <CollapsibleSection title="Lớp dữ liệu" summary={`${visibleLayers.length} đang bật`}>
            <LayerPanel
              layers={DATA_LAYERS}
              state={layerState}
              onToggle={updateLayerVisibility}
              onToggleGroup={updateLayerGroupVisibility}
              onOpacityChange={updateLayerOpacity}
              onMove={updateLayerOrder}
              onReorder={updateLayerReorder}
              onRefresh={refreshLayer}
              layerStatuses={layerStatuses}
              canManage={canManageLayers}
              history={layerHistory}
              onExport={exportLayerConfig}
            />
            {layerConfigStatus ? (
              <p className={styles.actionHint} role="status">
                {layerConfigStatus}
              </p>
            ) : null}
          </CollapsibleSection>
        ) : null}

        {canViewLayers ? (
          <CollapsibleSection
            title="Hiển thị tài sản"
            summary={`${visibleAssets.length} trong vùng xem`}
          >
            <AssetDisplayPanel
              config={assetDisplayConfig}
              permissions={permissions}
              status={assetDisplayStatus}
              error={assetDisplayError}
              history={assetHistory}
              visibleAssetCount={visibleAssets.length}
              onConfigChange={(config) =>
                setAssetDisplayConfig(normalizeAssetDisplayConfig(config))
              }
              onExport={exportVisibleAssets}
            />
          </CollapsibleSection>
        ) : null}

        <CollapsibleSection
          title="Thao tác quét"
          summary={rectangleCoords ? "Đã chọn vùng" : "Chưa chọn vùng"}
          defaultOpen
        >
          <div className={styles.actionGroup}>
            <button
              className={styles.secondaryAction}
              type="button"
              disabled={isAnalyzing}
              onClick={requestSelection}
            >
              Chọn khung quét
            </button>
            <button
              className={styles.primaryAction}
              type="button"
              disabled={!rectangleCoords || isAnalyzing}
              onClick={requestCapture}
            >
              {isAnalyzing ? "Đang quét..." : "Quét vùng đã chọn"}
            </button>
            <button
              className={styles.dangerAction}
              type="button"
              disabled={!rectangleCoords && !analysisResults && !isAnalyzing}
              onClick={clearWorkspace}
            >
              Xóa vùng
            </button>
            <button
              className={styles.secondaryAction}
              type="button"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            </button>
            <p className={styles.actionHint}>Diện tích quét hợp lệ tối đa 25 ha.</p>
          </div>
        </CollapsibleSection>

        {rectangleCoords ? (
          <CollapsibleSection title="Vùng đã chọn" summary="Tọa độ">
            <div className={styles.coordinateList}>
              <span>
                NE {rectangleCoords.northEast[0].toFixed(5)},{" "}
                {rectangleCoords.northEast[1].toFixed(5)}
              </span>
              <span>
                SW {rectangleCoords.southWest[0].toFixed(5)},{" "}
                {rectangleCoords.southWest[1].toFixed(5)}
              </span>
            </div>
          </CollapsibleSection>
        ) : null}

        <CollapsibleSection
          title="Con trỏ"
          summary={cursorPosition ? `z${cursorPosition.zoom}` : "Di chuyển trên bản đồ"}
        >
          <div className={styles.coordinateList}>
            {cursorPosition ? (
              <>
                <span>Lat {cursorPosition.lat.toFixed(6)}</span>
                <span>Lng {cursorPosition.lng.toFixed(6)}</span>
                <span>Zoom {cursorPosition.zoom}</span>
              </>
            ) : (
              <span>Di chuyển chuột trên bản đồ</span>
            )}
          </div>
        </CollapsibleSection>

        {isAnalyzing ? (
          <div className={styles.status} role="status" aria-live="polite">
            Đang gửi vùng quét đến máy chủ...
          </div>
        ) : null}

        {analysisResults ? (
          <CollapsibleSection
            title="Kết quả"
            summary={`${analysisResults.analysis.buildings.count} công trình`}
            defaultOpen
          >
            <div className={styles.resultGrid}>
              <div className={styles.metric}>
                <span>Công trình</span>
                <strong>{analysisResults.analysis.buildings.count}</strong>
              </div>
              <div className={styles.metric}>
                <span>Đối tượng</span>
                <strong>{analysisResults.analysis.objects?.length || 0}</strong>
              </div>
            </div>
            <p className={styles.meta}>
              Vùng hợp lệ: {analysisResults.validAreaHectares || 0} ha
            </p>
            <p className={styles.meta}>Nguồn: {analysisResults.dataSource}</p>
            {analysisResults.modelName ? (
              <p className={styles.meta}>Model: {analysisResults.modelName}</p>
            ) : null}
            <p className={styles.meta}>Thời gian xử lý: {analysisResults.processingTime}</p>
          </CollapsibleSection>
        ) : null}
      </aside>

      <div className={styles.mapCanvas}>
        <div className={styles.mapModeBadge} data-mode={scanMode}>
          {selectedScanMode?.label}
        </div>
        <Map
          onRectangleDrawn={handleRectangleDrawn}
          onAnalyzeImage={analyzeImage}
          analysisObjects={analysisResults?.analysis?.objects || []}
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
        />
      </div>
    </div>
  );
}
