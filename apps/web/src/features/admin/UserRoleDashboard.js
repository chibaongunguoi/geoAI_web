"use client";

import { useMemo, useState, useTransition, useEffect, useCallback } from "react";
import { useTranslation } from "../shared/localization/useTranslation";
import EmptyState from "../shared/EmptyState";
import Pagination from "../shared/Pagination";

const ROLE_OPTIONS = [
  { code: "USER", label: "Người dùng" },
  { code: "MANAGER", label: "Cán bộ" },
  { code: "ADMIN", label: "Quản trị viên" }
];

function roleCodesFor(user) {
  return new Set(user.roles?.map((item) => item.role.code) || []);
}

export default function UserRoleDashboard({ users: initialUsers, canManageRoles, fetchUsers }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState(initialUsers || []);
  const [loading, setLoading] = useState(!initialUsers && !!fetchUsers);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!fetchUsers) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || t('admin.users.loadError'));
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, t]);

  useEffect(() => {
    if (!initialUsers && fetchUsers) {
      loadData();
    }
  }, [initialUsers, fetchUsers, loadData]);

  useEffect(() => {
    if (initialUsers) {
      setUsers(initialUsers);
    }
  }, [initialUsers]);

  const initialRoles = useMemo(
    () => Object.fromEntries(users.map((user) => [user.id, [...roleCodesFor(user)]])),
    [users]
  );
  const [selectedRoles, setSelectedRoles] = useState(initialRoles);
  const [userStatuses, setUserStatuses] = useState(() =>
    Object.fromEntries(users.map((user) => [user.id, user.status || "ACTIVE"]))
  );
  const [message, setMessage] = useState("");
  const [pendingUserId, setPendingUserId] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setSelectedRoles(Object.fromEntries(users.map((user) => [user.id, [...roleCodesFor(user)]])));
    setUserStatuses(Object.fromEntries(users.map((user) => [user.id, user.status || "ACTIVE"])));
  }, [users]);

  const toggleRole = (userId, roleCode) => {
    setSelectedRoles((current) => {
      const nextRoles = new Set(current[userId] || []);

      if (nextRoles.has(roleCode)) {
        nextRoles.delete(roleCode);
      } else {
        nextRoles.add(roleCode);
      }

      return {
        ...current,
        [userId]: [...nextRoles]
      };
    });
  };

  const saveRoles = (userId) => {
    startTransition(async () => {
      setMessage("");
      setPendingUserId(userId);
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roles: selectedRoles[userId] || [] })
      });

      setPendingUserId(null);

      if (!response.ok) {
        setMessage(t('admin.users.updateRolesError'));
        return;
      }

      setMessage(t('admin.users.updateRolesSuccess'));
    });
  };

  const updateStatus = (userId, status) => {
    startTransition(async () => {
      setMessage("");
      setPendingUserId(userId);
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });

      setPendingUserId(null);

      if (!response.ok) {
        setMessage(t('admin.users.updateStatusError'));
        return;
      }

      setUserStatuses((current) => ({ ...current, [userId]: status }));
      setMessage(t('admin.users.updateStatusSuccess'));
    });
  };

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
