import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import Breadcrumb from "@/features/shared/Breadcrumb";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser } from "@/features/auth/server-auth";
import AssetImportExportClient from "@/features/assets/AssetImportExportClient";
import { normalizeAssetFilters } from "@/features/filters/filter-state";

export default async function ImportExportPage({ searchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "assets.importExport")) {
    redirect("/");
  }

  const filters = normalizeAssetFilters({
    query: params?.query || "",
    status: params?.status || "",
    propertyType: params?.propertyType || "",
    district: params?.district || "",
    ward: params?.ward || "",
    updatedFrom: params?.updatedFrom || "",
    updatedTo: params?.updatedTo || "",
  });

  return (
    <AppShell user={user} variant="page">
      <main className="admin-page">
        <Breadcrumb items={[{ label: "Quản trị", href: "/admin/users" }, { label: "Nhập/Xuất dữ liệu" }]} />
        <AssetImportExportClient
          initialFilters={filters}
          canImport={canAccess(user.permissions, "properties.import") && canAccess(user.permissions, "properties.manage")}
          canExport={canAccess(user.permissions, "export.use")}
        />
      </main>
    </AppShell>
  );
}
