import { useState } from "react";
import { backendFileUrl, uploadAssetFile } from "../asset-file-upload";
import { createId, downloadJson, ListEmpty } from "./utils";

function fileSizeLabel(size) {
  const value = Number(size || 0);
  if (!Number.isFinite(value) || value <= 0) return "metadata only";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${value} B`;
}

export default function AssetDocumentsTab({
  canManageProperties,
  updateDossier,
  filteredDocuments,
  documentTypeFilter,
  setConfig,
  setMessage,
}) {
  const [documentForm, setDocumentForm] = useState({ name: "", type: "technical", file: null });
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function addDocument() {
    const name = (documentForm.name || documentForm.file?.name || "").trim();
    if (!canManageProperties || !name || uploading) return;
    setUploading(true);
    setMessage("");
    try {
      const uploaded = await uploadAssetFile(documentForm.file);
      updateDossier(
        (current) => ({
          ...current,
          documents: [
            {
              id: createId("doc"),
              name,
              type: documentForm.type || "technical",
              sizeLabel: fileSizeLabel(documentForm.file?.size),
              uploadedAt: new Date().toISOString(),
              fileUrl: uploaded.fileUrl || uploaded.imageUrl || "",
              objectKey: uploaded.objectKey || "",
              contentType: uploaded.contentType || documentForm.file?.type || "",
            },
            ...current.documents,
          ],
        }),
        "documents.add",
        { name, type: documentForm.type, uploaded: Boolean(uploaded.objectKey) },
      );
      setDocumentForm({ name: "", type: "technical", file: null });
      setShowForm(false);
      setMessage(uploaded.objectKey ? "Đã tải tài liệu lên R2." : "Đã lưu metadata tài liệu.");
    } catch (error) {
      setMessage(error.message || "Tải tài liệu thất bại.");
    } finally {
      setUploading(false);
    }
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

  function openDocument(document) {
    if (document.fileUrl) {
      window.open(backendFileUrl(document.fileUrl), "_blank", "noopener,noreferrer");
      return;
    }
    downloadJson(`asset-document-${document.id}.json`, document);
    setMessage("Nội dung chưa được lưu. Đã xuất metadata.");
  }

  return (
    <section className="dossier-section">
      <div className="asset-section-title-row">
        <h2>Tài liệu</h2>
        <div className="asset-detail-actions">
          <label className="compact-filter">
            Lọc loại
            <select value={documentTypeFilter} onChange={(event) => setConfig({ documentTypeFilter: event.target.value })}>
              <option value="all">Tất cả</option>
              <option value="technical">Kỹ thuật</option>
              <option value="contract">Hợp đồng</option>
              <option value="warranty">Bảo hành</option>
              <option value="image">Hình ảnh</option>
            </select>
          </label>
          <button type="button" className="text-button" disabled={!canManageProperties} onClick={() => setShowForm((current) => !current)}>
            {showForm ? "Đóng" : "Thêm tài liệu"}
          </button>
        </div>
      </div>
      {showForm ? (
        <div className="dossier-form-grid dossier-form-grid--wide">
          <label>
            Tệp tài liệu
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setDocumentForm((current) => ({
                  ...current,
                  file,
                  name: current.name || file?.name || "",
                }));
              }}
            />
          </label>
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
          <button type="button" className="text-button" disabled={!canManageProperties || uploading} onClick={addDocument}>
            {uploading ? "Đang tải..." : "Lưu tài liệu"}
          </button>
        </div>
      ) : null}
      <ListEmpty items={filteredDocuments} message="Không có tài liệu nào." />
      {filteredDocuments.map((document) => (
        <div className="dossier-row" key={document.id}>
          <strong>{document.name}</strong>
          <span>{document.type}</span>
          <span>{document.sizeLabel}</span>
          <button type="button" className="text-button" onClick={() => openDocument(document)}>
            {document.fileUrl ? "Mở tệp" : "Tải metadata"}
          </button>
          <button type="button" className="text-button" disabled={!canManageProperties} onClick={() => deleteDocument(document.id)}>
            Xóa
          </button>
        </div>
      ))}
    </section>
  );
}
