# Requirements Document

## Introduction

The GeoAI web application has multiple UI readability and usability issues across its pages. Text contrast is insufficient in both light and dark modes, map tool panels overflow without scrolling, the Asset Manager page has poor visual hierarchy, and the Dashboard suffers from similar contrast problems. This spec addresses all these issues to bring the UI up to WCAG AA compliance and ensure usability on both desktop and mobile viewports.

## Glossary

- **Application**: The GeoAI Next.js web application
- **CSS_Variables**: The custom properties defined in `globals.css` that control theming (colors, spacing, shadows) for light and dark modes
- **Map_Panel**: A popover panel (filter, layer, or basemap) that appears over the map canvas when a tool button is activated
- **Filter_Panel**: The advanced filter panel component (`FilterPanel.js`) displayed inside a Map_Panel popover
- **Layer_Panel**: The layer management panel component (`LayerPanel.js`) displayed inside a Map_Panel popover
- **Asset_Manager**: The asset listing page (`/assets`) with its filter bar and data table
- **Dashboard**: The operational dashboard page showing KPIs, charts, and filters
- **WCAG_AA**: Web Content Accessibility Guidelines level AA, requiring 4.5:1 contrast ratio for normal text and 3:1 for large text (18px+ bold or 24px+ regular)
- **Popover_Container**: The `.leftToolPopover` / `.rightToolPopover` elements in `MapWrapper.module.css` that host Map_Panels

## Requirements

### Requirement 1: Text Readability in Light Mode

**User Story:** As a user viewing the application in light mode, I want all text to have sufficient contrast against its background, so that I can read labels, descriptions, and data without straining.

#### Acceptance Criteria

1. THE Application SHALL use a `--color-text-muted` value in light mode that achieves at least 4.5:1 contrast ratio against `--color-page` and `--color-surface` backgrounds
2. WHEN labels are rendered in the Filter_Panel, Layer_Panel, or Asset_Manager, THE Application SHALL display them with a minimum contrast ratio of 4.5:1 against their immediate background
3. THE Application SHALL not use hardcoded color values below 4.5:1 contrast ratio for any text element in the map search bar, tool popovers, or chip components
4. WHEN the Dashboard renders KPI labels, chart axis text, or section headings, THE Application SHALL ensure all text meets WCAG_AA contrast requirements against the card or page background

### Requirement 2: Text Readability in Dark Mode

**User Story:** As a user viewing the application in dark mode, I want all text to be clearly readable, so that I can use the application comfortably in low-light environments.

#### Acceptance Criteria

1. THE Application SHALL use a `--color-text-muted` value in dark mode that achieves at least 4.5:1 contrast ratio against `--color-page` and `--color-surface` backgrounds
2. WHEN form controls (inputs, selects) are rendered in dark mode, THE Application SHALL display their text with sufficient contrast against the control background
3. IF the map popover panels use hardcoded light-theme colors, THEN THE Application SHALL replace them with CSS_Variables that adapt to the current color scheme
4. WHEN the Asset_Manager is viewed in dark mode, THE Application SHALL render all filter labels and table text with at least 4.5:1 contrast ratio

### Requirement 3: Map Panel Scrolling

**User Story:** As a user interacting with map tool panels, I want panels to scroll when their content exceeds the available viewport height, so that I can access all controls without content being cut off.

#### Acceptance Criteria

1. WHEN the Filter_Panel content exceeds the Popover_Container height, THE Popover_Container SHALL allow vertical scrolling to reveal all content
2. WHEN the Layer_Panel content exceeds the Popover_Container height, THE Popover_Container SHALL allow vertical scrolling to reveal all content
3. THE Popover_Container SHALL constrain its maximum height to prevent extending beyond the viewport boundaries
4. WHILE a Map_Panel is open, THE Application SHALL prevent the panel from overlapping other open panels or the map tool rails
5. WHEN the user scrolls inside a Map_Panel, THE Application SHALL not propagate the scroll event to the map canvas beneath

### Requirement 4: Asset Manager Usability

**User Story:** As an administrator managing assets, I want the filter bar to have clear visual hierarchy and readable labels, so that I can quickly find and apply the filters I need.

#### Acceptance Criteria

1. THE Asset_Manager filter bar SHALL group related filter controls using card-based visual containers with distinct borders and backgrounds
2. THE Asset_Manager filter bar SHALL display all labels with at least 4.5:1 contrast ratio in both light and dark modes
3. WHEN the filter bar contains more controls than fit in the viewport width, THE Asset_Manager SHALL wrap controls into multiple rows with consistent spacing
4. THE Asset_Manager filter bar SHALL use a visual hierarchy where labels are visually distinct from input values (different font weight or size)
5. WHEN viewed on screens narrower than 760px, THE Asset_Manager filter bar SHALL stack controls vertically with full-width inputs

### Requirement 5: Dashboard Readability

**User Story:** As a user viewing the operational dashboard, I want all KPI values, chart labels, and section text to be clearly readable, so that I can quickly understand the data being presented.

#### Acceptance Criteria

1. THE Dashboard SHALL render KPI card labels using a color with at least 4.5:1 contrast ratio against the card background in both themes
2. THE Dashboard SHALL render KPI values and chart text using `--color-text` rather than `--color-text-muted` for primary data
3. WHEN the Dashboard displays muted or secondary text, THE Application SHALL use the updated `--color-text-muted` value that meets WCAG_AA requirements
4. THE Dashboard history section SHALL display timestamps and action labels with sufficient contrast in both light and dark modes

### Requirement 6: Responsive Behavior

**User Story:** As a mobile user, I want all UI fixes to work correctly on small screens, so that I can use the application on my phone without layout issues.

#### Acceptance Criteria

1. WHEN viewed on screens narrower than 760px, THE Map_Panel popovers SHALL resize to fill available width with appropriate margins
2. WHEN viewed on screens narrower than 760px, THE Map_Panel popovers SHALL have a maximum height that leaves room for the tool rail and does not cover the entire screen
3. WHEN the Asset_Manager is viewed on mobile, THE Application SHALL display the filter bar as a single-column stacked layout with touch-friendly input sizes (minimum 44px tap targets)
4. WHEN the Dashboard is viewed on mobile, THE Application SHALL maintain readable text sizes (minimum 12px for secondary text, 14px for primary text)
