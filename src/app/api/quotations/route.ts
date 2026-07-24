import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Quotation, Client, Project, Company } from "@/db/schema";
import { generateId, generateQuotationNumber } from "@/lib/utils";
import { buildCompanyFilter } from "@/lib/companies";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const status = req.nextUrl.searchParams.get("status");
    const clientId = req.nextUrl.searchParams.get("clientId");
    const companyId = req.nextUrl.searchParams.get("companyId");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const filter = buildCompanyFilter(companyId);
    if (status) filter.status = status;
    if (clientId) filter.clientId = clientId;

    const [quotations, total] = await Promise.all([
      Quotation.find(filter).select("-sections").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Quotation.countDocuments(filter),
    ]);

    // Attach client and project names
    const clientIds = [...new Set(quotations.map(q => q.clientId))];
    const projectIds = [...new Set(quotations.map(q => q.projectId))];
    const [clients, projects] = await Promise.all([
      clientIds.length > 0
        ? Client.find({ _id: { $in: clientIds } }).select("_id name email").lean()
        : Promise.resolve([]),
      projectIds.length > 0
        ? Project.find({ _id: { $in: projectIds } }).select("_id name").lean()
        : Promise.resolve([]),
    ]);
    const clientMap = new Map(clients.map(c => [c._id, c.name]));
    const clientEmailMap = new Map(clients.map(c => [c._id, (c as any).email || null]));
    const projectMap = new Map(projects.map(p => [p._id, p.name]));

    const result = quotations.map(q => ({
      ...q,
      id: q._id,
      clientName: clientMap.get(q.clientId) || null,
      clientEmail: clientEmailMap.get(q.clientId) || null,
      projectName: projectMap.get(q.projectId) || null,
    }));

    return NextResponse.json({
      data: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get quotations error:", error);
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
    const quotationNumber = body.quotationNumber || generateQuotationNumber(company.quotationPrefix);
    await Quotation.create({
      _id: id, companyId: body.companyId, quotationNumber, clientId: body.clientId, projectId: body.projectId,
      templateId: body.templateId, status: body.status || "draft",
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sections: body.sections, subtotal: body.subtotal?.toString() || "0",
      gstAmount: body.gstAmount?.toString() || "0", totalAmount: body.totalAmount?.toString() || "0",
      termsAndConditions: body.termsAndConditions, notes: body.notes, createdBy: body.createdBy,
    });
    const result = await Quotation.findById(id).lean();
    return NextResponse.json({ ...result, id: (result as any)._id }, { status: 201 });
  } catch (error) {
    console.error("Create quotation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
