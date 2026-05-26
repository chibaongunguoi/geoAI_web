import React from "react";
import { assetDetailUrl, assetPopupRows } from "@/features/map/assets";

export function AssetPopup({ feature, config, permissions }) {
  const properties = feature?.properties || {};
  const rows = assetPopupRows(feature, config, permissions);
  const title = properties.name || properties.code || "Asset";
  
  return (
    <div className="asset-popup">
      {properties.imageUrl && <img src={properties.imageUrl} alt="" />}
      <strong>{title}</strong>
      <dl>
        {rows.map((row) => (
          <React.Fragment key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </React.Fragment>
        ))}
      </dl>
      <a href={assetDetailUrl(feature)}>Mở hồ sơ chi tiết</a>
    </div>
  );
}
