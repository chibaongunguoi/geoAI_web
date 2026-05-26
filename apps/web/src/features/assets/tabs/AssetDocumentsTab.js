import { useState } from "react";
import { createId, downloadJson, ListEmpty } from "./utils";

export default function AssetDocumentsTab({
  canManageProperties,
  updateDossier,
  filteredDocuments,
  documentTypeFilter,
  setConfig,
  setMessage,
}) {
  const [documentForm, setDocumentForm] = useState({ name: "", type: "technical", sizeLabel: "" });

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
    setMessage("Nội dung chưa được lưu. Đã xuất metadata.");
  }

  return (
    <section className="dossier-section">
      <div className="dossier-toolbar">
        <button type="button" className="text-button" disabled={!canManageProperties} onClick={() => setMessage("Sẵn sàng tải lên. Thêm metadata bên dưới.")}>
          Tải lên
        </button>
        <label>
          Lọc loại tài liệu
          <select value={documentTypeFilter} onChange={(event) => setConfig({ documentTypeFilter: event.target.value })}>
            <option value="all">Tất cả</option>
            <option value="technical">Kỹ thuật</option>
            <option value="contract">Hợp đồng</option>
            <option value="warranty">Bảo hành</option>
            <option value="image">Hình ảnh</option>
          </select>
        </label>
      </div>
      <div className="dossier-form-grid">
        <label>
          Tên tài liệu
          <input value={documentForm.name} onChange={(event) => setDocumentForm({ ...documentForm, name: event.target.value })} />
        </label>
        <label>
          Loại tài liệu
          <select value={documentForm.type} onChange={(event) => setDocumentForm({ ...documentForm, type: event.target.value })}>
            <option value="technical">Kỹ thuật</option>
            <option value="contract">Hợp đồng</option>
            <option value="warranty">Bảo hành</option>
            <option value="image">Hình ảnh</option>
          </select>
        </label>
        <label>
          Dung lượng
          <input value={documentForm.sizeLabel} onChange={(event) => setDocumentForm({ ...documentForm, sizeLabel: event.target.value })} />
        </label>
        <button type="button" className="text-button" disabled={!canManageProperties} onClick={addDocument}>
          Thêm tài liệu
        </button>
      </div>
      <ListEmpty items={filteredDocuments} message="Không có tài liệu nào." />
      {filteredDocuments.map((document) => (
        <div className="dossier-row" key={document.id}>
          <strong>{document.name}</strong>
          <span>{document.type}</span>
          <span>{document.sizeLabel}</span>
          <button type="button" className="text-button" onClick={() => downloadDocumentMetadata(document)}>
            Tải metadata
          </button>
          <button type="button" className="text-button" disabled={!canManageProperties} onClick={() => deleteDocument(document.id)}>
            Xóa
          </button>
        </div>
      ))}
    </section>
  );
}
