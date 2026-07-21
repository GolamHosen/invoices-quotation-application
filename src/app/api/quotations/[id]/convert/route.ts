import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Invoice, Quotation, Company } from "@/db/schema";
import { generateInvoiceNumber, generateId } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;

    const q = await Quotation.findOne({ _id: id }).lean();
    if (!q) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    
    const company = await Company.findOne({ _id: q.companyId }).lean();
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const body = await req.json();
    const invoiceNumber = body.invoiceNumber || generateInvoiceNumber(company.invoicePrefix);

    const invoiceId = generateId();

    const createdInvoice = await Invoice.create({
      _id: invoiceId,
      companyId: q.companyId,
      invoiceNumber,
      quotationId: q._id,
      clientId: q.clientId,
      projectId: q.projectId,
      status: "draft",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      sections: q.sections,
      subtotal: q.subtotal,
      gstAmount: q.gstAmount,
      totalAmount: q.totalAmount,
      paidAmount: "0",
      paymentTerms: body.paymentTerms || "Payment due within 14 days",
      notes: q.notes,
      createdBy: body.createdBy,
    });

    await Quotation.updateOne({ _id: id }, { $set: { status: "approved" } });

    return NextResponse.json(createdInvoice.toObject(), { status: 201 });
  } catch (error) {
    console.error("Convert to invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
