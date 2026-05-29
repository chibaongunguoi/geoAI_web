"use client";

import L from "leaflet";
import { MapContainer, ScaleControl, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import "leaflet.heat";
import { useEffect, useState, useCallback, memo } from "react";
import { createDefaultAssetDisplayConfig } from "@/features/map/assets";
import { layerIsVisibleAtZoom } from "@/features/map/layers";
import { DANANG_CENTER, MAP_VIEW_BOUNDS } from "@/features/map/map-helpers";
import { useMapEvents } from "@/features/map/hooks/useMapEvents";
import { useMapDrawTools } from "@/features/map/hooks/useMapDrawTools";
import { useMapLayers } from "@/features/map/hooks/useMapLayers";

const MapComponent = memo(function MapComponent(props) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(() => map.getZoom());

  const isLayerActive = useCallback(
    (layerId) => {
      const layer = (props.layers || []).find((item) => item.id === layerId);
      return (props.visibleLayerIds || []).includes(layerId) && layerIsVisibleAtZoom(layer, currentZoom);
    },
    [currentZoom, props.layers, props.visibleLayerIds],
  );

  const { drawnItems, objectBoxes, measurementLayer, spatialDrawLayer, currentCoords, setCurrentCoords } = useMapDrawTools({
    map,
    isLayerActive,
    ...props
  });

  const {
    assetMarkers, boundaryLayer, maskLayer, propertySearchLayer,
    buildingHeatmapLayer, riskZonesLayer, poiLayer, focusedPropertyLayer, externalLayersRef
  } = useMapLayers({
    map,
    currentZoom,
    drawnItems,
    setCurrentCoords,
    isLayerActive,
    ...props
  });

  useMapEvents({
    map,
    setCurrentZoom,
    ...props
  });

  useEffect(() => {
    const groupsByLayerId = {
      "analysis-results": objectBoxes,
      "admin-boundaries": boundaryLayer,
      "sample-assets": assetMarkers,
    };

    props.layerOrder?.forEach((layerId) => {
      const layer = groupsByLayerId[layerId] || externalLayersRef.current.get(layerId);
      layer?.bringToFront?.();
    });

    buildingHeatmapLayer.bringToFront();
    if (riskZonesLayer) riskZonesLayer.bringToFront();
    propertySearchLayer.bringToFront();
    drawnItems.bringToFront();
    measurementLayer.bringToFront();
    spatialDrawLayer.bringToFront();
  }, [assetMarkers, boundaryLayer, buildingHeatmapLayer, riskZonesLayer, drawnItems, objectBoxes, propertySearchLayer, measurementLayer, spatialDrawLayer, props.layerOrder, externalLayersRef]);

  return null;
});

const Map = memo(function Map(props) {
  const selectedBasemap = props.selectedBasemap;
  return (
    <MapContainer
      center={DANANG_CENTER}
      zoom={12}
      minZoom={selectedBasemap?.minZoom || 11}
      maxZoom={selectedBasemap?.maxZoom || 19}
      maxBounds={MAP_VIEW_BOUNDS}
      maxBoundsViscosity={0.35}
      className="geoai-map"
      zoomControl={true}
      scrollWheelZoom={true}
      dragging={true}
    >
      <ScaleControl position="bottomleft" imperial={false} />
      <TileLayer
        key={selectedBasemap?.id || "satellite"}
        url={selectedBasemap?.url}
        attribution={selectedBasemap?.attribution}
        maxZoom={selectedBasemap?.maxZoom || 19}
        maxNativeZoom={selectedBasemap?.maxNativeZoom || 18}
      />
      <MapComponent {...props} />
    </MapContainer>
  );
});

export default Map;
