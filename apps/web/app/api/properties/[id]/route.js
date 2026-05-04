import { proxyToApi } from "@/features/auth/api-proxy";

export async function GET(request, { params }) {
  const { id } = await params;
  return proxyToApi(request, `/properties/${encodeURIComponent(id)}`, { method: "GET" });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToApi(request, `/properties/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body
  });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  return proxyToApi(request, `/properties/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}
