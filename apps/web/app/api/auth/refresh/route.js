import { proxyToApi } from "@/features/auth/api-proxy";

export async function POST(request) {
  return proxyToApi(request, "/auth/refresh", { method: "POST" });
}
