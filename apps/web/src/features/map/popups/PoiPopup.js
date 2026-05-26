import React from "react";

export function PoiPopup({ place }) {
  const address = place.address || place.street || place.district || "";
  const category = place.vietnameseCategory || place.category || "POI";
  
  return (
    <div className="poi-popup">
      <h3 className="poi-popup-name">{place.name || "POI"}</h3>
      <span className="poi-popup-category">{category}</span>
      {address && <p className="poi-popup-address">{address}</p>}
    </div>
  );
}

export function PoiTooltip({ place }) {
  const category = place.vietnameseCategory || place.category || "POI";
  const address = place.address || place.street || place.district || "";
  
  return (
    <div className="poi-tooltip-content">
      <strong>{place.name || "POI"}</strong>
      <span>{category}</span>
      {address && <small>{address}</small>}
    </div>
  );
}
