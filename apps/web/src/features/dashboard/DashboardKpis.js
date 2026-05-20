const KPI_ITEMS = [
  ["Tổng tài sản", "total"],
  ["Đang hoạt động", "active"],
  ["Không hoạt động", "inactive"],
  ["Cần xem xét", "review"],
  ["Cập nhật gần đây", "recentlyUpdated"],
  ["Thiếu tọa độ", "missingGeometry"]
];

export default function DashboardKpis({ summary }) {
  const totals = summary?.totals || {};

  return (
    <section className="dashboard-kpi-grid" aria-label="Dashboard KPIs">
      {KPI_ITEMS.map(([label, key]) => (
        <article className="dashboard-kpi-card" key={key}>
          <span className="dashboard-kpi-label">{label}</span>
          <strong className="dashboard-kpi-value">
            {Number(totals[key] || 0).toLocaleString("vi-VN")}
          </strong>
        </article>
      ))}
    </section>
  );
}
