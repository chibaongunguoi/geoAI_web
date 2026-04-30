import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { filterAssetsByBbox, parseBbox } from "@/features/map/assets";

export async function GET(request) {
  const bbox = parseBbox(new URL(request.url).searchParams.get("bbox"));
  if (!bbox) {
    return NextResponse.json(
      { success: false, error: "bbox must be minLng,minLat,maxLng,maxLat" },
      { status: 400 }
    );
  }

  try {
    const filePath = path.join(process.cwd(), "public", "data", "sample-assets.geojson");
    const payload = JSON.parse(await readFile(filePath, "utf8"));

    return NextResponse.json({
      ...payload,
      features: filterAssetsByBbox(payload.features, bbox)
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Không tải được tài sản: ${error.message}` },
      { status: 503 }
    );
  }
}
