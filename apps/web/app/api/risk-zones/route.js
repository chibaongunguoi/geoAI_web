import { proxyToApi } from "@/features/auth/api-proxy";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.toString();
  const url = search ? `/risk-zones?${search}` : `/risk-zones`;
  return proxyToApi(request, url, { method: "GET" });
}
