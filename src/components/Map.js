"use client";

import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";

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
  all_da_nang: "Toàn Đà Nẵng",
  camle: "Cẩm Lệ",
  haichau: "Hải Châu",
  hoavang: "Hòa Vang",
  lienchieu: "Liên Chiểu",
  nguhanhson: "Ngũ Hành Sơn",
  sontra: "Sơn Trà",
  thanhkhe: "Thanh Khê",
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

function MapComponent({
  onRectangleDrawn,
  onAnalyzeImage,
  analysisObjects,
  selectedAdminArea,
  selectRequestId,
  captureRequestId,
  clearRequestId,
}) {
  const map = useMap();
  const [drawnItems] = useState(new L.FeatureGroup());
  const [objectBoxes] = useState(new L.FeatureGroup());
  const [boundaryLayer] = useState(new L.FeatureGroup());
  const [maskLayer] = useState(new L.FeatureGroup());
  const [currentCoords, setCurrentCoords] = useState(null);
  const [adminBoundaries, setAdminBoundaries] = useState(null);
  const rightDragState = useRef(null);

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
        alert("Có lỗi khi cắt hình ảnh. Vui lòng thử lại.");
      }
    },
    [map, onAnalyzeImage],
  );

  useEffect(() => {
    map.setMaxBounds(MAP_VIEW_BOUNDS);
    map.fitBounds(DANANG_BOUNDS);
    map.addLayer(drawnItems);
    map.addLayer(objectBoxes);
    map.addLayer(maskLayer);
    map.addLayer(boundaryLayer);
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
      map.removeLayer(maskLayer);
      map.removeLayer(boundaryLayer);
    };
  }, [
    map,
    drawnItems,
    objectBoxes,
    maskLayer,
    boundaryLayer,
    onRectangleDrawn,
    captureImageForCoords,
  ]);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/admin-boundaries")
      .then((response) => response.json())
      .then((data) => {
        if (isMounted && data.success) {
          setAdminBoundaries(data.districts);
        }
      })
      .catch((error) => {
        console.error("Error loading admin boundaries:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!adminBoundaries?.features?.length) return;

    boundaryLayer.clearLayers();
    maskLayer.clearLayers();

    const selectedId = normalizedAdminArea(selectedAdminArea);
    const isAllDaNang = selectedId === "all_da_nang" || selectedId === "all";
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
          fillOpacity: 0.42,
          interactive: false,
        }).addTo(maskLayer);
      }
    }

    L.geoJSON(selectedCollection, {
      style: {
        color: "#ffffff",
        weight: 5,
        opacity: isAllDaNang ? 0.4 : 0.95,
        fillOpacity: 0,
        interactive: false,
      },
    }).addTo(boundaryLayer);

    L.geoJSON(selectedCollection, {
      style: {
        color: "#ef4444",
        weight: isAllDaNang ? 1.5 : 2.5,
        opacity: 1,
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
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(isAllDaNang ? 0.08 : 0.22), {
        animate: true,
        padding: isAllDaNang ? [16, 16] : [32, 32],
        maxZoom: isAllDaNang ? 12 : 15,
      });
    }
  }, [adminBoundaries, selectedAdminArea, boundaryLayer, maskLayer, map]);

  useEffect(() => {
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);

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

    const handleMouseDown = (event) => {
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
    window.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("mouseup", stopRightDrag, true);
    window.addEventListener("blur", stopRightDrag);

    return () => {
      container.removeEventListener("contextmenu", handleContextMenu, true);
      container.removeEventListener("mousedown", handleMouseDown, true);
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
              opacity: 1,
              fill: true,
              fillColor: objectColor(object.type),
              fillOpacity: 0.08,
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
          opacity: 1,
          fill: false,
          interactive: false,
        },
      );

      objectBoxes.addLayer(rectangle);
    });
  }, [analysisObjects, objectBoxes]);

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
  selectedAdminArea,
  selectRequestId,
  captureRequestId,
  clearRequestId,
}) {
  return (
    <MapContainer
      center={DANANG_CENTER}
      zoom={12}
      minZoom={11}
      maxZoom={19}
      maxBounds={MAP_VIEW_BOUNDS}
      maxBoundsViscosity={0.35}
      className="geoai-map"
      zoomControl={true}
      scrollWheelZoom={true}
      dragging={true}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        maxZoom={19}
        maxNativeZoom={18}
      />
      <MapComponent
        onRectangleDrawn={onRectangleDrawn}
        onAnalyzeImage={onAnalyzeImage}
        analysisObjects={analysisObjects || []}
        selectedAdminArea={selectedAdminArea || "all_da_nang"}
        selectRequestId={selectRequestId || 0}
        captureRequestId={captureRequestId || 0}
        clearRequestId={clearRequestId || 0}
      />
    </MapContainer>
  );
}
