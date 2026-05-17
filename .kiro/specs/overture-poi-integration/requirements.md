# Requirements Document

## Introduction

This feature integrates Overture Maps POI (Places) data into the GeoAI Đà Nẵng application, providing a Google Maps-like experience for discovering restaurants, cafes, shops, schools, hospitals, and other points of interest. Users can search POIs by category, view them as markers on the Leaflet map, inspect details via popups, and import selected POIs into the existing BuildingProperty asset table.

## Glossary

- **POI_Service**: The NestJS backend module responsible for managing Place records, including CRUD operations, category search, and viewport-based queries.
- **Place**: A database model representing a single point of interest from the Overture Maps `places` dataset, stored in SQLite via Prisma.
- **Category_Mapper**: A utility that translates Overture English category identifiers to Vietnamese display labels and vice versa.
- **POI_Importer**: The Python Flask backend component that reads Overture `places` layer data from a GeoPackage file and exposes it for ingestion into the Place table.
- **Map_UI**: The Next.js frontend Leaflet map interface that renders POI markers, popups, and search controls.
- **BuildingProperty**: The existing database model storing building assets with fields for code, name, street, ward, district, geometry, and source.
- **Viewport**: The geographic bounding box currently visible on the user's map, defined by south-west and north-east coordinates.

## Requirements

### Requirement 1: POI Data Model

**User Story:** As a developer, I want a dedicated Place model in the database, so that POI data is stored separately from building assets and can be queried efficiently by category and location.

#### Acceptance Criteria

1. THE Place model SHALL store the following fields: id (primary key), overtureId (unique), name, category, subcategories (JSON array), address, street, ward, district, city (default "Da Nang"), latitude, longitude, geometry (GeoJSON Point), confidence (float), source, sourceVersion, createdAt, and updatedAt.
2. THE Place model SHALL define a database index on the category field.
3. THE Place model SHALL define a database index on the city, district, and ward fields.
4. THE Place model SHALL define a unique constraint on the overtureId field to prevent duplicate imports.
5. THE Place model SHALL store geometry as a JSON field containing a GeoJSON Point object with coordinates in EPSG:4326.

### Requirement 2: POI Data Import from Overture GeoPackage

**User Story:** As an administrator, I want to download and import Overture Maps `places` data for Đà Nẵng into the Place table, so that the application has a comprehensive POI dataset.

#### Acceptance Criteria

1. WHEN the import process is triggered, THE POI_Importer SHALL read the `places` layer from the Đà Nẵng Overture GeoPackage file.
2. WHEN a place record has a valid geometry within the Đà Nẵng bounding box, THE POI_Importer SHALL extract the fields: id, names.primary, categories.primary, categories.alternate, addresses[0].freeform, addresses[0].locality, confidence, and sources.
3. WHEN the POI_Importer produces place features, THE POI_Service SHALL upsert each record into the Place table using overtureId as the match key.
4. WHEN a Place record already exists with the same overtureId, THE POI_Service SHALL update the existing record with new field values rather than creating a duplicate.
5. IF the GeoPackage file does not contain a `places` layer, THEN THE POI_Importer SHALL return an error message indicating the layer is missing.
6. IF a place record has null, empty, or invalid geometry (malformed coordinates, wrong projection), THEN THE POI_Importer SHALL skip that record and log a warning.
7. WHEN the import completes, THE POI_Service SHALL return a summary containing the count of records created, updated, and skipped.

### Requirement 3: Vietnamese Category Taxonomy

**User Story:** As a user, I want to search for POIs using Vietnamese keywords, so that I can find places without needing to know English category names.

#### Acceptance Criteria

1. THE Category_Mapper SHALL define a mapping from Overture English category identifiers to Vietnamese display labels for at least the following categories: restaurant→Nhà hàng, cafe→Quán cà phê, school→Trường học, hospital→Bệnh viện, pharmacy→Nhà thuốc, bank→Ngân hàng, hotel→Khách sạn, supermarket→Siêu thị, gas_station→Trạm xăng, temple→Chùa/Đền.
2. WHEN a Vietnamese search keyword is provided, THE Category_Mapper SHALL return all matching Overture category identifiers using case-insensitive substring matching.
3. WHEN an Overture category identifier is provided, THE Category_Mapper SHALL return the corresponding Vietnamese display label.
4. IF a category has no defined Vietnamese mapping, THEN THE Category_Mapper SHALL silently return the original English category identifier as the display label without raising an error.

### Requirement 4: POI Category Search

**User Story:** As a user, I want to search for POIs by category keyword, so that I can discover nearby restaurants, cafes, or other places of interest.

#### Acceptance Criteria

1. WHEN a user submits a category search query, THE POI_Service SHALL match the query against both Vietnamese labels and English category identifiers using case-insensitive substring matching.
2. WHEN a bounding box (viewport) parameter is provided, THE POI_Service SHALL return only Place records whose latitude and longitude fall within the specified bounds.
3. WHEN no bounding box parameter is provided, THE POI_Service SHALL return Place records city-wide for Đà Nẵng.
4. THE POI_Service SHALL return a maximum of 200 Place records per search request, ranked by confidence score descending before applying the limit.
5. THE POI_Service SHALL return each Place record with fields: id, name, category, vietnameseCategory, latitude, longitude, address, and street.
6. WHEN no Place records match the search query, THE POI_Service SHALL return an empty array with a total count of zero.

### Requirement 5: POI Map Display

**User Story:** As a user, I want to see POI markers on the map when I search by category, so that I can visually locate places of interest.

#### Acceptance Criteria

1. WHEN a category search returns results, THE Map_UI SHALL display a marker for each POI at its latitude and longitude coordinates.
2. THE Map_UI SHALL use a distinct marker icon for POI results that is visually different from existing building asset markers.
3. THE Map_UI SHALL assign marker colors based on the POI category group: food/drink (orange), education (blue), health (red), shopping (green), services (purple).
4. WHEN the user pans or zooms the map while a category search is active, THE Map_UI SHALL update the displayed markers to reflect the new viewport.
5. WHEN the user clears the category search or the search becomes inactive (timeout, navigation away), THE Map_UI SHALL remove all POI markers from the map.
6. WHILE a category search is active and returns updated results, THE Map_UI SHALL keep the existing markers visible until the user explicitly clears the search.
7. WHILE more than 100 POI markers are visible in the current viewport, THE Map_UI SHALL cluster nearby markers and display a cluster count badge.

### Requirement 6: POI Detail Popup

**User Story:** As a user, I want to click a POI marker and see its details, so that I can learn more about a place before visiting or adding it to my assets.

#### Acceptance Criteria

1. WHEN a user clicks a POI marker, THE Map_UI SHALL display a popup anchored to the marker position.
2. THE Map_UI SHALL display the following information in the popup: place name, Vietnamese category label, address or street name, and district.
3. THE Map_UI SHALL display an "Thêm vào tài sản" (Add to assets) button in the popup.
4. WHEN the place has no address value, THE Map_UI SHALL display the street name as a fallback; if neither exists, THE Map_UI SHALL display the district name only.
5. WHEN the user clicks outside the popup, clicks a close button, navigates away from the page, or the map loses focus, THE Map_UI SHALL close the popup.

### Requirement 7: POI to Asset Conversion

**User Story:** As a user, I want to add a POI to my building assets, so that I can track and manage places of interest alongside existing infrastructure data.

#### Acceptance Criteria

1. WHEN a user clicks the "Thêm vào tài sản" button in a POI popup, THE POI_Service SHALL first check whether a BuildingProperty with the same overtureId already exists, and only create a new BuildingProperty record if no duplicate is found.
2. THE POI_Service SHALL populate the new BuildingProperty record with: name from Place.name, street from Place.street, ward from Place.ward, district from Place.district, city from Place.city, centroidLat from Place.latitude, centroidLng from Place.longitude, geometry from Place.geometry, source set to "overture-places", and propertyType set to "poi".
3. THE POI_Service SHALL generate a unique code for the new BuildingProperty following the existing code generation pattern.
4. WHEN the conversion succeeds, THE Map_UI SHALL display a success notification with the text "Đã thêm vào tài sản" and the generated asset code.
5. IF a BuildingProperty with the same overtureId already exists, THEN THE POI_Service SHALL return an error indicating the POI has already been added as an asset.
6. WHEN the conversion succeeds, THE POI_Service SHALL create an AuditLog entry with action "poi_to_asset", entityType "BuildingProperty", and the new record ID.
