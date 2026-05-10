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

const TABS = [
  ["overview", "Overview"],
  ["documents", "Documents"],
  ["inspections", "Inspections"],
  ["maintenance", "Maintenance"],
  ["timeline", "Timeline"],
  ["links", "Links"],
];

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "REVIEW", "ARCHIVED"];

function display(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function areaLabel(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `${Number(value).toLocaleString("vi-VN")} m2`;
}

function assetIdentifier(property) {
  return property.code || property.id;
}

function assetKey(property) {
  return property.id || property.code || "unknown";
}

function dateLabel(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("vi-VN").format(date);
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function valueLabel(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function AssetDetailPanel({ property, auditLogs = [], canManageProperties }) {
  const identifier = assetIdentifier(property);
  const [status, setStatus] = useState(property.status || "ACTIVE");
  const [statusDraft, setStatusDraft] = useState(property.status || "ACTIVE");
  const [dossier, setDossier] = useState(() => normalizeDossierState(null));
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [documentForm, setDocumentForm] = useState({ name: "", type: "technical", sizeLabel: "" });
  const [inspectionForm, setInspectionForm] = useState({ date: "", result: "", notes: "", attachmentName: "" });
  const [maintenanceForm, setMaintenanceForm] = useState({ date: "", type: "", status: "Planned", notes: "" });
  const [valueForm, setValueForm] = useState({ date: "", value: "", note: "" });
  const [linkForm, setLinkForm] = useState({ label: "", type: "vendor", reference: "", url: "" });

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
    if (!saved) setMessage("Dossier could not be saved locally.");
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
      setMessage("Status saved.");
    } catch (error) {
      setMessage(error.message || "Status save failed.");
    } finally {
      setSavingStatus(false);
    }
  }

  function addValue() {
    if (!canManageProperties || !valueForm.value) return;
    updateDossier(
      (current) => ({
        ...current,
        valueHistory: [
          {
            id: createId("value"),
            date: valueForm.date || new Date().toISOString().slice(0, 10),
            value: Number(valueForm.value),
            note: valueForm.note,
          },
          ...current.valueHistory,
        ],
      }),
      "value.add",
      { value: Number(valueForm.value) },
    );
    setValueForm({ date: "", value: "", note: "" });
  }

  function addDocument() {
    if (!canManageProperties || !documentForm.name.trim()) return;
    updateDossier(
      (current) => ({
        ...current,
        documents: [
          {
            id: createId("doc"),
            name: documentForm.name.trim(),
            type: documentForm.type || "technical",
            sizeLabel: documentForm.sizeLabel || "metadata only",
            uploadedAt: new Date().toISOString(),
          },
          ...current.documents,
        ],
      }),
      "documents.add",
      { name: documentForm.name.trim(), type: documentForm.type },
    );
    setDocumentForm({ name: "", type: "technical", sizeLabel: "" });
  }

  function deleteDocument(id) {
    if (!canManageProperties) return;
    updateDossier(
      (current) => ({
        ...current,
        documents: current.documents.filter((document) => document.id !== id),
      }),
      "documents.delete",
      { id },
    );
  }

  function downloadDocumentMetadata(document) {
    downloadJson(`asset-document-${document.id}.json`, document);
    setMessage("File content not stored yet. Metadata exported.");
  }

  function addInspection() {
    if (!canManageProperties || !inspectionForm.result.trim()) return;
    updateDossier(
      (current) => ({
        ...current,
        inspections: [
          {
            id: createId("inspection"),
            date: inspectionForm.date || new Date().toISOString().slice(0, 10),
            result: inspectionForm.result.trim(),
            notes: inspectionForm.notes,
            attachmentName: inspectionForm.attachmentName,
          },
          ...current.inspections,
        ],
      }),
      "inspection.add",
      { result: inspectionForm.result.trim() },
    );
    setInspectionForm({ date: "", result: "", notes: "", attachmentName: "" });
  }

  function addMaintenance() {
    if (!canManageProperties || !maintenanceForm.type.trim()) return;
    updateDossier(
      (current) => ({
        ...current,
        maintenance: [
          {
            id: createId("maintenance"),
            date: maintenanceForm.date || new Date().toISOString().slice(0, 10),
            type: maintenanceForm.type.trim(),
            status: maintenanceForm.status || "Planned",
            notes: maintenanceForm.notes,
          },
          ...current.maintenance,
        ],
      }),
      "maintenance.add",
      { type: maintenanceForm.type.trim() },
    );
    setMaintenanceForm({ date: "", type: "", status: "Planned", notes: "" });
  }

  function addLink() {
    if (!canManageProperties || !linkForm.label.trim()) return;
    updateDossier(
      (current) => ({
        ...current,
        links: [
          {
            id: createId("link"),
            label: linkForm.label.trim(),
            type: linkForm.type || "vendor",
            reference: linkForm.reference,
            url: linkForm.url,
          },
          ...current.links,
        ],
      }),
      "links.add",
      { label: linkForm.label.trim() },
    );
    setLinkForm({ label: "", type: "vendor", reference: "", url: "" });
  }

  function exportDossier(kind = "dossier") {
    const payload = buildDossierExport({ property: { ...property, status }, state: dossier, auditLogs });
    downloadJson(`asset-${identifier}-${kind}.json`, payload);
    updateDossier((current) => current, kind === "package" ? "package.download" : "export.json", { kind });
    setMessage(kind === "package" ? "Dossier package exported as JSON." : "Dossier exported as JSON.");
  }

  const filteredDocuments =
    documentTypeFilter === "all"
      ? searched.documents
      : searched.documents.filter((document) => document.type === documentTypeFilter);

  return (
    <section className="asset-detail-panel">
      <div className="asset-detail-heading">
        <div>
          <p className="eyebrow">Asset dossier</p>
          <h1>{display(property.name || property.code)}</h1>
        </div>
        {canManageProperties ? (
          <Link className="text-button" href={`/assets/${encodeURIComponent(identifier)}/edit`}>
            Edit asset
          </Link>
        ) : null}
      </div>

      <div className="dossier-toolbar">
        <label>
          Search dossier
          <input
            value={searchQuery}
            onChange={(event) => setConfig({ searchQuery: event.target.value })}
            placeholder="Document, note, supplier"
          />
        </label>
        <button className="text-button" type="button" onClick={() => exportDossier("dossier")}>
          Export JSON
        </button>
        <button className="text-button" type="button" onClick={() => exportDossier("package")}>
          Download Package
        </button>
      </div>

      {searchQuery ? <p className="form-status">Search matched {searchCount} item{searchCount === 1 ? "" : "s"}.</p> : null}
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

      {activeTab === "overview" ? (
        <div className="dossier-section">
          <div className="asset-detail-grid">
            <dl>
              <dt>Code</dt>
              <dd>{display(property.code)}</dd>
              <dt>Type</dt>
              <dd>{display(property.propertyType)}</dd>
              <dt>Status</dt>
              <dd>{display(status)}</dd>
              <dt>Area</dt>
              <dd>{areaLabel(property.areaSqm)}</dd>
              <dt>Address</dt>
              <dd>{display(property.addressLine)}</dd>
              <dt>Administrative area</dt>
              <dd>{[property.ward, property.district, property.city].filter(Boolean).join(", ") || "-"}</dd>
              <dt>Coordinate</dt>
              <dd>{coordinate}</dd>
            </dl>
            <div className="asset-map-preview" aria-label="Map preview">
              <span className="asset-map-pin" />
              <strong>{coordinate}</strong>
            </div>
          </div>

          <div className="dossier-two-column">
            <section className="dossier-panel">
              <h2>Status and value</h2>
              <label>
                Current status
                <select
                  value={statusDraft}
                  disabled={!canManageProperties || savingStatus}
                  onChange={(event) => setStatusDraft(event.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="text-button" disabled={!canManageProperties || savingStatus} onClick={saveStatus}>
                Save status
              </button>
            </section>

            <section className="dossier-panel">
              <h2>Value history</h2>
              <div className="dossier-form-grid">
                <label>
                  Value date
                  <input type="date" value={valueForm.date} onChange={(event) => setValueForm({ ...valueForm, date: event.target.value })} />
                </label>
                <label>
                  Asset value
                  <input type="number" value={valueForm.value} onChange={(event) => setValueForm({ ...valueForm, value: event.target.value })} />
                </label>
                <label>
                  Value note
                  <input value={valueForm.note} onChange={(event) => setValueForm({ ...valueForm, note: event.target.value })} />
                </label>
                <button type="button" className="text-button" disabled={!canManageProperties} onClick={addValue}>
                  Add value
                </button>
              </div>
              <ListEmpty items={searched.valueHistory} message="No value history yet." />
              {searched.valueHistory.map((item) => (
                <div className="dossier-row" key={item.id}>
                  <strong>{valueLabel(item.value)}</strong>
                  <span>{dateLabel(item.date)}</span>
                  <span>{display(item.note)}</span>
                </div>
              ))}
            </section>
          </div>

          <section className="asset-timeline" aria-label="Recent audit timeline">
            <h2>Recent audit timeline</h2>
            <ListEmpty items={auditLogs} message="No audit entries for this asset." />
            {auditLogs.map((log) => (
              <article key={log.id} className="asset-timeline-item">
                <strong>{log.action}</strong>
                <span>{log.actor?.username || log.actor?.email || "System"}</span>
                <time dateTime={log.createdAt}>{dateLabel(log.createdAt)}</time>
              </article>
            ))}
          </section>
        </div>
      ) : null}

      {activeTab === "documents" ? (
        <section className="dossier-section">
          <div className="dossier-toolbar">
            <button type="button" className="text-button" disabled={!canManageProperties} onClick={() => setMessage("Upload placeholder ready. Add metadata below.")}>
              Upload
            </button>
            <label>
              Document type filter
              <select value={documentTypeFilter} onChange={(event) => setConfig({ documentTypeFilter: event.target.value })}>
                <option value="all">All</option>
                <option value="technical">Technical</option>
                <option value="contract">Contract</option>
                <option value="warranty">Warranty</option>
                <option value="image">Image</option>
              </select>
            </label>
          </div>
          <div className="dossier-form-grid">
            <label>
              Document name
              <input value={documentForm.name} onChange={(event) => setDocumentForm({ ...documentForm, name: event.target.value })} />
            </label>
            <label>
              Document type
              <select value={documentForm.type} onChange={(event) => setDocumentForm({ ...documentForm, type: event.target.value })}>
                <option value="technical">Technical</option>
                <option value="contract">Contract</option>
                <option value="warranty">Warranty</option>
                <option value="image">Image</option>
              </select>
            </label>
            <label>
              Size label
              <input value={documentForm.sizeLabel} onChange={(event) => setDocumentForm({ ...documentForm, sizeLabel: event.target.value })} />
            </label>
            <button type="button" className="text-button" disabled={!canManageProperties} onClick={addDocument}>
              Add document
            </button>
          </div>
          <ListEmpty items={filteredDocuments} message="No documents match this dossier view." />
          {filteredDocuments.map((document) => (
            <div className="dossier-row" key={document.id}>
              <strong>{document.name}</strong>
              <span>{document.type}</span>
              <span>{document.sizeLabel}</span>
              <button type="button" className="text-button" onClick={() => downloadDocumentMetadata(document)}>
                Download metadata
              </button>
              <button type="button" className="text-button" disabled={!canManageProperties} onClick={() => deleteDocument(document.id)}>
                Delete
              </button>
            </div>
          ))}
        </section>
      ) : null}

      {activeTab === "inspections" ? (
        <section className="dossier-section">
          <div className="dossier-form-grid">
            <label>
              Inspection date
              <input type="date" value={inspectionForm.date} onChange={(event) => setInspectionForm({ ...inspectionForm, date: event.target.value })} />
            </label>
            <label>
              Inspection result
              <input value={inspectionForm.result} onChange={(event) => setInspectionForm({ ...inspectionForm, result: event.target.value })} />
            </label>
            <label>
              Inspection notes
              <input value={inspectionForm.notes} onChange={(event) => setInspectionForm({ ...inspectionForm, notes: event.target.value })} />
            </label>
            <label>
              Attachment placeholder
              <input value={inspectionForm.attachmentName} onChange={(event) => setInspectionForm({ ...inspectionForm, attachmentName: event.target.value })} />
            </label>
            <button type="button" className="text-button" disabled={!canManageProperties} onClick={addInspection}>
              Add inspection
            </button>
          </div>
          <ListEmpty items={searched.inspections} message="No inspections recorded." />
          {searched.inspections.map((inspection) => (
            <div className="dossier-row" key={inspection.id}>
              <strong>{inspection.result}</strong>
              <span>{dateLabel(inspection.date)}</span>
              <span>{display(inspection.notes)}</span>
              <span>{display(inspection.attachmentName)}</span>
            </div>
          ))}
        </section>
      ) : null}

      {activeTab === "maintenance" ? (
        <section className="dossier-section">
          <div className="dossier-form-grid">
            <label>
              Maintenance date
              <input type="date" value={maintenanceForm.date} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, date: event.target.value })} />
            </label>
            <label>
              Maintenance type
              <input value={maintenanceForm.type} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, type: event.target.value })} />
            </label>
            <label>
              Maintenance status
              <input value={maintenanceForm.status} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, status: event.target.value })} />
            </label>
            <label>
              Maintenance notes
              <input value={maintenanceForm.notes} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, notes: event.target.value })} />
            </label>
            <button type="button" className="text-button" disabled={!canManageProperties} onClick={addMaintenance}>
              Add maintenance
            </button>
          </div>
          <ListEmpty items={searched.maintenance} message="No maintenance entries recorded." />
          {searched.maintenance.map((item) => (
            <div className="dossier-row" key={item.id}>
              <strong>{item.type}</strong>
              <span>{item.status}</span>
              <span>{dateLabel(item.date)}</span>
              <span>{display(item.notes)}</span>
            </div>
          ))}
        </section>
      ) : null}

      {activeTab === "timeline" ? (
        <section className="asset-timeline" aria-label="Dossier timeline">
          <h2>Dossier timeline</h2>
          <ListEmpty items={timeline} message="No timeline entries yet." />
          {timeline.map((item) => (
            <article key={`${item.source}-${item.id}`} className="asset-timeline-item">
              <strong>{item.action}</strong>
              <span>{display(item.actor)}</span>
              <time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === "links" ? (
        <section className="dossier-section">
          <div className="dossier-form-grid">
            <label>
              Link label
              <input value={linkForm.label} onChange={(event) => setLinkForm({ ...linkForm, label: event.target.value })} />
            </label>
            <label>
              Link type
              <input value={linkForm.type} onChange={(event) => setLinkForm({ ...linkForm, type: event.target.value })} />
            </label>
            <label>
              Link reference
              <input value={linkForm.reference} onChange={(event) => setLinkForm({ ...linkForm, reference: event.target.value })} />
            </label>
            <label>
              Link URL
              <input value={linkForm.url} onChange={(event) => setLinkForm({ ...linkForm, url: event.target.value })} />
            </label>
            <button type="button" className="text-button" disabled={!canManageProperties} onClick={addLink}>
              Add link
            </button>
          </div>
          <ListEmpty items={searched.links} message="No supplier or contract links recorded." />
          {searched.links.map((link) => (
            <div className="dossier-row" key={link.id}>
              <strong>{link.label}</strong>
              <span>{link.type}</span>
              <span>{display(link.reference)}</span>
              <span>{link.url ? <a href={link.url}>{link.url}</a> : "-"}</span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="dossier-history" aria-label="Dossier operation history">
        <h2>Operation history</h2>
        <ListEmpty items={dossier.history} message="No local dossier operations yet." />
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

function ListEmpty({ items, message }) {
  return items.length ? null : <p className="empty-list">{message}</p>;
}
