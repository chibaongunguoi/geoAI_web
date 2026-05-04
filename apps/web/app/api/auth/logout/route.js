import { proxyToApi } from "@/features/auth/api-proxy";

export async function POST(request) {
  return proxyToApi(request, "/auth/logout", { method: "POST" });
}
