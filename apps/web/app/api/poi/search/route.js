import { proxyToApi } from "@/features/auth/api-proxy";
import { getCache, setCache } from "@/lib/redis";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request) {
  const search = new URL(request.url).search;
  const cookie = request.headers.get("cookie") || "";
  
  // Tạo cache key an toàn
  const hash = crypto.createHash("md5").update(cookie + search).digest("hex");
  const cacheKey = `poi:search:${hash}`;
  
  // Trả về từ cache nếu có
  const cachedResponse = await getCache(cacheKey);
  if (cachedResponse) {
    return NextResponse.json(cachedResponse);
  }

  // Nếu không có cache, lấy từ backend
  const res = await proxyToApi(request, `/poi/search${search}`, { method: "GET" });
  
  // Cache kết quả nếu thành công
  if (res.status === 200) {
    // Chúng ta cần clone response để đọc json, vì proxyToApi trả về NextResponse đã được format
    try {
      const clone = res.clone();
      const data = await clone.json();
      // Cache trong 2 phút (120 giây)
      await setCache(cacheKey, data, 120);
    } catch (err) {
      console.error("Failed to cache search response:", err);
    }
  }
  
  return res;
}
