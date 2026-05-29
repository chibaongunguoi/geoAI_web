import { useState } from "react";
import { createId, display, ListEmpty } from "./utils";

export default function AssetLinksTab({ canManageProperties, updateDossier, searched }) {
  const [linkForm, setLinkForm] = useState({ label: "", type: "vendor", reference: "", url: "" });
  const [showForm, setShowForm] = useState(false);

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
    setShowForm(false);
  }

  return (
    <section className="dossier-section">
      <div className="asset-section-title-row">
        <h2>Liên kết</h2>
        <button type="button" className="text-button" disabled={!canManageProperties} onClick={() => setShowForm((current) => !current)}>
          {showForm ? "Đóng" : "Thêm liên kết"}
        </button>
      </div>
      {showForm ? (
        <div className="dossier-form-grid">
          <label>
            Tên liên kết
            <input value={linkForm.label} onChange={(event) => setLinkForm({ ...linkForm, label: event.target.value })} />
          </label>
          <label>
            Loại liên kết
            <input value={linkForm.type} onChange={(event) => setLinkForm({ ...linkForm, type: event.target.value })} />
          </label>
          <label>
            Tham chiếu
            <input value={linkForm.reference} onChange={(event) => setLinkForm({ ...linkForm, reference: event.target.value })} />
          </label>
          <label>
            URL
            <input value={linkForm.url} onChange={(event) => setLinkForm({ ...linkForm, url: event.target.value })} />
          </label>
          <button type="button" className="text-button" disabled={!canManageProperties} onClick={addLink}>
            Lưu liên kết
          </button>
        </div>
      ) : null}
      <ListEmpty items={searched.links} message="Chưa có liên kết nhà cung cấp hoặc hợp đồng." />
      {searched.links.map((link) => (
        <div className="dossier-row" key={link.id}>
          <strong>{link.label}</strong>
          <span>{link.type}</span>
          <span>{display(link.reference)}</span>
          <span>{link.url ? <a href={link.url}>{link.url}</a> : "-"}</span>
        </div>
      ))}
    </section>
  );
}
