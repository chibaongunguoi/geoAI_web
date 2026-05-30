import { proxyToApi } from "@/features/auth/api-proxy";

export async function GET(request, { params }) {
  const path = (await params).path?.join('/') || '';
  const search = new URL(request.url).search;
  return proxyToApi(request, `/notifications${path ? `/${path}` : ''}${search}`, { method: "GET" });
}

export async function PATCH(request, { params }) {
  const path = (await params).path?.join('/') || '';
  const body = await request.text();
  return proxyToApi(request, `/notifications${path ? `/${path}` : ''}`, { method: "PATCH", body });
}
