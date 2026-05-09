import { GET } from "./route";
import { encodeShareState } from "@/features/export/share-state";

jest.mock("next/server", () => ({
  NextResponse: {
    redirect: (url) =>
      ({
        status: 307,
        headers: {
          get: (key) => (key.toLowerCase() === "location" ? url.toString() : null),
        },
      }),
  },
}));

describe("GET /share/map", () => {
  it("redirects valid share payloads to the map page", async () => {
    const state = encodeShareState({ filters: { status: "ACTIVE" } }, {
      now: new Date("2026-05-09T00:00:00.000Z"),
      expiresInHours: 24,
    });
    const response = await GET({ url: `https://geoai.test/share/map?state=${state}` });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(`/?share=${state}`);
  });

  it("redirects invalid share payloads with an error marker", async () => {
    const response = await GET({ url: "https://geoai.test/share/map?state=bad-***" });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("shareError=invalid");
  });
});
