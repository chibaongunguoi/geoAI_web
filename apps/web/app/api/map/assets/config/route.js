import { proxyToApi } from "@/features/auth/api-proxy";

export async function GET(request) {
  return proxyToApi(request, "/map/assets/config", { method: "GET" });
}

export async function PUT(request) {
  const body = await request.text();

  return proxyToApi(request, "/map/assets/config", {
    method: "PUT",
    body
  });
}
