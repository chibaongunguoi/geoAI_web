import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser, serverFetch } from "@/features/auth/server-auth";

async function getRoles() {
  const response = await serverFetch("/admin/roles");
  return response.ok ? response.json() : [];
}

export default async function RolesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "admin.roles.view")) {
    redirect("/");
  }

  const roles = await getRoles();

  return (
    <AppShell user={user}>
      <main className="admin-page">
        <h1>Vai trò</h1>
        <div className="data-table">
          {roles.map((role) => (
            <div className="data-row" key={role.id}>
              <strong>{role.name}</strong>
              <span>{role.code}</span>
              <span>{role.permissions?.length || 0} quyền</span>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
