import { proxyToApi } from "@/features/auth/api-proxy";

export async function GET(request) {
  return proxyToApi(request, "/admin/roles", { method: "GET" });
}
