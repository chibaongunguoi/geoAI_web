"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export default function MapToolPopover({ styles, title, side = "left", onClose, children }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <section
      className={side === "right" ? styles.rightToolPopover : styles.leftToolPopover}
      aria-label={title}
    >
      <header className={styles.popoverHeader}>
        <h2>{title}</h2>
        <button
          type="button"
          className={styles.popoverCloseButton}
          aria-label={"\u0110\u00f3ng"}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <div className={styles.popoverBody}>{children}</div>
    </section>
  );
}
