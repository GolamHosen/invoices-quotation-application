import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Client, Project, Quotation, Invoice } from "@/db/schema";
import { buildCompanyFilter } from "@/lib/companies";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const q = req.nextUrl.searchParams.get("q");
    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!q) return NextResponse.json({ clients: [], projects: [], quotations: [], invoices: [] });

    const regex = new RegExp(q, "i");
    const filter = buildCompanyFilter(companyId);

    const [clientResults, projectResults, quotationResults, invoiceResults] = await Promise.all([
      Client.find({ ...filter, $or: [{ name: regex }, { email: regex }, { companyName: regex }] }).limit(5).lean(),
      Project.find({ ...filter, $or: [{ name: regex }, { address: regex }] }).limit(5).lean(),
      Quotation.find({ ...filter, quotationNumber: regex }).select("_id quotationNumber status totalAmount createdAt").limit(5).lean(),
      Invoice.find({ ...filter, invoiceNumber: regex }).select("_id invoiceNumber status totalAmount createdAt").limit(5).lean(),
    ]);

    return NextResponse.json({ clients: clientResults, projects: projectResults, quotations: quotationResults, invoices: invoiceResults });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}