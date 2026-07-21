import { NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Company } from "@/db/schema";
import { ensureCompanies, migrateToMultiCompany } from "@/lib/seed-companies";

function formatCompany(c: any) {
  return { ...c, id: c._id };
}

export async function GET() {
  const startedAt = Date.now();

  try {
    console.log("[api/companies] GET start");
    await connectDb();

    // Ensure we always have the two company records available for the dashboard.
    // This also helps when the legacy single-tenant CompanySettings exists.
    // (safe to run repeatedly)
    const existingCount = await Company.countDocuments({});
    if (existingCount === 0) {
      console.log("[api/companies] existingCount=0 -> ensureCompanies()");
      await ensureCompanies();
    } else if (existingCount === 1) {
      // If only one company exists, attempt legacy migration/backfill.
      // If not applicable, migrateToMultiCompany should be harmless.
      console.log("[api/companies] existingCount=1 -> migrateToMultiCompany()");
      await migrateToMultiCompany();
    }

    const companies = await Company.find().sort({ slug: 1 }).lean();
    console.log(`[api/companies] GET done in ${Date.now() - startedAt}ms`);
    return NextResponse.json(companies.map(formatCompany));
  } catch (error) {
    console.error("[api/companies] Get companies error:", error);
    console.error(`[api/companies] GET failed after ${Date.now() - startedAt}ms`);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
