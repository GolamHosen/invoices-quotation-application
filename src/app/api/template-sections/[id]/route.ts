import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { TemplateSectionOption } from "@/db/schema";

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
