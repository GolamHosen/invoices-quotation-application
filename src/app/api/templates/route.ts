import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Template } from "@/db/schema";
import { generateId } from "@/lib/utils";
import { buildCompanyFilter } from "@/lib/companies";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const projectType = req.nextUrl.searchParams.get("projectType");
    const companyId = req.nextUrl.searchParams.get("companyId");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;
    
    const filter = buildCompanyFilter(companyId);
    if (projectType) {
      filter.projectType = projectType;
    }
    
    const [templates, total] = await Promise.all([
      Template.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Template.countDocuments(filter),
    ]);
    
    const formattedResult = templates.map(t => ({ ...t, id: t._id }));
    return NextResponse.json({
      data: formattedResult,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get templates error:", error);
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
    if (!body.projectType) {
      return NextResponse.json({ error: "projectType is required" }, { status: 400 });
    }
    if (!Array.isArray(body.sections) || body.sections.length === 0) {
      return NextResponse.json({ error: "sections must be a non-empty array" }, { status: 400 });
    }

    // Normalize to match Mongoose schema requirements
    const normalizedSections = body.sections.map((sec: any) => ({
      id: sec?.id ?? generateId(),
      name: String(sec?.name ?? "").trim(),
      items: (Array.isArray(sec?.items) ? sec.items : []).map((it: any) => {
        const rawDescription = String(it?.description ?? "").trim();
        // Mongoose requires a non-empty description string
        const description = rawDescription.length > 0 ? rawDescription : "Description";
        return {
          id: it?.id ?? generateId(),
          description,
          quantity: Number.isFinite(Number(it?.quantity)) ? Number(it?.quantity) : 0,
          unit: String(it?.unit ?? ""),
          rate: Number.isFinite(Number(it?.rate)) ? Number(it?.rate) : 0,
        };
      }),
    }));

    const id = generateId();

    const normalizedTemplateDescription =
      typeof body?.description === "string" ? body.description.trim() : "";

    await Template.create({
      _id: id,
      companyId: body.companyId,
      name: String(body?.name ?? "").trim(),
      // Keep empty string instead of undefined so UI consistently receives a string
      description: normalizedTemplateDescription,
      projectType: body.projectType,
      isDefault: body.isDefault || false,
      sections: normalizedSections,
      notes: typeof body?.notes === "string" ? body.notes : "",
      createdBy: body?.createdBy,
    });

    const result = await Template.findById(id).lean();
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
