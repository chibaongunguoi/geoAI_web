import { splitSetCookieHeader } from "./api-proxy";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn()
  }
}));

describe("api-proxy", () => {
  it("splits multiple Set-Cookie values without splitting Expires dates", () => {
    expect(
      splitSetCookieHeader(
        "access_token=abc; Max-Age=900; Path=/; Expires=Sun, 10 May 2026 07:46:56 GMT; HttpOnly; SameSite=Lax, refresh_token=def; Max-Age=2592000; Path=/; Expires=Tue, 09 Jun 2026 07:31:56 GMT; HttpOnly; SameSite=Lax",
      ),
    ).toEqual([
      "access_token=abc; Max-Age=900; Path=/; Expires=Sun, 10 May 2026 07:46:56 GMT; HttpOnly; SameSite=Lax",
      "refresh_token=def; Max-Age=2592000; Path=/; Expires=Tue, 09 Jun 2026 07:31:56 GMT; HttpOnly; SameSite=Lax",
    ]);
  });
});
