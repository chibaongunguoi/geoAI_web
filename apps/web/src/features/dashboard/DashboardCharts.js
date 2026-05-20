import EmptyState from "../shared/EmptyState";

const ChartEmptyIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="12" width="4" height="9" rx="1" />
    <rect x="10" y="7" width="4" height="14" rx="1" />
    <rect x="17" y="3" width="4" height="18" rx="1" />
    <line x1="2" y1="22" x2="22" y2="22" />
  </svg>
);

function ChartGroup({ title, items = [], filterKey, onDrilldown }) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="dashboard-chart" aria-label={title}>
      <h2>{title}</h2>
      {items.length === 0 ? (
        <EmptyState
          icon={<ChartEmptyIcon />}
          message={`Không có dữ liệu ${title.toLowerCase()}`}
        />
      ) : (
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
      )}
    </section>
  );
}

export default function DashboardCharts({ summary, onDrilldown }) {
  const buckets = summary?.buckets || {};
  const trend = summary?.trend || [];

  const hasNoData =
    !buckets.byStatus?.length &&
    !buckets.byType?.length &&
    !buckets.byDistrict?.length &&
    !buckets.byWard?.length &&
    !trend.length;

  if (hasNoData) {
    return (
      <div className="dashboard-chart-grid">
        <section className="dashboard-chart dashboard-chart--empty-full" aria-label="Biểu đồ">
          <EmptyState
            icon={<ChartEmptyIcon />}
            message="Chưa có dữ liệu biểu đồ. Dữ liệu sẽ hiển thị khi có tài sản trong hệ thống."
          />
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-chart-grid">
      <ChartGroup title="Trạng thái" items={buckets.byStatus} filterKey="status" onDrilldown={onDrilldown} />
      <ChartGroup title="Loại" items={buckets.byType} filterKey="propertyType" onDrilldown={onDrilldown} />
      <ChartGroup title="Quận/huyện" items={buckets.byDistrict} filterKey="district" onDrilldown={onDrilldown} />
      <ChartGroup title="Phường/xã" items={buckets.byWard} filterKey="ward" onDrilldown={onDrilldown} />
      <section className="dashboard-chart" aria-label="Xu hướng cập nhật">
        <h2>Xu hướng cập nhật</h2>
        {trend.length === 0 ? (
          <EmptyState
            icon={<ChartEmptyIcon />}
            message="Không có dữ liệu xu hướng cập nhật"
          />
        ) : (
          <ol className="dashboard-trend">
            {trend.slice(-7).map((item) => (
              <li key={item.date}>
                <span>{item.date}</span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
