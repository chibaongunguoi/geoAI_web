import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import Breadcrumb from "@/features/shared/Breadcrumb";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser, serverFetch } from "@/features/auth/server-auth";
import { getTranslation } from "@/features/shared/localization/getTranslation";
import { getPermissionLabel, getPermissionGroupLabel } from "@/features/admin/permissions/getPermissionLabel";

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
    <AppShell user={user} variant="page">
      <main className="admin-page">
        <Breadcrumb items={[{ label: getTranslation("breadcrumb.admin"), href: "/admin/users" }, { label: getTranslation("admin.permissions.heading") }]} />
        <h1 className="admin-page-heading">{getTranslation("admin.permissions.heading")}</h1>
        <div className="data-table">
          <div className="data-row data-header">
            <strong>{getTranslation("admin.permissions.key")}</strong>
            <span>{getTranslation("admin.permissions.group")}</span>
            <span>{getTranslation("admin.permissions.name")}</span>
          </div>
          {permissions.map((permission) => (
            <div className="data-row" key={permission.id}>
              <strong>{getPermissionLabel(permission.key)}</strong>
              <span>{getPermissionGroupLabel(permission.key)}</span>
              <span>{permission.name}</span>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
