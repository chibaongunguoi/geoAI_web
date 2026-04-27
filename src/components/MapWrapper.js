"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import axios from "axios";
import styles from "./MapWrapper.module.css";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <p className={styles.loading}>Đang tải bản đồ...</p>,
});

const ADMIN_OPTIONS = [
  { value: "all_da_nang", label: "Toàn Đà Nẵng" },
  { value: "hai_chau", label: "Hải Châu" },
  { value: "thanh_khe", label: "Thanh Khê" },
  { value: "son_tra", label: "Sơn Trà" },
  { value: "ngu_hanh_son", label: "Ngũ Hành Sơn" },
  { value: "lien_chieu", label: "Liên Chiểu" },
  { value: "cam_le", label: "Cẩm Lệ" },
  { value: "hoa_vang", label: "Hòa Vang" },
];

const SCAN_MODE_OPTIONS = [
  {
    value: "geoai",
    label: "GeoAI + GeoTIFF",
    description:
      "Nhận diện khi bạn quét, dùng GeoTIFF backend cắt theo vùng đã chọn.",
  },
  {
    value: "overture",
    label: "Overture Maps",
    description: "Dùng building footprint vector đã cache sẵn.",
  },
];

export default function MapWrapper() {
  const abortControllerRef = useRef(null);
  const [adminArea, setAdminArea] = useState("all_da_nang");
  const [scanMode, setScanMode] = useState("geoai");
  const [rectangleCoords, setRectangleCoords] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectRequestId, setSelectRequestId] = useState(0);
  const [captureRequestId, setCaptureRequestId] = useState(0);
  const [clearRequestId, setClearRequestId] = useState(0);

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

  const analyzeImage = useCallback(
    async (imageBlob, bbox) => {
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsAnalyzing(true);
      setAnalysisResults(null);

      try {
        const formData = new FormData();
        formData.append("image", imageBlob, "captured_image.png");
        formData.append("bbox", JSON.stringify(bbox));
        formData.append("scanTypes", JSON.stringify(["building"]));
        formData.append("adminArea", adminArea);
        formData.append("scanMode", scanMode);

        const response = await axios.post("/api/analyze", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          signal: abortController.signal,
        });

        if (response.data.success) {
          setAnalysisResults(response.data.results);
          return;
        }

        throw new Error(response.data.error || "Lỗi phân tích");
      } catch (error) {
        if (axios.isCancel(error) || error.name === "CanceledError") {
          return;
        }

        console.error("Error analyzing image:", error);
        const errorMsg = error.response?.data?.error || error.message;
        alert(`Lỗi khi phân tích hình ảnh:\n${errorMsg}`);
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        setIsAnalyzing(false);
      }
    },
    [adminArea, scanMode],
  );

  const selectedScanMode = SCAN_MODE_OPTIONS.find(
    (option) => option.value === scanMode,
  );

  return (
    <div className={styles.mapWorkspace}>
      <aside className={styles.sidebar} aria-label="Bảng điều khiển GeoAI">
        <div className={styles.brandBlock}>
          <p className={styles.panelLabel}>GeoAI Đà Nẵng</p>
          <h1>Quét vùng vệ tinh</h1>
          <p>
            Chọn kiểu quét để demo, vẽ khung trong Đà Nẵng, hệ thống sẽ xử lý
            ngay. Chỉ phần nằm trong khu vực đã chọn được tính.
          </p>
        </div>

        <section className={styles.sidebarSection} aria-label="Khu vực quét">
          <h2>Khu vực</h2>
          <select
            className={styles.selectInput}
            value={adminArea}
            disabled={isAnalyzing}
            onChange={(event) => {
              setAdminArea(event.target.value);
              setAnalysisResults(null);
            }}
          >
            {ADMIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <p className={styles.actionHint}>
            Khu vực này giới hạn phần được tính trong kết quả.
          </p>
        </section>

        <section className={styles.sidebarSection} aria-label="Chế độ quét">
          <h2>Kiểu quét</h2>
          <select
            className={styles.selectInput}
            value={scanMode}
            disabled={isAnalyzing}
            onChange={(event) => {
              setScanMode(event.target.value);
              setAnalysisResults(null);
            }}
          >
            {SCAN_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <p className={styles.actionHint}>{selectedScanMode?.description}</p>
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
            {isAnalyzing ? "Đang quét..." : "Quét lại vùng này"}
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
            Sau khi vẽ khung, chỉ phần nằm trong khu vực đã chọn được tính. Vùng
            hợp lệ tối đa 25 hecta.
          </p>
        </div>

        {rectangleCoords && (
          <section
            className={styles.sidebarSection}
            aria-label="Tọa độ đã chọn"
          >
            <h2>Vùng đã chọn</h2>
            <div className={styles.coordinateList}>
              <span>
                NE {rectangleCoords.northEast[0].toFixed(5)},{" "}
                {rectangleCoords.northEast[1].toFixed(5)}
              </span>
              <span>
                SW {rectangleCoords.southWest[0].toFixed(5)},{" "}
                {rectangleCoords.southWest[1].toFixed(5)}
              </span>
            </div>
          </section>
        )}

        {isAnalyzing && (
          <div className={styles.status} role="status" aria-live="polite">
            Đang gửi vùng quét tới server...
          </div>
        )}

        {analysisResults && (
          <section className={styles.results} aria-label="Kết quả quét">
            <h2>Kết quả</h2>
            <div className={styles.resultGrid}>
              <div className={styles.metric}>
                <span>Nhà</span>
                <strong>{analysisResults.analysis.buildings.count}</strong>
              </div>
              <div className={styles.metric}>
                <span>Vùng nhận diện</span>
                <strong>{analysisResults.analysis.objects?.length || 0}</strong>
              </div>
            </div>
            <p className={styles.meta}>
              Phần hợp lệ: {analysisResults.validAreaHectares || 0} ha
            </p>
            <p className={styles.meta}>
              Nguồn quét: {analysisResults.dataSource}
            </p>
            {analysisResults.modelName && (
              <p className={styles.meta}>Model: {analysisResults.modelName}</p>
            )}
            <p className={styles.meta}>
              Thời gian xử lý: {analysisResults.processingTime}
            </p>
          </section>
        )}
      </aside>

      <div className={styles.mapCanvas}>
        <div className={styles.mapModeBadge} data-mode={scanMode}>
          {selectedScanMode?.label}
        </div>
        <Map
          onRectangleDrawn={handleRectangleDrawn}
          onAnalyzeImage={analyzeImage}
          analysisObjects={analysisResults?.analysis?.objects || []}
          selectRequestId={selectRequestId}
          captureRequestId={captureRequestId}
          clearRequestId={clearRequestId}
          selectedAdminArea={adminArea}
        />
      </div>
    </div>
  );
}
