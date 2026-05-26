import { Delegate, PropertiesPrisma, PropertyStatus, BuildingPropertyRow, PropertyDensityRegion, PropertySearchMap, PropertyDensityObject, PropertySearchAnswer, SearchIntent, DensityRegionRow, PropertySearchInput, PropertyHeatmapInput, PropertyMutationInput, AssetImportResult, ImportOptions, OvertureFeature, DEFAULT_CITY, DEFAULT_PROPERTY_TYPE, DEFAULT_STATUS, DEFAULT_SOURCE, OVERTURE_SOURCE, MAX_LIMIT, DEFAULT_LIMIT, DEFAULT_DENSITY_GRID_SIZE, DEFAULT_DENSITY_REGION_LIMIT, DEFAULT_DENSITY_OBJECT_LIMIT, DENSITY_BACKEND_TIMEOUT_MS, SEMANTIC_PROVIDER_TIMEOUT_MS, LIST_SEARCH_TIMEOUT_MS, DEFAULT_EMBEDDING_MODEL, VALID_STATUSES, STOP_WORDS_FOR_TOKENS, LOWEST_DENSITY_PHRASES, HIGHEST_DENSITY_PHRASES, DENSITY_INTENT_KEYWORDS, INTENT_KEYWORDS, STATIC_LOCATIONS, DANANG_DISTRICTS, PropertiesServiceOptions, PROPERTIES_SERVICE_OPTIONS } from "./properties.types";

export type PropertySearchProviderRow = {
  id: string;
  code?: string;
  overtureId?: string | null;
  name?: string | null;
  addressLine?: string | null;
  street?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  propertyType?: string | null;
  status?: string | null;
  source?: string | null;
  centroidLat?: number | null;
  centroidLng?: number | null;
  searchText?: string | null;
  searchTextNormalized?: string | null;
  deletedAt?: Date | string | null;
};

export type PropertySearchProviderInput = {
  query?: string;
  status?: string;
  propertyType?: string;
  source?: string;
  limit: number;
  tokens: string[];
  normalizedQuery: string;
  signal?: AbortSignal;
  filters?: {
    ward?: string;
    district?: string;
  };
};

export type PropertySearchProviderResult = {
  items: PropertySearchProviderRow[];
  searchMode: string;
  semanticModel?: string;
};

export type PropertySearchProvider = {
  search(input: PropertySearchProviderInput): Promise<PropertySearchProviderResult>;
};
