import { proxyToApi } from "../../../../../src/features/auth/api-proxy";

const cache = new Map();
const CACHE_TTL_MS = 60_000;

export async function GET(request) {
  const search = new URL(request.url).search;
  const cacheKey = search || "__empty__";
  const now = Date.now();

  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Cache": "HIT" }
    });
  }

  const response = await proxyToApi(request, `/dashboard/assets/summary${search}`, { method: "GET" });

  if (response.ok) {
    const data = await response.json();
    cache.set(cacheKey, { data, timestamp: now });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Cache": "MISS" }
    });
  }

  return response;
}
