import Link from "next/link";

function display(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function areaLabel(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `${Number(value).toLocaleString("vi-VN")} m2`;
}

function assetIdentifier(property) {
  return property.code || property.id;
}

function auditActor(log) {
  return log.actor?.username || log.actor?.email || "Hệ thống";
}

export default function AssetDetailPanel({ property, auditLogs = [], canManageProperties }) {
  const identifier = assetIdentifier(property);
  const coordinate =
    property.centroidLat !== null &&
    property.centroidLat !== undefined &&
    property.centroidLng !== null &&
    property.centroidLng !== undefined
      ? `${property.centroidLat}, ${property.centroidLng}`
      : "-";

  return (
    <section className="asset-detail-panel">
      <div className="asset-detail-heading">
        <div>
          <p className="eyebrow">Hồ sơ tài sản</p>
          <h1>{display(property.name || property.code)}</h1>
        </div>
        {canManageProperties ? (
          <Link className="text-button" href={`/assets/${encodeURIComponent(identifier)}/edit`}>
            Sửa tài sản
          </Link>
        ) : null}
      </div>
      <div className="asset-detail-grid">
        <dl>
          <dt>Mã</dt>
          <dd>{display(property.code)}</dd>
          <dt>Loại</dt>
          <dd>{display(property.propertyType)}</dd>
          <dt>Trạng thái</dt>
          <dd>{display(property.status)}</dd>
          <dt>Diện tích</dt>
          <dd>{areaLabel(property.areaSqm)}</dd>
          <dt>Địa chỉ</dt>
          <dd>{display(property.addressLine)}</dd>
          <dt>Địa bàn</dt>
          <dd>{[property.ward, property.district, property.city].filter(Boolean).join(", ") || "-"}</dd>
          <dt>Tọa độ</dt>
          <dd>{coordinate}</dd>
        </dl>
        <div className="asset-map-preview" aria-label="Xem trước bản đồ">
          <span className="asset-map-pin" />
          <strong>{coordinate}</strong>
        </div>
      </div>
      <section className="asset-timeline" aria-label="Lịch sử thay đổi">
        <h2>Lịch sử thay đổi</h2>
        {auditLogs.length ? (
          auditLogs.map((log) => (
            <article key={log.id} className="asset-timeline-item">
              <strong>{log.action}</strong>
              <span>{auditActor(log)}</span>
              <time dateTime={log.createdAt}>
                {log.createdAt ? new Intl.DateTimeFormat("vi-VN").format(new Date(log.createdAt)) : "-"}
              </time>
            </article>
          ))
        ) : (
          <p className="empty-list">Chưa có lịch sử thay đổi cho tài sản này.</p>
        )}
      </section>
    </section>
  );
}
