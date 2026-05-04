import { proxyToApi } from "@/features/auth/api-proxy";

export async function POST(request) {
  const body = await request.json();

  if (!body.username || !body.name || !body.password) {
    return Response.json(
      { error: "Username, name and password are required" },
      { status: 400 }
    );
  }

  return proxyToApi(request, "/auth/register", {
    method: "POST",
    body: JSON.stringify(body)
  });
}
