import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import PermissionMatrix from "@/features/admin/PermissionMatrix";
import { getCurrentUser, serverFetch } from "@/features/auth/server-auth";

async function getRoles() {
  const response = await serverFetch("/admin/roles");
  return response?.ok ? response.json() : [];
}

async function getPermissions() {
  const response = await serverFetch("/admin/permissions");
  return response?.ok ? response.json() : [];
}

export default async function PermissionMatrixPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "admin.permissions.view")) {
    redirect("/");
  }

  const [roles, permissions] = await Promise.all([getRoles(), getPermissions()]);

  return (
    <AppShell user={user} variant="page">
      <main className="admin-page">
        <h1>Ma trận quyền</h1>
        <PermissionMatrix roles={roles} permissions={permissions} />
      </main>
    </AppShell>
  );
}
