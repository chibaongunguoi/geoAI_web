import { useEffect, useCallback, useState } from "react";
import L from "leaflet";
import html2canvas from "html2canvas";
import { 
  snapPointByPixel, boundsToCoordinates, objectColor, 
  measurementVertexIcon, measurementLabelIcon, spatialDrawVertexIcon 
} from "../map-helpers";
import { formatDistance, calculateDistance, calculateCentroid } from "@/features/measurement/measurement-utils";

export function useMapDrawTools({
  map,
  visibleAssets,
  measurementState,
  measurementResult,
  onMeasurementPointAdd,
  onMeasurementPointEdit,
  spatialDrawState,
  spatialDrawResult,
  onSpatialDrawMapPointAdd,
  onSpatialDrawVertexEdit,
  onSpatialDrawVertexSelect,
  onRectangleDrawn,
  onAnalyzeImage,
  selectRequestId,
  clearRequestId,
  captureRequestId,
  analysisObjects,
  isLayerActive,
  layerOpacities,
  onLayerStatusChange
}) {
  const [drawnItems] = useState(() => new L.FeatureGroup());
  const [objectBoxes] = useState(() => new L.FeatureGroup());
  const [measurementLayer] = useState(() => new L.FeatureGroup());
  const [spatialDrawLayer] = useState(() => new L.FeatureGroup());
  const [currentCoords, setCurrentCoords] = useState(null);

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
    map.addLayer(drawnItems);
    map.addLayer(objectBoxes);
    map.addLayer(measurementLayer);
    map.addLayer(spatialDrawLayer);

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
      map.removeLayer(measurementLayer);
      map.removeLayer(spatialDrawLayer);
    };
  }, [map, drawnItems, objectBoxes, measurementLayer, spatialDrawLayer, onRectangleDrawn, captureImageForCoords]);

  useEffect(() => {
    const mode = measurementState?.mode || "idle";
    if (mode === "idle") return undefined;

    const handleMeasurementClick = (event) => {
      const rawPoint = {
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      };
      const point =
        measurementState?.snapEnabled === false
          ? rawPoint
          : snapPointByPixel(rawPoint, visibleAssets, map);

      onMeasurementPointAdd?.({
        lat: point.lat,
        lng: point.lng,
      });
    };

    map.on("click", handleMeasurementClick);
    return () => {
      map.off("click", handleMeasurementClick);
    };
  }, [map, measurementState?.mode, measurementState?.snapEnabled, onMeasurementPointAdd, visibleAssets]);


  useEffect(() => {
    measurementLayer.clearLayers();
    const mode = measurementState?.mode || "idle";
    const points = Array.isArray(measurementState?.points) ? measurementState.points : [];
    if (mode === "idle" || points.length === 0) return;

    const latLngs = points.map((point) => [point.lat, point.lng]);

    if (mode === "distance" && latLngs.length >= 2) {
      L.polyline(latLngs, {
        color: "#059669",
        weight: 4,
        opacity: 0.95,
      }).addTo(measurementLayer);

      points.slice(1).forEach((point, index) => {
        const previous = points[index];
        const mid = [(previous.lat + point.lat) / 2, (previous.lng + point.lng) / 2];
        L.marker(mid, {
          interactive: false,
          icon: measurementLabelIcon(formatDistance(calculateDistance(previous, point))),
        }).addTo(measurementLayer);
      });

      const last = points[points.length - 1];
      L.marker([last.lat, last.lng], {
        interactive: false,
        icon: measurementLabelIcon(measurementResult?.formattedValue || ""),
      }).addTo(measurementLayer);
    }

    if (mode === "area" && latLngs.length >= 3) {
      L.polygon(latLngs, {
        color: "#059669",
        weight: 4,
        opacity: 0.95,
        fillColor: "#10b981",
        fillOpacity: 0.16,
      }).addTo(measurementLayer);

      const centroid = measurementResult?.centroid || calculateCentroid(points);
      if (centroid) {
        L.marker([centroid.lat, centroid.lng], {
          interactive: false,
          icon: measurementLabelIcon(measurementResult?.formattedValue || ""),
        }).addTo(measurementLayer);
      }
    }

    points.forEach((point, index) => {
      const marker = L.marker([point.lat, point.lng], {
        draggable: true,
        icon: measurementVertexIcon(index),
        zIndexOffset: 1100,
      });
      marker.on("dragend", () => {
        const latLng = marker.getLatLng();
        onMeasurementPointEdit?.(index, { lat: latLng.lat, lng: latLng.lng });
      });
      marker.addTo(measurementLayer);
    });

    measurementLayer.bringToFront();
  }, [
    measurementLayer,
    measurementResult,
    measurementState?.mode,
    measurementState?.points,
    onMeasurementPointEdit,
  ]);


  useEffect(() => {
    const mode = spatialDrawState?.mode || "idle";
    if (mode === "idle" || mode === "edit") return undefined;

    const handleSpatialDrawClick = (event) => {
      const rawPoint = {
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      };
      const point =
        spatialDrawState?.snapEnabled === false
          ? rawPoint
          : snapPointByPixel(rawPoint, visibleAssets, map);

      onSpatialDrawMapPointAdd?.({
        lat: point.lat,
        lng: point.lng,
      });
    };

    map.on("click", handleSpatialDrawClick);
    return () => {
      map.off("click", handleSpatialDrawClick);
    };
  }, [
    map,
    onSpatialDrawMapPointAdd,
    spatialDrawState?.mode,
    spatialDrawState?.snapEnabled,
    visibleAssets,
  ]);


  useEffect(() => {
    spatialDrawLayer.clearLayers();
    const mode = spatialDrawState?.mode || "idle";
    const coordinates = Array.isArray(spatialDrawState?.coordinates) ? spatialDrawState.coordinates : [];
    if (mode === "idle" || coordinates.length === 0) return;

    const latLngs = coordinates.map((point) => [point.lat, point.lng]);

    if (coordinates.length === 1) {
      L.circleMarker(latLngs[0], {
        radius: 7,
        color: "#ffffff",
        weight: 2,
        fillColor: "#7c3aed",
        fillOpacity: 0.95,
      }).addTo(spatialDrawLayer);
    }

    if (coordinates.length >= 2 && (mode === "line" || coordinates.length === 2)) {
      L.polyline(latLngs, {
        color: "#7c3aed",
        weight: 4,
        opacity: 0.95,
        dashArray: mode === "polygon" ? "6 5" : undefined,
      }).addTo(spatialDrawLayer);
    }

    if (coordinates.length >= 3 && (mode === "polygon" || spatialDrawResult?.type === "polygon")) {
      L.polygon(latLngs, {
        color: "#7c3aed",
        weight: 4,
        opacity: 0.95,
        fillColor: "#8b5cf6",
        fillOpacity: 0.16,
      }).addTo(spatialDrawLayer);
    }

    coordinates.forEach((point, index) => {
      const marker = L.marker([point.lat, point.lng], {
        draggable: true,
        icon: spatialDrawVertexIcon(index, spatialDrawState?.selectedVertexIndex === index),
        zIndexOffset: 1200,
      });
      marker.on("click", () => {
        onSpatialDrawVertexSelect?.(index);
      });
      marker.on("dragend", () => {
        const latLng = marker.getLatLng();
        onSpatialDrawVertexEdit?.(index, { lat: latLng.lat, lng: latLng.lng });
      });
      marker.addTo(spatialDrawLayer);
    });

    spatialDrawLayer.bringToFront();
  }, [
    onSpatialDrawVertexEdit,
    onSpatialDrawVertexSelect,
    spatialDrawLayer,
    spatialDrawResult?.type,
    spatialDrawState?.coordinates,
    spatialDrawState?.mode,
    spatialDrawState?.selectedVertexIndex,
  ]);


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
      const isDensityRegion = object.geometrySource === "property_search_density_region";

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
              weight: isDensityRegion ? 3 : object.geometrySource === "geoai_mask" ? 2 : 2.4,
              opacity: layerOpacity,
              fill: true,
              fillColor: objectColor(object.type),
              fillOpacity: (isDensityRegion ? 0.04 : 0.08) * layerOpacity,
              interactive: false,
            },
          },
        );

        objectBoxes.addLayer(footprint);
        return;
      }

      if (object.geometrySource === "overture_property_search" && object.center) {
        const marker = L.circleMarker([object.center.lat, object.center.lng], {
          radius: 2.5,
          color: objectColor(object.type),
          weight: 1,
          opacity: 0.9 * layerOpacity,
          fill: true,
          fillColor: objectColor(object.type),
          fillOpacity: 0.55 * layerOpacity,
          interactive: false,
        });

        objectBoxes.addLayer(marker);
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
          weight: isDensityRegion ? 3 : 2,
          opacity: layerOpacity,
          fill: isDensityRegion,
          fillColor: objectColor(object.type),
          fillOpacity: isDensityRegion ? 0.05 * layerOpacity : 0,
          dashArray: isDensityRegion ? "8 5" : undefined,
          interactive: false,
        },
      );

      objectBoxes.addLayer(rectangle);
    });
  }, [analysisObjects, objectBoxes, layerOpacities, isLayerActive, onLayerStatusChange]);


  useEffect(() => {
    if (captureRequestId > 0) {
      captureImageForCoords(currentCoords);
    }
  }, [captureRequestId, captureImageForCoords, currentCoords]);


  return { drawnItems, objectBoxes, measurementLayer, spatialDrawLayer, currentCoords, setCurrentCoords };
}
