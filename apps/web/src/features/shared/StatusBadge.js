"use client";

/**
 * StatusBadge — renders a colored badge indicating asset status.
 *
 * Each status maps to a distinct `--color-status-*` CSS variable defined in
 * globals.css (both light and dark modes). Background colors use a low-opacity
 * tint of the status color while the text uses the full-strength status color,
 * ensuring ≥3:1 contrast against the page background.
 */

const STATUS_LABELS = {
  active: "Hoạt động",
  inactive: "Ngừng",
  maintenance: "Bảo trì",
  review: "Xem xét",
};

export default function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status;

  return (
    <span className={`status-badge status-badge--${status}`} aria-label={label}>
      {label}
    </span>
  );
}
