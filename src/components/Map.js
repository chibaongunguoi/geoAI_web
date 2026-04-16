'use client';

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { useEffect, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';

// Component to handle map initialization and drawing
function MapComponent({ onRectangleDrawn, rectangleCoords, onAnalyzeImage }) {
  const map = useMap();
  const [drawnItems] = useState(new L.FeatureGroup());
  const [captureControl, setCaptureControl] = useState(null);
  const [currentCoords, setCurrentCoords] = useState(null);

  // Update currentCoords when rectangleCoords changes
  useEffect(() => {
    setCurrentCoords(rectangleCoords);
  }, [rectangleCoords]);

  const captureImage = useCallback(async () => {
    if (!currentCoords) return;

    try {
      // Get the map container element
      const mapElement = map.getContainer();

      // Calculate pixel bounds of the rectangle
      const ne = map.latLngToContainerPoint([currentCoords.northEast[0], currentCoords.northEast[1]]);
      const sw = map.latLngToContainerPoint([currentCoords.southWest[0], currentCoords.southWest[1]]);

      const width = Math.abs(ne.x - sw.x);
      const height = Math.abs(ne.y - sw.y);
      const left = Math.min(ne.x, sw.x);
      const top = Math.min(ne.y, sw.y);

      // Use html2canvas to capture the map with clipping
      const canvas = await html2canvas(mapElement, {
        x: left,
        y: top,
        width: width,
        height: height,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
      });

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (blob && onAnalyzeImage) {
          // Create bbox array for the API
          const bbox = [
            currentCoords.southWest[1], // min lng
            currentCoords.southWest[0], // min lat
            currentCoords.northEast[1], // max lng
            currentCoords.northEast[0]  // max lat
          ];

          // Call the analyze function
          await onAnalyzeImage(blob, bbox);
        }
      }, 'image/png');

    } catch (error) {
      console.error('Error capturing image:', error);
      alert('Có lỗi khi cắt hình ảnh. Vui lòng thử lại.');
    }
  }, [currentCoords, map, onAnalyzeImage]);

  useEffect(() => {
    // Set initial view to a location (e.g., Vietnam)
    map.setView([14.0583, 108.2772], 6);

    // Add drawn items layer to map
    map.addLayer(drawnItems);

    // Initialize draw control
    const drawControl = new L.Control.Draw({
      draw: {
        polyline: false,
        polygon: false,
        circle: false,
        marker: false,
        circlemarker: false,
        rectangle: true, // Only allow rectangle drawing
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
        edit: true,
      },
    });

    map.addControl(drawControl);

    // Create custom capture control
    const captureCtrl = L.Control.extend({
      options: {
        position: 'topleft'
      },

      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';
        container.style.padding = '5px';
        container.style.border = '2px solid rgba(0,0,0,0.2)';
        container.style.borderRadius = '4px';
        container.style.cursor = 'pointer';
        container.style.display = 'none'; // Hidden by default
        container.innerHTML = '📷 Cắt ảnh';

        // Store reference to container for later updates
        this._container = container;

        return container;
      }
    });

    const newCaptureControl = new captureCtrl();
    map.addControl(newCaptureControl);
    setCaptureControl(newCaptureControl);

    // Handle rectangle creation
    map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer;

      // Clear all existing layers before adding new one
      drawnItems.clearLayers();
      drawnItems.addLayer(layer);

      if (event.layerType === 'rectangle') {
        const bounds = layer.getBounds();
        const coordinates = {
          northEast: [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
          southWest: [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
          northWest: [bounds.getNorthWest().lat, bounds.getNorthWest().lng],
          southEast: [bounds.getSouthEast().lat, bounds.getSouthEast().lng],
        };

        onRectangleDrawn(coordinates);
      }
    });

    // Handle rectangle editing
    map.on(L.Draw.Event.EDITED, (event) => {
      event.layers.eachLayer((layer) => {
        if (layer instanceof L.Rectangle) {
          const bounds = layer.getBounds();
          const coordinates = {
            northEast: [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
            southWest: [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
            northWest: [bounds.getNorthWest().lat, bounds.getNorthWest().lng],
            southEast: [bounds.getSouthEast().lat, bounds.getSouthEast().lng],
          };

          onRectangleDrawn(coordinates);
        }
      });
    });

    // Handle rectangle deletion
    map.on(L.Draw.Event.DELETED, () => {
      onRectangleDrawn(null);
    });

    return () => {
      map.removeControl(drawControl);
      if (newCaptureControl) {
        map.removeControl(newCaptureControl);
      }
      map.removeLayer(drawnItems);
    };
  }, [map, drawnItems, onRectangleDrawn, onAnalyzeImage]);

  // Update capture control click handler when captureImage changes
  useEffect(() => {
    if (captureControl) {
      const container = captureControl.getContainer();
      if (container) {
        container.onclick = captureImage;
      }
    }
  }, [captureControl, captureImage]);

  // Show/hide capture control based on rectangle existence
  useEffect(() => {
    if (captureControl) {
      const container = captureControl.getContainer();
      if (currentCoords) {
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    }
  }, [currentCoords, captureControl]);

  return null;
}

export default function Map({ onRectangleDrawn, rectangleCoords, onAnalyzeImage }) {
  return (
    <MapContainer
      center={[14.0583, 108.2772]} // Center on Vietnam
      zoom={6}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      scrollWheelZoom={true}
      dragging={true}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      />
      <MapComponent onRectangleDrawn={onRectangleDrawn} rectangleCoords={rectangleCoords} onAnalyzeImage={onAnalyzeImage} />
    </MapContainer>
  );
}