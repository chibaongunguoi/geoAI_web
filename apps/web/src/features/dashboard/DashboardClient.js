"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { shareUrlFromState } from "@/features/export/share-state";
import { normalizeAssetFilters } from "@/features/filters/filter-state";
import DashboardCharts from "./DashboardCharts";
import DashboardFilters from "./DashboardFilters";
import DashboardKpis from "./DashboardKpis";
import { dashboardCsv, dashboardJsonPayload, dashboardQueryString, downloadTextFile } from "./dashboard-state";
import useDashboardData from "./useDashboardData";

export default function DashboardClient({ initialFilters, canExport }) {
  const router = useRouter();
  const {
    filters,
    summary,
    status,
    loading,
    history,
    autoRefresh,
    lastRefreshedAt,
    applyFilters,
    resetFilters,
    changeAutoRefresh,
    loadSummary,
    record,
  } = useDashboardData(initialFilters);

  const drilldown = useCallback(
    (patch) => {
      const next = normalizeAssetFilters({ ...filters, ...patch });
      record("drilldown", patch);
      router.push(`/assets?${dashboardQueryString(next)}`);
    },
    [filters, record, router]
  );

  const exportJson = useCallback(() => {
    if (!summary || !canExport) return;
    downloadTextFile(JSON.stringify(dashboardJsonPayload(summary), null, 2), `geoai-dashboard-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
    record("export.json", { total: summary.totals?.total || 0 });
  }, [canExport, record, summary]);

  const exportCsv = useCallback(() => {
    if (!summary || !canExport) return;
    downloadTextFile(dashboardCsv(summary), `geoai-dashboard-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
    record("export.csv", { total: summary.totals?.total || 0 });
  }, [canExport, record, summary]);

  const viewMap = useCallback(() => {
    const url = shareUrlFromState(
      {
        filters,
        viewport: summary?.map?.center
          ? { center: summary.map.center, bounds: summary.map.bbox, zoom: 13 }
          : undefined
      },
      ""
    );
    record("view.map", { total: summary?.totals?.total || 0 });
    router.push(url);
  }, [filters, record, summary, router]);

  const empty = summary && Number(summary.totals?.total || 0) === 0;
  const historyItems = useMemo(() => history.slice(0, 5), [history]);

  return (
    <div className="dashboard-page">
      <header className="dashboard-heading">
        <div>
          <p>Bảng điều khiển</p>
          <h1>Tổng quan tài sản</h1>
        </div>
        {loading ? <span className="dashboard-pill">Đang tải</span> : null}
      </header>

      <DashboardFilters
        filters={filters}
        canExport={canExport}
        autoRefresh={autoRefresh}
        lastRefreshedAt={lastRefreshedAt}
        onApply={applyFilters}
        onReset={resetFilters}
        onRefresh={() => loadSummary(filters)}
        onExportJson={exportJson}
        onExportCsv={exportCsv}
        onViewMap={viewMap}
        onAutoRefreshChange={changeAutoRefresh}
      />

      {status === "timeout" ? (
        <div className="dashboard-timeout">
          <p>Truy vấn mất quá nhiều thời gian. Vui lòng thử lại.</p>
          <button type="button" onClick={() => loadSummary(filters)}>Thử lại</button>
        </div>
      ) : status ? (
        <p className="dashboard-error">{status}</p>
      ) : null}
      {empty ? <p className="dashboard-empty">Không có tài sản nào phù hợp với bộ lọc hiện tại.</p> : null}

      <DashboardKpis summary={summary} />
      <DashboardCharts summary={summary} onDrilldown={drilldown} />

      <section className="dashboard-history" aria-label="Dashboard history">
        <h2>Hoạt động gần đây</h2>
        {historyItems.length === 0 ? <p className="dashboard-muted">Chưa có hoạt động nào gần đây.</p> : null}
        <ol>
          {historyItems.map((item) => (
            <li key={item.id}>
              <span>{item.action}</span>
              <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
