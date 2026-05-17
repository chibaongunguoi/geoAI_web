# Implementation Plan: UI Polish & i18n Dashboard

## Overview

This plan implements Vietnamese localization, UI cleanup, CSS improvements, performance caching, and search guidance across the GeoAI Đà Nẵng web application. Tasks are ordered so foundational changes (navigation fix, string replacements) come first, followed by styling, performance, and search enhancements. Each task targets specific files and builds incrementally toward a fully localized, polished dashboard.

## Tasks

- [ ] 1. Fix navigation bar encoding and labels
  - [ ] 1.1 Fix mojibake and translate navigation labels in auth-client.js
    - Replace `"TÃ i sáº£n"` (or similar mojibake) with `"Tài sản"` for the assets link
    - Replace `"Dashboard"` with `"Bảng điều khiển"` for the dashboard link
    - Verify all navigation items use valid UTF-8 Vietnamese characters
    - File: `apps/web/src/features/auth/auth-client.js`
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2. Translate Dashboard components to Vietnamese
  - [ ] 2.1 Translate DashboardClient headings and states
    - Replace `"Operational dashboard"` → `"Bảng điều khiển"`
    - Replace `"Asset overview"` → `"Tổng quan tài sản"`
    - Replace `"Loading"` → `"Đang tải"`
    - Replace `"No assets match the current filters."` → `"Không có tài sản nào phù hợp với bộ lọc hiện tại."`
    - Replace `"Recent activity"` → `"Hoạt động gần đây"`
    - Replace `"No recent dashboard actions."` → `"Chưa có hoạt động nào gần đây."`
    - File: `apps/web/src/features/dashboard/DashboardClient.js`
    - _Requirements: 3.1, 3.9_

  - [ ] 2.2 Translate DashboardFilters labels, options, and buttons
    - Replace all filter labels with Vietnamese: "Trạng thái", "Loại", "Quận/huyện", "Phường/xã", "Từ ngày", "Đến ngày"
    - Replace filter option values: "Tất cả", "Đang hoạt động", "Không hoạt động", "Cần xem xét", "Lưu trữ"
    - Replace button text: "Áp dụng", "Đặt lại", "Làm mới", "Xuất JSON", "Xuất CSV", "Xem trên bản đồ"
    - Replace auto-refresh label: "Tự động làm mới"
    - Group buttons into three divs: `dashboard-action-primary`, `dashboard-action-export`, `dashboard-action-nav`
    - File: `apps/web/src/features/dashboard/DashboardFilters.js`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.4_

  - [ ] 2.3 Translate DashboardKpis labels and fix number formatting
    - Replace KPI_ITEMS labels: "Tổng tài sản", "Đang hoạt động", "Không hoạt động", "Cần xem xét", "Cập nhật gần đây", "Thiếu tọa độ"
    - Change `toLocaleString("en-US")` → `toLocaleString("vi-VN")`
    - File: `apps/web/src/features/dashboard/DashboardKpis.js`
    - _Requirements: 3.6, 3.10_

  - [ ] 2.4 Translate DashboardCharts headings
    - Replace chart group titles: "Trạng thái", "Loại", "Quận/huyện", "Phường/xã", "Xu hướng cập nhật"
    - Replace `"No data"` → `"Không có dữ liệu"`
    - File: `apps/web/src/features/dashboard/DashboardCharts.js`
    - _Requirements: 3.7, 3.8_

- [ ] 3. Checkpoint - Verify localization changes
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Update Dashboard filter and button CSS styling
  - [ ] 4.1 Add filter grid, button group, and responsive styles to globals.css
    - Update `.dashboard-filter-grid` gap to 12px
    - Update `.dashboard-filter-grid input, select` min-height to 40px with border, background, border-radius
    - Add `.dashboard-action-grid` flex container styles
    - Add `.dashboard-action-primary`, `.dashboard-action-export`, `.dashboard-action-nav` group styles with distinct background colors
    - Add `.dashboard-timeout` warning box styles
    - Increase `.dashboard-bars button span` font-size to 12px minimum
    - Increase `.dashboard-bars button strong` font-size to 13px minimum
    - Increase `.dashboard-history li` font-size to 13px
    - Add `@media (max-width: 768px)` rule for single-column filter stacking
    - File: `apps/web/app/globals.css`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

- [ ] 5. Add timeout handling to Dashboard fetch
  - [ ] 5.1 Implement AbortController with 5s timeout in DashboardClient
    - Wrap the fetch call in `loadSummary` with an `AbortController`
    - Set a 5-second timeout via `setTimeout(() => controller.abort(), 5000)`
    - Add `status` state to track timeout vs error
    - Render timeout UI with Vietnamese message and retry button when `status === "timeout"`
    - Render generic error message for non-timeout failures
    - File: `apps/web/src/features/dashboard/DashboardClient.js`
    - _Requirements: 6.3, 6.4_

- [ ] 6. Add in-memory caching to Summary API route
  - [x] 6.1 Implement cache with 60s TTL in summary route handler
    - Add a module-level `Map` for caching responses
    - Use query string as cache key
    - On cache hit within 60s, return cached JSON with `X-Cache: HIT` header
    - On cache miss or expiry, proxy to upstream API and store result with `X-Cache: MISS` header
    - File: `apps/web/app/api/dashboard/assets/summary/route.js`
    - _Requirements: 6.1, 6.2_

- [ ] 7. Remove search chips and add search guidance
  - [ ] 7.1 Remove search suggestion chips from MapTopSearchBar
    - Remove the `searchChipScroller` div and all `sampleQuestionChip` button rendering
    - Remove or ignore the `sampleQueries` prop
    - Update `TEXT.placeholder` to `"Tìm tài sản theo tên, địa chỉ, quận/huyện..."`
    - File: `apps/web/components/map-workspace/MapTopSearchBar.js`
    - _Requirements: 1.1, 1.2, 1.3, 7.1_

  - [ ] 7.2 Add focus hint panel and zero-results message
    - Add `TEXT.noResults`, `TEXT.hintTitle`, and `TEXT.hints` array to the TEXT constant
    - Render a `searchHintPanel` div below the search form when input is focused and empty, showing example queries
    - Render a `searchNoResults` paragraph when search returns zero results
    - Add corresponding CSS styles to `MapWrapper.module.css` for `.searchHintPanel` and `.searchNoResults`
    - Files: `apps/web/components/map-workspace/MapTopSearchBar.js`, `apps/web/components/map-workspace/MapWrapper.module.css`
    - _Requirements: 7.2, 7.3_

- [ ] 8. Final checkpoint - Build verification
  - Run `npm run build` to verify no compilation errors
  - Run `npm test` to verify existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- No property-based tests are included because this feature involves static string replacements, CSS styling, and simple TTL caching — none of which have complex input spaces suitable for PBT
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design uses JavaScript throughout; no language selection was needed
- All changes are localized to existing files with no new components or architectural patterns introduced

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.3", "2.4", "6.1"] },
    { "id": 1, "tasks": ["2.2", "7.1"] },
    { "id": 2, "tasks": ["4.1", "5.1", "7.2"] }
  ]
}
```
