import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Company } from "@/db/schema";
import { getInvoices, createInvoice } from "@/lib/turso-store";
import { generateId, generateInvoiceNumber } from "@/lib/utils";
import { logDocumentCreation } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const clientId = req.nextUrl.searchParams.get("clientId") || undefined;
    const companyId = req.nextUrl.searchParams.get("companyId") || undefined;
    const quotationId = req.nextUrl.searchParams.get("quotationId") || undefined;
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10", 10);

    // getInvoices now uses SQL JOINs to resolve client/project names
    // in a single batched query — no N+1 lookups needed
    const { data: invoices, total, totalPages } = await getInvoices({
      companyId,
      clientId,
      quotationId,
      status: status === "unpaid" ? undefined : status,
      page,
      limit,
    });

    let filteredInvoices = invoices;
    if (status === "unpaid") {
      filteredInvoices = invoices.filter((inv: any) => inv.status !== "paid");
    }

    return NextResponse.json({
      data: filteredInvoices,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Get invoices error:", error);
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
    const invoiceNumber = body.invoiceNumber || generateInvoiceNumber(company.invoicePrefix);

    const result = await createInvoice({
      id,
      companyId: body.companyId,
      invoiceNumber,
      quotationId: body.quotationId,
      clientId: body.clientId,
      projectId: body.projectId,
      status: body.status || "draft",
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      sections: body.sections || [],
      subtotal: body.subtotal?.toString() || "0",
      gstAmount: body.gstAmount?.toString() || "0",
      totalAmount: body.totalAmount?.toString() || "0",
      paidAmount: body.paidAmount?.toString() || "0",
      payments: body.payments || [],
      paymentTerms: body.paymentTerms,
      notes: body.notes,
      createdBy: body.createdBy,
    });

    // Log document creation
    await logDocumentCreation({
      documentType: "invoice",
      documentId: id,
      documentNumber: invoiceNumber,
      companyId: body.companyId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}