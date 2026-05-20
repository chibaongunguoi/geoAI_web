"use client";

/**
 * EmptyState — shared component for displaying empty data states.
 * Used by Dashboard charts, Admin tables, and Asset list when no data is available.
 *
 * @param {{ icon?: React.ReactNode, message: string, action?: { label: string, onClick: () => void } }} props
 */
export default function EmptyState({ icon, message, action }) {
  return (
    <div className="empty-state-container" role="status">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <p className="empty-state-message">{message}</p>
      {action && (
        <button
          type="button"
          className="empty-state-action"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
