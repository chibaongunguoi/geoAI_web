import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import Breadcrumb from "@/features/shared/Breadcrumb";
import { canAccess } from "@/features/auth/auth-client";
import AuditLogTable from "@/features/admin/AuditLogTable";
import { getCurrentUser, serverFetch } from "@/features/auth/server-auth";
import { getTranslation } from "@/features/shared/localization/getTranslation";

function queryString(filters) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) search.set(key, value);
  }
  return search.toString();
}

async function getAuditLogs(filters) {
  const query = queryString(filters);
  const response = await serverFetch(`/admin/audit-logs${query ? `?${query}` : ""}`);
  return response?.ok ? response.json() : [];
}

export default async function AuditLogsPage({ searchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const filters = {
    action: params?.action || "",
    entityType: params?.entityType || "",
    actorUserId: params?.actorUserId || "",
    from: params?.from || "",
    to: params?.to || ""
  };

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "admin.logs.view")) {
    redirect("/");
  }

  const logs = await getAuditLogs(filters);

  return (
    <AppShell user={user} variant="page">
      <main className="admin-page">
        <Breadcrumb items={[{ label: getTranslation("breadcrumb.admin"), href: "/admin/users" }, { label: getTranslation("admin.auditLogs.title") }]} />
        <h1 className="admin-page-heading">{getTranslation("admin.auditLogs.heading")}</h1>
        <form className="admin-filter-bar">
          <label>
            {getTranslation("admin.auditLogs.action")}
            <input name="action" defaultValue={filters.action} placeholder={getTranslation("admin.auditLogs.actionPlaceholder")} />
          </label>
          <label>
            {getTranslation("admin.auditLogs.entityType")}
            <input name="entityType" defaultValue={filters.entityType} placeholder={getTranslation("admin.auditLogs.entityTypePlaceholder")} />
          </label>
          <label>
            {getTranslation("admin.auditLogs.actorUserId")}
            <input name="actorUserId" defaultValue={filters.actorUserId} placeholder={getTranslation("admin.auditLogs.actorUserIdPlaceholder")} />
          </label>
          <label>
            {getTranslation("admin.auditLogs.fromDate")}
            <input name="from" type="date" defaultValue={filters.from} />
          </label>
          <label>
            {getTranslation("admin.auditLogs.toDate")}
            <input name="to" type="date" defaultValue={filters.to} />
          </label>
          <button className="text-button" type="submit">
            {getTranslation("admin.auditLogs.filter")}
          </button>
        </form>
        <AuditLogTable logs={logs} />
      </main>
    </AppShell>
  );
}
