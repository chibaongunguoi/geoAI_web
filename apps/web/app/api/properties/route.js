import { proxyToApi } from "@/features/auth/api-proxy";

export async function GET(request) {
  const search = new URL(request.url).search;
  return proxyToApi(request, `/properties${search}`, { method: "GET" });
}

export async function POST(request) {
  const body = await request.text();
  return proxyToApi(request, "/properties", {
    method: "POST",
    body
  });
}
