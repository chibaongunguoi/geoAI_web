'use client';

import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { useCallback, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';

const DANANG_CENTER = [16.0544, 108.2022];
const DANANG_BOUNDS = [
  [15.88, 107.82],
  [16.2, 108.35],
];
const OBJECT_COLORS = {
  building: '#ef4444',
  infrastructure: '#f59e0b',
  green: '#22c55e',
};

function boundsToCoordinates(bounds) {
  return {
    northEast: [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
    southWest: [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
    northWest: [bounds.getNorthWest().lat, bounds.getNorthWest().lng],
    southEast: [bounds.getSouthEast().lat, bounds.getSouthEast().lng],
  };
}

function isInsideDaNang(bounds) {
  const allowed = L.latLngBounds(DANANG_BOUNDS);
  return allowed.contains(bounds.getSouthWest()) && allowed.contains(bounds.getNorthEast());
}

function objectColor(type) {
  return OBJECT_COLORS[type] || OBJECT_COLORS.building;
}

function MapComponent({
  onRectangleDrawn,
  onAnalyzeImage,
  analysisObjects,
  selectRequestId,
  captureRequestId,
  clearRequestId,
}) {
  const map = useMap();
  const [drawnItems] = useState(new L.FeatureGroup());
  const [objectBoxes] = useState(new L.FeatureGroup());
  const [currentCoords, setCurrentCoords] = useState(null);

  const clearMapState = useCallback(() => {
    drawnItems.clearLayers();
    objectBoxes.clearLayers();
    setCurrentCoords(null);
    onRectangleDrawn(null);
  }, [drawnItems, objectBoxes, onRectangleDrawn]);

  const captureImageForCoords = useCallback(async (coords) => {
    if (!coords) return;

    try {
      const mapElement = map.getContainer();
      const ne = map.latLngToContainerPoint([coords.northEast[0], coords.northEast[1]]);
      const sw = map.latLngToContainerPoint([coords.southWest[0], coords.southWest[1]]);

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
      }, 'image/png');
    } catch (error) {
      console.error('Error capturing image:', error);
      alert('Có lỗi khi cắt hình ảnh. Vui lòng thử lại.');
    }
  }, [map, onAnalyzeImage]);

  useEffect(() => {
    map.setMaxBounds(DANANG_BOUNDS);
    map.fitBounds(DANANG_BOUNDS);
    map.addLayer(drawnItems);
    map.addLayer(objectBoxes);
    setTimeout(() => map.invalidateSize(), 0);

    const handleCreated = (event) => {
      const layer = event.layer;
      const bounds = layer.getBounds();

      if (!isInsideDaNang(bounds)) {
        alert('Vui lòng chọn vùng nằm trong địa phận Đà Nẵng.');
        return;
      }

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
    };
  }, [map, drawnItems, objectBoxes, onRectangleDrawn, captureImageForCoords]);

  useEffect(() => {
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  useEffect(() => {
    if (selectRequestId <= 0) return;

    drawnItems.clearLayers();
    objectBoxes.clearLayers();
    setCurrentCoords(null);
    onRectangleDrawn(null);

    const rectangleDrawer = new L.Draw.Rectangle(map, {
      shapeOptions: {
        color: '#2563eb',
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
        }
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
      maxBounds={DANANG_BOUNDS}
      maxBoundsViscosity={1}
      className="geoai-map"
      zoomControl={true}
      scrollWheelZoom={true}
      dragging={true}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        maxZoom={19}
        maxNativeZoom={18}
      />
      <MapComponent
        onRectangleDrawn={onRectangleDrawn}
        onAnalyzeImage={onAnalyzeImage}
        analysisObjects={analysisObjects || []}
        selectRequestId={selectRequestId || 0}
        captureRequestId={captureRequestId || 0}
        clearRequestId={clearRequestId || 0}
      />
    </MapContainer>
  );
}
