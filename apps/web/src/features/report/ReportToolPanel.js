import React, { useState } from "react";
import { CreateReportModal } from "./ReportModals";
import { canAccess } from "../auth/auth-client";

export default function ReportToolPanel({ styles, onEnablePickLocation, isPickingLocation, reportLocation, showMyReports, setShowMyReports, onCancelPick, onReportCreated, permissions = [] }) {
  const [showModal, setShowModal] = useState(false);

  // Admin and officers (who have properties.manage or admin permissions) can only view reports
  const isOfficerOrAdmin = canAccess(permissions, "properties.manage") || canAccess(permissions, "admin.users.view");

  return (
    <div className={styles?.toolPanelStack || "toolPanelStack"}>
      <p style={{ fontSize: "13px", color: "#cbd5e1", marginBottom: "8px" }}>
        Tính năng này cho phép cư dân gửi phản ánh hiện trường (hư hại, ngập lụt, v.v.).
      </p>

      {isPickingLocation ? (
        <div style={{ padding: "10px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid #f59e0b", borderRadius: "8px" }}>
          <p style={{ margin: "0 0 8px", color: "#fcd34d", fontSize: "13px", fontWeight: "bold" }}>
            Hãy click vào 1 điểm trên bản đồ để chọn vị trí!
          </p>
          <button onClick={onCancelPick} style={{ padding: "6px 12px", background: "#334155", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Hủy
          </button>
        </div>
      ) : reportLocation ? (
        <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "#a7f3d0" }}>
            Đã chọn: {reportLocation.lat.toFixed(5)}, {reportLocation.lng.toFixed(5)}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setShowModal(true)} style={{ flex: 1, padding: "8px", background: "#10b981", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
              Điền thông tin
            </button>
            <button onClick={onCancelPick} style={{ padding: "8px", background: "#334155", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Chọn lại
            </button>
          </div>
        </div>
      ) : !isOfficerOrAdmin ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button onClick={onEnablePickLocation} style={{ padding: "8px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
            Tạo Phản Ánh Mới
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#f8fafc", cursor: "pointer", marginTop: "8px" }}>
            <input 
              type="checkbox" 
              checked={showMyReports} 
              onChange={(e) => setShowMyReports(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Hiển thị phản ánh đang chờ xử lý của tôi
          </label>
        </div>
      ) : (
        <p style={{ fontSize: "13px", color: "#cbd5e1", marginTop: "8px", fontStyle: "italic" }}>
          Quản trị viên và cán bộ chỉ có quyền xem danh sách phản ánh.
        </p>
      )}

      {showModal && reportLocation && (
        <CreateReportModal 
          location={reportLocation} 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            onReportCreated();
          }} 
        />
      )}
    </div>
  );
}
