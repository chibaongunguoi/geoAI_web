"use client";

import { useState } from "react";

const TEXT = {
  placeholder: "T\u00ecm \u0111\u1ecba \u0111i\u1ec3m (nh\u00e0 h\u00e0ng, cafe, tr\u01b0\u1eddng h\u1ecdc...)",
  search: "T\u00ecm",
  searching: "\u0110ang t\u00ecm...",
  noResults: "Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u1ecba \u0111i\u1ec3m n\u00e0o.",
  results: "k\u1ebft qu\u1ea3",
  clear: "X\u00f3a"
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
    } catch {
      setError("Kh\u00f4ng th\u1ec3 t\u00ecm ki\u1ebfm. Vui l\u00f2ng th\u1eed l\u1ea1i.");
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
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <input
          type="search"
          value={query}
          placeholder={TEXT.placeholder}
          onChange={(event) => setQuery(event.target.value)}
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
