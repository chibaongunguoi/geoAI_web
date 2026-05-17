"use client";

import { Search, X } from "lucide-react";

const TEXT = {
  section: "T\u00ecm ki\u1ebfm nh\u00e0 \u0111\u1ea5t",
  question: "C\u00e2u h\u1ecfi",
  placeholder: "T\u00ecm t\u00e0i s\u1ea3n theo t\u00ean, \u0111\u1ecba ch\u1ec9, qu\u1eadn/huy\u1ec7n...",
  clear: "X\u00f3a truy v\u1ea5n",
  search: "T\u00ecm ki\u1ebfm",
  searching: "\u0110ang t\u00ecm...",
  noResults: "Kh\u00f4ng t\u00ecm th\u1ea5y k\u1ebft qu\u1ea3. Th\u1eed t\u00ecm theo t\u00ean t\u00e0i s\u1ea3n, \u0111\u1ecba ch\u1ec9 c\u1ee5 th\u1ec3, ho\u1eb7c t\u00ean qu\u1eadn/ph\u01b0\u1eddng."
};

export default function MapTopSearchBar({
  styles,
  query,
  suggestions,
  sampleQueries,
  isSearching,
  status,
  onQueryChange,
  onFetchSuggestions,
  onSearch
}) {
  const updateQuery = (event) => {
    const value = event.target.value;
    onQueryChange(value);
    onFetchSuggestions(value);
  };

  return (
    <section className={styles.topSearchBar} aria-label={TEXT.section}>
      <form
        className={styles.topSearchForm}
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <label className={styles.searchLabel}>
          <span>{TEXT.question}</span>
          <input
            className={styles.searchInput}
            value={query}
            placeholder={TEXT.placeholder}
            list="property-search-suggestions"
            onChange={updateQuery}
          />
        </label>
        <datalist id="property-search-suggestions">
          {suggestions.map((suggestion) => (
            <option key={suggestion.id} value={suggestion.text} />
          ))}
        </datalist>
        {query ? (
          <button
            type="button"
            className={styles.searchIconButton}
            aria-label={TEXT.clear}
            onClick={() => onQueryChange("")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        ) : null}
        <button
          className={styles.searchSubmitButton}
          type="submit"
          disabled={!query.trim()}
          aria-label={TEXT.search}
        >
          <Search size={20} aria-hidden="true" />
          <span>{isSearching ? TEXT.searching : TEXT.search}</span>
        </button>
      </form>

      {status ? (
        <p className={styles.searchStatus} role="status">
          {status}
        </p>
      ) : null}
    </section>
  );
}
