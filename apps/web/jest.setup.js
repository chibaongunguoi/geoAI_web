require("@testing-library/jest-dom");

jest.mock("react-leaflet", () => {
  const React = require("react");
  const MockComponent = ({ children }) => React.createElement("div", null, children);
  return {
    MapContainer: MockComponent,
    TileLayer: MockComponent,
    Marker: MockComponent,
    Popup: MockComponent,
    ZoomControl: MockComponent,
    Polygon: MockComponent,
    Polyline: MockComponent,
    Rectangle: MockComponent,
    Circle: MockComponent,
    CircleMarker: MockComponent,
    FeatureGroup: MockComponent,
    LayerGroup: MockComponent,
    Pane: MockComponent,
    GeoJSON: MockComponent,
    useMap: () => ({
      setView: jest.fn(),
      flyTo: jest.fn(),
      getZoom: () => 10,
      on: jest.fn(),
      off: jest.fn(),
      fitBounds: jest.fn(),
      invalidateSize: jest.fn(),
      getCenter: () => ({ lat: 0, lng: 0 })
    }),
    useMapEvents: () => ({}),
    useMapEvent: () => ({})
  };
});
