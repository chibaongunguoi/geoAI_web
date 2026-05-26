import { useCallback, useEffect, useState } from "react";

export function usePermissionMatrixData({ roles: initialRoles, permissions: initialPermissions, fetchData }) {
  const [roles, setRoles] = useState(initialRoles || []);
  const [permissions, setPermissions] = useState(initialPermissions || []);
  const [loading, setLoading] = useState(!initialRoles && !initialPermissions && !!fetchData);
  const [error, setError] = useState(null);

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

  return {
    roles,
    permissions,
    loading,
    error,
    loadData
  };
}
