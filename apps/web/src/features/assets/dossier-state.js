export const DOSSIER_STORAGE_KEY = "geoai.assetDossier.v1";

const VALID_TABS = new Set(["overview", "documents", "inspections", "maintenance", "timeline", "links"]);

export const DEFAULT_DOSSIER_STATE = {
  documents: [],
  inspections: [],
  maintenance: [],
  valueHistory: [],
  links: [],
  history: [],
  lastConfig: {
    activeTab: "overview",
    documentTypeFilter: "all",
    searchQuery: "",
  },
};

function text(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function id(value, prefix) {
  return text(value) || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function dateText(value) {
  return text(value) || new Date().toISOString().slice(0, 10);
}

function normalizeDocument(value) {
  const input = value && typeof value === "object" ? value : {};
  const name = text(input.name).trim();
  if (!name) return null;
  return {
    id: id(input.id, "doc"),
    name,
    type: text(input.type, "technical") || "technical",
    sizeLabel: text(input.sizeLabel, "metadata only") || "metadata only",
    uploadedAt: text(input.uploadedAt) || new Date().toISOString(),
  };
}

function normalizeInspection(value) {
  const input = value && typeof value === "object" ? value : {};
  const result = text(input.result).trim();
  if (!result) return null;
  return {
    id: id(input.id, "inspection"),
    date: dateText(input.date),
    result,
    notes: text(input.notes),
    attachmentName: text(input.attachmentName),
  };
}

function normalizeMaintenance(value) {
  const input = value && typeof value === "object" ? value : {};
  const type = text(input.type).trim();
  if (!type) return null;
  return {
    id: id(input.id, "maintenance"),
    date: dateText(input.date),
    type,
    status: text(input.status, "Planned") || "Planned",
    notes: text(input.notes),
  };
}

function normalizeValue(value) {
  const input = value && typeof value === "object" ? value : {};
  const parsed = Number(input.value);
  if (!Number.isFinite(parsed)) return null;
  return {
    id: id(input.id, "value"),
    date: dateText(input.date),
    value: parsed,
    note: text(input.note),
  };
}

function normalizeLink(value) {
  const input = value && typeof value === "object" ? value : {};
  const label = text(input.label).trim();
  if (!label) return null;
  return {
    id: id(input.id, "link"),
    label,
    type: text(input.type, "vendor") || "vendor",
    reference: text(input.reference),
    url: text(input.url),
  };
}

function normalizeHistory(value) {
  const input = value && typeof value === "object" ? value : {};
  const action = text(input.action).trim();
  if (!action) return null;
  return {
    action,
    detail: input.detail && typeof input.detail === "object" ? input.detail : {},
    createdAt: text(input.createdAt) || new Date().toISOString(),
  };
}

export function normalizeDossierState(value) {
  const input = value && typeof value === "object" ? value : {};
  const config = input.lastConfig && typeof input.lastConfig === "object" ? input.lastConfig : {};
  const activeTab = VALID_TABS.has(config.activeTab) ? config.activeTab : "overview";

  return {
    documents: Array.isArray(input.documents) ? input.documents.map(normalizeDocument).filter(Boolean) : [],
    inspections: Array.isArray(input.inspections) ? input.inspections.map(normalizeInspection).filter(Boolean) : [],
    maintenance: Array.isArray(input.maintenance) ? input.maintenance.map(normalizeMaintenance).filter(Boolean) : [],
    valueHistory: Array.isArray(input.valueHistory) ? input.valueHistory.map(normalizeValue).filter(Boolean) : [],
    links: Array.isArray(input.links) ? input.links.map(normalizeLink).filter(Boolean) : [],
    history: Array.isArray(input.history) ? input.history.map(normalizeHistory).filter(Boolean).slice(0, 50) : [],
    lastConfig: {
      activeTab,
      documentTypeFilter: text(config.documentTypeFilter, "all") || "all",
      searchQuery: text(config.searchQuery),
    },
  };
}

function storageKey(assetKey) {
  return `${DOSSIER_STORAGE_KEY}:${assetKey || "unknown"}`;
}

export function readDossierStorage(storage, assetKey) {
  if (!storage?.getItem) return DEFAULT_DOSSIER_STATE;
  try {
    const raw = storage.getItem(storageKey(assetKey));
    return raw ? normalizeDossierState(JSON.parse(raw)) : DEFAULT_DOSSIER_STATE;
  } catch {
    return DEFAULT_DOSSIER_STATE;
  }
}

export function writeDossierStorage(storage, assetKey, state) {
  if (!storage?.setItem) return false;
  try {
    storage.setItem(storageKey(assetKey), JSON.stringify(normalizeDossierState(state)));
    return true;
  } catch {
    return false;
  }
}

export function addDossierHistory(history, action, detail = {}) {
  const current = Array.isArray(history) ? history : [];
  return [
    {
      action,
      detail,
      createdAt: new Date().toISOString(),
    },
    ...current,
  ].slice(0, 50);
}

export function dossierWarnings(state) {
  const current = normalizeDossierState(state);
  const hasTechnicalDocument = current.documents.some((document) => document.type === "technical");
  const warnings = [];
  if (!hasTechnicalDocument) warnings.push("Thiếu tài liệu kỹ thuật bắt buộc.");
  if (current.inspections.length === 0) warnings.push("Thiếu biên bản kiểm tra.");
  return warnings;
}

function includesQuery(value, query) {
  return JSON.stringify(value).toLowerCase().includes(query);
}

export function filterDossierSections(state, query) {
  const current = normalizeDossierState(state);
  const normalizedQuery = text(query).trim().toLowerCase();
  if (!normalizedQuery) return current;
  return {
    ...current,
    documents: current.documents.filter((item) => includesQuery(item, normalizedQuery)),
    inspections: current.inspections.filter((item) => includesQuery(item, normalizedQuery)),
    maintenance: current.maintenance.filter((item) => includesQuery(item, normalizedQuery)),
    valueHistory: current.valueHistory.filter((item) => includesQuery(item, normalizedQuery)),
    links: current.links.filter((item) => includesQuery(item, normalizedQuery)),
    history: current.history.filter((item) => includesQuery(item, normalizedQuery)),
  };
}

function auditActor(log) {
  return log?.actor?.username || log?.actor?.email || "System";
}

function timelineDate(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function buildDossierTimeline(state, auditLogs = []) {
  const current = normalizeDossierState(state);
  const sourceItems = [
    ...current.maintenance.map((item) => ({
      id: item.id,
      action: item.type,
      actor: item.status,
      detail: item.notes,
      createdAt: item.date,
      source: "maintenance",
    })),
    ...current.inspections.map((item) => ({
      id: item.id,
      action: item.result,
      actor: "Inspection",
      detail: item.notes,
      createdAt: item.date,
      source: "inspection",
    })),
    ...current.valueHistory.map((item) => ({
      id: item.id,
      action: "value.update",
      actor: "Dossier",
      detail: item.note || String(item.value),
      createdAt: item.date,
      source: "value",
    })),
    ...(Array.isArray(auditLogs) ? auditLogs : []).map((log) => ({
      id: log.id,
      action: log.action,
      actor: auditActor(log),
      detail: "",
      createdAt: log.createdAt,
      source: "audit",
    })),
  ].sort((left, right) => timelineDate(right.createdAt) - timelineDate(left.createdAt));

  return [
    ...sourceItems,
    ...current.history.map((item, index) => ({
      id: `history-${index}-${item.createdAt}`,
      action: item.action,
      actor: "Local",
      detail: JSON.stringify(item.detail),
      createdAt: item.createdAt,
      source: "history",
    })),
  ];
}

export function buildDossierExport({ property, state, auditLogs = [] }) {
  const current = normalizeDossierState(state);
  return {
    exportedAt: new Date().toISOString(),
    asset: property || null,
    dossier: current,
    warnings: dossierWarnings(current),
    timeline: buildDossierTimeline(current, auditLogs),
  };
}
