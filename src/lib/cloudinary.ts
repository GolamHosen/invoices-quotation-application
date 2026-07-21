import { v2 as cloudinary } from "cloudinary";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    "Cloudinary env vars are not fully set. Expected CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
  );
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

export type UploadOptions = {
  folder: string;
  resourceType?: "image" | "video" | "raw" | "auto";
  filename?: string;
};

export type UploadedAsset = {
  publicId: string;
  secureUrl: string;
  url: string;
  resourceType: string;
  format?: string;
  bytes?: number;
};

export function getCloudinaryFolderPath(...segments: Array<string | undefined | null>) {
  return segments
    .filter(Boolean)
    .map((s) => String(s).trim().replace(/^\/+|\/+$/g, ""))
    .join("/");
}

export async function uploadToCloudinary(file: File, options: UploadOptions): Promise<UploadedAsset> {
  const resourceType = options.resourceType ?? "auto";

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: resourceType,
        // Avoid shorthand transformations that may be unsupported on your plan/account.
        // Use a safe transformation supported widely.
        transformation: [{ quality: "auto" }],
        use_filename: false,
        unique_filename: true,
      },
      (error: unknown, result: any) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Cloudinary upload returned empty result"));

        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          url: result.url,
          resourceType: result.resource_type,
          format: result.format,
          bytes: result.bytes,
        });
      }
    ).end(buffer);
  });
}

export async function uploadToCloudinaryWithPublicId(
  file: File,
  options: UploadOptions & { publicId: string }
): Promise<UploadedAsset> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: options.resourceType ?? "auto",
        // Avoid shorthand transformations that may be unsupported on your plan/account.
        transformation: [{ quality: "auto" }],
        use_filename: false,
        unique_filename: false,
      },
      (error: unknown, result: any) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Cloudinary upload returned empty result"));

        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          url: result.url,
          resourceType: result.resource_type,
          format: result.format,
          bytes: result.bytes,
        });
      }
    ).end(buffer);
  });
}

export async function deleteFromCloudinary(params: {
  publicId: string;
  resourceType?: "image" | "video" | "raw" | "auto";
}): Promise<{ result: string }> {
  const { publicId, resourceType = "auto" } = params;

  const res = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });

  return res as any;
}
