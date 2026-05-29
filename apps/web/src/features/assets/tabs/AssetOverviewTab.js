import { useState } from "react";
import dynamic from "next/dynamic";
import { areaLabel, createId, dateLabel, display, ListEmpty, valueLabel } from "./utils";

const AssetMiniMap = dynamic(() => import("../AssetMiniMap"), { ssr: false });
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
  timeline = [],
  searched,
  updateDossier,
}) {
  const [valueForm, setValueForm] = useState({ date: "", value: "", note: "" });
  const [showValueForm, setShowValueForm] = useState(false);

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
    setShowValueForm(false);
  }

  const mapHref =
    Number.isFinite(Number(property.centroidLat)) && Number.isFinite(Number(property.centroidLng))
      ? `/?lat=${encodeURIComponent(property.centroidLat)}&lng=${encodeURIComponent(property.centroidLng)}&asset=${encodeURIComponent(property.code || property.id)}`
      : "/";

  const recentActivity = timeline.slice(0, 5);

  return (
    <div className="asset-overview-layout">
      <section className="asset-overview-main" aria-label="Thông tin tài sản">
        <div className="asset-summary-block">
          <h2>Thông tin chính</h2>
          <dl className="asset-compact-list">
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
            <dt>Khu vực</dt>
            <dd>{[property.ward, property.district, property.city].filter(Boolean).join(", ") || "-"}</dd>
            <dt>Tọa độ</dt>
            <dd>{coordinate}</dd>
          </dl>
        </div>

        <div className="asset-summary-block">
          <div className="asset-section-title-row">
            <h2>Hoạt động gần đây</h2>
            <span>{recentActivity.length} mục</span>
          </div>
          <ListEmpty items={recentActivity} message="Chưa có hoạt động cho tài sản này." />
          {recentActivity.map((item) => (
            <article key={`${item.source}-${item.id}`} className="asset-activity-row">
              <strong>{item.action}</strong>
              <span>{display(item.actor)}</span>
              <time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>
            </article>
          ))}
        </div>
      </section>

      <aside className="asset-overview-side" aria-label="Vị trí và trạng thái">
        <section className="asset-summary-block asset-location-card">
          <div className="asset-section-title-row">
            <h2>Vị trí</h2>
            <a className="text-button" href={mapHref}>Mở bản đồ</a>
          </div>
          <AssetMiniMap lat={property.centroidLat} lng={property.centroidLng} label="Bản đồ vị trí tài sản" />
          <p className="asset-coordinate-line">{coordinate}</p>
        </section>

        <section className="asset-summary-block">
          <h2>Trạng thái</h2>
          <div className="asset-inline-form">
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
              Lưu
            </button>
          </div>
        </section>

        <section className="asset-summary-block">
          <div className="asset-section-title-row">
            <h2>Định giá</h2>
            {canManageProperties ? (
              <button type="button" className="text-button" onClick={() => setShowValueForm((current) => !current)}>
                {showValueForm ? "Đóng" : "Thêm"}
              </button>
            ) : null}
          </div>
          {showValueForm ? (
            <div className="asset-value-form">
              <label>
                Ngày định giá
                <input type="date" value={valueForm.date} onChange={(event) => setValueForm({ ...valueForm, date: event.target.value })} />
              </label>
              <label>
                Giá trị tài sản
                <input type="number" value={valueForm.value} onChange={(event) => setValueForm({ ...valueForm, value: event.target.value })} />
              </label>
              <label>
                Ghi chú
                <input value={valueForm.note} onChange={(event) => setValueForm({ ...valueForm, note: event.target.value })} />
              </label>
              <button type="button" className="text-button" disabled={!canManageProperties} onClick={addValue}>
                Lưu định giá
              </button>
            </div>
          ) : null}
          <ListEmpty items={searched.valueHistory} message="Chưa có lịch sử định giá." />
          {searched.valueHistory.slice(0, 3).map((item) => (
            <div className="asset-value-row" key={item.id}>
              <strong>{valueLabel(item.value)}</strong>
              <span>{dateLabel(item.date)}</span>
              <span>{display(item.note)}</span>
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}
