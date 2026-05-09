import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser } from "@/features/auth/server-auth";
import AssetListTable from "@/features/assets/AssetListTable";
import { searchAssets, sortAssets } from "@/features/assets/assets-server";

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
  const filters = {
    query: params?.query || "",
    status: params?.status || "",
    propertyType: params?.propertyType || "",
    sort: params?.sort || "updatedAt",
    limit: 100
  };
  const allAssets = sortAssets(await searchAssets(filters), filters.sort);
  const pageAssets = allAssets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const canManageProperties = canAccess(user.permissions, "properties.manage");

  return (
    <AppShell user={user}>
      <main className="admin-page">
        <div className="asset-page-heading">
          <h1>Tài sản</h1>
          {canManageProperties ? (
            <Link className="text-button" href="/assets/new">
              Thêm tài sản
            </Link>
          ) : null}
        </div>
        <form className="admin-filter-bar">
          <label>
            Tìm kiếm
            <input name="query" defaultValue={filters.query} placeholder="Mã, tên, địa chỉ" />
          </label>
          <label>
            Trạng thái
            <select name="status" defaultValue={filters.status}>
              <option value="">Tất cả</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Không hoạt động</option>
              <option value="REVIEW">Cần xem xét</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </label>
          <label>
            Sắp xếp
            <select name="sort" defaultValue={filters.sort}>
              <option value="updatedAt">Mới cập nhật</option>
              <option value="code">Mã</option>
              <option value="name">Tên</option>
              <option value="status">Trạng thái</option>
            </select>
          </label>
          <button className="text-button" type="submit">
            Lọc
          </button>
        </form>
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
