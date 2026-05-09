function ChartGroup({ title, items = [], filterKey, onDrilldown }) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="dashboard-chart" aria-label={title}>
      <h2>{title}</h2>
      {items.length === 0 ? <p className="dashboard-empty">No data</p> : null}
      <div className="dashboard-bars">
        {items.slice(0, 8).map((item) => (
          <button
            type="button"
            key={`${filterKey}-${item.key}`}
            aria-label={`${item.label} ${item.count}`}
            onClick={() => onDrilldown?.({ [filterKey]: item.key })}
          >
            <span>{item.label}</span>
            <strong>{item.count}</strong>
            <i style={{ width: `${Math.max(6, (item.count / max) * 100)}%` }} />
          </button>
        ))}
      </div>
    </section>
  );
}

export default function DashboardCharts({ summary, onDrilldown }) {
  const buckets = summary?.buckets || {};

  return (
    <div className="dashboard-chart-grid">
      <ChartGroup title="Status" items={buckets.byStatus} filterKey="status" onDrilldown={onDrilldown} />
      <ChartGroup title="Type" items={buckets.byType} filterKey="propertyType" onDrilldown={onDrilldown} />
      <ChartGroup title="District" items={buckets.byDistrict} filterKey="district" onDrilldown={onDrilldown} />
      <ChartGroup title="Ward" items={buckets.byWard} filterKey="ward" onDrilldown={onDrilldown} />
      <section className="dashboard-chart" aria-label="Updated trend">
        <h2>Updated trend</h2>
        <ol className="dashboard-trend">
          {(summary?.trend || []).slice(-7).map((item) => (
            <li key={item.date}>
              <span>{item.date}</span>
              <strong>{item.count}</strong>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
