"use client";

import L from "leaflet";
import { MapContainer, ScaleControl, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import {
  DATA_LAYERS,
  layerIsVisibleAtZoom,
  validateGeoJsonPayload,
  validateLayerConfig,
} from "@/features/map/layers";
import {
  assetDetailUrl,
  assetLabel,
  assetMarkerStyle,
  assetPopupRows,
  clusterAssets,
  createDefaultAssetDisplayConfig,
} from "@/features/map/assets";

const DANANG_CENTER = [16.0544, 108.2022];
const DANANG_BOUNDS = [
  [15.88, 107.82],
  [16.2, 108.35],
];
const MAP_VIEW_BOUNDS = [
  [15.74, 107.62],
  [16.36, 108.55],
];
const OBJECT_COLORS = {
  building: "#ef4444",
};
const ADMIN_ALIASES = {
  hai_chau: "haichau",
  thanh_khe: "thanhkhe",
  son_tra: "sontra",
  ngu_hanh_son: "nguhanhson",
  lien_chieu: "lienchieu",
  cam_le: "camle",
  hoa_vang: "hoavang",
};
const DISTRICT_LABELS = {
  all_da_nang: "To\u00e0n \u0110\u00e0 N\u1eb5ng",
  camle: "C\u1ea9m L\u1ec7",
  haichau: "H\u1ea3i Ch\u00e2u",
  hoavang: "H\u00f2a Vang",
  lienchieu: "Li\u00ean Chi\u1ec3u",
  nguhanhson: "Ng\u0169 H\u00e0nh S\u01a1n",
  sontra: "S\u01a1n Tr\u00e0",
  thanhkhe: "Thanh Kh\u00ea",
};
const WORLD_RING = [
  [-89, -179],
  [-89, 179],
  [89, 179],
  [89, -179],
];

function boundsToCoordinates(bounds) {
  return {
    northEast: [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
    southWest: [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
    northWest: [bounds.getNorthWest().lat, bounds.getNorthWest().lng],
    southEast: [bounds.getSouthEast().lat, bounds.getSouthEast().lng],
  };
}

function objectColor(type) {
  return OBJECT_COLORS[type] || OBJECT_COLORS.building;
}

function normalizedAdminArea(adminArea) {
  return ADMIN_ALIASES[adminArea] || adminArea || "all_da_nang";
}

function districtDisplayName(feature) {
  const adminId = feature?.properties?.admin_id;
  return DISTRICT_LABELS[adminId] || feature?.properties?.name || "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function polygonExteriorRings(geometry) {
  if (!geometry) return [];

  if (geometry.type === "Polygon") {
    return [geometry.coordinates[0].map(([lng, lat]) => [lat, lng])];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon) =>
      polygon[0].map(([lng, lat]) => [lat, lng]),
    );
  }

  return [];
}

function featureCenter(feature) {
  const bounds = L.geoJSON(feature).getBounds();
  return bounds.isValid() ? bounds.getCenter() : null;
}

function cacheBustedUrl(url, refreshId) {
  if (!refreshId) return url;

  return `${url}${url.includes("?") ? "&" : "?"}_refresh=${refreshId}`;
}

function geoJsonPointLayer(feature, latlng, opacity) {
  return L.circleMarker(latlng, {
    radius: 7,
    color: "#ffffff",
    weight: 2,
    opacity,
    fillColor: feature?.properties?.color || "#f59e0b",
    fillOpacity: 0.9 * opacity,
  });
}

function geoJsonPopup(feature) {
  const properties = feature?.properties || {};
  const title = properties.name || properties.title || properties.code || "Feature";
  const details = [properties.code, properties.status, properties.type].filter(Boolean);

  return `<strong>${escapeHtml(title)}</strong>${details
    .map((item) => `<br>${escapeHtml(item)}`)
    .join("")}`;
}

function assetTypeIcon(feature) {
  const type = String(feature?.properties?.type || feature?.properties?.category || "").toLowerCase();
  const icons = {
    lighting: "L",
    road: "R",
    drainage: "D",
    park: "P",
  };

  return icons[type] || "A";
}

function assetPopup(feature, config, permissions) {
  const properties = feature?.properties || {};
  const rows = assetPopupRows(feature, config, permissions);
  const image = properties.imageUrl
    ? `<img src="${escapeHtml(properties.imageUrl)}" alt="">`
    : "";
  const details = rows
    .map(
      (row) =>
        `<dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd>`,
    )
    .join("");

  return `<div class="asset-popup">${image}<strong>${escapeHtml(
    properties.name || properties.code || "Asset",
  )}</strong><dl>${details}</dl><a href="${escapeHtml(
    assetDetailUrl(feature),
  )}">Mở hồ sơ chi tiết</a></div>`;
}

function assetMarkerIcon(feature, config) {
  const style = assetMarkerStyle(feature, config.colorMode);
  const recentClass = style.isRecentlyUpdated ? " recent" : "";
  return L.divIcon({
    className: "",
    html: `<span class="asset-marker status-${escapeHtml(
      style.statusClass,
    )}${recentClass}" style="background:${escapeHtml(style.color)}">${escapeHtml(
      assetTypeIcon(feature),
    )}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

function propertyDensityPopup(region) {
  return `<strong>${escapeHtml(region.label || "Vung mat do")}</strong><br>${escapeHtml(
    Number(region.count || 0).toLocaleString("vi-VN"),
  )} toa nha`;
}

function propertyDensityBounds(region) {
  const bbox = region?.bbox;
  if (!bbox) return null;

  const bounds = [
    [Number(bbox.south), Number(bbox.west)],
    [Number(bbox.north), Number(bbox.east)],
  ];

  return bounds.every((pair) => pair.every(Number.isFinite)) ? bounds : null;
}

function clusterIcon(count) {
  return L.divIcon({
    className: "",
    html: `<span class="asset-cluster">${count}</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function labelIcon(label) {
  return L.divIcon({
    className: "asset-label",
    html: `<span>${escapeHtml(label)}</span>`,
    iconSize: [120, 22],
    iconAnchor: [60, -10],
  });
}

function MapComponent({
  onRectangleDrawn,
  onAnalyzeImage,
  analysisObjects,
  selectedBasemap,
  onCursorMove,
  selectedAdminArea,
  visibleLayerIds,
  layerOpacities,
  layerOrder,
  selectRequestId,
  captureRequestId,
  clearRequestId,
  layerRefreshRequests,
  onLayerStatusChange,
  assetDisplayConfig,
  permissions,
  onAssetLoad,
  onAssetError,
  propertySearchResult,
}) {
  const map = useMap();
  const [drawnItems] = useState(new L.FeatureGroup());
  const [objectBoxes] = useState(new L.FeatureGroup());
  const [assetMarkers] = useState(new L.FeatureGroup());
  const [boundaryLayer] = useState(new L.FeatureGroup());
  const [maskLayer] = useState(new L.FeatureGroup());
  const [propertySearchLayer] = useState(new L.FeatureGroup());
  const [currentCoords, setCurrentCoords] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(() => map.getZoom());
  const [adminBoundaries, setAdminBoundaries] = useState(null);
  const externalLayersRef = useRef(new globalThis.Map());
  const lastBoundaryViewKeyRef = useRef(null);
  const rightDragState = useRef(null);

  const isLayerActive = useCallback(
    (layerId) => {
      const layer = DATA_LAYERS.find((item) => item.id === layerId);
      return visibleLayerIds.includes(layerId) && layerIsVisibleAtZoom(layer, currentZoom);
    },
    [currentZoom, visibleLayerIds],
  );

  useEffect(() => {
    if (!selectedBasemap) return;

    map.setMinZoom(selectedBasemap.minZoom);
    map.setMaxZoom(selectedBasemap.maxZoom);

    if (map.getZoom() > selectedBasemap.maxZoom) {
      map.setZoom(selectedBasemap.maxZoom);
    }
  }, [map, selectedBasemap]);

  const clearMapState = useCallback(() => {
    drawnItems.clearLayers();
    objectBoxes.clearLayers();
    setCurrentCoords(null);
    onRectangleDrawn(null);
  }, [drawnItems, objectBoxes, onRectangleDrawn]);

  const captureImageForCoords = useCallback(
    async (coords) => {
      if (!coords) return;

      try {
        const mapElement = map.getContainer();
        const ne = map.latLngToContainerPoint([
          coords.northEast[0],
          coords.northEast[1],
        ]);
        const sw = map.latLngToContainerPoint([
          coords.southWest[0],
          coords.southWest[1],
        ]);

        const width = Math.abs(ne.x - sw.x);
        const height = Math.abs(ne.y - sw.y);
        const left = Math.min(ne.x, sw.x);
        const top = Math.min(ne.y, sw.y);

        const canvas = await html2canvas(mapElement, {
          x: left,
          y: top,
          width,
          height,
          useCORS: true,
          allowTaint: false,
          backgroundColor: null,
        });

        canvas.toBlob(async (blob) => {
          if (!blob) return;

          const bbox = [
            coords.southWest[1],
            coords.southWest[0],
            coords.northEast[1],
            coords.northEast[0],
          ];

          await onAnalyzeImage(blob, bbox);
        }, "image/png");
      } catch (error) {
        console.error("Error capturing image:", error);
        alert("C\u00f3 l\u1ed7i khi c\u1eaft h\u00ecnh \u1ea3nh. Vui l\u00f2ng th\u1eed l\u1ea1i.");
      }
    },
    [map, onAnalyzeImage],
  );

  useEffect(() => {
    map.setMaxBounds(MAP_VIEW_BOUNDS);
    map.fitBounds(DANANG_BOUNDS);
    map.addLayer(drawnItems);
    map.addLayer(objectBoxes);
    map.addLayer(assetMarkers);
    map.addLayer(maskLayer);
    map.addLayer(boundaryLayer);
    map.addLayer(propertySearchLayer);
    setTimeout(() => map.invalidateSize(), 0);

    const handleCreated = (event) => {
      const layer = event.layer;
      const bounds = layer.getBounds();

      drawnItems.clearLayers();
      objectBoxes.clearLayers();
      drawnItems.addLayer(layer);

      const coordinates = boundsToCoordinates(bounds);
      setCurrentCoords(coordinates);
      onRectangleDrawn(coordinates);
      setTimeout(() => captureImageForCoords(coordinates), 0);
    };

    map.on(L.Draw.Event.CREATED, handleCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.removeLayer(drawnItems);
      map.removeLayer(objectBoxes);
      map.removeLayer(assetMarkers);
      map.removeLayer(maskLayer);
      map.removeLayer(boundaryLayer);
      map.removeLayer(propertySearchLayer);
      externalLayersRef.current.forEach((layer) => map.removeLayer(layer));
      externalLayersRef.current.clear();
    };
  }, [
    map,
    drawnItems,
    objectBoxes,
    assetMarkers,
    maskLayer,
    boundaryLayer,
    propertySearchLayer,
    onRectangleDrawn,
    captureImageForCoords,
  ]);

  useEffect(() => {
    propertySearchLayer.clearLayers();

    const regions =
      propertySearchResult?.map?.type === "property-density"
        ? propertySearchResult.map.regions || []
        : [];

    if (regions.length === 0) {
      return;
    }

    const maxCount = Math.max(...regions.map((region) => Number(region.count || 0)), 1);
    const group = [];

    regions.forEach((region) => {
      const bounds = propertyDensityBounds(region);
      if (!bounds) return;

      const intensity = Number(region.count || 0) / maxCount;
      const rectangle = L.rectangle(bounds, {
        color: "#dc2626",
        weight: intensity > 0.85 ? 3 : 2,
        opacity: 0.88,
        fillColor: intensity > 0.72 ? "#ef4444" : "#f97316",
        fillOpacity: 0.18 + intensity * 0.34,
      }).bindPopup(propertyDensityPopup(region));
      rectangle.addTo(propertySearchLayer);
      group.push(rectangle);

      if (region.center?.lat && region.center?.lng) {
        L.marker([region.center.lat, region.center.lng], {
          interactive: false,
          icon: L.divIcon({
            className: "property-density-label",
            html: `<span>${escapeHtml(Number(region.count || 0).toLocaleString("vi-VN"))}</span>`,
            iconSize: [86, 28],
            iconAnchor: [43, 14],
          }),
        }).addTo(propertySearchLayer);
      }
    });

    const bounds = L.featureGroup(group).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.35), {
        animate: true,
        padding: [28, 28],
        maxZoom: 17,
      });
    }
  }, [map, propertySearchLayer, propertySearchResult]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const assetVisible = isLayerActive("sample-assets");

    assetMarkers.clearLayers();
    onAssetLoad?.([]);

    if (!assetVisible) {
      onLayerStatusChange?.("sample-assets", { state: "idle", message: "Ẩn" });
      return () => controller.abort();
    }

    const loadAssets = () => {
      const bounds = map.getBounds();
      const bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ].join(",");

      onLayerStatusChange?.("sample-assets", { state: "loading", message: "Đang tải" });
      fetch(`/api/map/assets?bbox=${bbox}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.json();
        })
        .then((payload) => {
          if (!isMounted) return;
          const features = Array.isArray(payload.features) ? payload.features : [];
          const opacity = layerOpacities["sample-assets"] ?? 1;
          const config = assetDisplayConfig || createDefaultAssetDisplayConfig();

          assetMarkers.clearLayers();
          clusterAssets(features, map.getZoom()).forEach((item) => {
            if (item.kind === "cluster") {
              L.marker([item.lat, item.lng], {
                icon: clusterIcon(item.count),
                opacity,
              }).addTo(assetMarkers);
              return;
            }

            const feature = item.feature;
            const [lng, lat] = feature.geometry.coordinates;
            const marker = L.marker([lat, lng], {
              icon: assetMarkerIcon(feature, config),
              opacity,
            }).bindPopup(assetPopup(feature, config, permissions));
            marker.addTo(assetMarkers);

            const label = assetLabel(feature, config.labelMode);
            if (label) {
              L.marker([lat, lng], {
                icon: labelIcon(label),
                interactive: false,
                opacity,
              }).addTo(assetMarkers);
            }
          });

          onAssetLoad?.(features);
          onAssetError?.(null);
          onLayerStatusChange?.("sample-assets", {
            state: "ready",
            message: `${features.length} tài sản`,
          });
        })
        .catch((error) => {
          if (error.name === "AbortError" || !isMounted) return;
          assetMarkers.clearLayers();
          onAssetLoad?.([]);
          onAssetError?.(error.message || "Không tải được tài sản");
          onLayerStatusChange?.("sample-assets", {
            state: "error",
            message: "Lỗi tải tài sản",
          });
        });
    };

    loadAssets();
    const handleMoveEnd = () => loadAssets();
    map.on("moveend", handleMoveEnd);
    map.on("zoomend", handleMoveEnd);

    return () => {
      isMounted = false;
      controller.abort();
      map.off("moveend", handleMoveEnd);
      map.off("zoomend", handleMoveEnd);
    };
  }, [
    assetDisplayConfig,
    assetMarkers,
    isLayerActive,
    layerOpacities,
    map,
    onAssetError,
    onAssetLoad,
    onLayerStatusChange,
    permissions,
    currentZoom,
  ]);

  useEffect(() => {
    let isMounted = true;
    onLayerStatusChange?.("admin-boundaries", { state: "loading", message: "Đang tải" });

    fetch("/api/admin-boundaries")
      .then((response) => response.json())
      .then((data) => {
        if (isMounted && data.success) {
          setAdminBoundaries(data.districts);
          onLayerStatusChange?.("admin-boundaries", { state: "ready", message: "Sẵn sàng" });
        }
      })
      .catch((error) => {
        console.error("Error loading admin boundaries:", error);
        if (isMounted) {
          onLayerStatusChange?.("admin-boundaries", { state: "error", message: "Lỗi tải" });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [onLayerStatusChange]);

  useEffect(() => {
    const handleZoomEnd = () => setCurrentZoom(map.getZoom());

    map.on("zoomend", handleZoomEnd);
    return () => {
      map.off("zoomend", handleZoomEnd);
    };
  }, [map]);

  useEffect(() => {
    const boundaryVisible = isLayerActive("admin-boundaries");

    if (!boundaryVisible) {
      boundaryLayer.clearLayers();
      maskLayer.clearLayers();
      lastBoundaryViewKeyRef.current = "hidden";
      return;
    }

    if (!adminBoundaries?.features?.length) return;

    boundaryLayer.clearLayers();
    maskLayer.clearLayers();
    const layerOpacity = layerOpacities["admin-boundaries"] ?? 1;

    const selectedId = normalizedAdminArea(selectedAdminArea);
    const isAllDaNang = selectedId === "all_da_nang" || selectedId === "all";
    const boundaryViewKey = `${selectedId}:${boundaryVisible}:${adminBoundaries.features.length}`;
    const selectedFeatures = isAllDaNang
      ? adminBoundaries.features
      : adminBoundaries.features.filter(
          (feature) => feature.properties?.admin_id === selectedId,
        );

    if (selectedFeatures.length === 0) return;

    const selectedCollection = {
      type: "FeatureCollection",
      features: selectedFeatures,
    };

    if (!isAllDaNang) {
      const holes = selectedFeatures.flatMap((feature) =>
        polygonExteriorRings(feature.geometry),
      );
      if (holes.length > 0) {
        L.polygon([WORLD_RING, ...holes], {
          stroke: false,
          fillColor: "#07110f",
          fillOpacity: 0.42 * layerOpacity,
          interactive: false,
        }).addTo(maskLayer);
      }
    }

    L.geoJSON(selectedCollection, {
      style: {
        color: "#ffffff",
        weight: 5,
        opacity: (isAllDaNang ? 0.4 : 0.95) * layerOpacity,
        fillOpacity: 0,
        interactive: false,
      },
    }).addTo(boundaryLayer);

    L.geoJSON(selectedCollection, {
      style: {
        color: "#ef4444",
        weight: isAllDaNang ? 1.5 : 2.5,
        opacity: layerOpacity,
        dashArray: isAllDaNang ? "4 6" : "2 4",
        fillOpacity: 0,
        interactive: false,
      },
    }).addTo(boundaryLayer);

    selectedFeatures.forEach((feature) => {
      const center = featureCenter(feature);
      if (center) {
        L.marker(center, {
          interactive: false,
          icon: L.divIcon({
            className: "district-label",
            html: `<span>${escapeHtml(districtDisplayName(feature))}</span>`,
            iconSize: [150, 28],
            iconAnchor: [75, 14],
          }),
        }).addTo(boundaryLayer);
      }
    });

    const bounds = L.geoJSON(selectedCollection).getBounds();
    if (bounds.isValid() && lastBoundaryViewKeyRef.current !== boundaryViewKey) {
      lastBoundaryViewKeyRef.current = boundaryViewKey;
      map.fitBounds(bounds.pad(isAllDaNang ? 0.08 : 0.22), {
        animate: true,
        padding: isAllDaNang ? [16, 16] : [32, 32],
        maxZoom: isAllDaNang ? 12 : 15,
      });
    }
  }, [
    adminBoundaries,
    selectedAdminArea,
    boundaryLayer,
    maskLayer,
    map,
    visibleLayerIds,
    layerOpacities,
    currentZoom,
    isLayerActive,
  ]);

  useEffect(() => {
    const externalLayers = DATA_LAYERS.filter(
      (layer) => !layer.renderer && ["geojson", "wms", "wmts"].includes(layer.sourceKind),
    );
    const abortControllers = [];

    const removeLayer = (layerId) => {
      const existingLayer = externalLayersRef.current.get(layerId);
      if (existingLayer) {
        map.removeLayer(existingLayer);
        externalLayersRef.current.delete(layerId);
      }
    };

    const setStatus = (layerId, state, message) => {
      onLayerStatusChange?.(layerId, { state, message });
    };

    externalLayers.forEach((layer) => {
      const refreshId = layerRefreshRequests?.[layer.id] || 0;
      const opacity = layerOpacities[layer.id] ?? 1;

      if (!isLayerActive(layer.id)) {
        removeLayer(layer.id);
        return;
      }

      const validation = validateLayerConfig(layer);
      if (!validation.valid) {
        removeLayer(layer.id);
        setStatus(layer.id, "error", validation.message);
        return;
      }

      if (layer.sourceKind === "geojson") {
        const controller = new AbortController();
        abortControllers.push(controller);
        removeLayer(layer.id);
        setStatus(layer.id, "loading", "Đang tải");

        fetch(cacheBustedUrl(layer.url, refreshId), {
          cache: "no-store",
          signal: controller.signal,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            const payload = data?.success && data.districts ? data.districts : data;
            const geoJsonValidation = validateGeoJsonPayload(payload);
            if (!geoJsonValidation.valid) {
              throw new Error(geoJsonValidation.message);
            }

            const geoJsonLayer = L.geoJSON(payload, {
              pointToLayer: (feature, latlng) => geoJsonPointLayer(feature, latlng, opacity),
              style: {
                color: "#f59e0b",
                weight: 2,
                opacity,
                fillOpacity: 0.18 * opacity,
              },
              onEachFeature: (feature, leafletLayer) => {
                leafletLayer.bindPopup(geoJsonPopup(feature));
              },
            }).addTo(map);

            externalLayersRef.current.set(layer.id, geoJsonLayer);
            setStatus(layer.id, "ready", "Sẵn sàng");
          })
          .catch((error) => {
            if (error.name === "AbortError") return;
            removeLayer(layer.id);
            setStatus(layer.id, "error", error.message || "Lỗi tải");
          });

        return;
      }

      removeLayer(layer.id);

      if (layer.sourceKind === "wms") {
        const tileLayer = L.tileLayer
          .wms(layer.url, {
            format: "image/png",
            transparent: true,
            attribution: layer.attribution,
            ...layer.wmsOptions,
            _refresh: refreshId || undefined,
            opacity,
          })
          .on("tileerror", () => {
            setStatus(layer.id, "error", "Lỗi tải tile WMS");
          })
          .addTo(map);

        externalLayersRef.current.set(layer.id, tileLayer);
        setStatus(layer.id, "ready", "Sẵn sàng");
        return;
      }

      const tileLayer = L.tileLayer(cacheBustedUrl(layer.url, refreshId), {
        attribution: layer.attribution,
        ...layer.tileOptions,
        opacity,
      })
        .on("tileerror", () => {
          setStatus(layer.id, "error", "Lỗi tải tile WMTS");
        })
        .addTo(map);

      externalLayersRef.current.set(layer.id, tileLayer);
      setStatus(layer.id, "ready", "Sẵn sàng");
    });

    return () => {
      abortControllers.forEach((controller) => controller.abort());
    };
  }, [
    map,
    layerOpacities,
    layerRefreshRequests,
    isLayerActive,
    onLayerStatusChange,
  ]);

  useEffect(() => {
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      onCursorMove?.({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        zoom: map.getZoom(),
      });
    };

    const handleMouseOut = () => {
      onCursorMove?.(null);
    };

    map.on("mousemove", handleMouseMove);
    map.on("mouseout", handleMouseOut);

    return () => {
      map.off("mousemove", handleMouseMove);
      map.off("mouseout", handleMouseOut);
    };
  }, [map, onCursorMove]);

  useEffect(() => {
    const container = map.getContainer();

    const stopRightMouseEvent = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };

    const handleContextMenu = (event) => {
      stopRightMouseEvent(event);
    };

    const stopMiddleMouseAction = (event) => {
      if (event.button !== 1) return;

      event.preventDefault();
      event.stopPropagation();
    };

    const handleMouseDown = (event) => {
      if (event.button === 1) {
        stopMiddleMouseAction(event);
        return;
      }

      if (event.button !== 2) return;

      stopRightMouseEvent(event);
      rightDragState.current = {
        x: event.clientX,
        y: event.clientY,
      };
      container.classList.add("leaflet-dragging");
    };

    const handleMouseMove = (event) => {
      const previous = rightDragState.current;
      if (!previous) return;

      stopRightMouseEvent(event);

      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      if (dx !== 0 || dy !== 0) {
        map.panBy([-dx, -dy], { animate: false });
        rightDragState.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }
    };

    const stopRightDrag = (event) => {
      if (!rightDragState.current) return;

      if (event) {
        stopRightMouseEvent(event);
      }
      rightDragState.current = null;
      container.classList.remove("leaflet-dragging");
    };

    container.addEventListener("contextmenu", handleContextMenu, true);
    container.addEventListener("mousedown", handleMouseDown, true);
    container.addEventListener("auxclick", stopMiddleMouseAction, true);
    window.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("mouseup", stopRightDrag, true);
    window.addEventListener("blur", stopRightDrag);

    return () => {
      container.removeEventListener("contextmenu", handleContextMenu, true);
      container.removeEventListener("mousedown", handleMouseDown, true);
      container.removeEventListener("auxclick", stopMiddleMouseAction, true);
      window.removeEventListener("mousemove", handleMouseMove, true);
      window.removeEventListener("mouseup", stopRightDrag, true);
      window.removeEventListener("blur", stopRightDrag);
      rightDragState.current = null;
      container.classList.remove("leaflet-dragging");
    };
  }, [map]);

  useEffect(() => {
    if (selectRequestId <= 0) return;

    drawnItems.clearLayers();
    objectBoxes.clearLayers();
    setCurrentCoords(null);
    onRectangleDrawn(null);

    const rectangleDrawer = new L.Draw.Rectangle(map, {
      shapeOptions: {
        color: "#2563eb",
        weight: 2,
        fillOpacity: 0.08,
      },
    });

    rectangleDrawer.enable();

    return () => {
      rectangleDrawer.disable();
    };
  }, [selectRequestId, map, drawnItems, objectBoxes, onRectangleDrawn]);

  useEffect(() => {
    if (clearRequestId > 0) {
      clearMapState();
    }
  }, [clearRequestId, clearMapState]);

  useEffect(() => {
    objectBoxes.clearLayers();
    onLayerStatusChange?.(
      "analysis-results",
      analysisObjects.length > 0
        ? { state: "ready", message: "Sẵn sàng" }
        : { state: "idle", message: "Chờ kết quả" },
    );

    if (!isLayerActive("analysis-results")) return;

    const layerOpacity = layerOpacities["analysis-results"] ?? 1;

    analysisObjects.forEach((object) => {
      if (object.geometry) {
        const footprint = L.geoJSON(
          {
            type: "Feature",
            properties: {},
            geometry: object.geometry,
          },
          {
            style: {
              color: objectColor(object.type),
              weight: object.geometrySource === "geoai_mask" ? 2 : 2.4,
              opacity: layerOpacity,
              fill: true,
              fillColor: objectColor(object.type),
              fillOpacity: 0.08 * layerOpacity,
              interactive: false,
            },
          },
        );

        objectBoxes.addLayer(footprint);
        return;
      }

      if (!object.bbox || object.bbox.length !== 4) return;

      const [minLng, minLat, maxLng, maxLat] = object.bbox;
      const rectangle = L.rectangle(
        [
          [minLat, minLng],
          [maxLat, maxLng],
        ],
        {
          color: objectColor(object.type),
          weight: 2,
          opacity: layerOpacity,
          fill: false,
          interactive: false,
        },
      );

      objectBoxes.addLayer(rectangle);
    });
  }, [analysisObjects, objectBoxes, layerOpacities, isLayerActive, onLayerStatusChange]);

  useEffect(() => {
    const groupsByLayerId = {
      "analysis-results": objectBoxes,
      "admin-boundaries": boundaryLayer,
      "sample-assets": assetMarkers,
    };

    layerOrder.forEach((layerId) => {
      const layer = groupsByLayerId[layerId] || externalLayersRef.current.get(layerId);
      layer?.bringToFront?.();
    });
  }, [assetMarkers, boundaryLayer, objectBoxes, layerOrder]);

  useEffect(() => {
    if (captureRequestId > 0) {
      captureImageForCoords(currentCoords);
    }
  }, [captureRequestId, captureImageForCoords, currentCoords]);

  return null;
}

export default function Map({
  onRectangleDrawn,
  onAnalyzeImage,
  analysisObjects,
  selectedBasemap,
  onCursorMove,
  selectedAdminArea,
  visibleLayerIds,
  layerOpacities,
  layerOrder,
  selectRequestId,
  captureRequestId,
  clearRequestId,
  layerRefreshRequests,
  onLayerStatusChange,
  assetDisplayConfig,
  permissions,
  onAssetLoad,
  onAssetError,
}) {
  return (
    <MapContainer
      center={DANANG_CENTER}
      zoom={12}
      minZoom={selectedBasemap?.minZoom || 11}
      maxZoom={selectedBasemap?.maxZoom || 19}
      maxBounds={MAP_VIEW_BOUNDS}
      maxBoundsViscosity={0.35}
      className="geoai-map"
      zoomControl={true}
      scrollWheelZoom={true}
      dragging={true}
    >
      <ScaleControl position="bottomleft" imperial={false} />
      <TileLayer
        key={selectedBasemap?.id || "satellite"}
        url={selectedBasemap?.url}
        attribution={selectedBasemap?.attribution}
        maxZoom={selectedBasemap?.maxZoom || 19}
        maxNativeZoom={selectedBasemap?.maxNativeZoom || 18}
      />
      <MapComponent
        onRectangleDrawn={onRectangleDrawn}
        onAnalyzeImage={onAnalyzeImage}
        analysisObjects={analysisObjects || []}
        selectedBasemap={selectedBasemap}
        onCursorMove={onCursorMove}
        selectedAdminArea={selectedAdminArea || "all_da_nang"}
        visibleLayerIds={visibleLayerIds || []}
        layerOpacities={layerOpacities || {}}
        layerOrder={layerOrder || []}
        selectRequestId={selectRequestId || 0}
        captureRequestId={captureRequestId || 0}
        clearRequestId={clearRequestId || 0}
        layerRefreshRequests={layerRefreshRequests || {}}
        onLayerStatusChange={onLayerStatusChange}
        assetDisplayConfig={assetDisplayConfig || createDefaultAssetDisplayConfig()}
        permissions={permissions || []}
        onAssetLoad={onAssetLoad}
        onAssetError={onAssetError}
      />
    </MapContainer>
  );
}
