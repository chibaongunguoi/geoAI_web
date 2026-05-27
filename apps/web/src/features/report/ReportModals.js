import React, { useState } from "react";
import { ReportService } from "./report.service";
import "./report.css";

import L from "leaflet";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export function CreateReportModal({ location, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ReportService.createReport({
        reason,
        message,
        latitude: location.lat,
        longitude: location.lng
      });
      alert("Phản ánh đã được gửi thành công!");
      onSuccess();
    } catch (err) {
      alert("Lỗi khi gửi phản ánh: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-modal-overlay">
      <div className="report-modal">
        <h3>Tạo Phản ánh hiện trường</h3>
        <p className="report-location">
          Vị trí: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="report-field">
            <label>Lý do (Loại sự cố):</label>
            <input 
              type="text" 
              required 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="Ví dụ: Ngập lụt, Hư hỏng đường..." 
            />
          </div>
          <div className="report-field">
            <label>Lời nhắn / Chi tiết:</label>
            <textarea 
              required 
              rows={4}
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Mô tả chi tiết sự cố..." 
            />
          </div>
          <div className="report-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Hủy</button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? "Đang gửi..." : "Gửi phản ánh"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ReportDetailsModal({ report, user, onClose, onUpdate }) {
  const [responseMsg, setResponseMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const isOfficerOrAdmin = user?.roles?.some(r => ['ADMIN', 'SYSTEM_ADMIN', 'OFFICER'].includes(r));
  const isCreator = report.userId === user?.id;

  const handleRespond = async () => {
    setLoading(true);
    try {
      await ReportService.respondToReport(report.id, responseMsg);
      alert("Đã gửi phản hồi thành công!");
      onUpdate();
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!window.confirm("Xác nhận sự cố đã được giải quyết?")) return;
    setLoading(true);
    try {
      await ReportService.resolveReport(report.id);
      alert("Đã đóng phản ánh thành công!");
      onUpdate();
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasLocation = report.latitude && report.longitude;

  return (
    <div className="report-modal-overlay">
      <div className="report-modal">
        <h3>Chi tiết Phản ánh</h3>
        
        <div className="report-detail-group">
          <label>Trạng thái:</label>
          <span className={`report-status status-${report.status.toLowerCase()}`}>
            {report.status === 'PENDING' ? 'Chờ xử lý' : report.status === 'RESPONDED' ? 'Đã phản hồi' : 'Đã giải quyết'}
          </span>
        </div>

        <div className="report-detail-group">
          <label>Người gửi:</label>
          <p>{report.user?.name || "Ẩn danh"}</p>
        </div>

        <div className="report-detail-group">
          <label>Sự cố:</label>
          <p><strong>{report.reason}</strong></p>
          <p>{report.message}</p>
        </div>

        {hasLocation && (
          <div className="report-detail-group">
            <label>Vị trí:</label>
            <div style={{ height: "180px", width: "100%", borderRadius: "8px", overflow: "hidden", marginTop: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <MapContainer 
                center={[report.latitude, report.longitude]} 
                zoom={15} 
                style={{ height: "100%", width: "100%", zIndex: 1 }}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <Marker position={[report.latitude, report.longitude]} icon={icon} />
              </MapContainer>
            </div>
          </div>
        )}

        {report.responseMessage && (
          <div className="report-response-box">
            <label>Phản hồi từ Cán bộ:</label>
            <p>{report.responseMessage}</p>
          </div>
        )}

        {report.status === 'PENDING' && isOfficerOrAdmin && (
          <div className="report-field">
            <label>Nhập lời phản hồi (Dành cho Cán bộ):</label>
            <textarea 
              rows={5} 
              style={{ padding: "12px", fontSize: "14px" }}
              value={responseMsg} 
              onChange={e => setResponseMsg(e.target.value)} 
              placeholder="Trả lời công dân về sự cố này..."
            />
            <button onClick={handleRespond} disabled={loading || !responseMsg} className="btn-submit" style={{ marginTop: '12px', padding: "10px 16px", fontWeight: "bold" }}>
              Đánh dấu Đã tiếp nhận & Gửi Phản Hồi
            </button>
          </div>
        )}

        <div className="report-actions" style={{ marginTop: "24px" }}>
          <button onClick={onClose} className="btn-cancel">Đóng</button>
          
          {isCreator && report.status !== 'RESOLVED' && (
            <button onClick={handleResolve} disabled={loading} className="btn-resolve">
              Đánh dấu Đã Giải Quyết
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
