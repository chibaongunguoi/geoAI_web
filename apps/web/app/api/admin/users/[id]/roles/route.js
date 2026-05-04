import { proxyToApi } from "@/features/auth/api-proxy";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();

  if (!Array.isArray(body.roles)) {
    return Response.json({ error: "roles must be an array" }, { status: 400 });
  }

  return proxyToApi(request, `/admin/users/${id}/roles`, {
    method: "PATCH",
    body: JSON.stringify({ roles: body.roles })
  });
}
