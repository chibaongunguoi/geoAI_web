import {
  DEFAULT_DOSSIER_STATE,
  addDossierHistory,
  buildDossierExport,
  buildDossierTimeline,
  dossierWarnings,
  filterDossierSections,
  normalizeDossierState,
  readDossierStorage,
  writeDossierStorage,
} from "./dossier-state";

describe("dossier-state", () => {
  it("normalizes local dossier records and config", () => {
    const state = normalizeDossierState({
      documents: [{ id: "doc-1", name: "Manual", type: "technical", sizeLabel: "2 MB" }],
      inspections: [{ id: "insp-1", date: "2026-05-01", result: "Pass", notes: "Stable" }],
      maintenance: [{ id: "mnt-1", date: "2026-05-02", type: "Repair", status: "Done" }],
      valueHistory: [{ id: "val-1", date: "2026-05-03", value: "1200000", note: "Initial" }],
      links: [{ id: "link-1", label: "Supplier", type: "vendor", reference: "ACME" }],
      lastConfig: { activeTab: "documents", documentTypeFilter: "technical", searchQuery: "manual" },
      history: [{ action: "documents.add", createdAt: "2026-05-04T00:00:00.000Z" }],
    });

    expect(state.documents[0]).toEqual(expect.objectContaining({ name: "Manual", type: "technical" }));
    expect(state.valueHistory[0]).toEqual(expect.objectContaining({ value: 1200000 }));
    expect(state.lastConfig).toEqual({
      activeTab: "documents",
      documentTypeFilter: "technical",
      searchQuery: "manual",
    });
    expect(normalizeDossierState(null)).toEqual(DEFAULT_DOSSIER_STATE);
  });

  it("persists per-asset dossiers and falls back safely", () => {
    const storage = {
      data: {},
      getItem(key) {
        return this.data[key] ?? null;
      },
      setItem(key, value) {
        this.data[key] = value;
      },
    };
    const state = normalizeDossierState({
      documents: [{ id: "doc-1", name: "Manual", type: "technical" }],
    });

    expect(writeDossierStorage(storage, "asset-1", state)).toBe(true);
    expect(readDossierStorage(storage, "asset-1")).toEqual(
      expect.objectContaining({
        documents: [expect.objectContaining({ id: "doc-1" })],
      }),
    );
    expect(readDossierStorage(storage, "asset-2")).toEqual(DEFAULT_DOSSIER_STATE);
    expect(writeDossierStorage(null, "asset-1", state)).toBe(false);
  });

  it("builds warnings, search results, timeline, history, and export payload", () => {
    const auditLogs = [
      {
        id: "audit-1",
        action: "properties.update",
        actor: { username: "admin" },
        createdAt: "2026-05-09T09:00:00.000Z",
      },
    ];
    const state = normalizeDossierState({
      inspections: [{ id: "insp-1", date: "2026-05-10", result: "Needs repair", notes: "Crack" }],
      maintenance: [{ id: "mnt-1", date: "2026-05-11", type: "Repair", status: "Planned" }],
      links: [{ id: "link-1", label: "Supplier ACME", type: "vendor", reference: "W-1" }],
    });
    const withHistory = {
      ...state,
      history: addDossierHistory([], "status.update", { status: "REVIEW" }),
    };

    expect(dossierWarnings(state)).toEqual([]);
    expect(filterDossierSections(state, "acme")).toEqual(
      expect.objectContaining({ links: [expect.objectContaining({ label: "Supplier ACME" })] }),
    );
    expect(buildDossierTimeline(withHistory, auditLogs).map((item) => item.action)).toEqual([
      "Repair",
      "Needs repair",
      "Cập nhật tài sản",
      "Cập nhật trạng thái",
    ]);
    expect(buildDossierExport({ property: { code: "DN-BLD-001" }, state: withHistory, auditLogs })).toEqual(
      expect.objectContaining({
        asset: expect.objectContaining({ code: "DN-BLD-001" }),
        timeline: expect.arrayContaining([expect.objectContaining({ action: "Cập nhật tài sản" })]),
      }),
    );
  });
});
