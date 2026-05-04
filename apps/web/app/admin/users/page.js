import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import UserRoleDashboard from "@/features/admin/UserRoleDashboard";
import { getCurrentUser, serverFetch } from "@/features/auth/server-auth";

async function getUsers() {
  const response = await serverFetch("/admin/users");
  return response.ok ? response.json() : [];
}

export default async function UsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "admin.users.view")) {
    redirect("/");
  }

  const users = await getUsers();

  return (
    <AppShell user={user}>
      <main className="admin-page">
        <h1>Người dùng</h1>
        <UserRoleDashboard
          users={users}
          canManageRoles={canAccess(user.permissions, "admin.users.manage")}
        />
      </main>
    </AppShell>
  );
}
