import { decodeShareState, encodeShareState, shareUrlFromState } from "./share-state";

describe("share-state", () => {
  it("encodes and decodes URL-safe share state", () => {
    const state = {
      viewport: { center: { lat: 16.05, lng: 108.2 }, zoom: 14 },
      filters: { status: "ACTIVE" },
    };
    const encoded = encodeShareState(state, {
      now: new Date("2026-05-09T00:00:00.000Z"),
      expiresInHours: 24,
    });

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeShareState(encoded, { now: new Date("2026-05-09T01:00:00.000Z") })).toEqual(
      expect.objectContaining({
        expired: false,
        state: expect.objectContaining({ filters: { status: "ACTIVE" } }),
      }),
    );
  });

  it("marks expired or invalid share state as controlled errors", () => {
    const encoded = encodeShareState({ filters: {} }, {
      now: new Date("2026-05-09T00:00:00.000Z"),
      expiresInHours: 1,
    });

    expect(decodeShareState(encoded, { now: new Date("2026-05-09T02:00:00.000Z") })).toEqual(
      expect.objectContaining({ expired: true, error: "Share link has expired." }),
    );
    expect(decodeShareState("not-valid-***")).toEqual(
      expect.objectContaining({ state: null, error: "Share link is invalid." }),
    );
  });

  it("builds share URLs with the encoded payload", () => {
    expect(shareUrlFromState({ filters: { district: "Hai Chau" } }, "https://geoai.test/")).toContain(
      "share=",
    );
  });
});
