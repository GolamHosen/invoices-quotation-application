import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Company } from "@/db/schema";
import { getQuotations, createQuotation } from "@/lib/turso-store";
import { generateId, generateQuotationNumber } from "@/lib/utils";
import { logDocumentCreation } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const clientId = req.nextUrl.searchParams.get("clientId") || undefined;
    const companyId = req.nextUrl.searchParams.get("companyId") || undefined;
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10", 10);

    // getQuotations now uses SQL JOINs to resolve client/project names
    // in a single batched query — no N+1 lookups needed
    const { data, total, totalPages } = await getQuotations({
      companyId,
      clientId,
      status,
      page,
      limit,
    });

    return NextResponse.json({
      data,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Get quotations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    await connectDb();
    const company = await Company.findById(body.companyId).lean();
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const id = generateId();
    const quotationNumber = body.quotationNumber || generateQuotationNumber(company.quotationPrefix);

    const result = await createQuotation({
      id,
      companyId: body.companyId,
      quotationNumber,
      clientId: body.clientId,
      projectId: body.projectId,
      templateId: body.templateId,
      status: body.status || "draft",
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sections: body.sections || [],
      subtotal: body.subtotal?.toString() || "0",
      gstAmount: body.gstAmount?.toString() || "0",
      totalAmount: body.totalAmount?.toString() || "0",
      termsAndConditions: body.termsAndConditions,
      notes: body.notes,
      createdBy: body.createdBy,
    });

    // Log document creation
    await logDocumentCreation({
      documentType: "quotation",
      documentId: id,
      documentNumber: quotationNumber,
      companyId: body.companyId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create quotation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
