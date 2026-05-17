"use client";

import { useState } from "react";

const TEXT = {
  addToAssets: "Thêm vào tài sản",
  adding: "Đang thêm...",
  success: "Đã thêm vào tài sản",
  alreadyAdded: "POI đã được thêm vào tài sản",
  error: "Không thể thêm. Vui lòng thử lại."
};

function getDisplayAddress(place) {
  if (place.address) return place.address;
  if (place.street) return place.street;
  return place.district || "";
}

export default function PoiPopup({ place, onClose, onConverted }) {
  const [converting, setConverting] = useState(false);
  const [status, setStatus] = useState(null);

  const convert = async () => {
    setConverting(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/poi/convert/${place.id}`, {
        method: "POST"
      });
      if (response.status === 409) {
        setStatus({ type: "warning", message: TEXT.alreadyAdded });
        return;
      }
      if (!response.ok) throw new Error("Conversion failed");
      const data = await response.json();
      setStatus({ type: "success", message: `${TEXT.success}: ${data.assetCode}` });
      onConverted?.(data);
    } catch {
      setStatus({ type: "error", message: TEXT.error });
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="poi-popup">
      <button className="poi-popup-close" type="button" onClick={onClose} aria-label="Đóng">×</button>
      <h3 className="poi-popup-name">{place.name}</h3>
      <span className="poi-popup-category">{place.vietnameseCategory}</span>
      <p className="poi-popup-address">{getDisplayAddress(place)}</p>
      {status && (
        <p className={`poi-popup-status poi-popup-status--${status.type}`}>
          {status.message}
        </p>
      )}
      <button
        className="poi-popup-convert"
        type="button"
        disabled={converting || status?.type === "success"}
        onClick={convert}
      >
        {converting ? TEXT.adding : TEXT.addToAssets}
      </button>
    </div>
  );
}

export { getDisplayAddress };
