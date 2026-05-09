import { proxyToApi } from "@/features/auth/api-proxy";

const VALID_STATUSES = new Set(["ACTIVE", "LOCKED"]);

export async function PATCH(request, { params }) {
  const body = await request.json().catch(() => ({}));

  if (!VALID_STATUSES.has(body.status)) {
    return Response.json({ error: "status must be ACTIVE or LOCKED" }, { status: 400 });
  }

  const { id } = await params;
  return proxyToApi(request, `/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: body.status })
  });
}
