import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary, type UploadOptions } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing or invalid file" }, { status: 400 });
    }

    const folderRaw = formData.get("folder");
    const folder = typeof folderRaw === "string" && folderRaw.trim() ? folderRaw.trim() : "uploads";

    const resourceTypeRaw = formData.get("resourceType");
    const resourceType =
      typeof resourceTypeRaw === "string" &&
      ["image", "video", "raw", "auto"].includes(resourceTypeRaw)
        ? (resourceTypeRaw as UploadOptions["resourceType"])
        : undefined;

    const options: UploadOptions = {
      folder,
      resourceType: resourceType ?? "auto",
    };

    const uploaded = await uploadToCloudinary(file, options);

    return NextResponse.json({
      ...uploaded,
      folder,
      resourceType: options.resourceType ?? "auto",
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
