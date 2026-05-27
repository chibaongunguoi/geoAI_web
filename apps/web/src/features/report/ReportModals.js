import React, { useState } from "react";
import { ReportService } from "./report.service";
import "./report.css";

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
              rows={3} 
              value={responseMsg} 
              onChange={e => setResponseMsg(e.target.value)} 
              placeholder="Trả lời công dân về sự cố này..."
            />
            <button onClick={handleRespond} disabled={loading || !responseMsg} className="btn-submit" style={{ marginTop: '8px' }}>
              Gửi Phản Hồi
            </button>
          </div>
        )}

        <div className="report-actions">
          <button onClick={onClose} className="btn-cancel">Đóng</button>
          
          {(isCreator || isOfficerOrAdmin) && report.status !== 'RESOLVED' && (
            <button onClick={handleResolve} disabled={loading} className="btn-resolve">
              Đánh dấu Đã Giải Quyết
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
