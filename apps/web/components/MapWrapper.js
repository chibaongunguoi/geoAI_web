"use client";

import React, { useRef } from "react";
import { MapStateProvider } from "@/features/map/contexts/MapStateContext";
import { MapSearchProvider } from "@/features/map/contexts/MapSearchContext";
import { DrawToolProvider } from "@/features/map/contexts/DrawToolContext";
import dynamic from "next/dynamic";

const MapWorkspace = dynamic(() => import("./MapWorkspace"), {
  ssr: false,
  loading: () => <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', color: '#94a3b8'}}>Đang khởi tạo không gian bản đồ...</div>
});

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
