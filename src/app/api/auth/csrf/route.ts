import { NextResponse } from "next/server";
import { generateAndSetCsrfCookie } from "@/lib/auth";

// GET /api/auth/csrf - Returns a CSRF token for the current session.
// The token is set as a non-httpOnly cookie so client JS can read it
// and send it as an X-CSRF-Token header on state-changing requests.
export async function GET() {
  const response = NextResponse.json({ success: true });
  generateAndSetCsrfCookie(response);
  return response;
}