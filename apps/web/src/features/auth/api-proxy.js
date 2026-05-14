import { NextResponse } from "next/server";

const API_URL = process.env.NEST_API_URL || "http://localhost:4000";

export function splitSetCookieHeader(value) {
  if (!value) return [];
  return String(value)
    .split(/,(?=\s*[^;,]+=)/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function proxyToApi(request, path, options = {}) {
  const headers = new Headers(options.headers || {});
  const cookie = request.headers.get("cookie");

  if (cookie) {
    headers.set("cookie", cookie);
  }

  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method || request.method,
      headers,
      body: options.body,
      cache: "no-store"
    });
  } catch {
    return NextResponse.json(
      { error: "Nest API is unavailable", target: API_URL },
      { status: 503 }
    );
  }

  const responseHeaders = new Headers();
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : splitSetCookieHeader(response.headers.get("set-cookie"));

  for (const cookie of setCookies) {
    responseHeaders.append("set-cookie", cookie);
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: responseHeaders
    });
  }

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: responseHeaders
  });
}
