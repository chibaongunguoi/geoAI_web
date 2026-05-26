import { useCallback, useEffect, useState } from "react";
import { normalizeAssetFilters } from "@/features/filters/filter-state";
import {
  addDashboardHistory,
  dashboardQueryString,
  readDashboardState,
  writeDashboardState
} from "./dashboard-state";

const AUTO_REFRESH_MS = 60000;

export default function useDashboardData(initialFilters) {
  const [filters, setFilters] = useState(() => normalizeAssetFilters(initialFilters || {}));
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = readDashboardState(window.localStorage);
    if (Object.values(stored.filters).some(Boolean)) setFilters(stored.filters);
    setHistory(stored.history);
    setAutoRefresh(stored.autoRefresh);
    setIsHydrated(true);
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
    if (isHydrated) {
      loadSummary(filters);
    }
  }, [filters, loadSummary, isHydrated]);

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

  const changeAutoRefresh = useCallback(
    (enabled) => {
      setAutoRefresh(enabled);
      persist(filters, enabled, history);
      record("auto-refresh", { enabled });
    },
    [filters, history, persist, record]
  );

  return {
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
  };
}
