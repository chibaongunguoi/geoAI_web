const KPI_ITEMS = [
  ["Total assets", "total"],
  ["Active", "active"],
  ["Inactive", "inactive"],
  ["Review", "review"],
  ["Recently updated", "recentlyUpdated"],
  ["Missing geometry", "missingGeometry"]
];

export default function DashboardKpis({ summary }) {
  const totals = summary?.totals || {};

  return (
    <section className="dashboard-kpi-grid" aria-label="Dashboard KPIs">
      {KPI_ITEMS.map(([label, key]) => (
        <article className="dashboard-kpi-card" key={key}>
          <span>{label}</span>
          <strong>{Number(totals[key] || 0).toLocaleString("en-US")}</strong>
        </article>
      ))}
    </section>
  );
}
