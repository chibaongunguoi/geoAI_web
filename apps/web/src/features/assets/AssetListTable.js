import Link from "next/link";

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
  total
}) {
  if (!assets.length) {
    return <p className="empty-list">Không có tài sản phù hợp.</p>;
  }

  return (
    <>
      <div className="asset-list-table" role="table" aria-label="Danh sách tài sản">
        <div className="asset-list-row asset-list-header" role="row">
          <span>Mã</span>
          <span>Tên</span>
          <span>Địa bàn</span>
          <span>Loại</span>
          <span>Trạng thái</span>
          <span>Cập nhật</span>
          <span>Thao tác</span>
        </div>
        {assets.map((asset) => {
          const identifier = assetIdentifier(asset);
          return (
            <div className="asset-list-row" role="row" key={asset.id || asset.code}>
              <strong>{asset.code || "-"}</strong>
              <span>{asset.name || "-"}</span>
              <span>{[asset.ward, asset.district].filter(Boolean).join(", ") || "-"}</span>
              <span>{asset.propertyType || "-"}</span>
              <span>{asset.status || "-"}</span>
              <span>{dateLabel(asset.updatedAt)}</span>
              <span className="asset-row-actions">
                <Link className="text-button" href={`/assets/${encodeURIComponent(identifier)}`}>
                  Chi tiết
                </Link>
                {canManageProperties ? (
                  <Link className="text-button" href={`/assets/${encodeURIComponent(identifier)}/edit`}>
                    Sửa
                  </Link>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <p className="asset-pagination">
        Trang {page} · Hiển thị {assets.length}/{total} · {pageSize} dòng/trang
      </p>
    </>
  );
}
