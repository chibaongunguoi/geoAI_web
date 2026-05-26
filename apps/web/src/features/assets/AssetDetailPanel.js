"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addDossierHistory,
  buildDossierExport,
  buildDossierTimeline,
  dossierWarnings,
  filterDossierSections,
  normalizeDossierState,
  readDossierStorage,
  writeDossierStorage,
} from "./dossier-state";
import { display, downloadJson, dateLabel } from "./tabs/utils";
import AssetOverviewTab from "./tabs/AssetOverviewTab";
import AssetDocumentsTab from "./tabs/AssetDocumentsTab";
import AssetInspectionsTab from "./tabs/AssetInspectionsTab";
import AssetMaintenanceTab from "./tabs/AssetMaintenanceTab";
import AssetTimelineTab from "./tabs/AssetTimelineTab";
import AssetLinksTab from "./tabs/AssetLinksTab";

const TABS = [
  ["overview", "Tổng quan"],
  ["documents", "Tài liệu"],
  ["inspections", "Kiểm tra"],
  ["maintenance", "Bảo trì"],
  ["timeline", "Lịch sử"],
  ["links", "Liên kết"],
];

function assetIdentifier(property) {
  return property.code || property.id;
}

function assetKey(property) {
  return property.id || property.code || "unknown";
}

export default function AssetDetailPanel({ property, auditLogs = [], canManageProperties }) {
  const identifier = assetIdentifier(property);
  const [status, setStatus] = useState(property.status || "ACTIVE");
  const [statusDraft, setStatusDraft] = useState(property.status || "ACTIVE");
  const [dossier, setDossier] = useState(() => normalizeDossierState(null));
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const activeTab = dossier.lastConfig.activeTab;
  const documentTypeFilter = dossier.lastConfig.documentTypeFilter;
  const searchQuery = dossier.lastConfig.searchQuery;
  const searched = useMemo(() => filterDossierSections(dossier, searchQuery), [dossier, searchQuery]);
  const warnings = useMemo(() => dossierWarnings(dossier), [dossier]);
  const timeline = useMemo(() => buildDossierTimeline(dossier, auditLogs), [auditLogs, dossier]);
  const searchCount =
    searched.documents.length +
    searched.inspections.length +
    searched.maintenance.length +
    searched.valueHistory.length +
    searched.links.length;

  const coordinate =
    property.centroidLat !== null &&
    property.centroidLat !== undefined &&
    property.centroidLng !== null &&
    property.centroidLng !== undefined
      ? `${property.centroidLat}, ${property.centroidLng}`
      : "-";

  useEffect(() => {
    setDossier(readDossierStorage(window.localStorage, assetKey(property)));
    setLoaded(true);
  }, [property]);

  useEffect(() => {
    if (!loaded) return;
    const saved = writeDossierStorage(window.localStorage, assetKey(property), dossier);
    if (!saved) setMessage("Không thể lưu hồ sơ cục bộ.");
  }, [dossier, loaded, property]);

  function updateDossier(updater, action, detail = {}) {
    setDossier((current) => {
      const next = normalizeDossierState(typeof updater === "function" ? updater(current) : updater);
      return {
        ...next,
        history: action ? addDossierHistory(next.history, action, detail) : next.history,
      };
    });
  }

  function setConfig(updates) {
    setDossier((current) =>
      normalizeDossierState({
        ...current,
        lastConfig: {
          ...current.lastConfig,
          ...updates,
        },
      }),
    );
  }

  async function saveStatus() {
    if (!canManageProperties || savingStatus) return;
    setSavingStatus(true);
    setMessage("");
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(property.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusDraft }),
      });
      if (!response.ok) throw new Error("Status save failed.");
      setStatus(statusDraft);
      updateDossier((current) => current, "status.update", { status: statusDraft });
      setMessage("Đã lưu trạng thái.");
    } catch (error) {
      setMessage(error.message || "Lưu trạng thái thất bại.");
    } finally {
      setSavingStatus(false);
    }
  }

  function exportDossier(kind = "dossier") {
    const payload = buildDossierExport({ property: { ...property, status }, state: dossier, auditLogs });
    downloadJson(`asset-${identifier}-${kind}.json`, payload);
    updateDossier((current) => current, kind === "package" ? "package.download" : "export.json", { kind });
    setMessage(kind === "package" ? "Đã tải gói hồ sơ dạng JSON." : "Đã xuất hồ sơ dạng JSON.");
  }

  const filteredDocuments =
    documentTypeFilter === "all"
      ? searched.documents
      : searched.documents.filter((document) => document.type === documentTypeFilter);

  if (!loaded) return null;

  return (
    <section className="asset-detail-panel">
      <div className="asset-detail-heading">
        <div>
          <p className="eyebrow">Hồ sơ tài sản</p>
          <h1>{display(property.name || property.code)}</h1>
        </div>
        {canManageProperties ? (
          <Link className="text-button" href={`/assets/${encodeURIComponent(identifier)}/edit`}>
            Chỉnh sửa
          </Link>
        ) : null}
      </div>

      <div className="dossier-toolbar">
        <label>
          Tìm kiếm hồ sơ
          <input
            value={searchQuery}
            onChange={(event) => setConfig({ searchQuery: event.target.value })}
            placeholder="Tài liệu, ghi chú, nhà cung cấp"
          />
        </label>
        <button className="text-button" type="button" onClick={() => exportDossier("dossier")}>
          Xuất JSON
        </button>
        <button className="text-button" type="button" onClick={() => exportDossier("package")}>
          Tải gói hồ sơ
        </button>
      </div>

      {searchQuery ? <p className="form-status">Tìm thấy {searchCount} kết quả.</p> : null}
      {message ? <p className="form-status" role="status">{message}</p> : null}
      {warnings.length ? (
        <div className="dossier-warning-list" role="alert">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <div className="dossier-tabs" role="tablist" aria-label="Asset dossier sections">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            className={activeTab === value ? "active" : ""}
            onClick={() => setConfig({ activeTab: value })}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <AssetOverviewTab
          property={property}
          status={status}
          statusDraft={statusDraft}
          setStatusDraft={setStatusDraft}
          savingStatus={savingStatus}
          saveStatus={saveStatus}
          canManageProperties={canManageProperties}
          coordinate={coordinate}
          auditLogs={auditLogs}
          searched={searched}
          updateDossier={updateDossier}
        />
      )}

      {activeTab === "documents" && (
        <AssetDocumentsTab
          canManageProperties={canManageProperties}
          updateDossier={updateDossier}
          filteredDocuments={filteredDocuments}
          documentTypeFilter={documentTypeFilter}
          setConfig={setConfig}
          setMessage={setMessage}
        />
      )}

      {activeTab === "inspections" && (
        <AssetInspectionsTab
          canManageProperties={canManageProperties}
          updateDossier={updateDossier}
          searched={searched}
        />
      )}

      {activeTab === "maintenance" && (
        <AssetMaintenanceTab
          canManageProperties={canManageProperties}
          updateDossier={updateDossier}
          searched={searched}
        />
      )}

      {activeTab === "timeline" && (
        <AssetTimelineTab
          timeline={timeline}
        />
      )}

      {activeTab === "links" && (
        <AssetLinksTab
          canManageProperties={canManageProperties}
          updateDossier={updateDossier}
          searched={searched}
        />
      )}

      <section className="dossier-history" aria-label="Dossier operation history">
        <h2>Operation history</h2>
        {dossier.history.length === 0 ? (
          <p className="empty-list">No local dossier operations yet.</p>
        ) : null}
        {dossier.history.slice(0, 6).map((item) => (
          <div className="dossier-row" key={`${item.action}-${item.createdAt}`}>
            <strong>{item.action}</strong>
            <span>{dateLabel(item.createdAt)}</span>
          </div>
        ))}
      </section>
    </section>
  );
}
