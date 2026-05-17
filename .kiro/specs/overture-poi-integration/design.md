# Design Document: Overture POI Integration

## Overview

This feature adds Overture Maps POI (Places) data to the GeoAI Đà Nẵng application, enabling users to discover restaurants, cafes, schools, hospitals, and other points of interest through category-based search with Vietnamese language support. POIs are displayed as clustered markers on the Leaflet map with detail popups, and can be converted into BuildingProperty assets for tracking alongside existing infrastructure data.

The system introduces a new `Place` model (separate from `BuildingProperty`), a Python Flask importer for reading Overture GeoPackage `places` layer data, a Vietnamese category taxonomy mapper, and a NestJS POI service for search and conversion operations.

### Key Design Decisions

1. **Separate Place model** rather than reusing BuildingProperty — POIs have distinct fields (category, subcategories, confidence) and different query patterns (category search, viewport filtering). Keeping them separate avoids polluting the existing asset table and allows independent indexing.

2. **Python Flask for import, NestJS for runtime queries** — The existing architecture already uses Python Flask (`geoai_backend.py`) for geospatial data processing (GeoPackage reading via GeoPandas/Fiona) and NestJS for API serving. We follow this pattern: POI_Importer reads the GeoPackage in Python, then pushes records to the NestJS API for persistence.

3. **Client-side marker clustering** via `react-leaflet` with Leaflet.markercluster — The existing map already implements custom clustering logic for assets. POI clustering follows the same pattern but with a 100-marker threshold.

4. **Vietnamese category mapping as a static utility** — The category taxonomy is a fixed mapping that changes infrequently. A simple in-memory lookup (JSON object) in the NestJS service is sufficient; no database table needed.

## Architecture

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        MapUI[Map_UI - Leaflet Map]
        SearchBar[POI Category Search Bar]
        Popup[POI Detail Popup]
    end

    subgraph "Backend (NestJS)"
        POIController[POI Controller]
        POIService[POI_Service]
        CategoryMapper[Category_Mapper]
        PropertiesService[Properties Service]
    end

    subgraph "Backend (Python Flask)"
        POIImporter[POI_Importer]
        GeoPackage[(Overture GeoPackage)]
    end

    subgraph "Database (SQLite)"
        PlaceTable[(Place Table)]
        BuildingPropertyTable[(BuildingProperty Table)]
        AuditLogTable[(AuditLog Table)]
    end

    SearchBar -->|category query + viewport| POIController
    POIController --> POIService
    POIService --> CategoryMapper
    POIService --> PlaceTable
    POIService --> PropertiesService
    PropertiesService --> BuildingPropertyTable
    PropertiesService --> AuditLogTable

    POIImporter -->|read places layer| GeoPackage
    POIImporter -->|POST /poi/import| POIController
    POIController --> POIService
    POIService -->|upsert| PlaceTable

    MapUI -->|display markers| SearchBar
    MapUI --> Popup
    Popup -->|"Thêm vào tài sản"| POIController
end
```

### Data Flow

1. **Import Flow**: Admin triggers import → Python Flask reads GeoPackage `places` layer → extracts features within Đà Nẵng bbox → POSTs batch to NestJS `/poi/import` → POI_Service upserts into Place table → returns summary.

2. **Search Flow**: User types category keyword → frontend calls `GET /poi/search?q=...&bounds=...` → POI_Service uses Category_Mapper to resolve Vietnamese/English → queries Place table with category + viewport filter → ranks by confidence descending → returns max 200 results → frontend renders markers.

3. **Conversion Flow**: User clicks "Thêm vào tài sản" in popup → frontend calls `POST /poi/convert/:placeId` → POI_Service checks for duplicate overtureId in BuildingProperty → if no duplicate, creates BuildingProperty from Place data → creates AuditLog entry → returns success with asset code.

## Components and Interfaces

### 1. Place Prisma Model

New model added to `apps/api/prisma/schema.prisma`:

```prisma
model Place {
  id             String   @id @default(cuid())
  overtureId     String   @unique
  name           String
  category       String
  subcategories  Json     @default("[]")
  address        String?
  street         String?
  ward           String?
  district       String?
  city           String   @default("Da Nang")
  latitude       Float
  longitude      Float
  geometry       Json
  confidence     Float    @default(0)
  source         String   @default("overture-places")
  sourceVersion  String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([category])
  @@index([city, district, ward])
}
```

### 2. POI Module (NestJS)

**File**: `apps/api/src/poi/poi.module.ts`

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [PoiController],
  providers: [PoiService, CategoryMapper],
  exports: [PoiService]
})
export class PoiModule {}
```

### 3. POI Controller

**File**: `apps/api/src/poi/poi.controller.ts`

```typescript
@Controller("poi")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PoiController {
  // GET /poi/search?q=<keyword>&south=&west=&north=&east=&limit=200
  @Get("search")
  @RequirePermissions("search.use")
  searchByCategory(@Query() query: PoiSearchQuery): Promise<PoiSearchResult>

  // POST /poi/import
  @Post("import")
  @RequirePermissions("properties.import")
  importPlaces(@Body() body: PoiImportPayload): Promise<PoiImportSummary>

  // POST /poi/convert/:placeId
  @Post("convert/:placeId")
  @RequirePermissions("properties.manage")
  convertToAsset(@Param("placeId") placeId: string, @Req() req): Promise<ConvertResult>
}
```

### 4. POI Service

**File**: `apps/api/src/poi/poi.service.ts`

```typescript
export interface PoiSearchQuery {
  q: string;
  south?: number;
  west?: number;
  north?: number;
  east?: number;
  limit?: number;
}

export interface PoiSearchResult {
  items: PoiSearchItem[];
  total: number;
}

export interface PoiSearchItem {
  id: string;
  name: string;
  category: string;
  vietnameseCategory: string;
  latitude: number;
  longitude: number;
  address: string | null;
  street: string | null;
}

export interface PoiImportSummary {
  created: number;
  updated: number;
  skipped: number;
}

export interface ConvertResult {
  success: boolean;
  assetId: string;
  assetCode: string;
}
```

Key methods:
- `searchByCategory(query: PoiSearchQuery)`: Resolves category via CategoryMapper, queries Place table with viewport bounds, ranks results by confidence score descending, returns max 200 results.
- `importPlaces(features: PoiImportFeature[])`: Upserts features into Place table using overtureId as match key.
- `convertToAsset(placeId: string, actorUserId: string)`: Checks for existing BuildingProperty with same overtureId first; if none exists, creates BuildingProperty from Place, generates code, writes AuditLog.

### 5. Category Mapper

**File**: `apps/api/src/poi/category-mapper.ts`

```typescript
export class CategoryMapper {
  // Static mapping: Overture category → Vietnamese label
  private readonly categoryMap: Record<string, string>;

  // Returns all Overture category IDs matching a Vietnamese or English keyword
  findCategories(keyword: string): string[]

  // Returns Vietnamese label for an Overture category ID
  getVietnameseLabel(category: string): string
}
```

The mapping covers at minimum: restaurant, cafe, school, hospital, pharmacy, bank, hotel, supermarket, gas_station, temple — plus additional common categories.

### 6. POI Importer (Python Flask)

**File**: `geoai_backend.py` (new route added)

```python
@app.route('/api/poi/extract', methods=['POST'])
def extract_poi_from_gpkg():
    """
    Reads the 'places' layer from the Đà Nẵng Overture GeoPackage,
    extracts features within the Đà Nẵng bounding box,
    and returns them as JSON for the NestJS backend to ingest.
    """
```

Uses GeoPandas/Fiona to read the GeoPackage `places` layer, filters by Đà Nẵng bbox, extracts required fields (id, names.primary, categories.primary, categories.alternate, addresses, confidence, sources), and returns a JSON array.

### 7. Frontend Components

**File**: `apps/web/src/features/poi/PoiSearchPanel.js`
- Category search input with Vietnamese placeholder
- Displays search results count
- Triggers map marker rendering

**File**: `apps/web/src/features/poi/poi-markers.js`
- Utility functions for creating POI marker icons by category group
- Color mapping: food/drink (orange), education (blue), health (red), shopping (green), services (purple)
- Cluster icon creation for 100+ markers

**File**: `apps/web/src/features/poi/PoiPopup.js`
- Popup component showing: name, Vietnamese category, address/street, district
- "Thêm vào tài sản" button
- Fallback logic: address → street → district

## Data Models

### Place (New)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, cuid | Internal identifier |
| overtureId | String | Unique | Overture Maps feature ID |
| name | String | Required | Place name (from names.primary) |
| category | String | Indexed | Primary Overture category |
| subcategories | Json | Default [] | Alternate categories array |
| address | String? | Optional | Freeform address |
| street | String? | Optional | Street name |
| ward | String? | Optional | Ward/phường |
| district | String? | Optional | District/quận |
| city | String | Default "Da Nang" | City |
| latitude | Float | Required | WGS84 latitude |
| longitude | Float | Required | WGS84 longitude |
| geometry | Json | Required | GeoJSON Point {type, coordinates} |
| confidence | Float | Default 0 | Overture confidence score |
| source | String | Default "overture-places" | Data source identifier |
| sourceVersion | String? | Optional | Overture release version |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

### BuildingProperty (Existing — fields used for POI conversion)

When converting a Place to a BuildingProperty:
- `name` ← Place.name
- `street` ← Place.street
- `ward` ← Place.ward
- `district` ← Place.district
- `city` ← Place.city
- `centroidLat` ← Place.latitude
- `centroidLng` ← Place.longitude
- `geometry` ← Place.geometry
- `source` ← "overture-places"
- `propertyType` ← "poi"
- `overtureId` ← Place.overtureId
- `code` ← generated (existing pattern: `formatCode(count + 1)`)

### Category Mapping (Static Data)

```typescript
const CATEGORY_MAP: Record<string, string> = {
  restaurant: "Nhà hàng",
  cafe: "Quán cà phê",
  school: "Trường học",
  hospital: "Bệnh viện",
  pharmacy: "Nhà thuốc",
  bank: "Ngân hàng",
  hotel: "Khách sạn",
  supermarket: "Siêu thị",
  gas_station: "Trạm xăng",
  temple: "Chùa/Đền",
  bar: "Quán bar",
  clinic: "Phòng khám",
  kindergarten: "Nhà trẻ",
  university: "Đại học",
  market: "Chợ",
  convenience_store: "Cửa hàng tiện lợi",
  atm: "ATM",
  post_office: "Bưu điện",
  police: "Công an",
  fire_station: "Trạm cứu hỏa"
};
```

### API Request/Response Shapes

**GET /poi/search**
```
Query: { q: string, south?: number, west?: number, north?: number, east?: number, limit?: number }
Response: { items: PoiSearchItem[], total: number }
```

**POST /poi/import**
```
Body: { features: PoiImportFeature[], sourceVersion?: string }
Response: { created: number, updated: number, skipped: number }
```

**POST /poi/convert/:placeId**
```
Response: { success: boolean, assetId: string, assetCode: string }
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Import upsert idempotence

*For any* valid set of POI features, importing them into the Place table and then importing the same set again (with potentially modified field values) SHALL result in exactly one Place record per unique overtureId, with field values matching the most recent import.

**Validates: Requirements 2.3, 2.4**

### Property 2: Import summary count invariant

*For any* batch of POI features submitted for import, the returned summary SHALL satisfy: `created + updated + skipped = total input count`, where skipped includes records with null, empty, or invalid geometry.

**Validates: Requirements 2.7, 2.6**

### Property 3: Feature extraction produces valid GeoJSON geometry

*For any* Overture feature with a valid geometry within the Đà Nẵng bounding box, the extracted Place record SHALL contain a geometry field that is a valid GeoJSON Point object with coordinates `[longitude, latitude]` where longitude ∈ [107.82, 108.35] and latitude ∈ [15.88, 16.20].

**Validates: Requirements 1.5, 2.2**

### Property 4: Category mapper round-trip

*For any* category identifier in the mapping, calling `getVietnameseLabel(category)` to obtain the Vietnamese label and then calling `findCategories(label)` SHALL return a set that includes the original category identifier.

**Validates: Requirements 3.2, 3.3**

### Property 5: Unknown category fallback identity

*For any* string that is NOT a key in the category mapping, calling `getVietnameseLabel(unknownString)` SHALL return the input string unchanged.

**Validates: Requirements 3.4**

### Property 6: Search result invariants

*For any* POI category search with a bounding box parameter, every item in the result SHALL satisfy: (a) the item's category matches the query via case-insensitive substring match against either Vietnamese labels or English identifiers, (b) the item's latitude and longitude fall within the specified bounding box, (c) the total result count does not exceed 200, and (d) each item contains the fields: id, name, category, vietnameseCategory, latitude, longitude, address, and street.

**Validates: Requirements 4.1, 4.2, 4.4, 4.5**

### Property 7: POI marker coordinate and color correctness

*For any* POI search result item, the generated map marker SHALL be positioned at the item's exact latitude and longitude, and its color SHALL correspond to the item's category group (food/drink→orange, education→blue, health→red, shopping→green, services→purple).

**Validates: Requirements 5.1, 5.3**

### Property 8: Marker clustering threshold

*For any* set of POI markers where more than 100 are visible in the current viewport, the clustering function SHALL produce at least one cluster group with a count badge reflecting the number of contained markers.

**Validates: Requirements 5.6**

### Property 9: Popup content with address fallback

*For any* Place object, the generated popup content SHALL contain the place name, the Vietnamese category label, and the district. For the address display: if `address` is non-null it SHALL be shown; otherwise if `street` is non-null it SHALL be shown; otherwise only the district SHALL be displayed.

**Validates: Requirements 6.2, 6.4**

### Property 10: POI-to-asset conversion correctness

*For any* valid Place record that has not been previously converted, calling `convertToAsset` SHALL create a BuildingProperty with: name=Place.name, street=Place.street, ward=Place.ward, district=Place.district, city=Place.city, centroidLat=Place.latitude, centroidLng=Place.longitude, geometry=Place.geometry, source="overture-places", propertyType="poi", a unique generated code, AND an AuditLog entry with action="poi_to_asset", entityType="BuildingProperty", and the new record's ID.

**Validates: Requirements 7.1, 7.2, 7.3, 7.6**

### Property 11: Duplicate conversion prevention

*For any* Place that has already been converted to a BuildingProperty (i.e., a BuildingProperty with the same overtureId exists), attempting `convertToAsset` again SHALL return an error indicating the POI has already been added as an asset, and no new BuildingProperty record SHALL be created.

**Validates: Requirements 7.5**

## Error Handling

### Import Errors

| Error Condition | Handling | Response |
|----------------|----------|----------|
| GeoPackage missing `places` layer | POI_Importer returns error | `{ error: "Layer 'places' not found in GeoPackage" }` |
| Feature has null, empty, or invalid geometry (malformed coordinates, wrong projection) | Skip record, log warning | Increments `skipped` count in summary |
| Invalid feature data (missing name/category) | Skip record | Increments `skipped` count |
| Database connection failure during upsert | Throw, abort batch | HTTP 500 with error message |
| GeoPackage file not found | POI_Importer returns error | `{ error: "GeoPackage file not found at path" }` |

### Search Errors

| Error Condition | Handling | Response |
|----------------|----------|----------|
| Empty query string | Return empty results | `{ items: [], total: 0 }` |
| Invalid bounding box coordinates | Ignore bounds, search city-wide | Log warning, proceed without viewport filter |
| Database timeout | Return error | HTTP 503 with retry suggestion |

### Conversion Errors

| Error Condition | Handling | Response |
|----------------|----------|----------|
| Place ID not found | Throw NotFoundException | HTTP 404 `{ message: "Place not found" }` |
| Duplicate overtureId in BuildingProperty | Throw ConflictException | HTTP 409 `{ message: "POI đã được thêm vào tài sản" }` |
| Code generation collision | Retry with incremented count | Transparent to user |
| Missing required fields on Place | Throw BadRequestException | HTTP 400 with field details |

### Frontend Error Handling

- Network failures during search: Show toast "Không thể tìm kiếm. Vui lòng thử lại."
- Conversion failure: Show toast with error message from API
- Map rendering errors: Gracefully degrade (hide POI layer, show error in search panel)

## Testing Strategy

### Unit Tests (Jest)

**Category Mapper** (`category-mapper.spec.ts`):
- Verify all 10+ required mappings exist
- Verify case-insensitive substring matching
- Verify unknown category fallback
- Verify empty string handling

**POI Service** (`poi.service.spec.ts`):
- Search with various query/bounds combinations
- Import with valid/invalid/duplicate features
- Conversion with valid Place, duplicate detection
- Summary count accuracy
- Max 200 result limit enforcement

**Frontend utilities** (`poi-markers.test.js`, `poi-popup.test.js`):
- Marker icon creation by category
- Color assignment by category group
- Popup HTML generation with fallback logic
- Clustering threshold behavior

### Property-Based Tests (fast-check)

The project uses Jest as the test runner. Property-based tests will use the `fast-check` library with a minimum of 100 iterations per property.

Each property test will be tagged with a comment referencing the design property:
```
// Feature: overture-poi-integration, Property N: <property_text>
```

**Target properties for PBT:**
- Property 1: Import upsert idempotence
- Property 2: Import summary count invariant
- Property 4: Category mapper round-trip
- Property 5: Unknown category fallback identity
- Property 6: Search result invariants (viewport bounds + max count + required fields)
- Property 9: Popup content with address fallback
- Property 10: POI-to-asset conversion field mapping
- Property 11: Duplicate conversion prevention

Properties 3, 7, 8 are better suited to example-based tests due to their dependency on UI rendering or specific coordinate ranges.

### Integration Tests

- End-to-end import flow: Python Flask → NestJS → SQLite
- Search with real database containing imported POI data
- Conversion flow with audit log verification
- Viewport-based search with map interaction

### Test Configuration

```json
{
  "testFramework": "jest",
  "pbtLibrary": "fast-check",
  "minIterations": 100,
  "testLocations": {
    "backend": "apps/api/src/poi/__tests__/",
    "frontend": "apps/web/src/features/poi/__tests__/"
  }
}
```

