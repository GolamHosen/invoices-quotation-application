import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Invoice, Client } from "@/db/schema";
import { logDocumentEdit, logStatusChange, logPaymentAdded } from "@/lib/audit";

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

    // Fetch the existing document BEFORE updating for audit comparison
    const oldDoc = await Invoice.findById(id).lean() as Record<string, unknown> | null;
    if (!oldDoc) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const oldStatus = String(oldDoc.status || "");
    const oldPayments = (oldDoc.payments as any[]) || [];

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
    const result = await Invoice.findById(id).lean() as Record<string, unknown> | null;

    // Log audit entry for the edit (field-level changes)
    if (result) {
      const newStatus = String(result.status || "");
      const documentNumber = String(result.invoiceNumber || "");
      const companyId = String(result.companyId || "");
      const newPayments = (result.payments as any[]) || [];

      // Detect if a new payment was added
      const newPaymentAdded =
        newPayments.length > oldPayments.length &&
        Array.isArray(body.payments);

      // If only the status changed (e.g., from the status dropdown), log as status_change
      const onlyStatusChanged =
        newStatus !== oldStatus &&
        Object.keys(body).filter((k) => !["status", "updatedAt"].includes(k)).length === 0;

      if (newPaymentAdded) {
        // Log each newly added payment
        const addedPayments = newPayments.slice(oldPayments.length);
        for (const p of addedPayments) {
          await logPaymentAdded({
            documentId: id,
            documentNumber,
            companyId,
            amount: parseFloat(p.amount) || 0,
            date: p.date ? new Date(p.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            note: p.note,
          });
        }
        // Also log the full edit (which may include status change due to payment)
        await logDocumentEdit({
          documentType: "invoice",
          documentId: id,
          documentNumber,
          companyId,
          oldDoc,
          newDoc: result,
        });
      } else if (onlyStatusChanged) {
        await logStatusChange({
          documentType: "invoice",
          documentId: id,
          documentNumber,
          companyId,
          oldStatus,
          newStatus,
        });
      } else {
        await logDocumentEdit({
          documentType: "invoice",
          documentId: id,
          documentNumber,
          companyId,
          oldDoc,
          newDoc: result,
        });
      }
    }

    // Handle client reminder cleanup when invoice is paid
    if (result) {
      const resultStatus = String(result.status || "");
      const resultPaidAmount = String(result.paidAmount || "0");
      const resultTotalAmount = String(result.totalAmount || "0");
      const resultClientId = String(result.clientId || "");

      if (resultStatus === "paid" || parseFloat(resultPaidAmount) >= parseFloat(resultTotalAmount)) {
        const remainingUnpaid = await Invoice.find({
          clientId: resultClientId,
          _id: { $ne: id },
          status: { $in: ["sent", "partially_paid", "overdue"] },
        }).lean();

        const hasOtherUnpaid = remainingUnpaid.some((inv: any) => {
          return parseFloat(inv.totalAmount || "0") - parseFloat(inv.paidAmount || "0") > 0.01;
        });

        if (!hasOtherUnpaid) {
          await Client.findByIdAndUpdate(resultClientId, {
            nextReminderDueAt: null,
            updatedAt: new Date(),
          });
        }
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