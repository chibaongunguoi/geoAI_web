# Implementation Plan: Overture POI Integration

## Overview

This plan implements the Overture Maps POI (Places) integration for GeoAI Đà Nẵng. The implementation proceeds in layers: data model first, then backend services (NestJS POI module + Python Flask importer), then frontend components (search, markers, popups, conversion). Each step builds incrementally on the previous, with property-based tests validating correctness properties from the design.

## Tasks

- [x] 1. Set up Place data model and POI module structure
  - [x] 1.1 Add Place model to Prisma schema and run migration
    - Add the `Place` model to `apps/api/prisma/schema.prisma` with all fields: id, overtureId (unique), name, category, subcategories (Json), address, street, ward, district, city, latitude, longitude, geometry (Json), confidence, source, sourceVersion, createdAt, updatedAt
    - Add indexes on `category` and `[city, district, ward]`
    - Run `npx prisma migrate dev` to generate the migration
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Create POI module scaffolding in NestJS
    - Create directory `apps/api/src/poi/`
    - Create `poi.module.ts` with imports for PrismaModule, controller, service, and CategoryMapper provider
    - Create empty `poi.controller.ts`, `poi.service.ts`, and `category-mapper.ts` files with class stubs
    - Register PoiModule in the app module imports
    - _Requirements: 1.1_

- [x] 2. Implement Category Mapper
  - [x] 2.1 Implement CategoryMapper class with Vietnamese taxonomy
    - Create `apps/api/src/poi/category-mapper.ts` with the full static mapping (restaurant, cafe, school, hospital, pharmacy, bank, hotel, supermarket, gas_station, temple, bar, clinic, kindergarten, university, market, convenience_store, atm, post_office, police, fire_station)
    - Implement `findCategories(keyword: string): string[]` — case-insensitive substring match against both Vietnamese labels and English identifiers
    - Implement `getVietnameseLabel(category: string): string` — returns Vietnamese label or original string if unmapped
    - Mark class as `@Injectable()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 2.2 Write property test: Category mapper round-trip (Property 4)
    - **Property 4: Category mapper round-trip**
    - For any category identifier in the mapping, `getVietnameseLabel(category)` → `findCategories(label)` returns a set including the original category
    - Use fast-check to generate category keys from the known mapping
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 2.3 Write property test: Unknown category fallback identity (Property 5)
    - **Property 5: Unknown category fallback identity**
    - For any string NOT in the category mapping, `getVietnameseLabel(unknownString)` returns the input unchanged
    - Use fast-check `fc.string()` filtered to exclude known category keys
    - **Validates: Requirements 3.4**

- [x] 3. Implement POI Service — Import functionality
  - [x] 3.1 Implement POI Service import method
    - Create `apps/api/src/poi/poi.service.ts` with `@Injectable()` decorator
    - Inject PrismaService and CategoryMapper
    - Implement `importPlaces(features: PoiImportFeature[], sourceVersion?: string): Promise<PoiImportSummary>`
    - Upsert logic: use `prisma.place.upsert()` with overtureId as the where clause
    - Skip records with null, empty, or invalid geometry (malformed coordinates, wrong projection), increment `skipped` count
    - Return `{ created, updated, skipped }` summary where created + updated + skipped = input count
    - _Requirements: 2.3, 2.4, 2.6, 2.7_

  - [ ]* 3.2 Write property test: Import upsert idempotence (Property 1)
    - **Property 1: Import upsert idempotence**
    - For any valid set of POI features, importing twice results in exactly one Place per unique overtureId with values from the latest import
    - Use fast-check to generate arrays of PoiImportFeature objects with random overtureIds
    - Mock PrismaService to track upsert calls
    - **Validates: Requirements 2.3, 2.4**

  - [ ]* 3.3 Write property test: Import summary count invariant (Property 2)
    - **Property 2: Import summary count invariant**
    - For any batch of features, `created + updated + skipped = total input count`
    - Use fast-check to generate mixed batches (some valid, some with null geometry)
    - **Validates: Requirements 2.7, 2.6**

- [x] 4. Implement POI Service — Search functionality
  - [x] 4.1 Implement POI Service search method
    - Implement `searchByCategory(query: PoiSearchQuery): Promise<PoiSearchResult>`
    - Use CategoryMapper.findCategories() to resolve query to category IDs
    - Query Place table with category filter (case-insensitive contains on category field)
    - Apply viewport bounds filter when south/west/north/east are provided
    - Enforce max 200 results via `take: Math.min(limit || 200, 200)`, ordered by confidence descending
    - Return items with fields: id, name, category, vietnameseCategory, latitude, longitude, address, street
    - Return `{ items: [], total: 0 }` for empty query string
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 4.2 Write property test: Search result invariants (Property 6)
    - **Property 6: Search result invariants**
    - For any search with bounding box: (a) items match query via category, (b) lat/lng within bounds, (c) count ≤ 200, (d) each item has required fields
    - Use fast-check to generate bounding boxes and seed Place records
    - **Validates: Requirements 4.1, 4.2, 4.4, 4.5**

- [x] 5. Implement POI Service — Conversion functionality
  - [x] 5.1 Implement POI-to-asset conversion method
    - Implement `convertToAsset(placeId: string, actorUserId: string): Promise<ConvertResult>`
    - Look up Place by id, throw NotFoundException if not found
    - Check if BuildingProperty with same overtureId exists, throw ConflictException if duplicate
    - Create BuildingProperty with mapped fields: name, street, ward, district, city, centroidLat, centroidLng, geometry, source="overture-places", propertyType="poi"
    - Generate unique code using existing `formatCode(count + 1)` pattern
    - Create AuditLog entry with action="poi_to_asset", entityType="BuildingProperty", entityId=new record ID
    - Return `{ success: true, assetId, assetCode }`
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

  - [ ]* 5.2 Write property test: POI-to-asset conversion correctness (Property 10)
    - **Property 10: POI-to-asset conversion correctness**
    - For any valid Place, conversion creates BuildingProperty with correct field mapping and AuditLog entry
    - Use fast-check to generate Place objects with random valid data
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.6**

  - [ ]* 5.3 Write property test: Duplicate conversion prevention (Property 11)
    - **Property 11: Duplicate conversion prevention**
    - For any Place already converted, attempting conversion again returns error and creates no new record
    - **Validates: Requirements 7.5**

- [x] 6. Implement POI Controller
  - [x] 6.1 Create POI Controller with all endpoints
    - Create `apps/api/src/poi/poi.controller.ts`
    - Implement `GET /poi/search` with query params: q, south, west, north, east, limit — delegates to PoiService.searchByCategory()
    - Implement `POST /poi/import` with body validation — delegates to PoiService.importPlaces()
    - Implement `POST /poi/convert/:placeId` — extracts user from request, delegates to PoiService.convertToAsset()
    - Add `@UseGuards(JwtAuthGuard, PermissionsGuard)` and appropriate `@RequirePermissions()` decorators
    - Create DTO classes for request validation (PoiSearchQueryDto, PoiImportPayloadDto)
    - _Requirements: 4.1, 2.3, 7.1_

- [x] 7. Checkpoint - Backend API complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Python Flask POI Importer
  - [x] 8.1 Add POI extraction route to geoai_backend.py
    - Add `@app.route('/api/poi/extract', methods=['POST'])` to `geoai_backend.py`
    - Read the `places` layer from the Overture GeoPackage using GeoPandas/Fiona
    - Filter features within Đà Nẵng bounding box (lon: 107.82–108.35, lat: 15.88–16.20)
    - Extract fields: id → overtureId, names.primary → name, categories.primary → category, categories.alternate → subcategories, addresses[0].freeform → address, addresses[0].locality → district, confidence, geometry (as GeoJSON Point)
    - Return error if `places` layer not found in GeoPackage
    - Skip records with null, empty, or invalid geometry (malformed coordinates, wrong projection)
    - Return JSON array of extracted features
    - _Requirements: 2.1, 2.2, 2.5, 2.6_

- [x] 9. Implement Frontend POI Search Panel
  - [x] 9.1 Create PoiSearchPanel component
    - Create `apps/web/src/features/poi/PoiSearchPanel.js`
    - Implement category search input with Vietnamese placeholder text ("Tìm kiếm địa điểm...")
    - On submit, call `GET /poi/search?q=...&south=...&west=...&north=...&east=...` with current map viewport bounds
    - Display result count below search input
    - Handle loading state and error state (toast: "Không thể tìm kiếm. Vui lòng thử lại.")
    - On clear, emit event to remove POI markers from map
    - Read the relevant Next.js guide in `node_modules/next/dist/docs/` before writing component code
    - _Requirements: 4.1, 5.4, 5.5_

- [x] 10. Implement Frontend POI Markers
  - [x] 10.1 Create POI marker utilities and map layer
    - Create `apps/web/src/features/poi/poi-markers.js`
    - Implement marker icon creation by category group with color mapping: food/drink→orange, education→blue, health→red, shopping→green, services→purple
    - Implement cluster icon creation for groups of 100+ markers using Leaflet.markercluster pattern
    - Integrate with existing map component to render POI markers from search results
    - Update markers when map viewport changes (pan/zoom) while search is active
    - _Requirements: 5.1, 5.2, 5.3, 5.6_

  - [ ]* 10.2 Write unit tests for POI marker utilities
    - Test marker icon creation returns correct color for each category group
    - Test cluster threshold behavior (100+ markers triggers clustering)
    - Test marker positioning matches input coordinates
    - _Requirements: 5.1, 5.3, 5.6_

- [x] 11. Implement Frontend POI Popup and Conversion
  - [x] 11.1 Create PoiPopup component
    - Create `apps/web/src/features/poi/PoiPopup.js`
    - Display: place name, Vietnamese category label, address/street/district (with fallback logic), and "Thêm vào tài sản" button
    - Address fallback: show address if non-null → else show street if non-null → else show district only
    - On "Thêm vào tài sản" click, call `POST /poi/convert/:placeId`
    - On success, show toast "Đã thêm vào tài sản" with asset code
    - On error (409 conflict), show toast with error message "POI đã được thêm vào tài sản"
    - Close popup on outside click, close button, map losing focus, or user navigating away from the page
    - Read the relevant Next.js guide in `node_modules/next/dist/docs/` before writing component code
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.4, 7.5_

  - [ ]* 11.2 Write property test: Popup content with address fallback (Property 9)
    - **Property 9: Popup content with address fallback**
    - For any Place object, popup shows name + Vietnamese category + district; address display follows fallback chain (address → street → district)
    - Use fast-check to generate Place objects with various null/non-null address/street combinations
    - **Validates: Requirements 6.2, 6.4**

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The Python Flask importer (task 8) is independent of frontend work and can proceed in parallel with tasks 9-11
- Frontend tasks (9, 10, 11) must read the Next.js guide in `node_modules/next/dist/docs/` before writing code due to breaking changes in this version

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 5, "tasks": ["4.2", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 7, "tasks": ["8.1", "9.1"] },
    { "id": 8, "tasks": ["10.1"] },
    { "id": 9, "tasks": ["10.2", "11.1"] },
    { "id": 10, "tasks": ["11.2"] }
  ]
}
```
