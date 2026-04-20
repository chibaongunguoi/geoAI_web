'use client';

import MapWrapper from '../components/MapWrapper';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.page} aria-label="GeoAI Satellite Analyzer">
      <MapWrapper />
    </main>
  );
}
