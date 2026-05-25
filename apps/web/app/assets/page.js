import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser } from "@/features/auth/server-auth";
import AssetFiltersForm from "@/features/assets/AssetFiltersForm";
import AssetListTable from "@/features/assets/AssetListTable";
import { searchAssets, sortAssets } from "@/features/assets/assets-server";
import { normalizeAssetFilters } from "@/features/filters/filter-state";

const PAGE_SIZE = 20;

export default async function AssetsPage({ searchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "properties.view")) {
    redirect("/");
  }

  const page = Math.max(1, Number(params?.page || 1));
  const filters = normalizeAssetFilters({
    query: params?.query || "",
    status: params?.status || "",
    propertyType: params?.propertyType || "",
    district: params?.district || "",
    ward: params?.ward || "",
    updatedFrom: "",
    updatedTo: ""
  });
  const searchFilters = {
    ...filters,
    sort: params?.sort || "updatedAt",
    limit: 100
  };
  const allAssets = sortAssets(await searchAssets(searchFilters), searchFilters.sort);
  const pageAssets = allAssets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const canManageProperties = canAccess(user.permissions, "properties.manage");

  return (
    <AppShell user={user} variant="page">
      <main className="admin-page">
        <div className="asset-page-heading">
          <h1>Tài sản</h1>
          {canManageProperties ? (
            <Link className="text-button" href="/assets/new">
              Thêm tài sản
            </Link>
          ) : null}
        </div>
        <AssetFiltersForm filters={filters} sort={searchFilters.sort} />
        <AssetListTable
          assets={pageAssets}
          canManageProperties={canManageProperties}
          page={page}
          pageSize={PAGE_SIZE}
          total={allAssets.length}
        />
      </main>
    </AppShell>
  );
}
