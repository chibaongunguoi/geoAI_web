"use client";

import { densitySummaryRows, hasDensityResult } from "@/features/map/property-search";
import PropertyTable from "../PropertyTable";
import SearchResultList from "../SearchResultList";

const TEXT = {
  section: "K\u1ebft qu\u1ea3 b\u1ea3n \u0111\u1ed3",
  density: "K\u1ebft qu\u1ea3 m\u1eadt \u0111\u1ed9",
  search: "K\u1ebft qu\u1ea3 t\u00ecm ki\u1ebfm",
  viewLabel: "Ki\u1ec3u hi\u1ec3n th\u1ecb k\u1ebft qu\u1ea3",
  list: "Danh s\u00e1ch",
  table: "B\u1ea3ng",
  scan: "K\u1ebft qu\u1ea3 qu\u00e9t",
  buildings: "C\u00f4ng tr\u00ecnh",
  objects: "\u0110\u1ed1i t\u01b0\u1ee3ng",
  validArea: "V\u00f9ng h\u1ee3p l\u1ec7",
  source: "Ngu\u1ed3n",
  processingTime: "Th\u1eddi gian x\u1eed l\u00fd"
};

export default function MapResultsOverlay({
  styles,
  propertySearchResult,
  propertyResultView,
  onPropertyResultViewChange,
  onSelectProperty,
  analysisResults
}) {
  const hasPropertyResult = Boolean(propertySearchResult);
  const hasAnalysisResult = Boolean(analysisResults);

  if (!hasPropertyResult && !hasAnalysisResult) {
    return null;
  }

  return (
    <section className={styles.resultsOverlay} aria-label={TEXT.section}>
      {hasDensityResult(propertySearchResult) ? (
        <>
          <header className={styles.overlayPanelHeader}>
            <h2>{TEXT.density}</h2>
          </header>
          <ol className={styles.densityList}>
            {densitySummaryRows(propertySearchResult).map((region) => (
              <li key={region.id}>
                <span>{region.label}</span>
                <strong>{region.count.toLocaleString("vi-VN")}</strong>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {propertySearchResult && !hasDensityResult(propertySearchResult) ? (
        <div className={styles.propertyResultsPanel}>
          <header className={styles.overlayPanelHeader}>
            <h2>{TEXT.search}</h2>
          </header>
          <div className={styles.viewSwitcher} role="group" aria-label={TEXT.viewLabel}>
            <button
              type="button"
              className={propertyResultView === "list" ? styles.activeViewButton : styles.viewButton}
              onClick={() => onPropertyResultViewChange("list")}
            >
              {TEXT.list}
            </button>
            <button
              type="button"
              className={propertyResultView === "table" ? styles.activeViewButton : styles.viewButton}
              onClick={() => onPropertyResultViewChange("table")}
            >
              {TEXT.table}
            </button>
          </div>
          {propertyResultView === "table" ? (
            <PropertyTable results={propertySearchResult.items || []} />
          ) : (
            <SearchResultList
              results={propertySearchResult.items || []}
              onSelectResult={onSelectProperty}
            />
          )}
        </div>
      ) : null}

      {analysisResults ? (
        <div className={styles.analysisSummaryPanel}>
          <header className={styles.overlayPanelHeader}>
            <h2>{TEXT.scan}</h2>
          </header>
          <div className={styles.resultGrid}>
            <div className={styles.metric}>
              <span>{TEXT.buildings}</span>
              <strong>{analysisResults.analysis.buildings.count}</strong>
            </div>
            <div className={styles.metric}>
              <span>{TEXT.objects}</span>
              <strong>{analysisResults.analysis.objects?.length || 0}</strong>
            </div>
          </div>
          <p className={styles.meta}>{TEXT.validArea}: {analysisResults.validAreaHectares || 0} ha</p>
          <p className={styles.meta}>{TEXT.source}: {analysisResults.dataSource}</p>
          {analysisResults.modelName ? <p className={styles.meta}>Model: {analysisResults.modelName}</p> : null}
          <p className={styles.meta}>{TEXT.processingTime}: {analysisResults.processingTime}</p>
        </div>
      ) : null}
    </section>
  );
}
