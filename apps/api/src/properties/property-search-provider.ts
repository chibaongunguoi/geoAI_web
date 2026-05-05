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
  source?: string;
  limit: number;
  tokens: string[];
  normalizedQuery: string;
};

export type PropertySearchProviderResult = {
  items: PropertySearchProviderRow[];
  searchMode: string;
  semanticModel?: string;
};

export type PropertySearchProvider = {
  search(input: PropertySearchProviderInput): Promise<PropertySearchProviderResult>;
};
