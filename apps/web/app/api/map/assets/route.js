import { NextResponse } from "next/server";
import { filterAssetsByBbox, parseBbox } from "@/features/map/assets";
import { getCache, setCache } from "@/lib/redis";
import crypto from "crypto";

const API_URL = process.env.NEST_API_URL || "http://localhost:4000";

export async function GET(request) {
  const bbox = parseBbox(new URL(request.url).searchParams.get("bbox"));
  if (!bbox) {
    return NextResponse.json(
      { success: false, error: "bbox must be minLng,minLat,maxLng,maxLat" },
      { status: 400 }
    );
  }

  try {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const cookie = request.headers.get("cookie") || "";
    
    // Tạo cache key dựa trên bbox và cookie để đảm bảo bảo mật dữ liệu theo phiên
    const hash = crypto.createHash("md5").update(cookie + bbox.join(",")).digest("hex");
    const cacheKey = `map:assets:${hash}`;
    
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const response = await fetch(
      `${API_URL}/poi/search?limit=5000&south=${minLat}&west=${minLng}&north=${maxLat}&east=${maxLng}`,
      {
        headers: cookie ? { cookie } : {},
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    const items = data.items || [];

    const features = items
      .filter((item) => item.centroidLat && item.centroidLng)
      .map((item) => ({
        type: "Feature",
        id: item.id,
        geometry: {
          type: "Point",
          coordinates: [item.centroidLng, item.centroidLat]
        },
        properties: {
          ...item,
          centroidLat: undefined,
          centroidLng: undefined
        }
      }));

    const result = {
      type: "FeatureCollection",
      features: filterAssetsByBbox(features, bbox)
    };

    // Cache kết quả trong 5 phút (300 giây)
    await setCache(cacheKey, result, 300);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Không tải được tài sản: ${error.message}` },
      { status: 503 }
    );
  }
}
