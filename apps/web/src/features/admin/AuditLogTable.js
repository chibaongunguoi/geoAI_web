function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("vi-VN") : "-";
}

function actorLabel(log) {
  return log.actor?.username || log.actor?.email || log.actorUserId || "-";
}

export default function AuditLogTable({ logs = [] }) {
  if (!logs.length) {
    return <p className="empty-panel">Không có nhật ký phù hợp.</p>;
  }

  return (
    <div className="data-table admin-audit-table">
      {logs.map((log) => (
        <div className="data-row admin-audit-row" key={log.id}>
          <strong>{log.action}</strong>
          <span>{log.entityType || "-"}</span>
          <span>{actorLabel(log)}</span>
          <span>{formatDate(log.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}
