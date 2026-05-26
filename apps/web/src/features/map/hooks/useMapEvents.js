import { useEffect, useCallback, useRef } from "react";

export function useMapEvents({ 
  map, 
  selectedBasemap, 
  onViewportChange, 
  setCurrentZoom
}) {
  const rightDragState = useRef(null);

  const reportViewport = useCallback(() => {
    const center = map.getCenter();
    const bounds = map.getBounds();
    onViewportChange?.({
      center: { lat: center.lat, lng: center.lng },
      zoom: map.getZoom(),
      bounds: {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      },
    });
  }, [map, onViewportChange]);

  useEffect(() => {
    if (!selectedBasemap) return;

    map.setMinZoom(selectedBasemap.minZoom);
    map.setMaxZoom(selectedBasemap.maxZoom);

    if (map.getZoom() > selectedBasemap.maxZoom) {
      map.setZoom(selectedBasemap.maxZoom);
    }
  }, [map, selectedBasemap]);

  useEffect(() => {
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);

  useEffect(() => {
    const container = map.getContainer();

    const stopRightMouseEvent = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };

    const handleContextMenu = (event) => {
      stopRightMouseEvent(event);
    };

    const stopMiddleMouseAction = (event) => {
      if (event.button !== 1) return;

      event.preventDefault();
      event.stopPropagation();
    };

    const handleMouseDown = (event) => {
      if (event.button === 1) {
        stopMiddleMouseAction(event);
        return;
      }

      if (event.button !== 2) return;

      stopRightMouseEvent(event);
      rightDragState.current = {
        x: event.clientX,
        y: event.clientY,
      };
      container.classList.add("leaflet-dragging");
    };

    const handleMouseMove = (event) => {
      const previous = rightDragState.current;
      if (!previous) return;

      stopRightMouseEvent(event);

      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      if (dx !== 0 || dy !== 0) {
        map.panBy([-dx, -dy], { animate: false });
        rightDragState.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }
    };

    const stopRightDrag = (event) => {
      if (!rightDragState.current) return;

      if (event) {
        stopRightMouseEvent(event);
      }
      rightDragState.current = null;
      container.classList.remove("leaflet-dragging");
    };

    container.addEventListener("contextmenu", handleContextMenu, true);
    container.addEventListener("mousedown", handleMouseDown, true);
    container.addEventListener("auxclick", stopMiddleMouseAction, true);
    window.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("mouseup", stopRightDrag, true);
    window.addEventListener("blur", stopRightDrag);

    return () => {
      container.removeEventListener("contextmenu", handleContextMenu, true);
      container.removeEventListener("mousedown", handleMouseDown, true);
      container.removeEventListener("auxclick", stopMiddleMouseAction, true);
      window.removeEventListener("mousemove", handleMouseMove, true);
      window.removeEventListener("mouseup", stopRightDrag, true);
      window.removeEventListener("blur", stopRightDrag);
      rightDragState.current = null;
      container.classList.remove("leaflet-dragging");
    };
  }, [map]);

  useEffect(() => {
    const handleZoomEnd = () => setCurrentZoom?.(map.getZoom());
    map.on("zoomend", handleZoomEnd);
    return () => {
      map.off("zoomend", handleZoomEnd);
    };
  }, [map, setCurrentZoom]);

  useEffect(() => {
    map.on("moveend", reportViewport);
    map.on("zoomend", reportViewport);
    return () => {
      map.off("moveend", reportViewport);
      map.off("zoomend", reportViewport);
    };
  }, [map, reportViewport]);
}
