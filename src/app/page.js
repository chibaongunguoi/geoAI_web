'use client';

import MapWrapper from '../components/MapWrapper';
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>🗺️ Bản đồ vệ tinh tương tác với GeoAI</h1>
        <p style={{ marginBottom: '20px', color: '#666', fontSize: '16px' }}>
          Chọn vùng trên bản đồ để phân tích với trí tuệ nhân tạo. Hệ thống sẽ tự động nhận diện các tòa nhà, phân loại đất đai và phân tích cơ sở hạ tầng.
        </p>
        <div style={{ height: '100vh', width: '100vw' }}>
          <MapWrapper />
        </div>
      </main>
    </div>
  );
}
