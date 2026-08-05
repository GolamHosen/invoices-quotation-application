import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Quotation } from "@/db/schema";
import { logDocumentEdit, logStatusChange } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const result = await Quotation.findById(id).lean();
    if (!result) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get quotation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const body = await req.json();

    // Fetch the existing document BEFORE updating for audit comparison
    const oldDoc = await Quotation.findById(id).lean() as Record<string, unknown> | null;
    if (!oldDoc) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const oldStatus = String(oldDoc.status || "");

    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.issueDate) updateData.issueDate = new Date(body.issueDate);
    if (body.expiryDate) updateData.expiryDate = new Date(body.expiryDate);
    if (body.subtotal !== undefined) updateData.subtotal = body.subtotal.toString();
    if (body.gstAmount !== undefined) updateData.gstAmount = body.gstAmount.toString();
    if (body.totalAmount !== undefined) updateData.totalAmount = body.totalAmount.toString();
    await Quotation.findByIdAndUpdate(id, updateData);
    const result = await Quotation.findById(id).lean() as Record<string, unknown> | null;

    // Log audit entry for the edit (field-level changes)
    if (result) {
      const newStatus = String(result.status || "");
      const documentNumber = String(result.quotationNumber || "");
      const companyId = String(result.companyId || "");

      // If only the status changed (e.g., from the status dropdown), log as status_change
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
          oldDoc,
          newDoc: result,
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
    await connectDb();
    const { id } = await params;
    await Quotation.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete quotation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}