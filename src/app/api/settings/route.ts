import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Company } from "@/db/schema";
import { ensureCompanies } from "@/lib/seed-companies";
import { COMPANY_COOKIE } from "@/lib/companies";
import { deleteFromCloudinary } from "@/lib/cloudinary";

function formatCompany(c: unknown) {
  const obj = c as Record<string, unknown> & { _id?: string };
  return { ...obj, id: obj._id };
}

function getCompanyIdFromCookie(req: NextRequest): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp("(^| )" + COMPANY_COOKIE + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function resolveCompanyId(req: NextRequest, explicit?: string | null): string | null {
  if (explicit && explicit !== "all") return explicit;
  return getCompanyIdFromCookie(req);
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const explicitCompanyId = req.nextUrl.searchParams.get("companyId");
    const companyId = resolveCompanyId(req, explicitCompanyId);

    // If companyId is missing, do not default to the first Company anymore.
    // The selected company must come from query or cookie to ensure tenant isolation.
    if (!companyId) {
      await ensureCompanies();
      const err = { error: "companyId is required" };
      return NextResponse.json(err, { status: 400 });
    }

    const result = await Company.findById(companyId).lean();
    if (!result) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    return NextResponse.json(formatCompany(result as unknown));
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDb();
    const body = await req.json();

    const explicitCompanyId = body.companyId || body.id || body._id;
    const companyId = resolveCompanyId(req, explicitCompanyId);

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const existing = await Company.findById(companyId).lean();
    if (!existing) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Handle logo replacement: if logoPublicId changes, delete the old asset.
    // Expected incoming fields (optional):
    // - logoUrl
    // - logoPublicId
    const nextLogoPublicId =
      typeof body.logoPublicId === "string" && body.logoPublicId.trim() ? body.logoPublicId.trim() : undefined;

    const oldLogoPublicId =
      typeof (existing as any).logoPublicId === "string" && (existing as any).logoPublicId.trim()
        ? (existing as any).logoPublicId.trim()
        : undefined;

    if (nextLogoPublicId && oldLogoPublicId && nextLogoPublicId !== oldLogoPublicId) {
      // Best-effort delete; don't block DB update if delete fails.
      // Tenant guard: our uploads use companies/{companyId}/... convention.
      if (oldLogoPublicId.startsWith(`companies/${companyId}/`)) {
        try {
          await deleteFromCloudinary({ publicId: oldLogoPublicId, resourceType: "auto" });
        } catch (e) {
          console.warn("Failed to delete old company logo from Cloudinary:", e);
        }
      }
    }

    const { _id, id, companyId: _cid, slug, quotationPrefix, invoicePrefix, ...updates } = body;
    await Company.findByIdAndUpdate(companyId, { ...updates, updatedAt: new Date() });
    const result = await Company.findById(companyId).lean();
    return NextResponse.json(formatCompany(result as unknown));
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
