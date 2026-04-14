'use client';

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { useEffect, useState } from 'react';

// Component to handle map initialization and drawing
function MapComponent({ onRectangleDrawn }) {
  const map = useMap();
  const [drawnItems] = useState(new L.FeatureGroup());

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

    // Handle rectangle creation
    map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer;
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
      map.removeLayer(drawnItems);
    };
  }, [map, drawnItems, onRectangleDrawn]);

  return null;
}

export default function Map({ onRectangleDrawn }) {
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
      <MapComponent onRectangleDrawn={onRectangleDrawn} />
    </MapContainer>
  );
}