import { proxyToApi } from "@/features/auth/api-proxy";

export async function GET(request) {
  const search = new URL(request.url).search;
  return proxyToApi(request, `/map/layers/history${search}`, { method: "GET" });
}
