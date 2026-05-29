import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useTranslation } from "../shared/localization/useTranslation";

function roleCodesFor(user) {
  return new Set(user.roles?.map((item) => item.role.code) || []);
}

export function useUserRoleData({ users: initialUsers, fetchUsers }) {
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

  useEffect(() => {
    setSelectedRoles(Object.fromEntries(users.map((user) => [user.id, [...roleCodesFor(user)]])));
    setUserStatuses(Object.fromEntries(users.map((user) => [user.id, user.status || "ACTIVE"])));
  }, [users]);

  const toggleRole = useCallback((userId, roleCode) => {
    setSelectedRoles((current) => ({
      ...current,
      [userId]: [roleCode]
    }));
  }, []);

  const saveRoles = useCallback((userId) => {
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
  }, [selectedRoles, t]);

  const updateStatus = useCallback((userId, status) => {
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
  }, [t]);

  return {
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
  };
}
