import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser } from "@/features/auth/server-auth";
import AssetDetailPanel from "@/features/assets/AssetDetailPanel";
import { getAssetAuditLogs, getAssetByIdentifier } from "@/features/assets/assets-server";

export default async function AssetDetailPage({ params }) {
  const user = await getCurrentUser();
  const { code } = await params;

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "properties.view")) {
    redirect("/");
  }

  const property = await getAssetByIdentifier(decodeURIComponent(code));
  if (!property) {
    notFound();
  }

  const auditLogs = await getAssetAuditLogs(property, canAccess(user.permissions, "admin.logs.view"));

  return (
    <AppShell user={user}>
      <main className="admin-page">
        <Link className="form-link" href="/assets">
          Quay lại danh sách
        </Link>
        <AssetDetailPanel
          property={property}
          auditLogs={auditLogs}
          canManageProperties={canAccess(user.permissions, "properties.manage")}
        />
      </main>
    </AppShell>
  );
}
