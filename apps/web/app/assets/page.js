import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser } from "@/features/auth/server-auth";
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
    updatedFrom: params?.updatedFrom || "",
    updatedTo: params?.updatedTo || ""
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
            Loại
            <select name="propertyType" defaultValue={filters.propertyType}>
              <option value="">Tất cả</option>
              <option value="building">Building</option>
            </select>
          </label>
          <label>
            Quận
            <input name="district" defaultValue={filters.district} placeholder="Liên Chiểu" />
          </label>
          <label>
            Phường
            <input name="ward" defaultValue={filters.ward} placeholder="Hòa Khánh Bắc" />
          </label>
          <label>
            Từ ngày
            <input name="updatedFrom" type="date" defaultValue={filters.updatedFrom} />
          </label>
          <label>
            Đến ngày
            <input name="updatedTo" type="date" defaultValue={filters.updatedTo} />
          </label>
          <label>
            Sắp xếp
            <select name="sort" defaultValue={searchFilters.sort}>
              <option value="updatedAt">Mới cập nhật</option>
              <option value="code">Mã</option>
              <option value="name">Tên</option>
              <option value="status">Trạng thái</option>
            </select>
          </label>
          <button className="text-button" type="submit">
            Lọc
          </button>
          <Link className="text-button" href="/assets">
            Xóa lọc
          </Link>
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
