import { assetFilterQueryString, normalizeAssetFilters } from "@/features/filters/filter-state";

export const DASHBOARD_STORAGE_KEY = "geoai.dashboard.v1";

export function dashboardQueryString(filters = {}) {
  return assetFilterQueryString(normalizeAssetFilters(filters));
}

export function dashboardJsonPayload(summary) {
  return {
    exportedAt: new Date().toISOString(),
    summary
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function dashboardCsv(summary) {
  const totals = summary?.totals || {};
  const rows = [["metric", "value"]];
  for (const key of ["total", "active", "inactive", "review", "archived", "recentlyUpdated", "missingGeometry"]) {
    rows.push([key, totals[key] ?? 0]);
  }

  rows.push([]);
  rows.push(["asset_code", "name", "status", "district", "ward"]);
  (summary?.topAssets || []).forEach((asset) => {
    rows.push([asset.code, asset.name || "", asset.status || "", asset.district || "", asset.ward || ""]);
  });

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function addDashboardHistory(history = [], action, detail = {}) {
  return [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      action,
      detail,
      createdAt: new Date().toISOString()
    },
    ...(Array.isArray(history) ? history : [])
  ].slice(0, 30);
}

export function readDashboardState(storage) {
  if (!storage?.getItem) {
    return { filters: normalizeAssetFilters({}), autoRefresh: false, history: [] };
  }

  try {
    const raw = storage.getItem(DASHBOARD_STORAGE_KEY);
    if (!raw) return { filters: normalizeAssetFilters({}), autoRefresh: false, history: [] };
    const parsed = JSON.parse(raw);
    return {
      filters: normalizeAssetFilters(parsed.filters || {}),
      autoRefresh: parsed.autoRefresh === true,
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 30) : []
    };
  } catch {
    return { filters: normalizeAssetFilters({}), autoRefresh: false, history: [] };
  }
}

export function writeDashboardState(storage, payload) {
  if (!storage?.setItem) return false;

  try {
    storage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({
        filters: normalizeAssetFilters(payload?.filters || {}),
        autoRefresh: payload?.autoRefresh === true,
        history: Array.isArray(payload?.history) ? payload.history.slice(0, 30) : []
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function downloadTextFile(content, filename, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
