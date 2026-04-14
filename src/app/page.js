'use client';

import MapWrapper from '../components/MapWrapper';
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Bản đồ vệ tinh tương tác</h1>
        <div style={{ height: '100vh', width: '100vw' }}>
          <MapWrapper />
        </div>
      </main>
    </div>
  );
}
