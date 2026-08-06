import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Company } from "@/db/schema";
import { getQuotations, createQuotation, getClientById, getProjectById } from "@/lib/turso-store";
import { generateId, generateQuotationNumber } from "@/lib/utils";
import { logDocumentCreation } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const clientId = req.nextUrl.searchParams.get("clientId") || undefined;
    const companyId = req.nextUrl.searchParams.get("companyId") || undefined;
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10", 10);

    const { data: quotations, total, totalPages } = await getQuotations({
      companyId,
      clientId,
      status,
      page,
      limit,
    });

    // Attach client and project names
    const clientMap = new Map();
    const clientEmailMap = new Map();
    const projectMap = new Map();

    const clientIds = [...new Set(quotations.map((q: any) => q.clientId))];
    const projectIds = [...new Set(quotations.map((q: any) => q.projectId))];

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
    ]);

    const result = quotations.map((q: any) => ({
      ...q,
      clientName: clientMap.get(q.clientId) || null,
      clientEmail: clientEmailMap.get(q.clientId) || null,
      projectName: projectMap.get(q.projectId) || null,
    }));

    return NextResponse.json({
      data: result,
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
