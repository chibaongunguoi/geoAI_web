"use client";

import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon path issues with Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

const DANANG_CENTER = [16.0544, 108.2022];

import { useEffect, useState } from "react";

function MapClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

export default function MiniMapPicker({ lat, lng, onLocationSelected }) {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    fetch("/api/admin-boundaries")
      .then(r => r.json())
      .then(data => {
        if (data && (data.type === "FeatureCollection" || data.type === "Feature")) {
          setGeoData(data);
        } else {
          console.error("Invalid geoData:", data);
        }
      })
      .catch(e => console.error("Failed to load admin boundaries", e));
  }, []);

  const center = (lat && lng && !isNaN(lat) && !isNaN(lng)) 
    ? [Number(lat), Number(lng)] 
    : DANANG_CENTER;

  const geoJsonStyle = {
    color: "#ef4444",
    weight: 2,
    opacity: 0.9,
    fillOpacity: 0.1
  };

  return (
    <div className="mini-map-picker" style={{ height: "400px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid #ccc", marginTop: "8px" }}>
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {geoData && (
          <GeoJSON 
            data={geoData} 
            style={geoJsonStyle} 
          />
        )}
        {lat && lng && !isNaN(lat) && !isNaN(lng) && (
          <Marker position={[Number(lat), Number(lng)]} icon={icon} />
        )}
        <MapClickHandler onClick={onLocationSelected} />
      </MapContainer>
    </div>
  );
}
