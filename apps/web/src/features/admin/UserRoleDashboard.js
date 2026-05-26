"use client";

import { useState } from "react";
import { useTranslation } from "../shared/localization/useTranslation";
import EmptyState from "../shared/EmptyState";
import Pagination from "../shared/Pagination";
import { useUserRoleData } from "./useUserRoleData";

const ROLE_OPTIONS = [
  { code: "USER", label: "Người dùng" },
  { code: "MANAGER", label: "Cán bộ" },
  { code: "ADMIN", label: "Quản trị viên" }
];

export default function UserRoleDashboard({ users: initialUsers, canManageRoles, fetchUsers }) {
  const { t } = useTranslation();
  
  const {
    users,
    loading,
    error,
    loadData,
    selectedRoles,
    userStatuses,
    message,
    pendingUserId,
    isPending,
    toggleRole,
    saveRoles,
    updateStatus
  } = useUserRoleData({ users: initialUsers, fetchUsers });

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  if (loading) {
    return (
      <div className="admin-table-loading" role="status" aria-label={t('common.loading')}>
        <div className="admin-table-spinner" />
        <p>{t('admin.users.loadingData')}</p>
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

  if (!users.length) {
    return (
      <EmptyState
        icon={<span className="empty-state-icon-text">👥</span>}
        message={t('admin.users.noUsers')}
      />
    );
  }

  const paginatedUsers = users.length > PAGE_SIZE
    ? users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : users;

  return (
    <div className="admin-user-list">
      {message ? <p className="form-status">{message}</p> : null}
      <div className="admin-table-header admin-user-header">
        <div className="admin-table-header-cell">{t('admin.users.information')}</div>
        <div className="admin-table-header-cell">{t('admin.users.roles')}</div>
        {canManageRoles && <div className="admin-table-header-cell">{t('admin.users.actions')}</div>}
      </div>
      {paginatedUsers.map((user, index) => (
        <section
          className={`admin-user-row ${index % 2 === 0 ? "admin-row-even" : "admin-row-odd"}`}
          key={user.id}
        >
          <div>
            <strong>{user.name}</strong>
            <span>{user.username}</span>
            <span>{user.email}</span>
            <span>{userStatuses[user.id]}</span>
          </div>
          <fieldset disabled={!canManageRoles || pendingUserId === user.id}>
            <legend>{t('admin.users.roles')}</legend>
            {ROLE_OPTIONS.map((role) => (
              <label key={role.code}>
                <input
                  checked={(selectedRoles[user.id] || []).includes(role.code)}
                  type="checkbox"
                  onChange={() => toggleRole(user.id, role.code)}
                />
                {role.label}
              </label>
            ))}
          </fieldset>
          {canManageRoles ? (
            <div className="admin-user-actions">
              <button
                className="text-button"
                type="button"
                disabled={isPending && pendingUserId === user.id}
                onClick={() => saveRoles(user.id)}
              >
                {pendingUserId === user.id ? t('admin.users.saving') : t('admin.users.saveRoles')}
              </button>
              <button
                className="text-button"
                type="button"
                disabled={isPending && pendingUserId === user.id}
                onClick={() =>
                  updateStatus(user.id, userStatuses[user.id] === "LOCKED" ? "ACTIVE" : "LOCKED")
                }
              >
                {userStatuses[user.id] === "LOCKED" ? t('admin.users.unlockAccount') : t('admin.users.lockAccount')}
              </button>
            </div>
          ) : null}
        </section>
      ))}
      {users.length > PAGE_SIZE && (
        <Pagination
          currentPage={currentPage}
          totalItems={users.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
