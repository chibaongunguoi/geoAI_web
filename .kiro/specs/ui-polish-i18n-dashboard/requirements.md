# Requirements Document

## Introduction

This spec addresses a set of UI polish, Vietnamese localization (i18n), and performance issues in the GeoAI Đà Nẵng web application. The issues span the map workspace search bar, the operational dashboard page, navigation encoding, and district/ward query performance. The goal is to deliver a fully Vietnamese-language dashboard with improved usability, remove visual clutter from the map search area, fix character encoding in navigation, and improve perceived performance of geographic filter queries.

## Glossary

- **Dashboard**: The operational dashboard page at `/dashboard` that displays asset KPIs, charts, filters, and recent activity
- **Search_Chips**: The row of sample question suggestion buttons rendered below the map search bar in the map workspace
- **Navigation_Bar**: The top-level `<nav>` element inside `AppShell` that renders links to application pages
- **Filter_Panel**: The section of the Dashboard containing status, type, district, ward, and date range controls
- **KPI_Grid**: The section of the Dashboard displaying summary metric cards (total assets, active, inactive, etc.)
- **Chart_Grid**: The section of the Dashboard displaying bar charts grouped by status, type, district, ward, and trend
- **Activity_Section**: The "Recent activity" section at the bottom of the Dashboard showing recent user actions
- **Summary_API**: The backend endpoint `/api/dashboard/assets/summary` that aggregates asset data by district and ward
- **Semantic_Search**: The AI-powered search feature in the map workspace that interprets natural language queries

## Requirements

### Requirement 1: Remove Search Suggestion Chips

**User Story:** As a map user, I want the sample question chip row removed from the search bar area, so that the interface is cleaner and there is no visual overlap with tool panels.

#### Acceptance Criteria

1. THE Search_Chips SHALL not render in the map workspace search bar area
2. WHEN the map workspace loads, THE map workspace SHALL display only the search input form and search history without sample question chips
3. WHEN a tool popover panel is open, THE tool popover panel SHALL not overlap with any element in the top search bar area

### Requirement 2: Fix Navigation Bar Encoding

**User Story:** As a user, I want all navigation labels to display correct Vietnamese characters, so that I can read and navigate the application without confusion.

#### Acceptance Criteria

1. THE Navigation_Bar SHALL display "Tài sản" as the label for the assets page link
2. THE Navigation_Bar SHALL display all link labels using valid UTF-8 Vietnamese characters without mojibake artifacts
3. THE Navigation_Bar SHALL display "Bảng điều khiển" as the label for the dashboard page link instead of "Dashboard"

### Requirement 3: Dashboard Vietnamese Localization

**User Story:** As a Vietnamese-speaking user, I want the entire dashboard page displayed in Vietnamese, so that I can understand all labels, buttons, and headings without needing English.

#### Acceptance Criteria

1. THE Dashboard SHALL display "Bảng điều khiển" as the page subtitle and "Tổng quan tài sản" as the page heading
2. THE Filter_Panel SHALL display filter labels in Vietnamese: "Trạng thái" for status, "Loại" for type, "Quận/huyện" for district, "Phường/xã" for ward, "Từ ngày" for updated-from, "Đến ngày" for updated-to
3. THE Filter_Panel SHALL display filter option values in Vietnamese: "Tất cả" for all, "Đang hoạt động" for active, "Không hoạt động" for inactive, "Cần xem xét" for review, "Lưu trữ" for archived
4. THE Dashboard SHALL display action buttons in Vietnamese: "Áp dụng" for apply, "Đặt lại" for reset, "Làm mới" for refresh, "Xuất JSON" for export JSON, "Xuất CSV" for export CSV, "Xem trên bản đồ" for view on map
5. THE Dashboard SHALL display "Tự động làm mới" as the auto-refresh checkbox label
6. THE KPI_Grid SHALL display card labels in Vietnamese: "Tổng tài sản" for total assets, "Đang hoạt động" for active, "Không hoạt động" for inactive, "Cần xem xét" for review, "Cập nhật gần đây" for recently updated, "Thiếu tọa độ" for missing geometry
7. THE Chart_Grid SHALL display section headings in Vietnamese: "Trạng thái" for status, "Loại" for type, "Quận/huyện" for district, "Phường/xã" for ward, "Xu hướng cập nhật" for updated trend
8. THE Chart_Grid SHALL display "Không có dữ liệu" when a chart section has no data items
9. THE Activity_Section SHALL display "Hoạt động gần đây" as its heading
10. THE KPI_Grid SHALL format numbers using Vietnamese locale ("vi-VN") for thousand separators

### Requirement 4: Dashboard Filter UI Redesign

**User Story:** As a dashboard user, I want the filter controls and action buttons to be visually distinct and easy to interact with, so that I can quickly apply filters and perform actions.

#### Acceptance Criteria

1. THE Filter_Panel SHALL render filter controls in a responsive grid layout with adequate spacing between each control (minimum 12px gap)
2. THE Filter_Panel SHALL render each filter input and select element with a visible border, background color, and minimum height of 40px for comfortable interaction
3. THE Dashboard SHALL render action buttons as visually distinct styled buttons with background color, border-radius, and padding rather than plain text links
4. THE Dashboard SHALL visually group primary actions (apply, reset, refresh) separately from export actions (export JSON, export CSV) and navigation actions (view on map)
5. WHEN the viewport width is below 768px, THE Filter_Panel SHALL stack filter controls vertically in a single column layout

### Requirement 5: Dashboard Chart Readability

**User Story:** As a dashboard user, I want the bar charts to be easy to read with clear labels and proportional bars, so that I can quickly understand the data distribution.

#### Acceptance Criteria

1. THE Chart_Grid SHALL render each bar with a minimum visible width of 6% and a distinct background color that contrasts with the chart background
2. THE Chart_Grid SHALL display the label text and count value for each bar with sufficient font size (minimum 12px for labels, minimum 13px for counts)
3. THE Activity_Section SHALL render with sufficient contrast and font size (minimum 13px) to be clearly visible against the page background

### Requirement 6: District and Ward Query Performance

**User Story:** As a dashboard user, I want district and ward aggregation queries to respond within an acceptable time, so that the dashboard loads without noticeable delay.

#### Acceptance Criteria

1. WHEN the Summary_API receives a request, THE Summary_API SHALL return a response within 3 seconds under normal load conditions
2. WHEN the Summary_API has been called with the same filter parameters within the last 60 seconds, THE Summary_API SHALL serve the response from a cache layer instead of re-querying the database
3. WHILE the Dashboard is loading summary data, THE Dashboard SHALL display a loading indicator to inform the user that data is being fetched
4. IF the Summary_API response exceeds 5 seconds, THEN THE Dashboard SHALL display a timeout message and offer a retry button

### Requirement 7: Semantic Search User Guidance

**User Story:** As a map user, I want clear guidance on what the semantic search supports, so that I can form effective queries and understand the search limitations.

#### Acceptance Criteria

1. THE Semantic_Search input SHALL display Vietnamese placeholder text explaining supported query types (e.g., "Tìm tài sản theo tên, địa chỉ, quận/huyện...")
2. WHEN the search input is focused and empty, THE Semantic_Search SHALL display a help tooltip or hint panel listing example queries and known limitations
3. WHEN the Semantic_Search returns zero results, THE Semantic_Search SHALL display a message suggesting alternative query formats or explaining what is not supported
