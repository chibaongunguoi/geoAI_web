import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import Breadcrumb from "@/features/shared/Breadcrumb";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser, serverFetch } from "@/features/auth/server-auth";
import { getTranslation } from "@/features/shared/localization/getTranslation";

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

  // Get Vietnamese translations
  const adminLabel = getTranslation("breadcrumb.admin");
  const rolesTitle = getTranslation("admin.roles.title");
  const rolesHeading = getTranslation("admin.roles.heading");
  const nameLabel = getTranslation("admin.roles.name");
  const codeLabel = getTranslation("admin.roles.code");
  const permissionsLabel = getTranslation("admin.roles.permissions");

  return (
    <AppShell user={user} variant="page">
      <main className="admin-page">
        <Breadcrumb items={[{ label: adminLabel, href: "/admin/users" }, { label: rolesHeading }]} />
        <h1 className="admin-page-heading">{rolesTitle}</h1>
        <div className="data-table">
          {roles.map((role) => (
            <div className="data-row" key={role.id}>
              <strong>{role.name}</strong>
              <span>{role.code}</span>
              <span>{role.permissions?.length || 0} {permissionsLabel}</span>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
