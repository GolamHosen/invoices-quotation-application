import { NextRequest, NextResponse } from "next/server";
import { getQuotationById, updateQuotation, deleteQuotation } from "@/lib/turso-store";
import { logDocumentEdit, logStatusChange } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await getQuotationById(id);
    if (!result) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get quotation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const oldDoc = await getQuotationById(id);
    if (!oldDoc) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const oldStatus = String(oldDoc.status || "");

    const updateData: Record<string, unknown> = { ...body };
    if (body.subtotal !== undefined) updateData.subtotal = body.subtotal.toString();
    if (body.gstAmount !== undefined) updateData.gstAmount = body.gstAmount.toString();
    if (body.totalAmount !== undefined) updateData.totalAmount = body.totalAmount.toString();

    const result = await updateQuotation(id, updateData);

    if (result) {
      const newStatus = String(result.status || "");
      const documentNumber = String(result.quotationNumber || "");
      const companyId = String(result.companyId || "");

      const onlyStatusChanged =
        newStatus !== oldStatus &&
        Object.keys(body).filter((k) => !["status", "updatedAt"].includes(k)).length === 0;

      if (onlyStatusChanged) {
        await logStatusChange({
          documentType: "quotation",
          documentId: id,
          documentNumber,
          companyId,
          oldStatus,
          newStatus,
        });
      } else {
        await logDocumentEdit({
          documentType: "quotation",
          documentId: id,
          documentNumber,
          companyId,
          oldDoc: oldDoc as any,
          newDoc: result as any,
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Update quotation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteQuotation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete quotation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}