import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Invoice, Client, Project, Company, Quotation } from "@/db/schema";
import { generateId, generateInvoiceNumber } from "@/lib/utils";
import { buildCompanyFilter } from "@/lib/companies";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const status = req.nextUrl.searchParams.get("status");
    const clientId = req.nextUrl.searchParams.get("clientId");
    const companyId = req.nextUrl.searchParams.get("companyId");
    const quotationId = req.nextUrl.searchParams.get("quotationId");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = buildCompanyFilter(companyId);
    if (status) {
      if (status === "unpaid") {
        (filter as any).status = { $ne: "paid" };
      } else {
        (filter as any).status = status;
      }
    }
    if (clientId) (filter as any).clientId = clientId;
    if (quotationId) (filter as any).quotationId = quotationId;

    // Run main query + count in parallel
    const [invoices, total] = await Promise.all([
      Invoice.find(filter).select("-sections").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Invoice.countDocuments(filter),
    ]);

    // Collect unique IDs for batch lookup
    const clientIds = [...new Set(invoices.map(inv => inv.clientId))];
    const projectIds = [...new Set(invoices.map(inv => inv.projectId))];
    const invoiceQuotationIds = [...new Set(invoices.map(inv => inv.quotationId).filter(Boolean))] as string[];

    // Run ALL related lookups in parallel (not sequential)
    const [clients, projects, quotationDocs] = await Promise.all([
      clientIds.length > 0
        ? Client.find({ _id: { $in: clientIds } }).select("_id name email").lean()
        : Promise.resolve([]),
      projectIds.length > 0
        ? Project.find({ _id: { $in: projectIds } }).select("_id name").lean()
        : Promise.resolve([]),
      invoiceQuotationIds.length > 0
        ? Quotation.find({ _id: { $in: invoiceQuotationIds } }).select("_id quotationNumber").lean()
        : Promise.resolve([]),
    ]);

    const clientMap = new Map(clients.map((c: any) => [c._id, c.name]));
    const clientEmailMap = new Map(clients.map((c: any) => [c._id, (c as any).email || null]));
    const projectMap = new Map(projects.map((p: any) => [p._id, p.name]));
    const quotationNumberMap = new Map(quotationDocs.map((q: any) => [q._id, q.quotationNumber]));

    const result = invoices.map(inv => ({
      ...inv,
      id: inv._id,
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
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const body = await req.json();
    if (!body.companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }
    
    const company = await Company.findById(body.companyId).lean();
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    
    const id = generateId();
    const invoiceNumber = body.invoiceNumber || generateInvoiceNumber(company.invoicePrefix);
    await Invoice.create({
      _id: id, companyId: body.companyId, invoiceNumber, quotationId: body.quotationId, clientId: body.clientId, projectId: body.projectId,
      status: body.status || "draft",
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      sections: body.sections, subtotal: body.subtotal?.toString() || "0",
      gstAmount: body.gstAmount?.toString() || "0", totalAmount: body.totalAmount?.toString() || "0",
      paidAmount: body.paidAmount?.toString() || "0",
      paymentTerms: body.paymentTerms, notes: body.notes, createdBy: body.createdBy,
    });
    const result = await Invoice.findById(id).lean();
    return NextResponse.json({ ...result, id: (result as any)._id }, { status: 201 });
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
