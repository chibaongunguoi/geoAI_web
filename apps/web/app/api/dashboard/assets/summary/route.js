import { proxyToApi } from "../../../../../src/features/auth/api-proxy";

export async function GET(request) {
  const search = new URL(request.url).search;
  return proxyToApi(request, `/dashboard/assets/summary${search}`, { method: "GET" });
}
