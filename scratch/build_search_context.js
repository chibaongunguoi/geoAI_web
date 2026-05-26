const fs = require('fs');
const path = require('path');

const mapJsPath = path.join(__dirname, 'MapWrapper.js.backup');
const lines = fs.readFileSync(mapJsPath, 'utf8').split('\n');

const searchContextContent = `"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { canAccess } from "@/features/auth/auth-client";
import { useMapState } from "./MapStateContext";
import useSearchHistory from "@/features/map/useSearchHistory";
import { propertySearchAnswerText } from "@/features/map/property-search";
import { hideAllLayerVisibility, focusLayerVisibility } from "@/features/map/layers";
import {
  DEFAULT_ASSET_FILTERS, addFilterHistory, assetFilterQueryString,
  normalizeAssetFilters, readFilterState, writeFilterState
} from "@/features/filters/filter-state";

const MapSearchContext = createContext(null);
const REFERENCE_LAYER_IDS = ["admin-boundaries"];
const TOTAL_UI_DEADLINE_MS = 8000;

export function useMapSearch() {
  const ctx = useContext(MapSearchContext);
  if (!ctx) throw new Error("useMapSearch must be used within MapSearchProvider");
  return ctx;
}

export function MapSearchProvider({ children, permissions }) {
  const { setLayerState } = useMapState();
  const propertySearchAbortRef = useRef(null);
  const poiAutoCacheRef = useRef(new globalThis.Map());
  const lastPoiAutoKeyRef = useRef(null);

` + lines.slice(185, 197).join('\n') + `
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mapViewport, setMapViewport] = useState(null);

  const { addSearch } = useSearchHistory();
  const canUseFilters = canAccess(permissions, "filters.use");

` + lines.slice(223, 283).join('\n') + `

` + lines.slice(524, 529).join('\n') + `

` + lines.slice(632, 709).join('\n') + `

` + lines.slice(711, 752).join('\n') + `

` + lines.slice(466, 473).join('\n') + `

` + lines.slice(1048, 1083).join('\n') + `

` + lines.slice(1227, 1264).join('\n') + `

  useEffect(() => {
    const storedFilters = readFilterState(window.localStorage);
    setAssetFilters(storedFilters.lastFilters);
    setFilterPresets(storedFilters.presets);
    setFilterHistory(storedFilters.history);
  }, []);

  const value = {
    propertyQuery, setPropertyQuery, propertySearchResult, setPropertySearchResult,
    propertySearchStatus, setPropertySearchStatus, isSearchingProperties, setIsSearchingProperties,
    focusedProperty, setFocusedProperty, propertyResultView, setPropertyResultView,
    assetFilters, setAssetFilters, filterPresets, setFilterPresets, filterHistory, setFilterHistory,
    filterStatus, setFilterStatus, poiResults, setPoiResults, poiEnabled, setPoiEnabled,
    analysisResults, setAnalysisResults, isAnalyzing, setIsAnalyzing, mapViewport, setMapViewport,
    runPropertySearch, applyFilters, saveFilterPreset, exportFilteredPropertyResults, analyzeImage,
    canUseFilters
  };

  return <MapSearchContext.Provider value={value}>{children}</MapSearchContext.Provider>;
}
`;

const destPath = path.join(__dirname, '../apps/web/src/features/map/contexts/MapSearchContext.js');
fs.writeFileSync(destPath, searchContextContent);
console.log("Wrote MapSearchContext.js");
