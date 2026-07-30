import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Invoice, Client } from "@/db/schema";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const result = await Invoice.findById(id).lean();
    if (!result) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const body = await req.json();
    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.issueDate) updateData.issueDate = new Date(body.issueDate);
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
    if (body.subtotal !== undefined) updateData.subtotal = body.subtotal.toString();
    if (body.gstAmount !== undefined) updateData.gstAmount = body.gstAmount.toString();
    if (body.totalAmount !== undefined) updateData.totalAmount = body.totalAmount.toString();
    if (body.paidAmount !== undefined) updateData.paidAmount = body.paidAmount.toString();
    if (Array.isArray(body.payments)) {
      updateData.payments = body.payments.map((p: any) => ({
        ...p,
        amount: Number(p.amount) || 0,
        date: p.date ? new Date(p.date) : new Date(),
      }));
    }
    await Invoice.findByIdAndUpdate(id, updateData);
    const result = await Invoice.findById(id).lean();

    if (result && (result.status === "paid" || parseFloat(result.paidAmount || "0") >= parseFloat(result.totalAmount || "0"))) {
      const remainingUnpaid = await Invoice.find({
        clientId: result.clientId,
        _id: { $ne: id },
        status: { $in: ["sent", "partially_paid", "overdue"] },
      }).lean();

      const hasOtherUnpaid = remainingUnpaid.some((inv: any) => {
        return parseFloat(inv.totalAmount || "0") - parseFloat(inv.paidAmount || "0") > 0.01;
      });

      if (!hasOtherUnpaid) {
        await Client.findByIdAndUpdate(result.clientId, {
          nextReminderDueAt: null,
          updatedAt: new Date(),
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Update invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    await Invoice.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}