"use client";

import { createContext, useContext } from "react";

export const MapAppContext = createContext(null);

export function useMapApp() {
  const context = useContext(MapAppContext);
  if (!context) {
    throw new Error("useMapApp must be used within a MapAppContext.Provider");
  }
  return context;
}
