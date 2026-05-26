const fs = require('fs');
const path = require('path');

const mapJsPath = path.join(__dirname, 'Map.js.backup');
const content = fs.readFileSync(mapJsPath, 'utf8');
const lines = content.split('\n');

function extractLines(startPattern, endPattern, occurrence = 1) {
    let currentOccurrence = 0;
    let startIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(startPattern)) {
            currentOccurrence++;
            if (currentOccurrence === occurrence) {
                startIdx = i;
                break;
            }
        }
    }
    if (startIdx === -1) return [];
    
    let braceCount = 0;
    let endIdx = -1;
    let started = false;
    
    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        for (let char of line) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
        }
        if (line.includes('{')) started = true;
        
        if (started && braceCount === 0) {
            endIdx = i;
            break;
        }
    }
    
    if (endIdx === -1) return [];
    return lines.slice(startIdx, endIdx + 1);
}

const useMapEventsContent = `import { useEffect, useCallback, useRef } from "react";
import { MAP_VIEW_BOUNDS, DANANG_BOUNDS } from "../map-helpers";

export function useMapEvents({ map, selectedBasemap, onViewportChange, setCurrentZoom }) {
  const rightDragState = useRef(null);

` + extractLines('const reportViewport = useCallback(() => {').join('\n') + `

` + extractLines('useEffect(() => {', '', 1).join('\n') + ` // basemap zoom limits

` + extractLines('useEffect(() => {', '', 3).join('\n') + ` // zoomend

` + extractLines('useEffect(() => {', '', 4).join('\n') + ` // report viewport

` + extractLines('useEffect(() => {', '', 9).join('\n') + ` // resize

` + extractLines('useEffect(() => {', '', 10).join('\n') + ` // context menu
}
`;

const mapEventsPath = path.join(__dirname, '../apps/web/src/features/map/hooks/useMapEvents.js');
fs.mkdirSync(path.dirname(mapEventsPath), { recursive: true });
fs.writeFileSync(mapEventsPath, useMapEventsContent);
console.log("Wrote useMapEvents.js");

// Let's do the rest dynamically in another step or I will just write them.
