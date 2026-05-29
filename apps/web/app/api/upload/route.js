import { proxyToApi } from "@/features/auth/api-proxy";

export async function POST(request) {
  // We need to proxy FormData. The `proxyToApi` might not support FormData directly if it just forwards JSON, 
  // but let's check what `proxyToApi` does. Usually it uses standard `fetch`.
  // Actually, we can just proxy the request directly using standard fetch or manually construct it.
  // Wait, let's look at proxyToApi. For now, we'll try to pass the request body as is.
  // Since it's a stream, we can pass request.body to proxyToApi but we also need headers.
  // A better way is to just fetch to backend URL directly.
  
  const backendUrl = process.env.API_URL || 'http://localhost:4000';
  const url = `${backendUrl}/upload`;

  const cookie = request.headers.get('cookie') || '';
  const formData = await request.formData();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'cookie': cookie,
    },
    body: formData,
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
