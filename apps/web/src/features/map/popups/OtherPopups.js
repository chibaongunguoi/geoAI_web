import React from "react";

export function GeoJsonPopup({ feature }) {
  const properties = feature?.properties || {};
  const title = properties.name || properties.title || properties.code || "Feature";
  const details = [properties.code, properties.status, properties.type].filter(Boolean);

  return (
    <>
      <strong>{title}</strong>
      {details.map((item, index) => (
        <React.Fragment key={index}>
          <br />
          {item}
        </React.Fragment>
      ))}
    </>
  );
}

export function PropertyDensityPopup({ region }) {
  const count = Number(region.count || 0).toLocaleString("vi-VN");
  return (
    <>
      <strong>{region.label || "Vùng mật độ"}</strong>
      <br />
      {count} tòa nhà
    </>
  );
}

export function PropertyDensityObjectPopup({ object }) {
  const properties = object?.properties || {};
  const title = properties.name || properties.code || "Building";
  const details = [properties.code, properties.ward, properties.district, properties.source].filter(Boolean);

  return (
    <>
      <strong>{title}</strong>
      {details.map((item, index) => (
        <React.Fragment key={index}>
          <br />
          {item}
        </React.Fragment>
      ))}
    </>
  );
}
