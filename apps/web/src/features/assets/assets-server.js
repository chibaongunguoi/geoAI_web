import { serverFetch } from "@/features/auth/server-auth";
import { assetFilterQueryString } from "@/features/filters/filter-state";
import fs from "fs/promises";
import path from "path";

export function assetSearchQuery(filters) {
  return assetFilterQueryString({ ...filters, limit: filters.limit || 100 });
}

export function sortAssets(assets, sort) {
  const rows = [...assets];
  const comparators = {
    code: (left, right) => String(left.code || "").localeCompare(String(right.code || "")),
    name: (left, right) => String(left.name || "").localeCompare(String(right.name || "")),
    status: (left, right) => String(left.status || "").localeCompare(String(right.status || "")),
    updatedAt: (left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0)
  };
  return rows.sort(comparators[sort] || comparators.updatedAt);
}

export async function searchAssets(filters) {
  const response = await serverFetch(`/properties?${assetSearchQuery(filters)}`);
  if (!response?.ok) {
    return [];
  }
  const data = await response.json();
  return Array.isArray(data?.items) ? data.items : [];
}

export async function getAssetByIdentifier(identifier) {
  const direct = await serverFetch(`/properties/${encodeURIComponent(identifier)}`);
  if (direct?.ok) {
    return direct.json();
  }

  const assets = await searchAssets({ query: identifier, limit: 20 });
  return (
    assets.find((asset) => asset.code === identifier || asset.id === identifier) ||
    assets[0] ||
    (await getSampleAsset(identifier))
  );
}

export async function getAssetAuditLogs(property, canViewLogs) {
  if (!property?.id || !canViewLogs) {
    return [];
  }
  const query = new URLSearchParams({
    entityType: "BuildingProperty",
    entityId: property.id
  });
  const response = await serverFetch(`/admin/audit-logs?${query.toString()}`);
  if (!response?.ok) {
    return [];
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function getSampleAsset(identifier) {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "sample-assets.geojson");
    const content = await fs.readFile(filePath, "utf8");
    const collection = JSON.parse(content);
    const feature = collection.features?.find((item) => item.properties?.code === identifier);
    if (!feature) return null;

    const [lng, lat] = feature.geometry?.coordinates || [];
    return {
      id: feature.properties.code,
      code: feature.properties.code,
      name: feature.properties.name,
      status: String(feature.properties.status || "").toUpperCase(),
      propertyType: feature.properties.type || feature.properties.category,
      addressLine: feature.properties.ownerUnit,
      city: "Da Nang",
      centroidLat: lat,
      centroidLng: lng,
      updatedAt: feature.properties.updatedAt,
      source: "sample"
    };
  } catch {
    return null;
  }
}
