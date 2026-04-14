'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export default function MapWrapper() {
  const [rectangleCoords, setRectangleCoords] = useState(null);

  const handleRectangleDrawn = (coordinates) => {
    setRectangleCoords(coordinates);
  };

  const handleCaptureImage = () => {
    // This will be handled by the Map component
  };

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Map onRectangleDrawn={handleRectangleDrawn} onCaptureImage={handleCaptureImage} rectangleCoords={rectangleCoords} />
      {rectangleCoords && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '300px',
          fontSize: '14px',
          zIndex: 1000
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Tọa độ hình chữ nhật:</h3>
          <div style={{ marginBottom: '8px' }}>
            <strong>Góc Đông Bắc (NE):</strong><br />
            Lat: {rectangleCoords.northEast[0].toFixed(6)}<br />
            Lng: {rectangleCoords.northEast[1].toFixed(6)}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Góc Tây Nam (SW):</strong><br />
            Lat: {rectangleCoords.southWest[0].toFixed(6)}<br />
            Lng: {rectangleCoords.southWest[1].toFixed(6)}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Góc Tây Bắc (NW):</strong><br />
            Lat: {rectangleCoords.northWest[0].toFixed(6)}<br />
            Lng: {rectangleCoords.northWest[1].toFixed(6)}
          </div>
          <div>
            <strong>Góc Đông Nam (SE):</strong><br />
            Lat: {rectangleCoords.southEast[0].toFixed(6)}<br />
            Lng: {rectangleCoords.southEast[1].toFixed(6)}
          </div>
        </div>
      )}
    </div>
  );
}