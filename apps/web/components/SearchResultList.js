"use client";

import { Coffee, Utensils, ShoppingBag, Hospital, GraduationCap, Building, MapPin, Briefcase } from "lucide-react";
import styles from "./SearchResultList.module.css";

const getCategoryDetails = (property) => {
  const isPoi = property.isPoi || property.category;
  const category = (property.category || property.propertyType || "").toLowerCase();

  if (category.includes("cafe") || category.includes("coffee")) {
    return { Icon: Coffee, bgClass: styles.bgFood, label: property.vietnameseCategory || "Quán Cafe" };
  }
  if (category.includes("restaurant") || category.includes("food") || category.includes("dining")) {
    return { Icon: Utensils, bgClass: styles.bgFood, label: property.vietnameseCategory || "Nhà hàng / Quán ăn" };
  }
  if (category.includes("retail") || category.includes("shop") || category.includes("store") || category.includes("mall")) {
    return { Icon: ShoppingBag, bgClass: styles.bgRetail, label: property.vietnameseCategory || "Cửa hàng" };
  }
  if (category.includes("health") || category.includes("hospital") || category.includes("clinic")) {
    return { Icon: Hospital, bgClass: styles.bgHealth, label: property.vietnameseCategory || "Y tế / Sức khỏe" };
  }
  if (category.includes("education") || category.includes("school")) {
    return { Icon: GraduationCap, bgClass: styles.bgEducation, label: property.vietnameseCategory || "Giáo dục" };
  }
  if (category.includes("office") || category.includes("service")) {
    return { Icon: Briefcase, bgClass: styles.bgService, label: property.vietnameseCategory || "Dịch vụ / Văn phòng" };
  }
  
  if (isPoi) {
    return { Icon: MapPin, bgClass: styles.bgBuilding, label: property.vietnameseCategory || "Địa điểm" };
  }

  return { Icon: Building, bgClass: styles.bgBuilding, label: "Công trình / Tòa nhà" };
};

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
          
          const { Icon, bgClass, label } = getCategoryDetails(property);

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
              <div className={styles.itemContent}>
                <div className={`${styles.avatarContainer} ${bgClass}`}>
                  <Icon size={24} strokeWidth={1.5} />
                </div>
                
                <div className={styles.details}>
                  <div className={styles.itemHeader}>
                    <span className={styles.name}>{property.name || (property.isPoi ? "Địa điểm chưa có tên" : "Công trình chưa có tên")}</span>
                  </div>
                  
                  <div className={styles.address}>
                    {addressText}
                  </div>

                  <div className={styles.badges}>
                    {property.status && (
                      <span className={`${styles.badge} ${styles.badgeStatus}`}>
                        {property.status}
                      </span>
                    )}
                    <span className={styles.badge}>{label}</span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
