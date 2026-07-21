import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Company } from "@/db/schema";

function formatCompany(c: Record<string, unknown>) {
  return { ...c, id: c._id };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const result = await Company.findById(id).lean();
    if (!result) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    return NextResponse.json(formatCompany(result as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("Get company error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const body = await req.json();
    const { _id, id: _id2, slug, quotationPrefix, invoicePrefix, ...updates } = body;
    await Company.findByIdAndUpdate(id, { ...updates, updatedAt: new Date() });
    const result = await Company.findById(id).lean();
    if (!result) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    return NextResponse.json(formatCompany(result as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("Update company error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
