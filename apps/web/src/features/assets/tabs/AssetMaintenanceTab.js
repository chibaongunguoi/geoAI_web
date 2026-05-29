import { useState } from "react";
import { backendFileUrl, uploadAssetFile } from "../asset-file-upload";
import { createId, dateLabel, display, ListEmpty } from "./utils";

const MAINTENANCE_TYPES = [
  ["routine", "Bảo trì định kỳ"],
  ["repair", "Sửa chữa"],
  ["replacement", "Thay thế"],
  ["inspection-followup", "Theo dõi sau kiểm tra"],
];

const MAINTENANCE_STATUSES = [
  ["planned", "Đã lên kế hoạch"],
  ["in-progress", "Đang thực hiện"],
  ["completed", "Hoàn tất"],
  ["blocked", "Tạm dừng"],
];

export default function AssetMaintenanceTab({ canManageProperties, updateDossier, searched, setMessage }) {
  const [maintenanceForm, setMaintenanceForm] = useState({
    date: "",
    type: "routine",
    status: "planned",
    notes: "",
    file: null,
  });
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  function labelFor(options, value) {
    return options.find(([itemValue]) => itemValue === value)?.[1] || value;
  }

  async function addMaintenance() {
    const type = labelFor(MAINTENANCE_TYPES, maintenanceForm.type);
    const status = labelFor(MAINTENANCE_STATUSES, maintenanceForm.status);
    if (!canManageProperties || !type || uploading) return;
    setUploading(true);
    setMessage("");
    try {
      const uploaded = await uploadAssetFile(maintenanceForm.file);
      updateDossier(
        (current) => ({
          ...current,
          maintenance: [
            {
              id: createId("maintenance"),
              date: maintenanceForm.date || new Date().toISOString().slice(0, 10),
              type,
              status,
              notes: maintenanceForm.notes,
              attachmentName: maintenanceForm.file?.name || "",
              fileUrl: uploaded.fileUrl || uploaded.imageUrl || "",
              objectKey: uploaded.objectKey || "",
              contentType: uploaded.contentType || maintenanceForm.file?.type || "",
            },
            ...current.maintenance,
          ],
        }),
        "maintenance.add",
        { type, uploaded: Boolean(uploaded.objectKey) },
      );
      setMaintenanceForm({ date: "", type: "routine", status: "planned", notes: "", file: null });
      setShowForm(false);
      setMessage(uploaded.objectKey ? "Đã tải hồ sơ bảo trì lên R2." : "Đã lưu bảo trì.");
    } catch (error) {
      setMessage(error.message || "Tải hồ sơ bảo trì thất bại.");
    } finally {
      setUploading(false);
    }
  }

  function openAttachment(item) {
    if (item.fileUrl) {
      window.open(backendFileUrl(item.fileUrl), "_blank", "noopener,noreferrer");
    }
  }

  return (
    <section className="dossier-section">
      <div className="asset-section-title-row">
        <h2>Bảo trì</h2>
        <button type="button" className="text-button" disabled={!canManageProperties} onClick={() => setShowForm((current) => !current)}>
          {showForm ? "Đóng" : "Thêm bảo trì"}
        </button>
      </div>
      {showForm ? (
        <div className="dossier-form-grid dossier-form-grid--wide">
          <label>
            Ngày bảo trì
            <input type="date" value={maintenanceForm.date} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, date: event.target.value })} />
          </label>
          <label>
            Loại bảo trì
            <select value={maintenanceForm.type} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, type: event.target.value })}>
              {MAINTENANCE_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái
            <select value={maintenanceForm.status} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, status: event.target.value })}>
              {MAINTENANCE_STATUSES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Tệp đính kèm
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={(event) => setMaintenanceForm({ ...maintenanceForm, file: event.target.files?.[0] || null })} />
          </label>
          <label>
            Ghi chú
            <input value={maintenanceForm.notes} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, notes: event.target.value })} />
          </label>
          <button type="button" className="text-button" disabled={!canManageProperties || uploading} onClick={addMaintenance}>
            {uploading ? "Đang tải..." : "Lưu bảo trì"}
          </button>
        </div>
      ) : null}
      <ListEmpty items={searched.maintenance} message="Chưa có lịch sử bảo trì." />
      {searched.maintenance.map((item) => (
        <div className="dossier-row" key={item.id}>
          <strong>{item.type}</strong>
          <span>{item.status}</span>
          <span>{dateLabel(item.date)}</span>
          <span>{display(item.notes)}</span>
          <span>{display(item.attachmentName)}</span>
          {item.fileUrl ? (
            <button type="button" className="text-button" onClick={() => openAttachment(item)}>
              Mở tệp
            </button>
          ) : null}
        </div>
      ))}
    </section>
  );
}
