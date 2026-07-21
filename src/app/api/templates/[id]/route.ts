import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Template } from "@/db/schema";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const result = await Template.findById(id).lean();
    if (!result) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    return NextResponse.json({ ...result, id: (result as any)._id });
  } catch (error) {
    console.error("Get template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const body = await req.json();
    await Template.findByIdAndUpdate(id, { ...body, updatedAt: new Date() });
    const result = await Template.findById(id).lean();
    if (!result) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    return NextResponse.json({ ...result, id: (result as any)._id });
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    await Template.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}