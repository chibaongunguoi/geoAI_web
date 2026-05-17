# Implementation Plan: UI Readability & Scrolling Fix

## Overview

CSS-only changes across two files to fix text contrast, map panel scrolling, dark mode adaptation, Asset Manager visual hierarchy, and Dashboard readability. Task 1 establishes the CSS variable foundation that Tasks 2–5 depend on.

## Tasks

- [x] 1. Update CSS custom properties for text contrast
  - [x] 1.1 Update light mode `--color-text-muted` from `#64748b` to `#475569` in `:root`
    - Achieves ~6.2:1 on `#f5f3ff` and ~5.7:1 on `#ffffff`
    - _Requirements: 1.1, 1.2, 5.3_
  - [x] 1.2 Update dark mode variables in `@media (prefers-color-scheme: dark)` block
    - Change `--color-control-bg` from `#ffffff` to `rgba(31, 41, 55, 0.92)`
    - Change `--color-control-text` from `#111827` to `#f1f5f9`
    - Change `--color-control-placeholder` from `#64748b` to `#94a3b8`
    - _Requirements: 2.1, 2.2_
  - [x] 1.3 Add new dark mode popover variables
    - Add `--color-popover-bg: rgba(31, 41, 55, 0.96)`
    - Add `--color-popover-text: #f1f5f9`
    - Add `--color-popover-border: rgba(148, 163, 184, 0.2)`
    - _Requirements: 2.3_
  - File: `apps/web/app/globals.css`

- [x] 2. Fix map panel scrolling
  - [x] 2.1 Add `grid-template-rows: auto minmax(0, 1fr)` to `.leftToolPopover` and `.rightToolPopover`
    - Enables fixed header + scrollable body pattern
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 2.2 Replace hardcoded colors with CSS variable fallbacks in popover selectors
    - `background` → `var(--color-popover-bg, rgba(255, 255, 255, 0.96))`
    - `color` → `var(--color-popover-text, #0f172a)`
    - `border` color → `var(--color-popover-border, rgba(15, 23, 42, 0.12))`
    - _Requirements: 2.3_
  - [x] 2.3 Add `overscroll-behavior: contain` to `.popoverBody`
    - Prevents scroll propagation to map canvas
    - _Requirements: 3.5_
  - [x] 2.4 Update mobile `@media (max-width: 760px)` block for popovers
    - Add `max-height: min(55svh, calc(100% - 140px))`
    - Add `grid-template-rows: auto minmax(0, 1fr)` to maintain scroll pattern on mobile
    - _Requirements: 6.1, 6.2_
  - File: `apps/web/components/MapWrapper.module.css`

- [x] 3. Add dark mode styles for map popovers
  - [x] 3.1 Add `@media (prefers-color-scheme: dark)` block in MapWrapper.module.css
    - Cover `.leftToolPopover`, `.rightToolPopover` with dark bg/text/border/shadow
    - Cover `.popoverHeader`, `.popoverHeader h2`, `.popoverCloseButton`
    - Cover `.topSearchForm`, `.searchInput`, `.searchIconButton`, `.searchStatus`
    - Cover `.searchChipScroller .sampleQuestionChip`
    - Cover `.leftToolRail`, `.rightToolRail`, `.mapToolButton`
    - Cover `.resultsOverlay`, `.overlayPanelHeader h2`
    - _Requirements: 2.3, 2.1_
  - File: `apps/web/components/MapWrapper.module.css`

- [x] 4. Checkpoint — Verify map panel changes
  - Ensure popover scrolling works (open Filter Panel with many items, verify scroll)
  - Ensure dark mode colors apply correctly to popovers
  - Ensure mobile popover max-height is respected
  - Ask the user if questions arise.

- [x] 5. Redesign Asset Manager filter bar
  - [x] 5.1 Update `.admin-filter-bar` with card-based styling
    - Add `border: 1px solid var(--color-border)`
    - Add `border-radius: var(--radius-md)`
    - Add `background: var(--color-surface)`
    - Add `padding: 16px`
    - Update `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))`
    - _Requirements: 4.1, 4.3_
  - [x] 5.2 Update `.admin-filter-bar label` color to `var(--color-text)`
    - Change from `var(--color-text-muted)` to `var(--color-text)`
    - Set `font-weight: 800` for visual hierarchy
    - _Requirements: 4.2, 4.4_
  - [x] 5.3 Update `.admin-filter-bar input, .admin-filter-bar select` styling
    - Change `min-height` from `38px` to `40px`
    - Change border to `1px solid var(--color-border-strong)`
    - Add `font-size: 13px` and `font-weight: 600`
    - _Requirements: 4.4_
  - [x] 5.4 Add mobile responsive rule for Asset Manager
    - Add `@media (max-width: 760px)` with `grid-template-columns: 1fr`
    - Set `min-height: 44px` on inputs/selects for touch targets
    - _Requirements: 4.5, 6.3_
  - File: `apps/web/app/globals.css`

- [x] 6. Fix Dashboard readability
  - [x] 6.1 Update `.dashboard-kpi-card span` color to `var(--color-text)`
    - Change from `var(--color-text-muted)` to full contrast color
    - Set `font-weight: 800`
    - _Requirements: 5.1, 5.2_
  - [x] 6.2 Update `.dashboard-filter-grid label` color to `var(--color-text)`
    - Change from `var(--color-text-muted)` for filter label readability
    - _Requirements: 5.1_
  - [x] 6.3 Update `.dashboard-trend li, .dashboard-history li` font size
    - Change from `12px` to `13px`
    - _Requirements: 5.3, 5.4_
  - [x] 6.4 Add mobile responsive adjustments for Dashboard
    - Add `.dashboard-kpi-card strong { font-size: 22px }` in mobile media query
    - Add `.dashboard-trend li, .dashboard-history li { font-size: 12px }` in mobile query
    - _Requirements: 6.4_
  - File: `apps/web/app/globals.css`

- [x] 7. Final checkpoint — Ensure all changes are correct
  - Verify light mode contrast: `#475569` on `#f5f3ff` ≥ 4.5:1
  - Verify dark mode contrast: `#cbd5e1` on `#111827` ≥ 4.5:1
  - Verify Asset Manager filter bar card styling and mobile stacking
  - Verify Dashboard KPI labels use full contrast color
  - Verify no regressions in existing layout
  - Ensure all tests pass, ask the user if questions arise.

## Task Dependency Graph

```json
{
  "waves": [
    { "tasks": ["1"], "description": "Establish CSS variable foundation" },
    { "tasks": ["2", "3", "5", "6"], "description": "Apply fixes using new variables (parallel)" },
    { "tasks": ["4"], "description": "Checkpoint — verify map panel changes" },
    { "tasks": ["7"], "description": "Final checkpoint — verify all changes" }
  ]
}
```

## Notes

- All changes are CSS-only — no component or JavaScript modifications required
- Task 1 is a prerequisite for Tasks 2–6 (establishes CSS variables they consume)
- Tasks 2 and 3 both modify `MapWrapper.module.css` but target different sections (layout vs dark mode block)
- Tasks 5 and 6 both modify `globals.css` but target different selectors (Asset Manager vs Dashboard)
- No property-based tests apply — this is pure UI styling; use visual regression and manual contrast verification
- CSS variable fallbacks ensure graceful degradation if variables are undefined
