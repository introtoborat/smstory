/**
 * Reads the csrf-token cookie and returns it, or fetches a new one from /api/auth/csrf.
 * Call this once on app load and cache the token.
 */
let _csrfToken: string | null = null;

export async function getCsrfToken(): Promise<string | null> {
  if (_csrfToken) return _csrfToken;

  // Try reading from cookie first
  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf-token="))
    ?.split("=")[1];

  if (cookieToken) {
    _csrfToken = cookieToken;
    return _csrfToken;
  }

  // Fetch a fresh token
  try {
    const res = await fetch("/api/auth/csrf", { credentials: "include" });
    if (res.ok) {
      const cookieToken2 = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrf-token="))
        ?.split("=")[1];
      if (cookieToken2) {
        _csrfToken = cookieToken2;
        return _csrfToken;
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

export function getCsrfTokenSync(): string | null {
  if (_csrfToken) return _csrfToken;

  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf-token="))
    ?.split("=")[1];

  if (cookieToken) {
    _csrfToken = cookieToken;
    return _csrfToken;
  }

  return null;
}

/** Fetch wrapper that includes CSRF token header for mutations. */
export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (isMutation) {
    const token = getCsrfTokenSync();
    if (token) {
      headers["x-csrf-token"] = token;
    } else {
      // Try to get token synchronously from cookie; if not, we'll still
      // proceed and let the middleware reject with a clear error.
      const directCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrf-token="))
        ?.split("=")[1];
      if (directCookie) {
        headers["x-csrf-token"] = directCookie;
        _csrfToken = directCookie;
      }
    }
  }

  if (!headers["Content-Type"] && options.body) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, { ...options, headers, credentials: "include" });
}