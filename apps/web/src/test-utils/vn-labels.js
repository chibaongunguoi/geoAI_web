/**
 * Shared Vietnamese UI-label constants for web tests.
 *
 * Tests should import from here instead of hardcoding Vietnamese strings
 * or English regex matchers that no longer match the shipped UI.
 *
 * Used by:
 *   - src/features/measurement/MeasurementToolbar.test.js
 *   - components/__tests__/MapWrapperMeasurement.test.js
 *   - src/features/map/LayerPanel.test.js
 *
 * Rule of three satisfied: a single source of truth prevents drift
 * when the UI copy changes in one place but a test elsewhere lags behind.
 */

// Measurement toolbar button labels (matches apps/web/src/features/measurement/MeasurementToolbar.js).
export const MEASUREMENT_LABELS = Object.freeze({
  distance: /Đo khoảng cách/,
  area: /Đo diện tích/,
  idle: /Tắt đo/,
  undo: /Hoàn tác/,
  // Exact match so we do not also hit aria-label "Xóa phép đo" in history translations.
  clear: /^Xóa$/,
  copy: /^Sao chép$/,
  save: /^Lưu$/,
  exportJson: /Xuất JSON/,
  snap: /Bám vào điểm tài sản/,
  // CollapsibleSection title for the measurement toolbar in MapWrapper.
  sectionTitle: "Đo khoảng cách/diện tích",
});

// LayerPanel history action translations (matches HISTORY_ACTION_LABELS in LayerPanel.js).
export const LAYER_HISTORY_LABELS = Object.freeze({
  "map.layers.config.update": "Cập nhật cấu hình lớp",
  "map.layers.config.export": "Xuất cấu hình lớp",
});

// LayerPanel group labels (matches DATA_LAYERS.group in apps/web/src/features/map/layers.js).
export const LAYER_GROUP_LABELS = Object.freeze({
  basemap: "Nền bản đồ",
  assets: "Tài sản",
  external: "Dữ liệu ngoài",
  geoai: "GeoAI",
});
