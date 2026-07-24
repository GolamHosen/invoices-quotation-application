import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Company } from "@/db/schema";
import { uploadToCloudinary } from "@/lib/cloudinary";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const formData = await req.formData();

    const file = formData.get("file");
    const companyId = formData.get("companyId") as string;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing or invalid file" }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    let logoUrl = "";
    let logoPublicId: string | undefined = undefined;

    // Check if Cloudinary is configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      try {
        const uploaded = await uploadToCloudinary(file, {
          folder: `companies/${companyId}`,
          resourceType: "image",
        });
        logoUrl = uploaded.secureUrl;
        logoPublicId = uploaded.publicId;
      } catch (err) {
        console.warn("Cloudinary upload failed, falling back to local file storage:", err);
      }
    }

    // Fallback to local file storage if Cloudinary wasn't used or failed
    if (!logoUrl) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(file.name) || ".png";
      const filename = `${companyId}-logo-${Date.now()}${ext}`;
      const publicDir = path.join(process.cwd(), "public", "logos");

      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const filePath = path.join(publicDir, filename);
      fs.writeFileSync(filePath, buffer);
      logoUrl = `/logos/${filename}`;
    }

    // Update Company in MongoDB
    await Company.findByIdAndUpdate(companyId, {
      logoUrl,
      ...(logoPublicId ? { logoPublicId } : {}),
      updatedAt: new Date(),
    });

    return NextResponse.json({ logoUrl, logoPublicId, success: true });
  } catch (error) {
    console.error("Upload logo error:", error);
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 });
  }
}
