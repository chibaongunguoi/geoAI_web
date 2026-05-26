"use client";
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
import { useMapState } from "./MapStateContext";

const DrawToolContext = createContext(null);

export function useDrawTool() {
  const ctx = useContext(DrawToolContext);
  if (!ctx) throw new Error("useDrawTool must be used within DrawToolProvider");
  return ctx;
}

export function DrawToolProvider({ children, permissions, workspaceRef, mapCanvasRef }) {
  const { 
    setPropertySearchResult, setAnalysisResults, setIsAnalyzing, isAnalyzing,
    mapViewport, focusedProperty, propertySearchResult, assetFilters
  } = useMapSearch();
  const { selectedBasemap, visibleLayers } = useMapState();

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
  const [rectangleCoords, setRectangleCoords] = useState(null);
  const [selectRequestId, setSelectRequestId] = useState(0);
  const [captureRequestId, setCaptureRequestId] = useState(0);
  const [clearRequestId, setClearRequestId] = useState(0);

  const canMeasure = canAccess(permissions, "measurement.use");
  const canDrawSpatial = canAccess(permissions, "properties.manage");
  const canExportMap = canAccess(permissions, "export.use");
  const canShareMap = canAccess(permissions, "share.create");

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
        type: measurementResult.type,
        value: measurementResult.value
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
  }, [canDrawSpatial, persistSpatialDrawState, spatialDrawHistory, spatialDrawResult, spatialDrawState]);

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
  }, [canDrawSpatial, persistSpatialDrawState, spatialDrawHistory, spatialDrawResult, spatialDrawState]);

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
  }, [canExportMap, exportMetadata, recordExportHistory, mapCanvasRef]);

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
  }, [canExportMap, exportMetadata, recordExportHistory, mapCanvasRef]);

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

  const clearWorkspace = useCallback(() => {
    setIsAnalyzing(false);
    setRectangleCoords(null);
    setAnalysisResults(null);
    setClearRequestId((requestId) => requestId + 1);
  }, [setIsAnalyzing, setAnalysisResults]);

  const handleRectangleDrawn = useCallback((coordinates) => {
    setRectangleCoords(coordinates);
    setAnalysisResults(null);
  }, [setAnalysisResults]);

  const requestSelection = useCallback(() => {
    if (isAnalyzing) return;
    setAnalysisResults(null);
    setPropertySearchResult(null);
    setSelectRequestId((requestId) => requestId + 1);
  }, [isAnalyzing, setAnalysisResults, setPropertySearchResult]);

  const requestCapture = useCallback(() => {
    if (!rectangleCoords || isAnalyzing) return;
    setCaptureRequestId((requestId) => requestId + 1);
  }, [rectangleCoords, isAnalyzing]);

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
