import { NextResponse } from "next/server";
import { filterAssetsByBbox, parseBbox } from "@/features/map/assets";

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
    const cookie = request.headers.get("cookie");
    const response = await fetch(`${API_URL}/properties?limit=5000&source=all`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store"
    });

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

    return NextResponse.json({
      type: "FeatureCollection",
      features: filterAssetsByBbox(features, bbox)
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Không tải được tài sản: ${error.message}` },
      { status: 503 }
    );
  }
}
