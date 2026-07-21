import { NextRequest, NextResponse } from "next/server";
import { deleteFromCloudinary } from "@/lib/cloudinary";

function resolveCompanyId(req: NextRequest): string | null {
  // Mirrors logic style used in other routes (settings)
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/(^| )hujurat_company_id=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const companyId = body.companyId ?? resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const { publicId } = body as { publicId?: string };
    const resourceType = body.resourceType as "image" | "video" | "raw" | "auto" | undefined;

    if (!publicId || typeof publicId !== "string") {
      return NextResponse.json({ error: "publicId is required" }, { status: 400 });
    }

    // Basic orphan prevention / tenant guard:
    // We expect company-scoped uploads to live under: companies/{companyId}/...
    // If the publicId doesn't match, refuse.
    const expectedPrefix = `companies/${companyId}/`;
    if (!publicId.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "publicId is not within this company scope" },
        { status: 403 }
      );
    }

    const result = await deleteFromCloudinary({
      publicId,
      resourceType: resourceType ?? "auto",
    });

    return NextResponse.json({ success: true, cloudinary: result });
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
