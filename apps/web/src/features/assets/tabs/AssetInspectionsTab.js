import { useState } from "react";
import { backendFileUrl, uploadAssetFile } from "../asset-file-upload";
import { createId, dateLabel, display, ListEmpty } from "./utils";

const INSPECTION_RESULTS = [
  ["passed", "Đạt"],
  ["needs-repair", "Cần sửa chữa"],
  ["monitoring", "Theo dõi thêm"],
  ["failed", "Không đạt"],
];

export default function AssetInspectionsTab({ canManageProperties, updateDossier, searched, setMessage }) {
  const [inspectionForm, setInspectionForm] = useState({ date: "", result: "passed", notes: "", file: null });
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function addInspection() {
    const result = INSPECTION_RESULTS.find(([value]) => value === inspectionForm.result)?.[1] || inspectionForm.result;
    if (!canManageProperties || !result || uploading) return;
    setUploading(true);
    setMessage("");
    try {
      const uploaded = await uploadAssetFile(inspectionForm.file);
      updateDossier(
        (current) => ({
          ...current,
          inspections: [
            {
              id: createId("inspection"),
              date: inspectionForm.date || new Date().toISOString().slice(0, 10),
              result,
              notes: inspectionForm.notes,
              attachmentName: inspectionForm.file?.name || "",
              fileUrl: uploaded.fileUrl || uploaded.imageUrl || "",
              objectKey: uploaded.objectKey || "",
              contentType: uploaded.contentType || inspectionForm.file?.type || "",
            },
            ...current.inspections,
          ],
        }),
        "inspection.add",
        { result, uploaded: Boolean(uploaded.objectKey) },
      );
      setInspectionForm({ date: "", result: "passed", notes: "", file: null });
      setShowForm(false);
      setMessage(uploaded.objectKey ? "Đã tải biên bản kiểm tra lên R2." : "Đã lưu kiểm tra.");
    } catch (error) {
      setMessage(error.message || "Tải biên bản kiểm tra thất bại.");
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
        <h2>Kiểm tra</h2>
        <button type="button" className="text-button" disabled={!canManageProperties} onClick={() => setShowForm((current) => !current)}>
          {showForm ? "Đóng" : "Thêm kiểm tra"}
        </button>
      </div>
      {showForm ? (
        <div className="dossier-form-grid dossier-form-grid--wide">
          <label>
            Ngày kiểm tra
            <input type="date" value={inspectionForm.date} onChange={(event) => setInspectionForm({ ...inspectionForm, date: event.target.value })} />
          </label>
          <label>
            Kết quả kiểm tra
            <select value={inspectionForm.result} onChange={(event) => setInspectionForm({ ...inspectionForm, result: event.target.value })}>
              {INSPECTION_RESULTS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Tệp đính kèm
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={(event) => setInspectionForm({ ...inspectionForm, file: event.target.files?.[0] || null })} />
          </label>
          <label>
            Ghi chú
            <input value={inspectionForm.notes} onChange={(event) => setInspectionForm({ ...inspectionForm, notes: event.target.value })} />
          </label>
          <button type="button" className="text-button" disabled={!canManageProperties || uploading} onClick={addInspection}>
            {uploading ? "Đang tải..." : "Lưu kiểm tra"}
          </button>
        </div>
      ) : null}
      <ListEmpty items={searched.inspections} message="Chưa có biên bản kiểm tra nào." />
      {searched.inspections.map((inspection) => (
        <div className="dossier-row" key={inspection.id}>
          <strong>{inspection.result}</strong>
          <span>{dateLabel(inspection.date)}</span>
          <span>{display(inspection.notes)}</span>
          <span>{display(inspection.attachmentName)}</span>
          {inspection.fileUrl ? (
            <button type="button" className="text-button" onClick={() => openAttachment(inspection)}>
              Mở tệp
            </button>
          ) : null}
        </div>
      ))}
    </section>
  );
}
