"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import StatusBadge from "../shared/StatusBadge";
import EmptyState from "../shared/EmptyState";
import Pagination from "../shared/Pagination";

function assetIdentifier(asset) {
  return asset.code || asset.id;
}

function dateLabel(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

export default function AssetListTable({
  assets,
  canManageProperties,
  page,
  pageSize,
  total,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = useCallback(
    (newPage) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(newPage));
      router.push(`/assets?${params.toString()}`);
    },
    [router, searchParams]
  );

  if (!assets || !assets.length) {
    return (
      <EmptyState
        icon={
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        }
        message="Không có tài sản phù hợp với bộ lọc hiện tại."
      />
    );
  }

  return (
    <>
      <div className="asset-list-table" role="table" aria-label="Danh sách tài sản">
        <div className="asset-list-row asset-list-header" role="row">
          <span role="columnheader">Mã</span>
          <span role="columnheader">Tên</span>
          <span role="columnheader">Địa bàn</span>
          <span role="columnheader">Loại</span>
          <span role="columnheader">Trạng thái</span>
          <span role="columnheader">Cập nhật</span>
          <span role="columnheader">Thao tác</span>
        </div>
        {assets.map((asset) => {
          const identifier = assetIdentifier(asset);
          return (
            <div
              className="asset-list-row"
              role="row"
              key={asset.id || asset.code}
            >
              <span className="asset-cell" data-label="Mã">
                <strong>{asset.code || "-"}</strong>
              </span>
              <span className="asset-cell" data-label="Tên">
                {asset.name || "-"}
              </span>
              <span className="asset-cell" data-label="Địa bàn">
                {[asset.ward, asset.district].filter(Boolean).join(", ") || "-"}
              </span>
              <span className="asset-cell" data-label="Loại">
                {asset.propertyType || "-"}
              </span>
              <span className="asset-cell asset-cell--status" data-label="Trạng thái">
                {asset.status ? <StatusBadge status={asset.status} /> : "-"}
              </span>
              <span className="asset-cell" data-label="Cập nhật">
                {dateLabel(asset.updatedAt)}
              </span>
              <span className="asset-cell asset-row-actions" data-label="Thao tác">
                <Link
                  className="text-button"
                  href={`/assets/${encodeURIComponent(identifier)}`}
                >
                  Chi tiết
                </Link>
                {canManageProperties ? (
                  <Link
                    className="text-button"
                    href={`/assets/${encodeURIComponent(identifier)}/edit`}
                  >
                    Sửa
                  </Link>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </>
  );
}
