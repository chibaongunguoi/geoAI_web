import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import UserRoleDashboard from "@/features/admin/UserRoleDashboard";
import { getCurrentUser, serverFetch } from "@/features/auth/server-auth";

function queryString(filters) {
  const search = new URLSearchParams();
  if (filters.search) search.set("search", filters.search);
  if (filters.role) search.set("role", filters.role);
  return search.toString();
}

async function getUsers(filters) {
  const query = queryString(filters);
  const response = await serverFetch(`/admin/users${query ? `?${query}` : ""}`);
  return response?.ok ? response.json() : [];
}

export default async function UsersPage({ searchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const filters = {
    search: params?.search || "",
    role: params?.role || ""
  };

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "admin.users.view")) {
    redirect("/");
  }

  const users = await getUsers(filters);

  return (
    <AppShell user={user}>
      <main className="admin-page">
        <h1>Người dùng</h1>
        <form className="admin-filter-bar">
          <label>
            Tìm kiếm
            <input name="search" defaultValue={filters.search} placeholder="Tên, username, email" />
          </label>
          <label>
            Vai trò
            <select name="role" defaultValue={filters.role}>
              <option value="">Tất cả</option>
              <option value="USER">Người dùng</option>
              <option value="MANAGER">Cán bộ</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <button className="text-button" type="submit">
            Lọc
          </button>
        </form>
        <UserRoleDashboard
          users={users}
          canManageRoles={canAccess(user.permissions, "admin.users.manage")}
        />
      </main>
    </AppShell>
  );
}
