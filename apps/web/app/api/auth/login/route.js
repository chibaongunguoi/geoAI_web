import { proxyToApi } from "@/features/auth/api-proxy";

export async function POST(request) {
  const body = await request.json();

  if (!(body.identifier || body.email) || !body.password) {
    return Response.json(
      { error: "Identifier and password are required" },
      { status: 400 }
    );
  }

  return proxyToApi(request, "/auth/login", {
    method: "POST",
    body: JSON.stringify(body)
  });
}
