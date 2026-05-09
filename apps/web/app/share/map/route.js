import { NextResponse } from "next/server";

import { decodeShareState } from "@/features/export/share-state";

export async function GET(request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || url.searchParams.get("share") || "";
  const target = new URL("/", url.origin);

  if (!state) {
    target.searchParams.set("shareError", "missing");
    return NextResponse.redirect(target);
  }

  const decoded = decodeShareState(state);
  if (decoded.error) {
    target.searchParams.set("shareError", decoded.expired ? "expired" : "invalid");
    return NextResponse.redirect(target);
  }

  target.searchParams.set("share", state);
  return NextResponse.redirect(target);
}
