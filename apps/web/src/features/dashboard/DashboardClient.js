"use client";

import { useCallback } from "react";
import DashboardCharts from "./DashboardCharts";
import { dashboardCsv, downloadTextFile } from "./dashboard-state";
import useDashboardData from "./useDashboardData";

export default function DashboardClient({ initialFilters, canExport }) {
  const { summary, status, loading, record } = useDashboardData(initialFilters);

  const exportCsv = useCallback(() => {
    if (!summary || !canExport) return;
    downloadTextFile(dashboardCsv(summary), `geoai-dashboard-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
    record("export.csv");
  }, [canExport, record, summary]);

  const empty = summary && (!summary.buckets?.byDistrict || summary.buckets.byDistrict.length === 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bảng điều khiển</p>
          <h1 style={{ margin: '0.25rem 0 0 0', color: '#0f172a', fontSize: '1.875rem', fontWeight: 700 }}>Thống kê Building</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {loading ? <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Đang tải...</span> : null}
          <button 
            type="button" 
            onClick={exportCsv} 
            disabled={!canExport || empty}
            style={{ 
              padding: '0.625rem 1.25rem', 
              background: '#0f172a', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: (!canExport || empty) ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              transition: 'background 0.2s',
              opacity: (!canExport || empty) ? 0.5 : 1
            }}
          >
            Xuất CSV
          </button>
        </div>
      </header>

      {status === "timeout" ? (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem' }}>
          <p style={{ margin: 0 }}>Truy vấn mất quá nhiều thời gian. Vui lòng thử lại.</p>
        </div>
      ) : status ? (
        <p style={{ color: '#ef4444' }}>{status}</p>
      ) : null}

      <DashboardCharts summary={summary} />
    </div>
  );
}
