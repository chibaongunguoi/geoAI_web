"use client";

import styles from "./SearchResultList.module.css";

export default function SearchResultList({ results, onSelectResult }) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.emptyState}>Không tìm thấy kết quả</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Danh sách kết quả ({results.length})</h3>
      <ul className={styles.list}>
        {results.map((property) => {
          const addressParts = [
            property.addressLine || property.street,
            property.ward,
            property.district,
            property.city
          ].filter(Boolean);

          const addressText = addressParts.length > 0 ? addressParts.join(", ") : "Chưa cập nhật địa chỉ";

          return (
            <li
              key={property.id}
              className={styles.item}
              onClick={() => onSelectResult && onSelectResult(property)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectResult && onSelectResult(property);
                }
              }}
            >
              <div className={styles.itemHeader}>
                <span className={styles.name}>{property.name || "Công trình chưa có tên"}</span>
                <span className={styles.code}>{property.code}</span>
              </div>
              
              <div className={styles.address}>
                {addressText}
              </div>

              <div className={styles.badges}>
                <span className={`${styles.badge} ${styles.badgeStatus}`}>
                  {property.status}
                </span>
                {property.propertyType && (
                  <span className={styles.badge}>{property.propertyType}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
