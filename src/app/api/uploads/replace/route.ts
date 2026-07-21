import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinaryWithPublicId, deleteFromCloudinary, type UploadOptions } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    // Accept multipart form-data with:
    // - file (required)
    // - oldPublicId (required) (text)
    // - resourceType (optional)
    // - folder (optional)
    const formData = await req.formData();

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing or invalid file" }, { status: 400 });
    }

    const oldPublicIdRaw = formData.get("oldPublicId");
    const oldPublicId = typeof oldPublicIdRaw === "string" ? oldPublicIdRaw.trim() : "";
    if (!oldPublicId) {
      return NextResponse.json({ error: "oldPublicId is required" }, { status: 400 });
    }

    const resourceTypeRaw = formData.get("resourceType");
    const resourceType =
      typeof resourceTypeRaw === "string" && ["image", "video", "raw", "auto"].includes(resourceTypeRaw)
        ? (resourceTypeRaw as UploadOptions["resourceType"])
        : undefined;

    const folderRaw = formData.get("folder");
    const folder = typeof folderRaw === "string" && folderRaw.trim() ? folderRaw.trim() : "uploads";

    const companyIdRaw = formData.get("companyId");
    const companyId = typeof companyIdRaw === "string" && companyIdRaw.trim() ? companyIdRaw.trim() : null;

    // Tenant guard (optional): if companyId provided, enforce expected public_id prefix.
    if (companyId) {
      const expectedPrefix = `companies/${companyId}/`;
      if (!oldPublicId.startsWith(expectedPrefix)) {
        return NextResponse.json({ error: "oldPublicId is not within this company scope" }, { status: 403 });
      }
    }

    // Upload new content using the same public_id (replaces asset in Cloudinary).
    const uploaded = await uploadToCloudinaryWithPublicId(file, {
      folder,
      publicId: oldPublicId,
      resourceType: resourceType ?? "auto",
    });

    // Best-effort cleanup:
    // In most cases, uploading with same public_id overwrites rather than creates new.
    // But for safety, we attempt destroy of the old asset with the old public_id.
    // If Cloudinary overwrote, destroy will remove the new asset too, so we only destroy if
    // resource type changed. Since we upload with same public_id and same resource_type default,
    // resource type usually matches; thus we skip destroy when resourceType is identical.
    //
    // NOTE: Cloudinary overwrite semantics: upload with same public_id replaces, so destroy is not needed.
    // We therefore do NOT call deleteFromCloudinary here to avoid accidental removal.
    return NextResponse.json({
      success: true,
      replaced: true,
      asset: uploaded,
    });
  } catch (error) {
    console.error("Cloudinary replace upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
