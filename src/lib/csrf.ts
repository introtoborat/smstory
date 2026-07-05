export const CSRF_COOKIE = "csrf-token";
export const CSRF_HEADER = "x-csrf-token";
export const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}
