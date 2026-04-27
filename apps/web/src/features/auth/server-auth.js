import { cookies } from "next/headers";

const apiUrl = process.env.NEST_API_URL || "http://localhost:4000";

export async function serverFetch(path) {
  const cookieStore = await cookies();

  return fetch(`${apiUrl}${path}`, {
    headers: {
      cookie: cookieStore.toString()
    },
    cache: "no-store"
  });
}

export async function getCurrentUser() {
  const response = await serverFetch("/auth/me");

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.user || null;
}
