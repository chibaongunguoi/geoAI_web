import { useState } from "react";
import { createId, dateLabel, display, ListEmpty } from "./utils";

export default function AssetInspectionsTab({ canManageProperties, updateDossier, searched }) {
  const [inspectionForm, setInspectionForm] = useState({ date: "", result: "", notes: "", attachmentName: "" });

  function addInspection() {
    if (!canManageProperties || !inspectionForm.result.trim()) return;
    updateDossier(
      (current) => ({
        ...current,
        inspections: [
          {
            id: createId("inspection"),
            date: inspectionForm.date || new Date().toISOString().slice(0, 10),
            result: inspectionForm.result.trim(),
            notes: inspectionForm.notes,
            attachmentName: inspectionForm.attachmentName,
          },
          ...current.inspections,
        ],
      }),
      "inspection.add",
      { result: inspectionForm.result.trim() },
    );
    setInspectionForm({ date: "", result: "", notes: "", attachmentName: "" });
  }

  return (
    <section className="dossier-section">
      <div className="dossier-form-grid">
        <label>
          Ngày kiểm tra
          <input type="date" value={inspectionForm.date} onChange={(event) => setInspectionForm({ ...inspectionForm, date: event.target.value })} />
        </label>
        <label>
          Kết quả kiểm tra
          <input value={inspectionForm.result} onChange={(event) => setInspectionForm({ ...inspectionForm, result: event.target.value })} />
        </label>
        <label>
          Ghi chú kiểm tra
          <input value={inspectionForm.notes} onChange={(event) => setInspectionForm({ ...inspectionForm, notes: event.target.value })} />
        </label>
        <label>
          Tên tệp đính kèm
          <input value={inspectionForm.attachmentName} onChange={(event) => setInspectionForm({ ...inspectionForm, attachmentName: event.target.value })} />
        </label>
        <button type="button" className="text-button" disabled={!canManageProperties} onClick={addInspection}>
          Thêm kiểm tra
        </button>
      </div>
      <ListEmpty items={searched.inspections} message="Chưa có biên bản kiểm tra nào." />
      {searched.inspections.map((inspection) => (
        <div className="dossier-row" key={inspection.id}>
          <strong>{inspection.result}</strong>
          <span>{dateLabel(inspection.date)}</span>
          <span>{display(inspection.notes)}</span>
          <span>{display(inspection.attachmentName)}</span>
        </div>
      ))}
    </section>
  );
}
