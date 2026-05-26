export interface PoiImportFeature {
  overtureId: string;
  name: string;
  category: string;
  subcategories?: string[];
  address?: string | null;
  street?: string | null;
  ward?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geometry?: unknown;
  confidence?: number;
  source?: string;
}

export interface PoiImportSummary {
  created: number;
  updated: number;
  skipped: number;
}

export interface PoiSearchQuery {
  q: string;
  south?: number;
  west?: number;
  north?: number;
  east?: number;
  limit?: number;
}

export interface PoiSearchItem {
  id: string;
  code?: string;
  name: string;
  category: string;
  vietnameseCategory: string;
  latitude: number;
  longitude: number;
  centroidLat?: number;
  centroidLng?: number;
  address: string | null;
  street: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  status?: string;
  propertyType?: string;
}

export interface PoiSearchResult {
  items: PoiSearchItem[];
  total: number;
}

export interface ConvertResult {
  success: boolean;
  assetId: string;
  assetCode: string;
}

export type PoiSemanticIntentType = "poi-density" | "poi-count" | "poi-list";
export type PoiDensityDirection = "highest" | "lowest";

export interface PoiLocationFilter {
  ward?: string;
  district?: string;
}

export interface PoiSemanticIntent {
  type: PoiSemanticIntentType;
  direction: PoiDensityDirection;
  categories: string[];
  categoryLabel: string;
  filters: PoiLocationFilter;
}

export interface PoiDensityRegion {
  id: string;
  label: string;
  ward: string;
  district: string;
  count: number;
  center: { lat: number; lng: number };
  bbox: { west: number; south: number; east: number; north: number };
}

export interface PoiSemanticResult {
  items: PoiSearchItem[];
  total: number;
  answer: {
    type: PoiSemanticIntentType;
    text: string;
    count: number;
    filters: PoiLocationFilter & { category?: string };
  };
  map?: {
    type: "property-density";
    regions: PoiDensityRegion[];
  };
  meta: {
    searchMode: "sqlite-poi-semantic";
    categories: string[];
    intent: PoiSemanticIntentType;
    densityDirection?: PoiDensityDirection;
    warnings?: string[];
  };
}

export interface PoiSqlRow {
  id: string;
  code: string;
  name: string;
  propertyType: string;
  addressLine: string | null;
  street: string | null;
  ward: string | null;
  district: string | null;
  city: string | null;
  centroidLat: number;
  centroidLng: number;
}

export interface PoiDensityRow {
  ward: string | null;
  district: string | null;
  count: number;
  centerLat: number;
  centerLng: number;
}
