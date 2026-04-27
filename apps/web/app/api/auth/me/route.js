import { proxyToApi } from "@/features/auth/api-proxy";

export async function GET(request) {
  return proxyToApi(request, "/auth/me", { method: "GET" });
}
