import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import Breadcrumb from "@/features/shared/Breadcrumb";
import { canAccess } from "@/features/auth/auth-client";
import UserRoleDashboard from "@/features/admin/UserRoleDashboard";
import { getCurrentUser, serverFetch } from "@/features/auth/server-auth";
import { getTranslation } from "@/features/shared/localization/getTranslation";

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
    <AppShell user={user} variant="page">
      <main className="admin-page">
        <Breadcrumb items={[{ label: getTranslation("breadcrumb.admin"), href: "/admin/users" }, { label: getTranslation("admin.users.heading") }]} />
        <h1 className="admin-page-heading">{getTranslation("admin.users.heading")}</h1>
        <form className="admin-filter-bar">
          <label>
            {getTranslation("admin.users.search")}
            <input name="search" defaultValue={filters.search} placeholder={getTranslation("admin.users.searchPlaceholder")} />
          </label>
          <label>
            {getTranslation("admin.users.roleFilter")}
            <select name="role" defaultValue={filters.role}>
              <option value="">{getTranslation("admin.users.allRoles")}</option>
              <option value="USER">{getTranslation("admin.users.userRole")}</option>
              <option value="MANAGER">{getTranslation("admin.users.manager")}</option>
              <option value="ADMIN">{getTranslation("admin.users.admin")}</option>
            </select>
          </label>
          <button className="text-button" type="submit">
            {getTranslation("admin.users.filter")}
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
