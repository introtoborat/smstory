import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { forbidden, unauthorized, badRequest } from "@/lib/api-response";
import { uploadStoryImage } from "@/lib/cloudinary";

// Allow up to 60 seconds for Cloudinary uploads (default serverless limit is often 10s)
export const maxDuration = 60;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// POST /api/upload - Upload a story cover image to Cloudinary
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("story.create");
    if (!user) return forbidden();

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return badRequest("Request must be multipart/form-data");
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return badRequest("No file provided");
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return badRequest("Only JPEG, PNG, WebP, and GIF images are allowed");
    }

    if (file.size > MAX_FILE_SIZE) {
      return badRequest("File size must not exceed 5 MB");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, publicId } = await uploadStoryImage(buffer);

    return NextResponse.json({ url, publicId }, { status: 200 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// Only allow POST
export async function GET() {
  return unauthorized();
}
