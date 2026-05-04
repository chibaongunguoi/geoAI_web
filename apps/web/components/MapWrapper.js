"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { canAccess } from "@/features/auth/auth-client";
import CollapsibleSection from "@/features/map/CollapsibleSection";
import LayerPanel from "@/features/map/LayerPanel";
import {
  DATA_LAYERS,
  createDefaultLayerState,
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

  useEffect(() => {
    setSelectedBasemapId(readStoredBasemap(window.localStorage));
    setLayerState(readStoredLayerState(window.localStorage, DATA_LAYERS));
  }, []);

  useEffect(() => {
    writeStoredBasemap(window.localStorage, selectedBasemapId);
  }, [selectedBasemapId]);

  useEffect(() => {
    writeStoredLayerState(window.localStorage, layerState);
  }, [layerState]);

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
    setLayerStatuses((current) =>
      current[layerId] === status ? current : { ...current, [layerId]: status }
    );
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
  const canViewLayers = canAccess(permissions, "layers.view");
  const visibleLayers = useMemo(() => visibleLayerIds(layerState), [layerState]);
  const layerOpacities = useMemo(
    () =>
      Object.fromEntries(
        DATA_LAYERS.map((layer) => [layer.id, opacityForLayer(layerState, layer.id)])
      ),
    [layerState]
  );

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
              layerStatuses={layerStatuses}
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
          onLayerStatusChange={handleLayerStatusChange}
        />
      </div>
    </div>
  );
}
