"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function AssetMiniMap({ lat, lng, label }) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
  const center = hasLocation ? [latitude, longitude] : [16.0544, 108.2022];

  return (
    <div className="asset-mini-map" aria-label={label || "Bản đồ vị trí tài sản"}>
      <MapContainer
        center={center}
        zoom={hasLocation ? 16 : 12}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        {hasLocation ? <Marker position={[latitude, longitude]} icon={markerIcon} /> : null}
      </MapContainer>
      {!hasLocation ? <span className="asset-mini-map-empty">Chưa có tọa độ</span> : null}
    </div>
  );
}
