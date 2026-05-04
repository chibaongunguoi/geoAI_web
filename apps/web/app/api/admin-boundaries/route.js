import { NextResponse } from "next/server";

const GEOAI_BACKEND_URL =
  process.env.GEOAI_BACKEND_URL || "http://localhost:5000";

export async function GET() {
  try {
    const response = await fetch(`${GEOAI_BACKEND_URL}/admin-boundaries`, {
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Không tải được ranh giới: ${error.message}` },
      { status: 503 },
    );
  }
}
