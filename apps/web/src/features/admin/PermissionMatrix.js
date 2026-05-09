const ROLE_LABELS = {
  USER: "Người dùng",
  MANAGER: "Cán bộ",
  ADMIN: "Admin"
};

function permissionKeysFor(role) {
  return new Set(role.permissions?.map((item) => item.permission.key) || []);
}

export default function PermissionMatrix({ roles = [], permissions = [] }) {
  if (!roles.length || !permissions.length) {
    return <p className="empty-panel">Chưa có dữ liệu quyền.</p>;
  }

  const rolePermissions = new Map(roles.map((role) => [role.code, permissionKeysFor(role)]));

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
          {permissions.map((permission) => (
            <tr key={permission.id || permission.key}>
              <th scope="row">
                <strong>{permission.key}</strong>
                <span>{permission.group}</span>
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
    </div>
  );
}
