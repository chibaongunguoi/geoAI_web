const fs = require('fs');
const path = require('path');

const mapJsPath = path.join(__dirname, 'MapWrapper.js.backup');
const lines = fs.readFileSync(mapJsPath, 'utf8').split('\n');

const mapWorkspaceContent = `"use client";
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
import { useMapState } from "@/features/map/contexts/MapStateContext";
import { useMapSearch } from "@/features/map/contexts/MapSearchContext";
import { useDrawTool } from "@/features/map/contexts/DrawToolContext";

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

export default function MapWorkspace({ permissions, workspaceRef, mapCanvasRef }) {
  const mapState = useMapState();
  const mapSearch = useMapSearch();
  const drawTool = useDrawTool();

  const [activeTool, setActiveTool] = useState("scan");
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    { id: "basemap", label: TOOL_TEXT.basemap, icon: "basemap" },
    mapState.canViewLayers ? { id: "layers", label: TOOL_TEXT.layers, icon: "layers", badge: mapState.visibleLayers.length || null } : null,
    mapState.canViewLayers ? { id: "assets", label: TOOL_TEXT.assets, icon: "assets", badge: mapSearch.poiEnabled ? "ON" : null } : null,
    { id: "heatmap", label: TOOL_TEXT.heatmap, icon: "heatmap", badge: mapState.buildingHeatmap ? "ON" : mapState.isHeatmapLoading ? "..." : null, onClick: mapState.toggleBuildingHeatmap }
  ].filter(Boolean), [mapState.buildingHeatmap, mapState.canViewLayers, mapState.isHeatmapLoading, mapSearch.poiResults.length, drawTool.rectangleCoords, mapState.toggleBuildingHeatmap, mapState.visibleAssets.length, mapState.visibleLayers.length, mapSearch.poiEnabled]);

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

` + lines.slice(1398, 1550).join('\n')
  .replace(/adminArea/g, 'mapState.adminArea')
  .replace(/setAdminArea/g, 'mapState.setAdminArea')
  .replace(/scanMode/g, 'mapState.scanMode')
  .replace(/setScanMode/g, 'mapState.setScanMode')
  .replace(/isAnalyzing/g, 'mapSearch.isAnalyzing')
  .replace(/setAnalysisResults/g, 'mapSearch.setAnalysisResults')
  .replace(/rectangleCoords/g, 'drawTool.rectangleCoords')
  .replace(/requestSelection/g, 'drawTool.requestSelection')
  .replace(/requestCapture/g, 'drawTool.requestCapture')
  .replace(/clearWorkspace/g, 'drawTool.clearWorkspace')
  
  .replace(/selectedBasemapId/g, 'mapState.selectedBasemapId')
  .replace(/selectedBasemap\}/g, 'mapState.selectedBasemap}')
  .replace(/setSelectedBasemapId/g, 'mapState.setSelectedBasemapId')
  
  .replace(/layerState/g, 'mapState.layerState')
  .replace(/updateLayerVisibility/g, 'mapState.updateLayerVisibility')
  .replace(/updateLayerGroupVisibility/g, 'mapState.updateLayerGroupVisibility')
  .replace(/updateLayerOpacity/g, 'mapState.updateLayerOpacity')
  .replace(/updateLayerOrder/g, 'mapState.updateLayerOrder')
  .replace(/updateLayerReorder/g, 'mapState.updateLayerReorder')
  .replace(/refreshLayer/g, 'mapState.refreshLayer')
  .replace(/layerStatuses/g, 'mapState.layerStatuses')
  .replace(/canViewLayers/g, 'mapState.canViewLayers')
  .replace(/canManageLayers/g, 'mapState.canManageLayers')
  .replace(/layerHistory/g, 'mapState.layerHistory')
  .replace(/exportLayerConfig/g, 'mapState.exportLayerConfig')
  .replace(/layerConfigStatus/g, 'mapState.layerConfigStatus')
  
  .replace(/poiEnabled/g, 'mapSearch.poiEnabled')
  .replace(/setPoiEnabled/g, 'mapSearch.setPoiEnabled')
  
  .replace(/assetFilters/g, 'mapSearch.assetFilters')
  .replace(/propertySearchResult/g, 'mapSearch.propertySearchResult')
  .replace(/filterPresets/g, 'mapSearch.filterPresets')
  .replace(/filterHistory/g, 'mapSearch.filterHistory')
  .replace(/canUseFilters/g, 'mapSearch.canUseFilters')
  .replace(/applyFilters/g, 'mapSearch.applyFilters')
  .replace(/saveFilterPreset/g, 'mapSearch.saveFilterPreset')
  .replace(/exportFilteredPropertyResults/g, 'mapSearch.exportFilteredPropertyResults')
  .replace(/filterStatus/g, 'mapSearch.filterStatus')
  
  .replace(/canMeasure/g, 'drawTool.canMeasure')
  .replace(/measurementState/g, 'drawTool.measurementState')
  .replace(/measurementResult/g, 'drawTool.measurementResult')
  .replace(/measurementHistory/g, 'drawTool.measurementHistory')
  .replace(/measurementStatus/g, 'drawTool.measurementStatus')
  .replace(/setMeasurementMode/g, 'drawTool.setMeasurementMode')
  .replace(/undoMeasurement/g, 'drawTool.undoMeasurement')
  .replace(/clearMeasurement/g, 'drawTool.clearMeasurement')
  .replace(/copyMeasurement/g, 'drawTool.copyMeasurement')
  .replace(/saveMeasurementSession/g, 'drawTool.saveMeasurementSession')
  .replace(/exportMeasurement/g, 'drawTool.exportMeasurement')
  .replace(/toggleMeasurementSnap/g, 'drawTool.toggleMeasurementSnap')

  .replace(/canDrawSpatial/g, 'drawTool.canDrawSpatial')
  .replace(/spatialDrawState/g, 'drawTool.spatialDrawState')
  .replace(/spatialDrawResult/g, 'drawTool.spatialDrawResult')
  .replace(/spatialDrawHistory/g, 'drawTool.spatialDrawHistory')
  .replace(/spatialDrawStatus/g, 'drawTool.spatialDrawStatus')
  .replace(/setSpatialDrawMode/g, 'drawTool.setSpatialDrawMode')
  .replace(/undoSpatialDraw/g, 'drawTool.undoSpatialDraw')
  .replace(/redoSpatialDraw/g, 'drawTool.redoSpatialDraw')
  .replace(/saveSpatialDrawDraft/g, 'drawTool.saveSpatialDrawDraft')
  .replace(/cancelSpatialDraw/g, 'drawTool.cancelSpatialDraw')
  .replace(/exportSpatialDraw/g, 'drawTool.exportSpatialDraw')
  .replace(/toggleSpatialDrawSnap/g, 'drawTool.toggleSpatialDrawSnap')
  .replace(/addSpatialDrawCoordinate/g, 'drawTool.addSpatialDrawCoordinate')
  .replace(/editSpatialDrawCoordinate/g, 'drawTool.editSpatialDrawCoordinate')
  .replace(/deleteSpatialDrawVertex/g, 'drawTool.deleteSpatialDrawVertex')
  .replace(/selectSpatialDrawVertex/g, 'drawTool.selectSpatialDrawVertex')
  .replace(/updateSpatialDrawAttributes/g, 'drawTool.updateSpatialDrawAttributes')
  .replace(/duplicateLatestSpatialDraft/g, 'drawTool.duplicateLatestSpatialDraft')

  .replace(/canExportMap/g, 'drawTool.canExportMap')
  .replace(/canShareMap/g, 'drawTool.canShareMap')
  .replace(/exportMetadata/g, 'drawTool.exportMetadata')
  .replace(/exportTemplates/g, 'drawTool.exportTemplates')
  .replace(/exportHistory/g, 'drawTool.exportHistory')
  .replace(/exportStatus/g, 'drawTool.exportStatus')
  .replace(/updateExportMetadata/g, 'drawTool.updateExportMetadata')
  .replace(/exportMapPng/g, 'drawTool.exportMapPng')
  .replace(/exportMapPdf/g, 'drawTool.exportMapPdf')
  .replace(/copyShareLink/g, 'drawTool.copyShareLink')
  .replace(/saveExportTemplate/g, 'drawTool.saveExportTemplate')
  .replace(/loadExportTemplate/g, 'drawTool.loadExportTemplate')
  + `

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
        />
        <div className={styles.mapModeBadge} data-mode={mapState.scanMode}>
          {selectedScanMode?.label}
        </div>
        <Map
          onRectangleDrawn={drawTool.handleRectangleDrawn}
          onAnalyzeImage={mapSearch.analyzeImage}
          analysisObjects={mapSearch.analysisResults?.analysis?.objects || []}
          selectedBasemap={mapState.selectedBasemap}
          selectRequestId={drawTool.selectRequestId}
          captureRequestId={drawTool.captureRequestId}
          clearRequestId={drawTool.clearRequestId}
          selectedAdminArea={mapState.adminArea}
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
        />
      </div>
    </div>
  );
}
`;

const wrapperContent = `"use client";

import React, { useRef } from "react";
import { MapStateProvider } from "@/features/map/contexts/MapStateContext";
import { MapSearchProvider } from "@/features/map/contexts/MapSearchContext";
import { DrawToolProvider } from "@/features/map/contexts/DrawToolContext";
import MapWorkspace from "./MapWorkspace";

export default function MapWrapper({ permissions = [] }) {
  const workspaceRef = useRef(null);
  const mapCanvasRef = useRef(null);

  return (
    <MapStateProvider permissions={permissions}>
      <MapSearchProvider permissions={permissions}>
        <DrawToolProvider permissions={permissions} workspaceRef={workspaceRef} mapCanvasRef={mapCanvasRef}>
          <MapWorkspace permissions={permissions} workspaceRef={workspaceRef} mapCanvasRef={mapCanvasRef} />
        </DrawToolProvider>
      </MapSearchProvider>
    </MapStateProvider>
  );
}
`;

const wsPath = path.join(__dirname, '../apps/web/components/MapWorkspace.js');
fs.writeFileSync(wsPath, mapWorkspaceContent);
console.log("Wrote MapWorkspace.js");

const wpPath = path.join(__dirname, '../apps/web/components/MapWrapper.js');
fs.writeFileSync(wpPath, wrapperContent);
console.log("Wrote MapWrapper.js");
