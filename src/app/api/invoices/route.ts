import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Company } from "@/db/schema";
import {
  getInvoices,
  createInvoice,
  getClientById,
  getProjectById,
  getQuotationById,
} from "@/lib/turso-store";
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

    const clientMap = new Map();
    const clientEmailMap = new Map();
    const projectMap = new Map();
    const quotationNumberMap = new Map();

    const clientIds = [...new Set(filteredInvoices.map((inv: any) => inv.clientId))];
    const projectIds = [...new Set(filteredInvoices.map((inv: any) => inv.projectId))];
    const invoiceQuotationIds = [...new Set(filteredInvoices.map((inv: any) => inv.quotationId).filter(Boolean))];

    await Promise.all([
      ...clientIds.map(async (cId) => {
        if (cId) {
          const client = await getClientById(cId);
          if (client) {
            clientMap.set(cId, client.name);
            clientEmailMap.set(cId, client.email || null);
          }
        }
      }),
      ...projectIds.map(async (pId) => {
        if (pId) {
          const project = await getProjectById(pId);
          if (project) projectMap.set(pId, project.name);
        }
      }),
      ...invoiceQuotationIds.map(async (qId) => {
        if (qId) {
          const quotation = await getQuotationById(qId);
          if (quotation) quotationNumberMap.set(qId, quotation.quotationNumber);
        }
      }),
    ]);

    const result = filteredInvoices.map((inv: any) => ({
      ...inv,
      clientName: clientMap.get(inv.clientId) || null,
      clientEmail: clientEmailMap.get(inv.clientId) || null,
      projectName: projectMap.get(inv.projectId) || null,
      quotationNumber: inv.quotationId ? quotationNumberMap.get(inv.quotationId) || null : null,
      quotationId: inv.quotationId || null,
    }));

    return NextResponse.json({
      data: result,
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