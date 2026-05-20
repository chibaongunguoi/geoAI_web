"use client";

import { useState, useEffect, useCallback } from "react";
import EmptyState from "../shared/EmptyState";
import Pagination from "../shared/Pagination";
import { usePermissionDisplay } from "./permissions/usePermissionDisplay";

const ROLE_LABELS = {
  USER: "Người dùng",
  MANAGER: "Cán bộ",
  ADMIN: "Quản trị viên"
};

function permissionKeysFor(role) {
  return new Set(role.permissions?.map((item) => item.permission.key) || []);
}

export default function PermissionMatrix({
  roles: initialRoles,
  permissions: initialPermissions,
  fetchData
}) {
  const { getLabel, getGroupLabel } = usePermissionDisplay();
  const [roles, setRoles] = useState(initialRoles || []);
  const [permissions, setPermissions] = useState(initialPermissions || []);
  const [loading, setLoading] = useState(!initialRoles && !initialPermissions && !!fetchData);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const loadData = useCallback(async () => {
    if (!fetchData) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchData();
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu quyền.");
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (!initialRoles && !initialPermissions && fetchData) {
      loadData();
    }
  }, [initialRoles, initialPermissions, fetchData, loadData]);

  useEffect(() => {
    if (initialRoles) setRoles(initialRoles);
  }, [initialRoles]);

  useEffect(() => {
    if (initialPermissions) setPermissions(initialPermissions);
  }, [initialPermissions]);

  if (loading) {
    return (
      <div className="admin-table-loading" role="status" aria-label="Đang tải">
        <div className="admin-table-spinner" />
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-table-error" role="alert">
        <p className="admin-table-error-message">{error}</p>
        <button type="button" className="admin-table-retry-btn" onClick={loadData}>
          Thử lại
        </button>
      </div>
    );
  }

  if (!roles.length || !permissions.length) {
    return (
      <EmptyState
        icon={<span className="empty-state-icon-text">🔐</span>}
        message="Chưa có dữ liệu quyền."
      />
    );
  }

  const rolePermissions = new Map(roles.map((role) => [role.code, permissionKeysFor(role)]));

  const paginatedPermissions = permissions.length > PAGE_SIZE
    ? permissions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : permissions;

  return (
    <div className="permission-matrix-shell">
      <table className="permission-matrix">
        <thead>
          <tr>
            <th>Quyền</th>
            {roles.map((role) => (
              <th key={role.id || role.code}>{ROLE_LABELS[role.code] || role.name || role.code}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedPermissions.map((permission, index) => (
            <tr
              key={permission.id || permission.key}
              className={index % 2 === 0 ? "admin-row-even" : "admin-row-odd"}
            >
              <th scope="row">
                <strong>{getLabel(permission.key)}</strong>
                <span>{getGroupLabel(permission.key)}</span>
              </th>
              {roles.map((role) => (
                <td key={`${permission.key}:${role.code}`}>
                  {rolePermissions.get(role.code)?.has(permission.key) ? "Có" : "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {permissions.length > PAGE_SIZE && (
        <Pagination
          currentPage={currentPage}
          totalItems={permissions.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
