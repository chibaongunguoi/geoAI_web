"use client";

import React, { useEffect, useState } from "react";
import { ReportService } from "./report.service";
import { ReportDetailsModal } from "./ReportModals";

export default function ReportListPage({ user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await ReportService.getReports(filter);
      setReports(data);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi tải danh sách phản ánh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  return (
    <div className="report-list-wrapper">
      <div className="report-header">
        <h2>Danh sách Phản ánh hiện trường</h2>
        
        <div className="report-filters">
          <label>Lọc theo trạng thái:</label>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="RESPONDED">Đã phản hồi</option>
            <option value="RESOLVED">Đã giải quyết</option>
          </select>
          <button onClick={fetchReports} className="btn-refresh">Làm mới</button>
        </div>
      </div>

      {loading ? (
        <p style={{color: "#94a3b8"}}>Đang tải dữ liệu...</p>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <p>Không có phản ánh nào.</p>
        </div>
      ) : (
        <div className="report-grid">
          {reports.map(r => (
            <div key={r.id} className="report-card" onClick={() => setSelectedReport(r)}>
              <div className="report-card-header">
                <span className={`report-status status-${r.status.toLowerCase()}`}>
                  {r.status === 'PENDING' ? 'Chờ xử lý' : r.status === 'RESPONDED' ? 'Đã phản hồi' : 'Đã giải quyết'}
                </span>
                <span className="report-date">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <h3 className="report-title">{r.reason}</h3>
              <p className="report-desc">{r.message.length > 100 ? r.message.substring(0, 100) + '...' : r.message}</p>
              <div className="report-card-footer">
                <span className="report-author">{r.user?.name || "Người dùng"}</span>
                {r.responseMessage && <span className="report-replied-badge">Có phản hồi</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReport && (
        <ReportDetailsModal 
          report={selectedReport} 
          user={user} 
          onClose={() => setSelectedReport(null)} 
          onUpdate={() => {
            setSelectedReport(null);
            fetchReports();
          }} 
        />
      )}
    </div>
  );
}
