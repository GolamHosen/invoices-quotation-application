import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { TemplateSectionOption } from "@/db/schema";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const existing = await TemplateSectionOption.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: "Template section option not found" }, { status: 404 });
    }

    // Check for duplicate name (excluding self)
    const duplicate = await TemplateSectionOption.findOne({
      _id: { $ne: id },
      companyId: existing.companyId,
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
    }).lean();

    if (duplicate) {
      return NextResponse.json({ error: "Section option with this name already exists" }, { status: 409 });
    }

    const result = await TemplateSectionOption.findByIdAndUpdate(id, { name }, { new: true }).lean();
    return NextResponse.json({ ...result, id: result!._id });
  } catch (error) {
    console.error("Update template section error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const result = await TemplateSectionOption.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: "Template section option not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete template section error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
