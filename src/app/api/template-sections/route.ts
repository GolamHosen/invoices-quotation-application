import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { TemplateSectionOption } from "@/db/schema";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const companyId = req.nextUrl.searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const result = await TemplateSectionOption.find({ companyId })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const formattedResult = result.map((t) => ({ ...t, id: t._id }));
    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error("Get template sections error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const body = await req.json();

    if (!body.companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const name = String(body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await TemplateSectionOption.findOne({
      companyId: body.companyId,
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
    }).lean();

    if (existing) {
      return NextResponse.json({ error: "Section option with this name already exists" }, { status: 409 });
    }

    // Get max sort order
    const maxSort = await TemplateSectionOption.findOne({ companyId: body.companyId })
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();

    const id = generateId();
    const sortOrder = (maxSort?.sortOrder ?? -1) + 1;

    await TemplateSectionOption.create({
      _id: id,
      companyId: body.companyId,
      name,
      sortOrder,
    });

    const result = await TemplateSectionOption.findById(id).lean();
    return NextResponse.json({ ...result, id: result!._id }, { status: 201 });
  } catch (error) {
    console.error("Create template section error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
