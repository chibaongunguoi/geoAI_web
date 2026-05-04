import { proxyToApi } from "@/features/auth/api-proxy";

export async function POST(request) {
  const body = await request.text();
  return proxyToApi(request, "/properties/import/overture", {
    method: "POST",
    body
  });
}
