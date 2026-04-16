'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import axios from 'axios';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export default function MapWrapper() {
  const [rectangleCoords, setRectangleCoords] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRectangleDrawn = (coordinates) => {
    setRectangleCoords(coordinates);
  };

  const analyzeImage = async (imageBlob, bbox) => {
    setIsAnalyzing(true);
    setAnalysisResults(null);

    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'captured_image.png');
      formData.append('bbox', JSON.stringify(bbox));

      const response = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setAnalysisResults(response.data.results);
      } else {
        throw new Error(response.data.error || 'Lỗi phân tích');
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      const errorMsg = error.response?.data?.error || error.message;
      alert('Lỗi khi phân tích hình ảnh:\n' + errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Map
        onRectangleDrawn={handleRectangleDrawn}
        rectangleCoords={rectangleCoords}
        onAnalyzeImage={analyzeImage}
      />
      {rectangleCoords && (
        <div style={{
          color:'black',
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '350px',
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
          <div style={{ marginBottom: '15px' }}>
            <strong>Góc Đông Nam (SE):</strong><br />
            Lat: {rectangleCoords.southEast[0].toFixed(6)}<br />
            Lng: {rectangleCoords.southEast[1].toFixed(6)}
          </div>

          {isAnalyzing && (
            <div style={{
              background: '#e3f2fd',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              <div>🔄 Đang phân tích với GeoAI...</div>
            </div>
          )}

          {analysisResults && (
            <div style={{
              background: '#f0f8e7',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '10px',
              border: '1px solid #4caf50'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#2e7d32' }}>📊 Kết quả GeoAI:</h4>
              <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                <div><strong>🏗️ Buildings:</strong> {analysisResults.analysis.buildings.count} tòa ({analysisResults.analysis.buildings.totalArea}m²)</div>
                <div><strong>🏘️ Đất ở:</strong> {analysisResults.analysis.landUse.residential}%</div>
                <div><strong>🏢 Thương mại:</strong> {analysisResults.analysis.landUse.commercial}%</div>
                <div><strong>🏭 Công nghiệp:</strong> {analysisResults.analysis.landUse.industrial}%</div>
                <div><strong>🌳 Không gian xanh:</strong> {analysisResults.analysis.landUse.greenSpace}%</div>
                <div><strong>🛣️ Đường sá:</strong> {analysisResults.analysis.infrastructure.roads} tuyến</div>
                <div><strong>⚡ Độ tin cậy:</strong> {(analysisResults.confidence * 100).toFixed(1)}%</div>
                <div style={{ marginTop: '5px', fontSize: '11px', color: '#666' }}>
                  ⏱️ Thời gian xử lý: {analysisResults.processingTime}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
