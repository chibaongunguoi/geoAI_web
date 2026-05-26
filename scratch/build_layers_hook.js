const fs = require('fs');
const path = require('path');

const mapJsPath = path.join(__dirname, 'Map.js.backup');
const lines = fs.readFileSync(mapJsPath, 'utf8').split('\n');

const useMapLayersContent = `import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import { DATA_LAYERS, validateGeoJsonPayload, validateLayerConfig, layerIsVisibleAtZoom } from "@/features/map/layers";
import { createDefaultAssetDisplayConfig, clusterAssets, assetLabel } from "@/features/map/assets";
import { clusterPoiMarkers, shouldShowPoiLayer, createClusterIconHtml, createPoiMarkerHtml } from "@/features/poi/poi-markers";
import {
  normalizedAdminArea, districtDisplayName, polygonExteriorRings, featureCenter,
  cacheBustedUrl, geoJsonPointLayer, geoJsonPopup, assetMarkerIcon, assetPopup,
  labelIcon, clusterIcon, objectColor, escapeHtml, propertyDensityBounds,
  propertyDensityPopup, propertyDensityCenter, propertyDensityObjectPopup,
  rotatedFootprintPoints, densityHeatPoint, WORLD_RING, boundsToCoordinates
} from "../map-helpers";

export function useMapLayers({
  map,
  currentZoom,
  visibleLayerIds,
  layerOpacities,
  layerRefreshRequests,
  onLayerStatusChange,
  assetDisplayConfig,
  permissions,
  onAssetLoad,
  onAssetError,
  propertySearchResult,
  focusedProperty,
  poiResults,
  buildingHeatmap,
  selectedAdminArea,
  drawnItems,
  setCurrentCoords,
  onRectangleDrawn
}) {
  const [assetMarkers] = useState(() => new L.FeatureGroup());
  const [boundaryLayer] = useState(() => new L.FeatureGroup());
  const [maskLayer] = useState(() => new L.FeatureGroup());
  const [propertySearchLayer] = useState(() => new L.FeatureGroup());
  const [buildingHeatmapLayer] = useState(() => new L.FeatureGroup());
  const [poiLayer] = useState(() => new L.FeatureGroup());
  const [focusedPropertyLayer] = useState(() => new L.FeatureGroup());
  const externalLayersRef = useRef(new globalThis.Map());
  const poiMarkersRef = useRef(new globalThis.Map());
  const buildingHeatLayerRef = useRef(null);
  const [adminBoundaries, setAdminBoundaries] = useState(null);
  const lastBoundaryViewKeyRef = useRef(null);

  useEffect(() => {
    map.addLayer(assetMarkers);
    map.addLayer(maskLayer);
    map.addLayer(boundaryLayer);
    map.addLayer(buildingHeatmapLayer);
    map.addLayer(propertySearchLayer);
    map.addLayer(poiLayer);
    map.addLayer(focusedPropertyLayer);

    return () => {
      map.removeLayer(assetMarkers);
      map.removeLayer(maskLayer);
      map.removeLayer(boundaryLayer);
      map.removeLayer(buildingHeatmapLayer);
      map.removeLayer(propertySearchLayer);
      map.removeLayer(poiLayer);
      map.removeLayer(focusedPropertyLayer);
      externalLayersRef.current.forEach((layer) => map.removeLayer(layer));
      externalLayersRef.current.clear();
    };
  }, [map, assetMarkers, maskLayer, boundaryLayer, buildingHeatmapLayer, propertySearchLayer, poiLayer, focusedPropertyLayer]);

` + lines.slice(471, 483).join('\n') + `

` + lines.slice(498, 506).join('\n') + `

` + lines.slice(639, 712).join('\n') + `

` + lines.slice(712, 743).join('\n') + `

` + lines.slice(936, 1107).join('\n') + `

` + lines.slice(1107, 1157).join('\n') + `

` + lines.slice(1157, 1267).join('\n') + `

` + lines.slice(1267, 1291).join('\n') + `

` + lines.slice(1310, 1422).join('\n') + `

` + lines.slice(1422, 1551).join('\n') + `

  return {
    assetMarkers, boundaryLayer, maskLayer, propertySearchLayer,
    buildingHeatmapLayer, poiLayer, focusedPropertyLayer, externalLayersRef,
    isLayerActive
  };
}
`;

const mapLayersPath = path.join(__dirname, '../apps/web/src/features/map/hooks/useMapLayers.js');
fs.writeFileSync(mapLayersPath, useMapLayersContent);
console.log("Wrote useMapLayers.js");
