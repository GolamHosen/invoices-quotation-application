import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Project, Client } from "@/db/schema";
import { generateId } from "@/lib/utils";
import { buildCompanyFilter } from "@/lib/companies";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const search = req.nextUrl.searchParams.get("search");
    const clientId = req.nextUrl.searchParams.get("clientId");
    const companyId = req.nextUrl.searchParams.get("companyId");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const filter = buildCompanyFilter(companyId);
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ name: regex }, { address: regex }];
    }
    if (clientId) {
      filter.clientId = clientId;
    }

    const [projects, total] = await Promise.all([
      Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Project.countDocuments(filter),
    ]);
    
    // Attach client names
    const clientIds = [...new Set(projects.map(p => p.clientId))];
    const clients = clientIds.length > 0
      ? await Client.find({ _id: { $in: clientIds } }).select("_id name").lean()
      : [];
    const clientMap = new Map(clients.map(c => [c._id, c.name]));
    
    const result = projects.map(p => ({
      ...p,
      id: p._id,
      clientName: clientMap.get(p.clientId) || null,
    }));

    return NextResponse.json({
      data: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get projects error:", error);
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
    const id = generateId();
    await Project.create({ _id: id, companyId: body.companyId, name: body.name, address: body.address, type: body.type, status: body.status || "pending", clientId: body.clientId, createdBy: body.createdBy });
    const result = await Project.findById(id).lean();
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}