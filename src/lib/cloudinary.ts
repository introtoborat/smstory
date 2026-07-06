import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 120000, // 120 second SDK-level timeout
});

export { cloudinary };

export async function uploadStoryImage(
  file: Buffer,
  options?: { publicId?: string; folder?: string }
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    // Manual timeout guard — upload_stream options don't support a timeout field
    const timeoutId = setTimeout(() => {
      reject(new Error("Upload timed out after 55 seconds"));
    }, 55000);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options?.folder ?? "story-covers",
        public_id: options?.publicId,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        clearTimeout(timeoutId);
        if (error || !result) {
          reject(error ?? new Error("Upload failed"));
        } else {
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      }
    );
    uploadStream.end(file);
  });
}

export async function deleteStoryImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
