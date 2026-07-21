import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Invoice } from "@/db/schema";

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
    await Invoice.findByIdAndUpdate(id, updateData);
    const result = await Invoice.findById(id).lean();
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