"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "geoai-search-history";
const MAX_HISTORY_ITEMS = 20;

export function classifySearchText(text) {
  const normalized = String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return /\b(bao nhieu|co bao nhieu|vung nao|noi nao|cho toi|hay cho biet|dang hoat dong|can xem xet)\b/.test(
    normalized
  )
    ? "nl-question"
    : "keyword";
}

function historyEntry(value) {
  if (typeof value === "string") {
    return {
      text: value,
      type: classifySearchText(value),
      createdAt: new Date().toISOString()
    };
  }

  if (!value || typeof value !== "object" || typeof value.text !== "string") {
    return null;
  }

  return {
    text: value.text,
    type: value.type === "nl-question" ? "nl-question" : "keyword",
    createdAt: value.createdAt || new Date().toISOString()
  };
}

function readHistory(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(historyEntry).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeHistory(storage, history) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

export default function useSearchHistory(storage = globalThis.window?.localStorage) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!storage) return;
    setHistory(readHistory(storage).slice(0, MAX_HISTORY_ITEMS));
  }, [storage]);

  const addSearch = useCallback(
    (text) => {
      const cleanText = String(text || "").trim();
      if (!cleanText) return;

      setHistory((current) => {
        const next = [
          {
            text: cleanText,
            type: classifySearchText(cleanText),
            createdAt: new Date().toISOString()
          },
          ...current.filter((item) => item.text !== cleanText)
        ].slice(0, MAX_HISTORY_ITEMS);

        if (storage) {
          writeHistory(storage, next);
        }

        return next;
      });
    },
    [storage]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (storage) {
      writeHistory(storage, []);
    }
  }, [storage]);

  return { history, addSearch, clearHistory };
}
