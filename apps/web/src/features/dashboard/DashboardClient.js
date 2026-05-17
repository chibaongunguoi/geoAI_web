"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { shareUrlFromState } from "@/features/export/share-state";
import { normalizeAssetFilters } from "@/features/filters/filter-state";
import DashboardCharts from "./DashboardCharts";
import DashboardFilters from "./DashboardFilters";
import DashboardKpis from "./DashboardKpis";
import {
  addDashboardHistory,
  dashboardCsv,
  dashboardJsonPayload,
  dashboardQueryString,
  downloadTextFile,
  readDashboardState,
  writeDashboardState
} from "./dashboard-state";

const AUTO_REFRESH_MS = 60000;

export default function DashboardClient({ initialFilters, canExport }) {
  const [filters, setFilters] = useState(() => normalizeAssetFilters(initialFilters || {}));
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  useEffect(() => {
    const stored = readDashboardState(window.localStorage);
    if (Object.values(stored.filters).some(Boolean)) setFilters(stored.filters);
    setHistory(stored.history);
    setAutoRefresh(stored.autoRefresh);
  }, []);

  const persist = useCallback((nextFilters, nextAutoRefresh, nextHistory) => {
    writeDashboardState(window.localStorage, {
      filters: nextFilters,
      autoRefresh: nextAutoRefresh,
      history: nextHistory
    });
  }, []);

  const record = useCallback(
    (action, detail = {}) => {
      setHistory((current) => {
        const next = addDashboardHistory(current, action, detail);
        persist(filters, autoRefresh, next);
        return next;
      });
    },
    [autoRefresh, filters, persist]
  );

  const loadSummary = useCallback(
    async (nextFilters = filters) => {
      setLoading(true);
      setStatus(null);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const query = dashboardQueryString(nextFilters);
        const response = await fetch(`/api/dashboard/assets/summary${query ? `?${query}` : ""}`, {
          cache: "no-store",
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) throw new Error("Tải dữ liệu thất bại.");
        const data = await response.json();
        setSummary(data);
        setLastRefreshedAt(new Date().toISOString());
        record("refresh", { total: data.totals?.total || 0 });
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === "AbortError") {
          setStatus("timeout");
        } else {
          setStatus(error.message || "Tải dữ liệu thất bại.");
        }
      } finally {
        setLoading(false);
      }
    },
    [filters, record]
  );

  useEffect(() => {
    loadSummary(filters);
  }, [filters, loadSummary]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => loadSummary(filters), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, filters, loadSummary]);

  const applyFilters = useCallback(
    (nextFilters) => {
      const normalized = normalizeAssetFilters(nextFilters);
      setFilters(normalized);
      persist(normalized, autoRefresh, history);
      record("filters.apply", normalized);
    },
    [autoRefresh, history, persist, record]
  );

  const resetFilters = useCallback(() => applyFilters({}), [applyFilters]);

  const drilldown = useCallback(
    (patch) => {
      const next = normalizeAssetFilters({ ...filters, ...patch });
      record("drilldown", patch);
      window.location.href = `/assets?${dashboardQueryString(next)}`;
    },
    [filters, record]
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
      window.location.origin
    );
    record("view.map", { total: summary?.totals?.total || 0 });
    window.location.href = url;
  }, [filters, record, summary]);

  const changeAutoRefresh = useCallback(
    (enabled) => {
      setAutoRefresh(enabled);
      persist(filters, enabled, history);
      record("auto-refresh", { enabled });
    },
    [filters, history, persist, record]
  );

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
