import { proxyToApi } from "@/features/auth/api-proxy";

export async function POST(request, { params }) {
  const { placeId } = await params;
  return proxyToApi(request, `/poi/convert/${encodeURIComponent(placeId)}`, { method: "POST" });
}
