"use client";

import { useState } from "react";

const TEXT = {
  placeholder: "Tìm kiếm địa điểm (nhà hàng, cafe, trường học...)",
  search: "Tìm",
  searching: "Đang tìm...",
  noResults: "Không tìm thấy địa điểm nào.",
  results: "kết quả",
  clear: "Xóa"
};

export default function PoiSearchPanel({ mapBounds, onResults, onClear }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultCount, setResultCount] = useState(null);
  const [error, setError] = useState(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query.trim() });
      if (mapBounds) {
        params.set("south", String(mapBounds.south));
        params.set("west", String(mapBounds.west));
        params.set("north", String(mapBounds.north));
        params.set("east", String(mapBounds.east));
      }
      const response = await fetch(`/api/poi/search?${params}`);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setResultCount(data.total);
      onResults?.(data.items);
    } catch (err) {
      setError("Không thể tìm kiếm. Vui lòng thử lại.");
      setResultCount(null);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setQuery("");
    setResultCount(null);
    setError(null);
    onClear?.();
  };

  return (
    <div className="poi-search-panel">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <input
          type="search"
          value={query}
          placeholder={TEXT.placeholder}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading || !query.trim()}>
          {loading ? TEXT.searching : TEXT.search}
        </button>
        {resultCount !== null && (
          <button type="button" onClick={clear}>
            {TEXT.clear}
          </button>
        )}
      </form>
      {error && <p className="poi-search-error">{error}</p>}
      {resultCount !== null && (
        <p className="poi-search-count">
          {resultCount === 0 ? TEXT.noResults : `${resultCount} ${TEXT.results}`}
        </p>
      )}
    </div>
  );
}
