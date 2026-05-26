"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addImportExportHistory,
  readImportExportState,
  writeImportExportState,
} from "./import-export-state";
import AssetImportClient from "./AssetImportClient";
import AssetExportClient from "./AssetExportClient";

export default function AssetImportExportClient({ initialFilters, canImport, canExport }) {
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [lastConfig, setLastConfig] = useState({ format: "csv" });

  useEffect(() => {
    const stored = readImportExportState(window.localStorage);
    setHistory(stored.history);
    setLogs(stored.logs);
    setLastConfig(stored.lastConfig);
  }, []);

  const persist = useCallback((nextHistory, nextLogs, nextConfig = lastConfig) => {
    writeImportExportState(window.localStorage, {
      history: nextHistory,
      logs: nextLogs,
      lastConfig: nextConfig,
    });
  }, [lastConfig]);

  const recordActivity = useCallback((action, detail = {}, configOverride = undefined) => {
    setHistory((current) => {
      const next = addImportExportHistory(current, action, detail);
      persist(next, logs, configOverride || lastConfig);
      if (configOverride) {
        setLastConfig(configOverride);
      }
      return next;
    });
  }, [logs, lastConfig, persist]);

  const handleImportSuccess = useCallback((data) => {
    const nextLogs = [
      { id: `${Date.now()}`, action: "import", status: "complete", imported: data.imported, skipped: data.skipped, createdAt: new Date().toISOString() },
      ...logs,
    ].slice(0, 30);
    setLogs(nextLogs);
    
    setHistory((current) => {
      const nextHistory = addImportExportHistory(current, "import.confirm", { imported: data.imported, skipped: data.skipped });
      persist(nextHistory, nextLogs);
      return nextHistory;
    });
  }, [logs, persist]);

  const handleExportSuccess = useCallback((format, count) => {
    const nextLogs = [
      { id: `${Date.now()}`, action: `export.${format}`, status: "complete", exported: count, createdAt: new Date().toISOString() },
      ...logs,
    ].slice(0, 30);
    setLogs(nextLogs);

    setHistory((current) => {
      const nextHistory = addImportExportHistory(current, `export.${format}`, { rows: count });
      persist(nextHistory, nextLogs, { format });
      return nextHistory;
    });
    setLastConfig({ format });
  }, [logs, persist]);

  return (
    <div className="import-export-page">
      <header className="dashboard-heading">
        <div>
          <p>Admin data exchange</p>
          <h1>Asset import/export</h1>
        </div>
      </header>

      <AssetImportClient 
        canImport={canImport} 
        onImportSuccess={handleImportSuccess} 
        recordActivity={recordActivity} 
      />

      <AssetExportClient 
        canExport={canExport} 
        initialFilters={initialFilters}
        lastFormat={lastConfig.format}
        onExportSuccess={handleExportSuccess}
        recordActivity={recordActivity}
      />

      <section className="dashboard-history" aria-label="Import export logs">
        <h2>Import/export logs</h2>
        {logs.length === 0 ? <p className="dashboard-muted">No import/export logs yet.</p> : null}
        <ol>
          {logs.slice(0, 6).map((log) => (
            <li key={log.id}><span>{log.action}</span><time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString()}</time></li>
          ))}
        </ol>
      </section>

      <section className="dashboard-history" aria-label="Import export history">
        <h2>Recent activity</h2>
        {history.length === 0 ? <p className="dashboard-muted">No local import/export operations yet.</p> : null}
        <ol>
          {history.slice(0, 6).map((item) => (
            <li key={item.id}><span>{item.action}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></li>
          ))}
        </ol>
      </section>
    </div>
  );
}
