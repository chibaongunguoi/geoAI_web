const fs = require('fs');
const path = require('path');

const mapJsPath = path.join(__dirname, 'Map.js.backup');
const lines = fs.readFileSync(mapJsPath, 'utf8').split('\n');

const useMapDrawToolsContent = `import { useEffect, useCallback, useState } from "react";
import L from "leaflet";
import html2canvas from "html2canvas";
import { 
  snapPointByPixel, boundsToCoordinates, objectColor, 
  measurementVertexIcon, measurementLabelIcon, spatialDrawVertexIcon 
} from "../map-helpers";
import { formatDistance, calculateDistance, calculateCentroid } from "@/features/measurement/measurement-utils";

export function useMapDrawTools({
  map,
  visibleAssets,
  measurementState,
  measurementResult,
  onMeasurementPointAdd,
  onMeasurementPointEdit,
  spatialDrawState,
  spatialDrawResult,
  onSpatialDrawMapPointAdd,
  onSpatialDrawVertexEdit,
  onSpatialDrawVertexSelect,
  onRectangleDrawn,
  onAnalyzeImage,
  selectRequestId,
  clearRequestId,
  captureRequestId,
  analysisObjects,
  isLayerActive,
  layerOpacities,
  onLayerStatusChange
}) {
  const [drawnItems] = useState(() => new L.FeatureGroup());
  const [objectBoxes] = useState(() => new L.FeatureGroup());
  const [measurementLayer] = useState(() => new L.FeatureGroup());
  const [spatialDrawLayer] = useState(() => new L.FeatureGroup());
  const [currentCoords, setCurrentCoords] = useState(null);

` + lines.slice(517, 524).join('\n') + `

` + lines.slice(524, 574).join('\n') + `

  useEffect(() => {
    map.addLayer(drawnItems);
    map.addLayer(objectBoxes);
    map.addLayer(measurementLayer);
    map.addLayer(spatialDrawLayer);

` + lines.slice(590, 606).join('\n') + `

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.removeLayer(drawnItems);
      map.removeLayer(objectBoxes);
      map.removeLayer(measurementLayer);
      map.removeLayer(spatialDrawLayer);
    };
  }, [map, drawnItems, objectBoxes, measurementLayer, spatialDrawLayer, onRectangleDrawn, captureImageForCoords]);

` + lines.slice(743, 769).join('\n') + `

` + lines.slice(769, 840).join('\n') + `

` + lines.slice(840, 872).join('\n') + `

` + lines.slice(872, 936).join('\n') + `

` + lines.slice(1641, 1664).join('\n') + `

` + lines.slice(1664, 1670).join('\n') + `

` + lines.slice(1670, 1750).join('\n') + `

` + lines.slice(1769, 1775).join('\n') + `

  return { drawnItems, objectBoxes, measurementLayer, spatialDrawLayer, currentCoords };
}
`;

const mapDrawPath = path.join(__dirname, '../apps/web/src/features/map/hooks/useMapDrawTools.js');
fs.writeFileSync(mapDrawPath, useMapDrawToolsContent);
console.log("Wrote useMapDrawTools.js");
