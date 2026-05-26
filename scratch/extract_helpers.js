const fs = require('fs');
const path = require('path');

const mapJsPath = path.join(__dirname, 'Map.js.backup');
const content = fs.readFileSync(mapJsPath, 'utf8');

const lines = content.split('\n');

const helpersContent = lines.slice(37, 417).join('\n'); // lines 38 to 417 (0-indexed 37 to 416)

const mapHelpersPath = path.join(__dirname, '../apps/web/src/features/map/map-helpers.js');

const finalHelpersContent = `import L from "leaflet";
import { assetDetailUrl, assetMarkerStyle, assetPopupRows } from "@/features/map/assets";
import { snapPointToVisibleAssets } from "@/features/measurement/measurement-state";

` + helpersContent + `

export {
  DANANG_CENTER,
  DANANG_BOUNDS,
  MAP_VIEW_BOUNDS,
  OBJECT_COLORS,
  ADMIN_ALIASES,
  DISTRICT_LABELS,
  WORLD_RING,
  boundsToCoordinates,
  objectColor,
  normalizedAdminArea,
  districtDisplayName,
  escapeHtml,
  polygonExteriorRings,
  featureCenter,
  cacheBustedUrl,
  geoJsonPointLayer,
  geoJsonPopup,
  assetTypeIcon,
  assetPopup,
  assetMarkerIcon,
  poiPopup,
  poiTooltip,
  propertyDensityPopup,
  propertyDensityObjectPopup,
  propertyDensityBounds,
  propertyDensityCenter,
  densityHeatRatio,
  densityHeatColor,
  densityHeatRadius,
  densityHeatPoint,
  densityFocusLabel,
  deterministicAngle,
  rotatedFootprintPoints,
  clusterIcon,
  labelIcon,
  measurementLabelIcon,
  measurementVertexIcon,
  spatialDrawVertexIcon,
  visibleAssetPoint,
  snapPointByPixel
};
`;

fs.writeFileSync(mapHelpersPath, finalHelpersContent);
console.log("Wrote map-helpers.js");
