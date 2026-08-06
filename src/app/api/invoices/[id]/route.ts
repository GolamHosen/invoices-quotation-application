import { NextRequest, NextResponse } from "next/server";
import {
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  getInvoices,
  updateClient,
} from "@/lib/turso-store";
import { logDocumentEdit, logStatusChange, logPaymentAdded } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await getInvoiceById(id);
    if (!result) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const oldDoc = await getInvoiceById(id);
    if (!oldDoc) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const oldStatus = String(oldDoc.status || "");
    const oldPayments = (oldDoc.payments as any[]) || [];

    const updateData: Record<string, unknown> = { ...body };
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

    const result = await updateInvoice(id, updateData);

    if (result) {
      const newStatus = String(result.status || "");
      const documentNumber = String(result.invoiceNumber || "");
      const companyId = String(result.companyId || "");
      const newPayments = (result.payments as any[]) || [];

      const newPaymentAdded =
        newPayments.length > oldPayments.length && Array.isArray(body.payments);

      const onlyStatusChanged =
        newStatus !== oldStatus &&
        Object.keys(body).filter((k) => !["status", "updatedAt"].includes(k)).length === 0;

      if (newPaymentAdded) {
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
        await logDocumentEdit({
          documentType: "invoice",
          documentId: id,
          documentNumber,
          companyId,
          oldDoc: oldDoc as any,
          newDoc: result as any,
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
          oldDoc: oldDoc as any,
          newDoc: result as any,
        });
      }

      // Handle client reminder cleanup when invoice is paid
      const resultStatus = String(result.status || "");
      const resultPaidAmount = String(result.paidAmount || "0");
      const resultTotalAmount = String(result.totalAmount || "0");
      const resultClientId = String(result.clientId || "");

      if (resultStatus === "paid" || parseFloat(resultPaidAmount) >= parseFloat(resultTotalAmount)) {
        const clientInvoicesRes = await getInvoices({ clientId: resultClientId, limit: 100 });
        const remainingUnpaid = clientInvoicesRes.data.filter(
          (inv: any) => inv.id !== id && ["sent", "partially_paid", "overdue"].includes(inv.status)
        );

        const hasOtherUnpaid = remainingUnpaid.some((inv: any) => {
          return parseFloat(inv.totalAmount || "0") - parseFloat(inv.paidAmount || "0") > 0.01;
        });

        if (!hasOtherUnpaid) {
          await updateClient(resultClientId, { nextReminderDueAt: null });
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
    const { id } = await params;
    await deleteInvoice(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}