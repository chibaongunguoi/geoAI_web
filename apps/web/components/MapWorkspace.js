"use client";
import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "./MapWrapper.module.css";
import MapResultsOverlay from "./map-workspace/MapResultsOverlay";
import MapToolPopover from "./map-workspace/MapToolPopover";
import MapToolRail from "./map-workspace/MapToolRail";
import MapTopSearchBar from "./map-workspace/MapTopSearchBar";
import {
  AssetDisplayToolPanel, BasemapToolPanel, ExportShareToolPanel, FilterToolPanel,
  LayerToolPanel, MeasurementToolPanel, ScanToolPanel, SpatialDrawToolPanel
} from "./map-workspace/ToolPanels";
import ReportToolPanel from "@/features/report/ReportToolPanel";
import { ReportService } from "@/features/report/report.service";
import { useMapState } from "@/features/map/contexts/MapStateContext";
import { useMapSearch } from "@/features/map/contexts/MapSearchContext";
import { useDrawTool } from "@/features/map/contexts/DrawToolContext";
import { BASEMAPS } from "@/features/map/basemaps";
import { canAccess } from "@/features/auth/auth-client";

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
  { value: "geoai-disabled", disabled: true, label: "GeoAI + GeoTIFF", description: "Quét vùng đã chọn bằng backend GeoAI." },
  { value: "overture", label: "Overture Maps", description: "Dùng footprint công trình đã cache từ Overture." }
];

const SEMANTIC_SEARCH_SAMPLE_QUERIES = [
  "Vùng nào nhiều nhà nhất ở Hòa Khánh Bắc",
  "Vùng nào thưa thớt nhất ở Liên Chiểu",
  "Cho tôi danh sách nhà ở Hải Châu",
  "Có bao nhiêu tòa nhà ở Hòa Khánh Bắc, Liên Chiểu?",
  "Tìm nhà đang hoạt động ở Sơn Trà",
  "16.08828, 108.21860"
];

const TOOL_TEXT = {
  scan: "Thao tác quét",
  basemap: "Bản đồ nền",
  layers: "Lớp dữ liệu",
  assets: "Hiển thị tài sản",
  poi: "Điểm quan tâm",
  heatmap: "Heatmap mật độ nhà",
  riskZones: "Heatmap cảnh báo ngập lụt/sạt lở",
  filters: "Bộ lọc nâng cao",
  measurement: "Đo khoảng cách/diện tích",
  draw: "Vẽ không gian (Spatial draw)",
  report: "Phản ánh hiện trường",
  exportShare: "Xuất & Chia sẻ",
  exitFullscreen: "Thoát toàn màn hình",
  fullscreen: "Toàn màn hình"
};

export default function MapWorkspace({ permissions = [], workspaceRef, mapCanvasRef }) {
  const mapState = useMapState();
  const mapSearch = useMapSearch();
  const drawTool = useDrawTool();

  const isOfficerOrAdmin = canAccess(permissions, "admin.users.view") || canAccess(permissions, "properties.manage");

  const [activeTool, setActiveTool] = useState("scan");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Report states
  const [isPickingReportLocation, setIsPickingReportLocation] = useState(false);
  const [reportLocation, setReportLocation] = useState(null);
  const [showMyReports, setShowMyReports] = useState(false);
  const [myReports, setMyReports] = useState([]);

  useEffect(() => {
    let isMounted = true;
    if (showMyReports) {
      ReportService.getReports("PENDING").then(data => {
        if (isMounted) setMyReports(data || []);
      }).catch(err => {
        console.error("Failed to fetch reports:", err);
      });
    } else {
      setMyReports([]);
    }
    return () => { isMounted = false; };
  }, [showMyReports]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === workspaceRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [workspaceRef]);

  const toggleFullscreen = async () => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await workspace.requestFullscreen();
  };

  const leftTools = useMemo(() => [
    { id: "scan", label: TOOL_TEXT.scan, icon: "scan", badge: drawTool.rectangleCoords ? "1" : null },
    !isOfficerOrAdmin ? { id: "report", label: TOOL_TEXT.report, icon: "alert" } : null,
    { id: "basemap", label: TOOL_TEXT.basemap, icon: "basemap" },
    { id: "layers", label: TOOL_TEXT.layers, icon: "layers", badge: mapState.visibleLayers.length || null },
    { id: "assets", label: TOOL_TEXT.assets, icon: "assets", badge: mapSearch.poiEnabled ? "ON" : null, onClick: () => mapSearch.setPoiEnabled(!mapSearch.poiEnabled) },
    { id: "heatmap", label: TOOL_TEXT.heatmap, icon: "heatmap", badge: mapState.buildingHeatmap ? "ON" : mapState.isHeatmapLoading ? "..." : null, onClick: mapState.toggleBuildingHeatmap },
    { id: "riskZones", label: TOOL_TEXT.riskZones, icon: "riskZones", badge: mapState.riskZones ? "ON" : mapState.isRiskZonesLoading ? "..." : null, onClick: mapState.toggleRiskZones }
  ].filter(Boolean), [mapState.buildingHeatmap, mapState.isHeatmapLoading, mapState.riskZones, mapState.isRiskZonesLoading, mapState.canViewLayers, mapSearch.poiResults.length, drawTool.rectangleCoords, mapState.toggleBuildingHeatmap, mapState.toggleRiskZones, mapState.visibleAssets.length, mapState.visibleLayers.length, mapSearch.poiEnabled, isOfficerOrAdmin]);

  const rightTools = useMemo(() => [
    mapSearch.canUseFilters ? { id: "filters", label: TOOL_TEXT.filters, icon: "filters" } : null,
    drawTool.canMeasure ? { id: "measurement", label: TOOL_TEXT.measurement, icon: "measurement" } : null,
    drawTool.canDrawSpatial ? { id: "draw", label: TOOL_TEXT.draw, icon: "draw" } : null,
    drawTool.canExportMap || drawTool.canShareMap ? { id: "export", label: TOOL_TEXT.exportShare, icon: "export" } : null,
    { id: "fullscreen", label: isFullscreen ? TOOL_TEXT.exitFullscreen : TOOL_TEXT.fullscreen, icon: "fullscreen", onClick: toggleFullscreen }
  ].filter(Boolean), [drawTool.canDrawSpatial, drawTool.canExportMap, drawTool.canMeasure, drawTool.canShareMap, mapSearch.canUseFilters, isFullscreen]);

  const activeToolConfig = [...leftTools, ...rightTools].find((tool) => tool.id === activeTool);
  const activeToolSide = rightTools.some((tool) => tool.id === activeTool) ? "right" : "left";
  const selectedScanMode = SCAN_MODE_OPTIONS.find((mode) => mode.value === mapState.scanMode);

  const renderActiveToolPanel = () => {
    switch (activeTool) {
      case "scan":
        return (
          <ScanToolPanel
            styles={styles}
            adminOptions={ADMIN_OPTIONS}
            scanModeOptions={SCAN_MODE_OPTIONS}
            adminArea={mapState.adminArea}
            scanMode={mapState.scanMode}
            selectedScanMode={selectedScanMode}
            rectangleCoords={drawTool.rectangleCoords}
            isAnalyzing={mapSearch.isAnalyzing}
            isFullscreen={isFullscreen}
            onAdminAreaChange={(value) => {
              mapState.setAdminArea(value);
              mapSearch.setAnalysisResults(null);
            }}
            onScanModeChange={(value) => {
              mapState.setScanMode(value);
              mapSearch.setAnalysisResults(null);
            }}
            onRequestSelection={drawTool.requestSelection}
            onRequestCapture={drawTool.requestCapture}
            onClearWorkspace={drawTool.clearWorkspace}
            onToggleFullscreen={toggleFullscreen}
          />
        );
      case "basemap":
        return (
          <BasemapToolPanel
            styles={styles}
            basemaps={BASEMAPS}
            selectedBasemapId={mapState.selectedBasemapId}
            selectedBasemap={mapState.selectedBasemap}
            onChange={mapState.setSelectedBasemapId}
          />
        );
      case "report":
        return (
          <ReportToolPanel
            styles={styles}
            permissions={permissions}
            isPickingLocation={isPickingReportLocation}
            reportLocation={reportLocation}
            showMyReports={showMyReports}
            setShowMyReports={setShowMyReports}
            onEnablePickLocation={() => {
              setIsPickingReportLocation(true);
              setReportLocation(null);
            }}
            onCancelPick={() => {
              setIsPickingReportLocation(false);
              setReportLocation(null);
            }}
            onReportCreated={() => {
              setIsPickingReportLocation(false);
              setReportLocation(null);
              // We should trigger a refresh of reports here. 
              // We can do it by firing a global event.
              window.dispatchEvent(new Event("geoai:refresh-reports"));
            }}
          />
        );
      case "layers":
        return mapState.canViewLayers ? (
          <LayerToolPanel
            styles={styles}
            layers={mapState.layers}
            state={mapState.layerState}
            onToggle={mapState.updateLayerVisibility}
            onToggleGroup={mapState.updateLayerGroupVisibility}
            onOpacityChange={mapState.updateLayerOpacity}
            onMove={mapState.updateLayerOrder}
            onReorder={mapState.updateLayerReorder}
            onRefresh={(layerId) => {
              mapState.setLayerRefreshRequests((current) => ({
                ...current,
                [layerId]: (current[layerId] || 0) + 1
              }));
            }}
            layerStatuses={mapState.layerStatuses}
            canToggle={mapState.canViewLayers}
            canManage={mapState.canManageLayers}
            history={mapState.layerHistory}
            onExport={() => {}} 
            status={mapState.layerConfigStatus}
          />
        ) : null;

      case "filters":
        return mapSearch.canUseFilters ? (
          <FilterToolPanel
            styles={styles}
            filters={mapSearch.assetFilters}
            resultCount={mapSearch.propertySearchResult?.meta?.total ?? mapSearch.propertySearchResult?.items?.length ?? 0}
            presets={mapSearch.filterPresets}
            history={mapSearch.filterHistory}
            onApply={mapSearch.applyFilters}
            onSavePreset={mapSearch.saveFilterPreset}
            onExport={mapSearch.exportFilteredPropertyResults}
            status={mapSearch.filterStatus}
          />
        ) : null;
      case "measurement":
        return drawTool.canMeasure ? (
          <MeasurementToolPanel
            styles={styles}
            canMeasure={drawTool.canMeasure}
            state={drawTool.measurementState}
            result={drawTool.measurementResult}
            history={drawTool.measurementHistory}
            status={drawTool.measurementStatus}
            onModeChange={drawTool.setMeasurementMode}
            onUndo={drawTool.undoMeasurement}
            onClear={drawTool.clearMeasurement}
            onCopy={drawTool.copyMeasurement}
            onSave={drawTool.saveMeasurementSession}
            onExport={drawTool.exportMeasurement}
            onToggleSnap={drawTool.toggleMeasurementSnap}
          />
        ) : null;
      case "draw":
        return drawTool.canDrawSpatial ? (
          <SpatialDrawToolPanel
            styles={styles}
            canDraw={drawTool.canDrawSpatial}
            state={drawTool.spatialDrawState}
            result={drawTool.spatialDrawResult}
            history={drawTool.spatialDrawHistory}
            status={drawTool.spatialDrawStatus}
            onModeChange={drawTool.setSpatialDrawMode}
            onUndo={drawTool.undoSpatialDraw}
            onRedo={drawTool.redoSpatialDraw}
            onSaveDraft={drawTool.saveSpatialDrawDraft}
            onCancel={drawTool.cancelSpatialDraw}
            onExport={drawTool.exportSpatialDraw}
            onToggleSnap={drawTool.toggleSpatialDrawSnap}
            onAddCoordinate={drawTool.addSpatialDrawCoordinate}
            onUpdateCoordinate={drawTool.editSpatialDrawCoordinate}
            onDeleteVertex={drawTool.deleteSpatialDrawVertex}
            onSelectVertex={drawTool.selectSpatialDrawVertex}
            onAttributesChange={drawTool.updateSpatialDrawAttributes}
            onDuplicateLatest={drawTool.duplicateLatestSpatialDraft}
          />
        ) : null;
      case "export":
        return drawTool.canExportMap || drawTool.canShareMap ? (
          <ExportShareToolPanel
            styles={styles}
            canExport={drawTool.canExportMap}
            canShare={drawTool.canShareMap}
            metadata={drawTool.exportMetadata}
            templates={drawTool.exportTemplates}
            history={drawTool.exportHistory}
            status={drawTool.exportStatus}
            onMetadataChange={drawTool.updateExportMetadata}
            onExportPng={drawTool.exportMapPng}
            onExportPdf={drawTool.exportMapPdf}
            onShare={drawTool.copyShareLink}
            onSaveTemplate={drawTool.saveExportTemplate}
            onLoadTemplate={drawTool.loadExportTemplate}
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
          initialQuery={mapSearch.propertyQuery}
          sampleQueries={SEMANTIC_SEARCH_SAMPLE_QUERIES}
          isSearching={mapSearch.isSearchingProperties}
          status={mapSearch.propertySearchStatus}
          onSearch={mapSearch.runPropertySearch}
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
          propertySearchResult={mapSearch.propertySearchResult}
          propertyResultView={mapSearch.propertyResultView}
          onPropertyResultViewChange={mapSearch.setPropertyResultView}
          onSelectProperty={mapSearch.setFocusedProperty}
          analysisResults={mapSearch.analysisResults}
          onClearAnalysisResults={() => mapSearch.setAnalysisResults(null)}
          onClearPropertySearchResults={() => mapSearch.setPropertySearchResult(null)}
        />
        <div className={styles.mapModeBadge} data-mode={mapState.scanMode}>
          {selectedScanMode?.label}
        </div>
        <Map
          onRectangleDrawn={drawTool.handleRectangleDrawn}
          isPickingReportLocation={isPickingReportLocation}
          showMyReports={showMyReports}
          myReports={myReports}
          reportLocation={reportLocation}
          onReportLocationPick={(latlng) => {
            setReportLocation(latlng);
            setIsPickingReportLocation(false);
          }}
          onAnalyzeImage={mapSearch.analyzeImage}
          analysisObjects={mapSearch.analysisResults?.analysis?.objects || []}
          selectedBasemap={mapState.selectedBasemap}
          selectRequestId={drawTool.selectRequestId}
          captureRequestId={drawTool.captureRequestId}
          clearRequestId={drawTool.clearRequestId}
          selectedAdminArea={mapState.adminArea}
          layers={mapState.layers}
          visibleLayerIds={mapState.visibleLayers}
          layerOpacities={mapState.layerState?.opacities || {}}
          layerOrder={mapState.layerState?.order || []}
          layerRefreshRequests={mapState.layerRefreshRequests}
          onLayerStatusChange={mapState.handleLayerStatusChange}
          assetDisplayConfig={mapState.assetDisplayConfig}
          permissions={permissions}
          onAssetLoad={mapState.setVisibleAssets}
          onAssetError={mapState.setAssetDisplayError}
          propertySearchResult={mapSearch.propertySearchResult}
          focusedProperty={mapSearch.focusedProperty}
          measurementState={drawTool.measurementState}
          measurementResult={drawTool.measurementResult}
          visibleAssets={mapState.visibleAssets}
          onMeasurementPointAdd={drawTool.addMeasurementPoint}
          onMeasurementPointEdit={drawTool.editMeasurementPoint}
          spatialDrawState={drawTool.canDrawSpatial ? drawTool.spatialDrawState : undefined}
          spatialDrawResult={drawTool.spatialDrawResult}
          onSpatialDrawMapPointAdd={drawTool.addSpatialDrawCoordinate}
          onSpatialDrawVertexEdit={drawTool.editSpatialDrawCoordinate}
          onSpatialDrawVertexSelect={drawTool.selectSpatialDrawVertex}
          onViewportChange={mapSearch.setMapViewport}
          poiResults={mapSearch.poiEnabled ? mapSearch.poiResults : []}
          buildingHeatmap={mapState.buildingHeatmap}
          riskZones={mapState.riskZones}
        />
      </div>
    </div>
  );
}
