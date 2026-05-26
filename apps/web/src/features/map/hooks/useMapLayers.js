import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import { validateGeoJsonPayload, validateLayerConfig, layerIsVisibleAtZoom } from "@/features/map/layers";
import { createDefaultAssetDisplayConfig, clusterAssets, assetLabel } from "@/features/map/assets";
import { clusterPoiMarkers, shouldShowPoiLayer, createClusterIconHtml, createPoiMarkerHtml } from "@/features/poi/poi-markers";
import {
  normalizedAdminArea, districtDisplayName, polygonExteriorRings, featureCenter,
  cacheBustedUrl, geoJsonPointLayer, geoJsonPopup, assetMarkerIcon, assetPopup,
  labelIcon, clusterIcon, objectColor, escapeHtml, propertyDensityBounds,
  propertyDensityPopup, propertyDensityCenter, propertyDensityObjectPopup,
  rotatedFootprintPoints, densityHeatPoint, WORLD_RING, boundsToCoordinates,
  poiPopup, poiTooltip
} from "../map-helpers";

export function useMapLayers({
  map,
  currentZoom,
  layers,
  visibleLayerIds,
  layerOpacities,
  layerRefreshRequests,
  onLayerStatusChange,
  assetDisplayConfig,
  permissions,
  onAssetLoad,
  onAssetError,
  propertySearchResult,
  focusedProperty,
  poiResults,
  buildingHeatmap,
  selectedAdminArea,
  drawnItems,
  setCurrentCoords,
  onRectangleDrawn,
  isLayerActive: passedIsLayerActive
}) {
  const [assetMarkers] = useState(() => new L.FeatureGroup());
  const [boundaryLayer] = useState(() => new L.FeatureGroup());
  const [maskLayer] = useState(() => new L.FeatureGroup());
  const [propertySearchLayer] = useState(() => new L.FeatureGroup());
  const [buildingHeatmapLayer] = useState(() => new L.FeatureGroup());
  const [poiLayer] = useState(() => new L.FeatureGroup());
  const [focusedPropertyLayer] = useState(() => new L.FeatureGroup());
  const externalLayersRef = useRef(new globalThis.Map());
  const poiMarkersRef = useRef(new globalThis.Map());
  const buildingHeatLayerRef = useRef(null);
  const [adminBoundaries, setAdminBoundaries] = useState(null);
  const lastBoundaryViewKeyRef = useRef(null);

  useEffect(() => {
    map.addLayer(assetMarkers);
    map.addLayer(maskLayer);
    map.addLayer(boundaryLayer);
    map.addLayer(buildingHeatmapLayer);
    map.addLayer(propertySearchLayer);
    map.addLayer(poiLayer);
    map.addLayer(focusedPropertyLayer);

    return () => {
      map.removeLayer(assetMarkers);
      map.removeLayer(maskLayer);
      map.removeLayer(boundaryLayer);
      map.removeLayer(buildingHeatmapLayer);
      map.removeLayer(propertySearchLayer);
      map.removeLayer(poiLayer);
      map.removeLayer(focusedPropertyLayer);
      externalLayersRef.current.forEach((layer) => map.removeLayer(layer));
      externalLayersRef.current.clear();
    };
  }, [map, assetMarkers, maskLayer, boundaryLayer, buildingHeatmapLayer, propertySearchLayer, poiLayer, focusedPropertyLayer]);

  const renderedPoiItems = useMemo(() => {
    if (!shouldShowPoiLayer(currentZoom)) {
      return [];
    }

    const items = Array.isArray(poiResults) ? poiResults : [];
    const validItems = items.filter((item) =>
      Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)),
    );
    return clusterPoiMarkers(validItems);
  }, [currentZoom, poiResults]);


  const isLayerActive = passedIsLayerActive || useCallback(
    (layerId) => {
      const layer = (layers || []).find((item) => item.id === layerId);
      return (visibleLayerIds || []).includes(layerId) && layerIsVisibleAtZoom(layer, currentZoom);
    },
    [currentZoom, visibleLayerIds, layers],
  );


  useEffect(() => {
    const currentMarkers = poiMarkersRef.current;
    const newMarkers = new globalThis.Map();
    let hasChanges = false;

    renderedPoiItems.forEach((entry) => {
      const key = entry.kind === "cluster" 
        ? `cluster-${entry.lat}-${entry.lng}-${entry.count}` 
        : `poi-${entry.item.id}`;

      if (currentMarkers.has(key)) {
        newMarkers.set(key, currentMarkers.get(key));
        currentMarkers.delete(key);
      } else {
        let marker;
        if (entry.kind === "cluster") {
          marker = L.marker([entry.lat, entry.lng], {
            zIndexOffset: 650,
            icon: L.divIcon({
              className: "poi-cluster-icon",
              html: createClusterIconHtml(entry.count),
              iconSize: [42, 42],
              iconAnchor: [21, 21],
            }),
          })
            .bindPopup(`${Number(entry.count || 0).toLocaleString("vi-VN")} \u0111\u1ecba \u0111i\u1ec3m`)
            .bindTooltip(`${Number(entry.count || 0).toLocaleString("vi-VN")} địa điểm`, {
              direction: "top",
              offset: [0, -18],
              opacity: 0.96,
              className: "poi-tooltip",
            });
        } else {
          const item = entry.item;
          marker = L.marker([Number(item.latitude), Number(item.longitude)], {
            zIndexOffset: 700,
            icon: L.divIcon({
              className: "poi-marker-icon",
              html: createPoiMarkerHtml(item.category),
              iconSize: [30, 30],
              iconAnchor: [15, 30],
              popupAnchor: [0, -26],
            }),
          })
            .bindPopup(poiPopup(item))
            .bindTooltip(poiTooltip(item), {
              direction: "top",
              offset: [0, -26],
              opacity: 0.96,
              sticky: true,
              className: "poi-tooltip",
            });
        }
        marker.addTo(poiLayer);
        newMarkers.set(key, marker);
        hasChanges = true;
      }
    });

    if (currentMarkers.size > 0) {
      currentMarkers.forEach((marker) => {
        poiLayer.removeLayer(marker);
      });
      hasChanges = true;
    }

    poiMarkersRef.current = newMarkers;

    if (hasChanges && newMarkers.size > 0) {
      poiLayer.bringToFront();
    }
  }, [poiLayer, renderedPoiItems]);


  useEffect(() => {
    focusedPropertyLayer.clearLayers();
    if (!focusedProperty) return;

    const lat = focusedProperty.centroidLat;
    const lng = focusedProperty.centroidLng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    const center = L.latLng(lat, lng);

    const marker = L.circleMarker(center, {
      radius: 8,
      color: "#ffffff",
      weight: 2,
      opacity: 1,
      fillColor: "#ef4444",
      fillOpacity: 1,
    }).bindPopup(
      `<strong>${escapeHtml(focusedProperty.name || focusedProperty.code)}</strong><br>${escapeHtml(focusedProperty.addressLine || focusedProperty.ward || "")}`
    );

    marker.addTo(focusedPropertyLayer);

    const targetZoom = Math.max(map.getZoom(), 17);
    map.flyTo(center, targetZoom, { animate: true, duration: 0.75 });
    
    // Automatically open popup after flying
    setTimeout(() => marker.openPopup(), 800);

  }, [focusedProperty, focusedPropertyLayer, map]);


  useEffect(() => {
    propertySearchLayer.clearLayers();
    const focusTimers = [];

    const regions =
      propertySearchResult?.map?.type === "property-density"
        ? propertySearchResult.map.regions || []
        : [];

    if (regions.length === 0) {
      return undefined;
    }

    drawnItems.clearLayers();
    const group = [];
    const focusGroup = [];
    let topRegionBounds = null;

    const focusedRegions = regions.slice(0, 1);

    focusedRegions.forEach((region, regionIndex) => {
      const bounds = propertyDensityBounds(region);
      if (!bounds) return;

      const isTopRegion = regionIndex === 0;
      const latLngBounds = L.latLngBounds(bounds);

      if (isTopRegion) {
        topRegionBounds = latLngBounds;
        const selectionRectangle = L.rectangle(latLngBounds, {
          color: "#2563eb",
          weight: 3,
          opacity: 1,
          fillColor: "#2563eb",
          fillOpacity: 0.04,
          interactive: false,
        });
        selectionRectangle.addTo(drawnItems);
        const coordinates = boundsToCoordinates(selectionRectangle.getBounds());
        setCurrentCoords(coordinates);
        onRectangleDrawn(coordinates);
      }

      const rectangle = L.rectangle(bounds, {
        color: "#2563eb",
        weight: 3,
        opacity: 1,
        fillColor: "#2563eb",
        fillOpacity: 0.03,
      }).bindPopup(propertyDensityPopup(region));
      rectangle.addTo(propertySearchLayer);
      group.push(rectangle);
      if (isTopRegion) {
        focusGroup.push(rectangle);
      }

      if (isTopRegion) {
        const center = propertyDensityCenter(region, latLngBounds);

        if (center) {
          L.circle(center, {
            radius: 45,
            color: "#facc15",
            weight: 4,
            opacity: 1,
            fillColor: "#ef4444",
            fillOpacity: 0.16,
            interactive: false,
          }).addTo(propertySearchLayer);

          L.marker(center, {
            interactive: false,
            zIndexOffset: 900,
            icon: L.divIcon({
              className: "property-density-focus-label",
              html: `<span>Khu dày đặc nhất<br><strong>${escapeHtml(
                Number(region.count || 0).toLocaleString("vi-VN"),
              )}</strong></span>`,
              iconSize: [132, 42],
              iconAnchor: [66, 50],
            }),
          }).addTo(propertySearchLayer);
        }
      }

      const objects = Array.isArray(region.objects) ? region.objects : [];
      objects.forEach((object) => {
        if (
          object.geometry &&
          typeof object.geometry === "object" &&
          !Array.isArray(object.geometry)
        ) {
          const footprint = L.geoJSON(
            {
              type: "Feature",
              properties: object.properties || {},
              geometry: object.geometry,
            },
            {
              style: {
                color: objectColor(object.type),
                weight: 2.1,
                opacity: 0.95,
                fill: false,
                fillColor: objectColor(object.type),
                fillOpacity: 0,
              },
            },
          ).bindPopup(propertyDensityObjectPopup(object));

          footprint.addTo(propertySearchLayer);
          group.push(footprint);
          if (isTopRegion) {
            focusGroup.push(footprint);
          }
          return;
        }

        if (!object.bbox || object.bbox.length !== 4) return;

        const [minLng, minLat, maxLng, maxLat] = object.bbox;
        const objectBounds = [
          [Number(minLat), Number(minLng)],
          [Number(maxLat), Number(maxLng)],
        ];
        if (!objectBounds.every((pair) => pair.every(Number.isFinite))) return;

        const footprint = L.polygon(rotatedFootprintPoints(objectBounds, object.id), {
          color: objectColor(object.type),
          weight: 2.1,
          opacity: 0.95,
          fill: false,
          fillColor: objectColor(object.type),
          fillOpacity: 0,
        }).bindPopup(propertyDensityObjectPopup(object));

        footprint.addTo(propertySearchLayer);
        group.push(footprint);
        if (isTopRegion) {
          focusGroup.push(footprint);
        }
      });
    });

    const bounds = L.featureGroup(focusGroup.length > 0 ? focusGroup : group).getBounds();
    const scanStyleBounds = topRegionBounds?.isValid?.() ? topRegionBounds : bounds;
    if (scanStyleBounds.isValid()) {
      const maxZoom = map.getMaxZoom();
      const targetZoom = Math.min(Number.isFinite(maxZoom) ? maxZoom : 18, 18);
      const focusSearchBounds = () => {
        map.invalidateSize();
        propertySearchLayer.bringToFront();
        drawnItems.bringToFront();
        map.flyToBounds(scanStyleBounds.pad(0.22), {
          animate: true,
          duration: 0.75,
          padding: [34, 34],
          maxZoom: targetZoom,
        });
      };

      focusSearchBounds();
      focusTimers.push(setTimeout(focusSearchBounds, 120));
      focusTimers.push(setTimeout(focusSearchBounds, 650));
    }

    return () => {
      focusTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [drawnItems, map, onRectangleDrawn, propertySearchLayer, propertySearchResult]);


  useEffect(() => {
    buildingHeatmapLayer.clearLayers();
    if (buildingHeatLayerRef.current) {
      map.removeLayer(buildingHeatLayerRef.current);
      buildingHeatLayerRef.current = null;
    }
    const regions =
      buildingHeatmap?.map?.type === "property-density"
        ? buildingHeatmap.map.regions || []
        : [];

    if (regions.length === 0) {
      return;
    }

    const maxRegionCount = Math.max(
      ...regions.map((region) => Number(region?.count || 0)).filter(Number.isFinite),
      0,
    );
    const heatPoints = regions
      .map((region) => densityHeatPoint(region, maxRegionCount))
      .filter(Boolean);

    if (heatPoints.length > 0 && typeof L.heatLayer === "function") {
      buildingHeatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 36,
        blur: 32,
        maxZoom: 17,
        minOpacity: 0.26,
        gradient: {
          0.12: "#2563eb",
          0.32: "#22c55e",
          0.52: "#facc15",
          0.74: "#f97316",
          1: "#ef4444",
        },
      }).addTo(map);
      buildingHeatmapLayer.bringToFront();
      propertySearchLayer.bringToFront();
      poiLayer.bringToFront();
    }

    return () => {
      if (buildingHeatLayerRef.current) {
        map.removeLayer(buildingHeatLayerRef.current);
        buildingHeatLayerRef.current = null;
      }
    };
  }, [buildingHeatmap, buildingHeatmapLayer, map, poiLayer, propertySearchLayer]);


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
    const boundaryVisible = isLayerActive("admin-boundaries");
    const hasPropertyDensityFocus =
      propertySearchResult?.map?.type === "property-density" &&
      Array.isArray(propertySearchResult.map.regions) &&
      propertySearchResult.map.regions.length > 0;

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
    if (
      bounds.isValid() &&
      lastBoundaryViewKeyRef.current !== boundaryViewKey &&
      !hasPropertyDensityFocus
    ) {
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
    propertySearchResult,
  ]);


  useEffect(() => {
    const externalLayers = (layers || []).filter(
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


  return {
    assetMarkers, boundaryLayer, maskLayer, propertySearchLayer,
    buildingHeatmapLayer, poiLayer, focusedPropertyLayer, externalLayersRef,
    isLayerActive
  };
}
