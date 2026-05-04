import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser, serverFetch } from "@/features/auth/server-auth";

async function getPermissions() {
  const response = await serverFetch("/admin/permissions");
  return response.ok ? response.json() : [];
}

export default async function PermissionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "admin.permissions.view")) {
    redirect("/");
  }

  const permissions = await getPermissions();

  return (
    <AppShell user={user}>
      <main className="admin-page">
        <h1>Quyền hệ thống</h1>
        <div className="data-table">
          {permissions.map((permission) => (
            <div className="data-row" key={permission.id}>
              <strong>{permission.key}</strong>
              <span>{permission.group}</span>
              <span>{permission.name}</span>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
