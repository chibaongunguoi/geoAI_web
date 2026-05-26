import { useState } from "react";
import { areaLabel, createId, dateLabel, display, ListEmpty, valueLabel } from "./utils";

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "REVIEW", "ARCHIVED"];

export default function AssetOverviewTab({
  property,
  status,
  statusDraft,
  setStatusDraft,
  savingStatus,
  saveStatus,
  canManageProperties,
  coordinate,
  auditLogs,
  searched,
  updateDossier,
}) {
  const [valueForm, setValueForm] = useState({ date: "", value: "", note: "" });

  function addValue() {
    if (!canManageProperties || !valueForm.value) return;
    updateDossier(
      (current) => ({
        ...current,
        valueHistory: [
          {
            id: createId("value"),
            date: valueForm.date || new Date().toISOString().slice(0, 10),
            value: Number(valueForm.value),
            note: valueForm.note,
          },
          ...current.valueHistory,
        ],
      }),
      "value.add",
      { value: Number(valueForm.value) },
    );
    setValueForm({ date: "", value: "", note: "" });
  }

  return (
    <div className="dossier-section">
      <section className="asset-section-basic-info" aria-label="Thông tin cơ bản">
        <h2>Thông tin cơ bản</h2>
        <dl>
          <dt>Mã tài sản</dt>
          <dd>{display(property.code)}</dd>
          <dt>Loại tài sản</dt>
          <dd>{display(property.propertyType)}</dd>
          <dt>Trạng thái</dt>
          <dd>{display(status)}</dd>
          <dt>Diện tích</dt>
          <dd>{areaLabel(property.areaSqm)}</dd>
          <dt>Địa chỉ</dt>
          <dd>{display(property.addressLine)}</dd>
        </dl>
      </section>

      <section className="asset-section-location" aria-label="Vị trí">
        <h2>Vị trí</h2>
        <dl>
          <dt>Khu vực hành chính</dt>
          <dd>{[property.ward, property.district, property.city].filter(Boolean).join(", ") || "-"}</dd>
          <dt>Tọa độ</dt>
          <dd>{coordinate}</dd>
        </dl>
        <div className="asset-map-preview" aria-label="Map preview">
          <span className="asset-map-pin" />
          <strong>{coordinate}</strong>
        </div>
      </section>

      <section className="asset-section-timeline" aria-label="Lịch sử hoạt động gần đây">
        <h2>Lịch sử hoạt động gần đây</h2>
        <ListEmpty items={auditLogs} message="Không có lịch sử hoạt động cho tài sản này." />
        {auditLogs.map((log) => (
          <article key={log.id} className="asset-timeline-item">
            <strong>{log.action}</strong>
            <span>{log.actor?.username || log.actor?.email || "System"}</span>
            <time dateTime={log.createdAt}>{dateLabel(log.createdAt)}</time>
          </article>
        ))}
      </section>

      <div className="dossier-two-column">
        <section className="dossier-panel">
          <h2>Trạng thái và giá trị</h2>
          <label>
            Trạng thái hiện tại
            <select
              value={statusDraft}
              disabled={!canManageProperties || savingStatus}
              onChange={(event) => setStatusDraft(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="text-button" disabled={!canManageProperties || savingStatus} onClick={saveStatus}>
            Lưu trạng thái
          </button>
        </section>

        <section className="dossier-panel">
          <h2>Lịch sử định giá</h2>
          <div className="dossier-form-grid">
            <label>
              Ngày định giá
              <input type="date" value={valueForm.date} onChange={(event) => setValueForm({ ...valueForm, date: event.target.value })} />
            </label>
            <label>
              Giá trị tài sản
              <input type="number" value={valueForm.value} onChange={(event) => setValueForm({ ...valueForm, value: event.target.value })} />
            </label>
            <label>
              Ghi chú định giá
              <input value={valueForm.note} onChange={(event) => setValueForm({ ...valueForm, note: event.target.value })} />
            </label>
            <button type="button" className="text-button" disabled={!canManageProperties} onClick={addValue}>
              Thêm giá trị
            </button>
          </div>
          <ListEmpty items={searched.valueHistory} message="Chưa có lịch sử định giá." />
          {searched.valueHistory.map((item) => (
            <div className="dossier-row" key={item.id}>
              <strong>{valueLabel(item.value)}</strong>
              <span>{dateLabel(item.date)}</span>
              <span>{display(item.note)}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
