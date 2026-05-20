"use client";

import { useState, useEffect, useCallback } from "react";
import EmptyState from "../shared/EmptyState";
import Pagination from "../shared/Pagination";
import { useTranslation } from "../shared/localization/useTranslation";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("vi-VN") : "-";
}

function actorLabel(log) {
  return log.actor?.username || log.actor?.email || log.actorUserId || "-";
}

export default function AuditLogTable({ logs: initialLogs, fetchLogs }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState(initialLogs || []);
  const [loading, setLoading] = useState(!initialLogs && !!fetchLogs);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const loadData = useCallback(async () => {
    if (!fetchLogs) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLogs();
      setLogs(data);
    } catch (err) {
      setError(err.message || t('messages.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [fetchLogs, t]);

  useEffect(() => {
    if (!initialLogs && fetchLogs) {
      loadData();
    }
  }, [initialLogs, fetchLogs, loadData]);

  useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs);
    }
  }, [initialLogs]);

  if (loading) {
    return (
      <div className="admin-table-loading" role="status" aria-label={t('common.loading')}>
        <div className="admin-table-spinner" />
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-table-error" role="alert">
        <p className="admin-table-error-message">{error}</p>
        <button type="button" className="admin-table-retry-btn" onClick={loadData}>
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!logs.length) {
    return (
      <EmptyState
        icon={<span className="empty-state-icon-text">📋</span>}
        message={t('admin.auditLogs.noData')}
      />
    );
  }

  const paginatedLogs = logs.length > PAGE_SIZE
    ? logs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : logs;

  return (
    <div className="data-table admin-audit-table">
      <div className="admin-table-header admin-audit-header">
        <div className="admin-table-header-cell">{t('admin.auditLogs.action')}</div>
        <div className="admin-table-header-cell">{t('admin.auditLogs.entityType')}</div>
        <div className="admin-table-header-cell">{t('admin.auditLogs.actor')}</div>
        <div className="admin-table-header-cell">{t('admin.auditLogs.timestamp')}</div>
      </div>
      {paginatedLogs.map((log, index) => (
        <div
          className={`data-row admin-audit-row ${index % 2 === 0 ? "admin-row-even" : "admin-row-odd"}`}
          key={log.id}
        >
          <strong>{log.action}</strong>
          <span>{log.entityType || "-"}</span>
          <span>{actorLabel(log)}</span>
          <span>{formatDate(log.createdAt)}</span>
        </div>
      ))}
      {logs.length > PAGE_SIZE && (
        <Pagination
          currentPage={currentPage}
          totalItems={logs.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
