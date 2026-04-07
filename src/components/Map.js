'use client';

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Component to handle map initialization
function MapComponent() {
  const map = useMap();

  useEffect(() => {
    // Set initial view to a location (e.g., Vietnam)
    map.setView([14.0583, 108.2772], 6);
  }, [map]);

  return null;
}

export default function Map() {
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
      <MapComponent />
    </MapContainer>
  );
}