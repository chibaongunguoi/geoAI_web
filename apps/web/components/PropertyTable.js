"use client";

import styles from "./PropertyTable.module.css";

function displayValue(value) {
  return value === undefined || value === null || value === "" ? "-" : value;
}

function areaValue(value) {
  const area = Number(value);
  return Number.isFinite(area) && area > 0 ? `${area.toLocaleString("vi-VN")} m2` : "-";
}

export default function PropertyTable({ results }) {
  const rows = Array.isArray(results) ? results : [];

  if (rows.length === 0) {
    return <p className={styles.emptyState}>Không có dữ liệu bảng</p>;
  }

  return (
    <div className={styles.tableShell}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Mã</th>
            <th>Tên</th>
            <th>Phường</th>
            <th>Quận</th>
            <th>Trạng thái</th>
            <th>Diện tích</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((property) => (
            <tr key={property.id || property.code}>
              <td>{displayValue(property.code)}</td>
              <td>{displayValue(property.name)}</td>
              <td>{displayValue(property.ward)}</td>
              <td>{displayValue(property.district)}</td>
              <td>{displayValue(property.status)}</td>
              <td>{areaValue(property.areaSqm)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
