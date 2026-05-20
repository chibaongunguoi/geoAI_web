"use client";

/**
 * Pagination — shared component for navigating paginated data.
 * Used by Admin tables and Asset list when datasets exceed pageSize.
 *
 * Displays "Trang {currentPage} / {totalPages}" with previous/next buttons.
 * Previous is disabled on page 1, next is disabled on the last page.
 *
 * @param {{
 *   currentPage: number,
 *   totalItems: number,
 *   pageSize?: number,
 *   onPageChange: (page: number) => void
 * }} props
 */
export default function Pagination({
  currentPage,
  totalItems,
  pageSize = 20,
  onPageChange,
}) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="Phân trang">
      <button
        type="button"
        className="pagination-btn pagination-prev"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Trang trước"
      >
        ‹ Trước
      </button>

      <span className="pagination-label">
        Trang {currentPage} / {totalPages}
      </span>

      <button
        type="button"
        className="pagination-btn pagination-next"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Trang sau"
      >
        Sau ›
      </button>
    </nav>
  );
}
