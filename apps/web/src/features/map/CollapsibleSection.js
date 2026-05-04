"use client";

import { useId, useState } from "react";

export default function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children
}) {
  const contentId = useId();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="collapsible-section">
      <button
        className="collapsible-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>
          <strong>{title}</strong>
          {summary ? <small>{summary}</small> : null}
        </span>
        <span aria-hidden="true">{isOpen ? "Thu gọn" : "Mở"}</span>
      </button>
      {isOpen ? (
        <div className="collapsible-content" id={contentId}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
