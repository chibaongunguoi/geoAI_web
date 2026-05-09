import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import AuditLogTable from "@/features/admin/AuditLogTable";
import { getCurrentUser, serverFetch } from "@/features/auth/server-auth";

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
    <AppShell user={user}>
      <main className="admin-page">
        <h1>Nhật ký hệ thống</h1>
        <form className="admin-filter-bar">
          <label>
            Hành động
            <input name="action" defaultValue={filters.action} placeholder="admin.users..." />
          </label>
          <label>
            Đối tượng
            <input name="entityType" defaultValue={filters.entityType} placeholder="User" />
          </label>
          <label>
            Người thao tác
            <input name="actorUserId" defaultValue={filters.actorUserId} placeholder="User ID" />
          </label>
          <label>
            Từ ngày
            <input name="from" type="date" defaultValue={filters.from} />
          </label>
          <label>
            Đến ngày
            <input name="to" type="date" defaultValue={filters.to} />
          </label>
          <button className="text-button" type="submit">
            Lọc
          </button>
        </form>
        <AuditLogTable logs={logs} />
      </main>
    </AppShell>
  );
}
