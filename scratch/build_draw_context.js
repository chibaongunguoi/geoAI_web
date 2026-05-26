const fs = require('fs');
const path = require('path');

const mapJsPath = path.join(__dirname, 'MapWrapper.js.backup');
const lines = fs.readFileSync(mapJsPath, 'utf8').split('\n');

const drawContextContent = `"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { canAccess } from "@/features/auth/auth-client";
import { useMapSearch } from "./MapSearchContext";
import { buildMeasurementExport, getMeasurementResult } from "@/features/measurement/measurement-utils";
import {
  DEFAULT_MEASUREMENT_STATE, addMeasurementHistory, measurementReducer,
  readMeasurementStorage, writeMeasurementStorage
} from "@/features/measurement/measurement-state";
import { buildSpatialDrawExport, getSpatialDrawResult } from "@/features/spatial-draw/spatial-draw-utils";
import {
  DEFAULT_SPATIAL_DRAW_STATE, addSpatialDrawHistory, readSpatialDrawStorage,
  spatialDrawReducer, writeSpatialDrawStorage
} from "@/features/spatial-draw/spatial-draw-state";
import {
  DEFAULT_EXPORT_METADATA, addExportHistory, buildMapExportState,
  normalizeExportMetadata, readExportStorage, writeExportStorage
} from "@/features/export/map-export-state";
import { captureElementPng, downloadDataUrl, exportPrintablePdf } from "@/features/export/map-capture";
import { shareUrlFromState } from "@/features/export/share-state";

const DrawToolContext = createContext(null);

export function useDrawTool() {
  const ctx = useContext(DrawToolContext);
  if (!ctx) throw new Error("useDrawTool must be used within DrawToolProvider");
  return ctx;
}

export function DrawToolProvider({ children, permissions, workspaceRef, mapCanvasRef }) {
  const { setPropertySearchResult, setAnalysisResults, setIsAnalyzing, isAnalyzing } = useMapSearch();
  const abortControllerRef = useRef(null);

` + lines.slice(197, 207).join('\n') + `
  const [rectangleCoords, setRectangleCoords] = useState(null);
  const [selectRequestId, setSelectRequestId] = useState(0);
  const [captureRequestId, setCaptureRequestId] = useState(0);
  const [clearRequestId, setClearRequestId] = useState(0);

  const canMeasure = canAccess(permissions, "measurement.use");
  const canDrawSpatial = canAccess(permissions, "properties.manage");
  const canExportMap = canAccess(permissions, "export.use");
  const canShareMap = canAccess(permissions, "share.create");

` + lines.slice(753, 856).join('\n') + `

` + lines.slice(857, 1047).join('\n') + `

` + lines.slice(1085, 1226).join('\n') + `

` + lines.slice(1265, 1350).join('\n') + `

` + lines.slice(531, 557).join('\n') + `

  useEffect(() => {
    const storedMeasurement = readMeasurementStorage(window.localStorage);
    setMeasurementState(storedMeasurement.state);
    setMeasurementHistory(storedMeasurement.history);
    const storedSpatialDraw = readSpatialDrawStorage(window.localStorage);
    setSpatialDrawState(storedSpatialDraw.state);
    setSpatialDrawHistory(storedSpatialDraw.history);
    const storedExport = readExportStorage(window.localStorage);
    setExportTemplates(storedExport.templates);
    setExportHistory(storedExport.history);
  }, []);

  const value = {
    measurementState, measurementHistory, measurementStatus, measurementResult,
    spatialDrawState, spatialDrawHistory, spatialDrawStatus, spatialDrawResult,
    exportMetadata, exportTemplates, exportHistory, exportStatus,
    rectangleCoords, setRectangleCoords, selectRequestId, captureRequestId, clearRequestId,
    canMeasure, canDrawSpatial, canExportMap, canShareMap,
    setMeasurementMode, addMeasurementPoint, editMeasurementPoint, undoMeasurement, clearMeasurement, copyMeasurement, saveMeasurementSession, exportMeasurement, toggleMeasurementSnap,
    setSpatialDrawMode, addSpatialDrawCoordinate, editSpatialDrawCoordinate, undoSpatialDraw, redoSpatialDraw, saveSpatialDrawDraft, cancelSpatialDraw, exportSpatialDraw, toggleSpatialDrawSnap, deleteSpatialDrawVertex, selectSpatialDrawVertex, updateSpatialDrawAttributes, duplicateLatestSpatialDraft,
    updateExportMetadata, exportMapPng, exportMapPdf, copyShareLink, saveExportTemplate, loadExportTemplate,
    requestSelection, requestCapture, clearWorkspace, handleRectangleDrawn
  };

  return <DrawToolContext.Provider value={value}>{children}</DrawToolContext.Provider>;
}
`;

const destPath = path.join(__dirname, '../apps/web/src/features/map/contexts/DrawToolContext.js');
fs.writeFileSync(destPath, drawContextContent);
console.log("Wrote DrawToolContext.js");
