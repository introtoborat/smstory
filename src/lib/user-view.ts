// Shared helper to strip sensitive fields (password) from any user-shaped
// object before returning it to clients.
export function toPublicUser<T extends { password?: unknown }>(user: T) {
  const { password, ...rest } = user as T & { password?: unknown };
  return rest;
}