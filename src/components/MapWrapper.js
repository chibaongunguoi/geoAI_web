'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import styles from './MapWrapper.module.css';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <p className={styles.loading}>Đang tải bản đồ...</p>,
});

const SCAN_OPTIONS = [
  { value: 'all', label: 'Quét tất cả' },
  { value: 'building', label: 'Building' },
  { value: 'infrastructure', label: 'Nhà xưởng / infra' },
  { value: 'green', label: 'Cây xanh' },
];

const SCAN_TYPES = {
  all: ['building', 'infrastructure', 'green'],
  building: ['building'],
  infrastructure: ['infrastructure'],
  green: ['green'],
};

export default function MapWrapper() {
  const abortControllerRef = useRef(null);
  const [scanMode, setScanMode] = useState('all');
  const [rectangleCoords, setRectangleCoords] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectRequestId, setSelectRequestId] = useState(0);
  const [captureRequestId, setCaptureRequestId] = useState(0);
  const [clearRequestId, setClearRequestId] = useState(0);

  const selectedScanTypes = useMemo(() => SCAN_TYPES[scanMode] || SCAN_TYPES.all, [scanMode]);

  const clearWorkspace = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsAnalyzing(false);
    setRectangleCoords(null);
    setAnalysisResults(null);
    setClearRequestId((requestId) => requestId + 1);
  }, []);

  const handleRectangleDrawn = useCallback((coordinates) => {
    setRectangleCoords(coordinates);
    setAnalysisResults(null);
  }, []);

  const requestSelection = () => {
    if (isAnalyzing) return;
    setAnalysisResults(null);
    setSelectRequestId((requestId) => requestId + 1);
  };

  const requestCapture = () => {
    if (!rectangleCoords || isAnalyzing) return;
    setCaptureRequestId((requestId) => requestId + 1);
  };

  const analyzeImage = useCallback(async (imageBlob, bbox) => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsAnalyzing(true);
    setAnalysisResults(null);

    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'captured_image.png');
      formData.append('bbox', JSON.stringify(bbox));
      formData.append('scanTypes', JSON.stringify(selectedScanTypes));

      const response = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: abortController.signal,
      });

      if (response.data.success) {
        setAnalysisResults(response.data.results);
        return;
      }

      throw new Error(response.data.error || 'Lỗi phân tích');
    } catch (error) {
      if (axios.isCancel(error) || error.name === 'CanceledError') {
        return;
      }

      console.error('Error analyzing image:', error);
      const errorMsg = error.response?.data?.error || error.message;
      alert(`Lỗi khi phân tích hình ảnh:\n${errorMsg}`);
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setIsAnalyzing(false);
    }
  }, [selectedScanTypes]);

  return (
    <div className={styles.mapWorkspace}>
      <aside className={styles.sidebar} aria-label="Bảng điều khiển GeoAI">
        <div className={styles.brandBlock}>
          <p className={styles.panelLabel}>GeoAI Đà Nẵng</p>
          <h1>Quét vùng vệ tinh</h1>
          <p>Chọn loại dữ liệu, vẽ khung trong Đà Nẵng, hệ thống sẽ xử lý ngay.</p>
        </div>

        <section className={styles.sidebarSection} aria-label="Loại dữ liệu cần quét">
          <h2>Loại quét</h2>
          <div className={styles.scanModeGrid}>
            {SCAN_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={scanMode === option.value ? styles.scanModeActive : styles.scanMode}
                type="button"
                disabled={isAnalyzing}
                onClick={() => setScanMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <div className={styles.actionGroup}>
          <button
            className={styles.secondaryAction}
            type="button"
            disabled={isAnalyzing}
            onClick={requestSelection}
          >
            Chọn khung quét
          </button>
          <button
            className={styles.primaryAction}
            type="button"
            disabled={!rectangleCoords || isAnalyzing}
            onClick={requestCapture}
          >
            {isAnalyzing ? 'Đang quét...' : 'Quét lại vùng này'}
          </button>
          <button
            className={styles.dangerAction}
            type="button"
            disabled={!rectangleCoords && !analysisResults && !isAnalyzing}
            onClick={clearWorkspace}
          >
            Hủy
          </button>
          <p className={styles.actionHint}>
            Sau khi vẽ khung, hệ thống tự cắt ảnh và gửi vùng quét tới server.
          </p>
        </div>

        {rectangleCoords && (
          <section className={styles.sidebarSection} aria-label="Tọa độ vùng đã chọn">
            <h2>Vùng đã chọn</h2>
            <div className={styles.coordinateList}>
              <span>NE {rectangleCoords.northEast[0].toFixed(5)}, {rectangleCoords.northEast[1].toFixed(5)}</span>
              <span>SW {rectangleCoords.southWest[0].toFixed(5)}, {rectangleCoords.southWest[1].toFixed(5)}</span>
            </div>
          </section>
        )}

        {isAnalyzing && (
          <div className={styles.status} role="status" aria-live="polite">
            Đang gửi vùng quét tới server...
          </div>
        )}

        {analysisResults && (
          <section className={styles.results} aria-label="Kết quả GeoAI">
            <h2>Kết quả</h2>
            <div className={styles.legend}>
              <span><i className={styles.redKey} /> Building</span>
              <span><i className={styles.orangeKey} /> Infra</span>
              <span><i className={styles.greenKey} /> Cây xanh</span>
            </div>
            <div className={styles.resultGrid}>
              <div className={styles.metric}>
                <span>Building</span>
                <strong>{analysisResults.analysis.buildings.count}</strong>
              </div>
              <div className={styles.metric}>
                <span>Infra</span>
                <strong>{analysisResults.analysis.infrastructure.count || 0}</strong>
              </div>
              <div className={styles.metric}>
                <span>Cây xanh</span>
                <strong>{analysisResults.analysis.green?.count || 0}</strong>
              </div>
              <div className={styles.metric}>
                <span>Object vẽ</span>
                <strong>{analysisResults.analysis.objects?.length || 0}</strong>
              </div>
            </div>
            <p className={styles.meta}>Thời gian xử lý: {analysisResults.processingTime}</p>
          </section>
        )}
      </aside>

      <div className={styles.mapCanvas}>
        <Map
          onRectangleDrawn={handleRectangleDrawn}
          onAnalyzeImage={analyzeImage}
          analysisObjects={analysisResults?.analysis?.objects || []}
          selectRequestId={selectRequestId}
          captureRequestId={captureRequestId}
          clearRequestId={clearRequestId}
        />
      </div>
    </div>
  );
}
