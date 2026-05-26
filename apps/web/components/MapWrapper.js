"use client";

import React, { useRef } from "react";
import { MapStateProvider } from "@/features/map/contexts/MapStateContext";
import { MapSearchProvider } from "@/features/map/contexts/MapSearchContext";
import { DrawToolProvider } from "@/features/map/contexts/DrawToolContext";
import MapWorkspace from "./MapWorkspace";

export default function MapWrapper({ permissions = [] }) {
  const workspaceRef = useRef(null);
  const mapCanvasRef = useRef(null);

  return (
    <MapStateProvider permissions={permissions}>
      <MapSearchProvider permissions={permissions}>
        <DrawToolProvider permissions={permissions} workspaceRef={workspaceRef} mapCanvasRef={mapCanvasRef}>
          <MapWorkspace permissions={permissions} workspaceRef={workspaceRef} mapCanvasRef={mapCanvasRef} />
        </DrawToolProvider>
      </MapSearchProvider>
    </MapStateProvider>
  );
}
