"use client";

import { useMemo, useState, useTransition } from "react";

const ROLE_OPTIONS = [
  { code: "USER", label: "Người dùng" },
  { code: "MANAGER", label: "Cán bộ" },
  { code: "ADMIN", label: "Admin" }
];

function roleCodesFor(user) {
  return new Set(user.roles?.map((item) => item.role.code) || []);
}

export default function UserRoleDashboard({ users, canManageRoles }) {
  const initialRoles = useMemo(
    () =>
      Object.fromEntries(
        users.map((user) => [user.id, [...roleCodesFor(user)]])
      ),
    [users]
  );
  const [selectedRoles, setSelectedRoles] = useState(initialRoles);
  const [message, setMessage] = useState("");
  const [pendingUserId, setPendingUserId] = useState(null);
  const [isPending, startTransition] = useTransition();

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
        setMessage("Không thể cập nhật vai trò.");
        return;
      }

      setMessage("Đã cập nhật vai trò.");
    });
  };

  return (
    <div className="admin-user-list">
      {message ? <p className="form-status">{message}</p> : null}
      {users.map((user) => (
        <section className="admin-user-row" key={user.id}>
          <div>
            <strong>{user.name}</strong>
            <span>{user.username}</span>
            <span>{user.email}</span>
            <span>{user.status}</span>
          </div>
          <fieldset disabled={!canManageRoles || pendingUserId === user.id}>
            <legend>Vai trò</legend>
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
            <button
              className="text-button"
              type="button"
              disabled={isPending && pendingUserId === user.id}
              onClick={() => saveRoles(user.id)}
            >
              {pendingUserId === user.id ? "Đang lưu..." : "Lưu vai trò"}
            </button>
          ) : null}
        </section>
      ))}
    </div>
  );
}
