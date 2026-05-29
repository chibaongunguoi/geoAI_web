export async function uploadAssetFile(file) {
  if (!file) return {};

  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload file thất bại.");
  }

  return response.json();
}

export function backendFileUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return `${base}${path}`;
}
