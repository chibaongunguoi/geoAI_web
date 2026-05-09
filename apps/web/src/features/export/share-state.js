function toBase64Url(value) {
  const encoded =
    typeof window === "undefined"
      ? Buffer.from(value, "utf8").toString("base64")
      : window.btoa(unescape(encodeURIComponent(value)));
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = `${value}`.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return typeof window === "undefined"
    ? Buffer.from(padded, "base64").toString("utf8")
    : decodeURIComponent(escape(window.atob(padded)));
}

export function encodeShareState(state, options = {}) {
  const now = options.now || new Date();
  const expiresInHours = Number(options.expiresInHours || 72);
  const payload = {
    version: 1,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + expiresInHours * 60 * 60 * 1000).toISOString(),
    state,
  };

  return toBase64Url(JSON.stringify(payload));
}

export function decodeShareState(encoded, options = {}) {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(String(encoded || ""))) {
      throw new Error("Invalid characters");
    }

    const payload = JSON.parse(fromBase64Url(encoded));
    const now = options.now || new Date();
    const expiresAt = new Date(payload.expiresAt);
    if (!Number.isFinite(expiresAt.getTime())) {
      throw new Error("Invalid expiry");
    }

    if (expiresAt.getTime() < now.getTime()) {
      return {
        state: payload.state || null,
        expired: true,
        error: "Share link has expired.",
      };
    }

    return {
      state: payload.state || null,
      expired: false,
      error: null,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return {
      state: null,
      expired: false,
      error: "Share link is invalid.",
    };
  }
}

export function shareUrlFromState(state, baseUrl, options = {}) {
  const url = new URL(baseUrl || "http://localhost/");
  url.searchParams.set(
    "share",
    encodeShareState(state, {
      expiresInHours: options.expiresInHours,
      now: options.now,
    }),
  );
  return url.toString();
}
