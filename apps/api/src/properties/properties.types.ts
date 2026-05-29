import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional
} from "@nestjs/common";
// import removed
import { PrismaService } from "../prisma/prisma.service";
import { DENSITY_OBJECT_LIMIT } from "./density-config";
import { ElasticsearchPropertySearchProvider } from "./elasticsearch-property-search.provider";
import { PropertySearchProvider } from "./property-search-provider";

export type Delegate = {
  findFirst?: (args: unknown) => Promise<unknown>;
  findMany?: (args: unknown) => Promise<unknown[]>;
  findUnique?: (args: unknown) => Promise<unknown>;
  count?: (args?: unknown) => Promise<number>;
  create?: (args: unknown) => Promise<unknown>;
  update?: (args: unknown) => Promise<unknown>;
  upsert?: (args: unknown) => Promise<unknown>;
};

export type PropertiesPrisma = {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: any[]) => Promise<T>;
  buildingProperty: Required<
    Pick<Delegate, "findFirst" | "findMany" | "findUnique" | "count" | "create" | "update" | "upsert">
  >;
  auditLog: Required<Pick<Delegate, "create">>;
};

export type PropertyStatus = "ACTIVE" | "INACTIVE" | "REVIEW" | "ARCHIVED";

export type BuildingPropertyRow = {
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
  sourceVersion?: string | null;
  level?: number | null;
  height?: number | null;
  floors?: number | null;
  areaSqm?: number | null;
  centroidLat?: number | null;
  centroidLng?: number | null;
  bbox?: unknown;
  geometry?: unknown;
  attributes?: unknown;
  searchText?: string | null;
  searchTextNormalized?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export type PropertyDensityRegion = {
  id: string;
  label: string;
  count: number;
  center: {
    lat: number;
    lng: number;
  };
  bbox: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  ward?: string;
  district?: string;
  objects?: PropertyDensityObject[];
};

export type PropertySearchMap = {
  type: "property-density";
  regions: PropertyDensityRegion[];
};

export type PropertyDensityObject = {
  id: string;
  type: "building";
  center?: {
    lat: number;
    lng: number;
  };
  bbox?: [number, number, number, number];
  geometry?: unknown;
  geometrySource: "overture_property_search";
  properties: {
    code?: string;
    name?: string | null;
    ward?: string | null;
    district?: string | null;
    source?: string | null;
  };
};

export type PropertySearchAnswer = {
  type: "count" | "density";
  count: number;
  filters: {
    ward?: string;
    district?: string;
  };
  text: string;
  topRegion?: PropertyDensityRegion;
};

export type SearchIntent = {
  type: "list" | "count" | "density";
  direction?: "highest" | "lowest";
  filters: {
    ward?: string;
    district?: string;
    status?: PropertyStatus;
    propertyType?: string;
  };
};

export type DensityRegionRow = {
  cellId?: string;
  count?: number;
  centerLat?: number;
  centerLng?: number;
  minLat?: number;
  minLng?: number;
  maxLat?: number;
  maxLng?: number;
  cellSouth?: number;
  cellWest?: number;
  cellNorth?: number;
  cellEast?: number;
  ward?: string | null;
  district?: string | null;
};

export type PropertySearchInput = {
  query?: string;
  street?: string;
  ward?: string;
  district?: string;
  status?: string;
  propertyType?: string;
  source?: string;
  updatedFrom?: string;
  updatedTo?: string;
  limit?: number;
};

export type PropertyHeatmapInput = {
  ward?: string;
  district?: string;
  source?: string;
  limit?: number;
  gridSize?: number;
};

export type PropertyMutationInput = {
  code?: string;
  overtureId?: string;
  name?: string;
  addressLine?: string;
  street?: string;
  ward?: string;
  district?: string;
  city?: string;
  propertyType?: string;
  status?: PropertyStatus;
  source?: string;
  sourceVersion?: string;
  level?: number;
  height?: number;
  floors?: number;
  areaSqm?: number;
  centroidLat?: number;
  centroidLng?: number;
  bbox?: unknown;
  geometry?: unknown;
  attributes?: unknown;
  embedding?: unknown;
};

export type AssetImportResult = {
  imported: number;
  skipped: number;
  failedRows: Array<{
    rowNumber: number;
    code?: string;
    errors: string[];
  }>;
};

export type ImportOptions = {
  actorUserId?: string;
  sourceVersion?: string;
  defaultWard?: string;
  defaultDistrict?: string;
};

export type OvertureFeature = {
  id?: unknown;
  bbox?: unknown;
  geometry?: unknown;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
};

export const DEFAULT_CITY = "Da Nang";
export const DEFAULT_PROPERTY_TYPE = "building";
export const DEFAULT_STATUS: PropertyStatus = "ACTIVE";
export const DEFAULT_SOURCE = "manual";
export const OVERTURE_SOURCE = "overture";
export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;
export const DEFAULT_DENSITY_GRID_SIZE = 0.002;
export const DEFAULT_DENSITY_REGION_LIMIT = 6;
export const DEFAULT_DENSITY_OBJECT_LIMIT = DENSITY_OBJECT_LIMIT;
export const DENSITY_BACKEND_TIMEOUT_MS = Number(process.env.DENSITY_BACKEND_TIMEOUT_MS || 5000);
export const SEMANTIC_PROVIDER_TIMEOUT_MS = Number(process.env.SEMANTIC_PROVIDER_TIMEOUT_MS || 7000);
export const LIST_SEARCH_TIMEOUT_MS = Number(process.env.LIST_SEARCH_TIMEOUT_MS || 2000);
export const DEFAULT_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";
export const VALID_STATUSES = new Set<PropertyStatus>([
  "ACTIVE",
  "INACTIVE",
  "REVIEW",
  "ARCHIVED"
]);
export const STOP_WORDS_FOR_TOKENS = new Set([
  "cho",
  "toi",
  "toi",
  "danh",
  "sach",
  "cac",
  "can",
  "nha",
  "o",
  "duong",
  "tai",
  "phuong",
  "quan",
  "huyen",
  "thanh",
  "pho",
  "tp",
  "va",
  "co",
  "nhung",
  "theo",
  "ve",
  "san",
  "du",
  "lieu",
  "biet",
  "vung",
  "nao",
  "so",
  "toa",
  "cua",
  "thuoc",
  "la",
  "bao",
  "nhieu",
  "dem",
  "tong",
  "may",
  "mat",
  "do",
  "day",
  "dac",
  "nhat",
  "tim",
  "dang",
  "hoat",
  "dong",
  "khong",
  "can",
  "xem",
  "xet",
  "luu",
  "tru",
  "building"
]);

export const LOWEST_DENSITY_PHRASES = ["thua thot", "it nha", "it nhat", "vang nha", "vang", "thap nhat"];
export const HIGHEST_DENSITY_PHRASES = [
  "day dac",
  "mat do",
  "dong nhat",
  "nhieu nhat",
  "dong duc",
  "nhieu nha nhat",
  "cao nhat"
];
export const DENSITY_INTENT_KEYWORDS = [...HIGHEST_DENSITY_PHRASES, ...LOWEST_DENSITY_PHRASES];
export const INTENT_KEYWORDS = new Set([
  ...DENSITY_INTENT_KEYWORDS,
  "bao nhieu",
  "so luong",
  "toa nha",
  "can nha",
  "bat dong san"
]);

export const STATIC_LOCATIONS: Array<[string, string]> = [
  ["An Hải Bắc", "Sơn Trà"],
  ["An Hải Tây", "Sơn Trà"],
  ["An Hải Đông", "Sơn Trà"],
  ["An Khê", "Thanh Khê"],
  ["Bình Hiên", "Hải Châu"],
  ["Bình Thuận", "Hải Châu"],
  ["Chính Gián", "Thanh Khê"],
  ["Hoà Hải", "Ngũ Hành Sơn"],
  ["Hoà Quý", "Ngũ Hành Sơn"],
  ["Hòa An", "Cẩm Lệ"],
  ["Hòa Bắc", "Hòa Vang"],
  ["Hòa Châu", "Hòa Vang"],
  ["Hòa Cường Bắc", "Hải Châu"],
  ["Hòa Cường Nam", "Hải Châu"],
  ["Hòa Hiệp Bắc", "Liên Chiểu"],
  ["Hòa Hiệp Nam", "Liên Chiểu"],
  ["Hòa Khánh Bắc", "Liên Chiểu"],
  ["Hòa Khánh Nam", "Liên Chiểu"],
  ["Hòa Khê", "Thanh Khê"],
  ["Hòa Khương", "Hòa Vang"],
  ["Hòa Liên", "Hòa Vang"],
  ["Hòa Minh", "Liên Chiểu"],
  ["Hòa Nhơn", "Hòa Vang"],
  ["Hòa Ninh", "Hòa Vang"],
  ["Hòa Phong", "Hòa Vang"],
  ["Hòa Phát", "Cẩm Lệ"],
  ["Hòa Phú", "Hòa Vang"],
  ["Hòa Phước", "Hòa Vang"],
  ["Hòa Sơn", "Hòa Vang"],
  ["Hòa Thuận Tây", "Hải Châu"],
  ["Hòa Thuận Đông", "Hải Châu"],
  ["Hòa Thọ Tây", "Cẩm Lệ"],
  ["Hòa Thọ Đông", "Cẩm Lệ"],
  ["Hòa Tiến", "Hòa Vang"],
  ["Hòa Xuân", "Cẩm Lệ"],
  ["Hải Châu I", "Hải Châu"],
  ["Hải Châu II", "Hải Châu"],
  ["Khuê Mỹ", "Ngũ Hành Sơn"],
  ["Khuê Trung", "Cẩm Lệ"],
  ["Mân Thái", "Sơn Trà"],
  ["Mỹ An", "Ngũ Hành Sơn"],
  ["Nam Dương", "Hải Châu"],
  ["Nại Hiên Đông", "Sơn Trà"],
  ["Phước Mỹ", "Sơn Trà"],
  ["Phước Ninh", "Hải Châu"],
  ["Tam Thuận", "Thanh Khê"],
  ["Thanh Bình", "Hải Châu"],
  ["Thanh Khê Tây", "Thanh Khê"],
  ["Thanh Khê Đông", "Thanh Khê"],
  ["Thuận Phước", "Hải Châu"],
  ["Thạc Gián", "Thanh Khê"],
  ["Thạch Thang", "Hải Châu"],
  ["Thọ Quang", "Sơn Trà"],
  ["Tân Chính", "Thanh Khê"],
  ["Vĩnh Trung", "Thanh Khê"],
  ["Xuân Hà", "Thanh Khê"]
];

export const DANANG_DISTRICTS = [
  "cam le",
  "hai chau",
  "hoa vang",
  "lien chieu",
  "ngu hanh son",
  "son tra",
  "thanh khe"
];

export type PropertiesServiceOptions = {
  elasticsearchProvider?: PropertySearchProvider;
  propertySearchProvider?: "postgres" | "elasticsearch";
};
export const PROPERTIES_SERVICE_OPTIONS = "PROPERTIES_SERVICE_OPTIONS";

