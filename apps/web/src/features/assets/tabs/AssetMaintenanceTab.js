import { useState } from "react";
import { createId, dateLabel, display, ListEmpty } from "./utils";

export default function AssetMaintenanceTab({ canManageProperties, updateDossier, searched }) {
  const [maintenanceForm, setMaintenanceForm] = useState({ date: "", type: "", status: "Planned", notes: "" });

  function addMaintenance() {
    if (!canManageProperties || !maintenanceForm.type.trim()) return;
    updateDossier(
      (current) => ({
        ...current,
        maintenance: [
          {
            id: createId("maintenance"),
            date: maintenanceForm.date || new Date().toISOString().slice(0, 10),
            type: maintenanceForm.type.trim(),
            status: maintenanceForm.status || "Planned",
            notes: maintenanceForm.notes,
          },
          ...current.maintenance,
        ],
      }),
      "maintenance.add",
      { type: maintenanceForm.type.trim() },
    );
    setMaintenanceForm({ date: "", type: "", status: "Planned", notes: "" });
  }

  return (
    <section className="dossier-section">
      <div className="dossier-form-grid">
        <label>
          Ngày bảo trì
          <input type="date" value={maintenanceForm.date} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, date: event.target.value })} />
        </label>
        <label>
          Loại bảo trì
          <input value={maintenanceForm.type} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, type: event.target.value })} />
        </label>
        <label>
          Trạng thái bảo trì
          <input value={maintenanceForm.status} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, status: event.target.value })} />
        </label>
        <label>
          Ghi chú bảo trì
          <input value={maintenanceForm.notes} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, notes: event.target.value })} />
        </label>
        <button type="button" className="text-button" disabled={!canManageProperties} onClick={addMaintenance}>
          Thêm bảo trì
        </button>
      </div>
      <ListEmpty items={searched.maintenance} message="Chưa có lịch sử bảo trì." />
      {searched.maintenance.map((item) => (
        <div className="dossier-row" key={item.id}>
          <strong>{item.type}</strong>
          <span>{item.status}</span>
          <span>{dateLabel(item.date)}</span>
          <span>{display(item.notes)}</span>
        </div>
      ))}
    </section>
  );
}
