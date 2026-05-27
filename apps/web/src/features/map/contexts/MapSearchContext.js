"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
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
  const { setLayerState, adminArea, scanMode } = useMapState();
  const propertySearchAbortRef = useRef(null);
  const poiAutoCacheRef = useRef(new globalThis.Map());
  const lastPoiAutoKeyRef = useRef(null);

  const [propertyQuery, setPropertyQuery] = useState(
    "Vùng nào ở phường Thuận Phước có mật độ nhà nhiều nhất?"
  );
  const [propertySearchResult, setPropertySearchResult] = useState(null);
  const [propertySearchStatus, setPropertySearchStatus] = useState(null);
  const [isSearchingProperties, setIsSearchingProperties] = useState(false);
  const [focusedProperty, setFocusedProperty] = useState(null);
  const [propertyResultView, setPropertyResultView] = useState("list");
  const [assetFilters, setAssetFilters] = useState(() => ({ ...DEFAULT_ASSET_FILTERS }));
  const [filterPresets, setFilterPresets] = useState([]);
  const [filterHistory, setFilterHistory] = useState([]);
  const [filterStatus, setFilterStatus] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mapViewport, setMapViewport] = useState(null);
  const [poiResults, setPoiResults] = useState([]);
  const [poiEnabled, setPoiEnabled] = useState(false); // Default to false to avoid heavy query on load

  const { addSearch } = useSearchHistory();
  const canUseFilters = canAccess(permissions, "filters.use");
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!poiEnabled || !mapViewport?.bounds || mapViewport.zoom < 10) {
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
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Received non-JSON response from server");
        }
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
    }, 500);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [mapViewport, poiEnabled]);

  useEffect(() => {
    return () => {
      propertySearchAbortRef.current?.abort();
      propertySearchAbortRef.current = null;
    };
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
      const [propResponse, poiResponse] = await Promise.allSettled([
        fetch(`/api/properties?query=${encodeURIComponent(query)}&${filterParams}`, {
          cache: "no-store",
          signal: controller.signal
        }),
        fetch(`/api/poi/semantic-search?q=${encodeURIComponent(query)}&limit=15`, {
          cache: "no-store",
          signal: controller.signal
        })
      ]);

      let result = null;
      let combinedItems = [];

      if (propResponse.status === "fulfilled" && propResponse.value.ok) {
        result = await propResponse.value.json();
        combinedItems = [...(result.items || [])];
      } else if (propResponse.status === "rejected" && propResponse.reason?.name === "AbortError") {
        throw propResponse.reason;
      } else if (!poiResponse || poiResponse.status === "rejected") {
        throw new Error("HTTP Fetch Failed");
      }

      if (poiResponse.status === "fulfilled" && poiResponse.value.ok) {
        const poiData = await poiResponse.value.json();
        const poiItems = (poiData.items || []).map((item) => ({ ...item, isPoi: true }));
        
        // Remove duplicates if any property matches POI
        const poiIds = new Set(poiItems.map((p) => p.id));
        const filteredProps = combinedItems.filter((p) => !poiIds.has(p.id));
        
        combinedItems = [...poiItems, ...filteredProps];
      }

      if (!result) result = { items: [], meta: {} };
      result.items = combinedItems;
      if (result.meta) {
        result.meta.total = combinedItems.length;
      }

      setPropertySearchResult(result);
      setPoiResults([]);
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
          : "Không tìm kiếm được dữ liệu nhà/đất."
      );
    } finally {
      clearTimeout(timeoutId);
      if (propertySearchAbortRef.current === controller) {
        propertySearchAbortRef.current = null;
        setIsSearchingProperties(false);
      }
    }
  }, [addSearch, assetFilters, canUseFilters, propertyQuery, setLayerState]);

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
  }, [assetFilters, canUseFilters, filterHistory, filterPresets, persistFilterState, propertySearchResult]);

  useEffect(() => {
    const hasAnalysisObjects = Boolean(analysisResults?.analysis?.objects?.length);
    if (!hasAnalysisObjects) return;

    setLayerState((current) =>
      focusLayerVisibility(current, "analysis-results", REFERENCE_LAYER_IDS)
    );
  }, [analysisResults, setLayerState]);

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

  useEffect(() => {
    const storedFilters = readFilterState(window.localStorage);
    setAssetFilters(storedFilters.lastFilters);
    setFilterPresets(storedFilters.presets);
    setFilterHistory(storedFilters.history);
  }, []);

  const value = useMemo(() => ({
    propertyQuery, setPropertyQuery, propertySearchResult, setPropertySearchResult,
    propertySearchStatus, setPropertySearchStatus, isSearchingProperties, setIsSearchingProperties,
    focusedProperty, setFocusedProperty, propertyResultView, setPropertyResultView,
    assetFilters, setAssetFilters, filterPresets, setFilterPresets, filterHistory, setFilterHistory,
    filterStatus, setFilterStatus, poiResults, setPoiResults, poiEnabled, setPoiEnabled,
    analysisResults, setAnalysisResults, isAnalyzing, setIsAnalyzing, mapViewport, setMapViewport,
    runPropertySearch, applyFilters, saveFilterPreset, exportFilteredPropertyResults, analyzeImage,
    canUseFilters
  }), [
    propertyQuery, propertySearchResult, propertySearchStatus, isSearchingProperties, focusedProperty,
    propertyResultView, assetFilters, filterPresets, filterHistory, filterStatus, poiResults, poiEnabled,
    analysisResults, isAnalyzing, mapViewport, runPropertySearch, applyFilters, saveFilterPreset,
    exportFilteredPropertyResults, analyzeImage, canUseFilters
  ]);

  return <MapSearchContext.Provider value={value}>{children}</MapSearchContext.Provider>;
}
