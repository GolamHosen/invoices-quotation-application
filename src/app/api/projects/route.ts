import { NextRequest, NextResponse } from "next/server";
import { getProjects, getClientById, createProject } from "@/lib/turso-store";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search")?.toLowerCase();
    const clientId = req.nextUrl.searchParams.get("clientId") || undefined;
    const companyId = req.nextUrl.searchParams.get("companyId") || undefined;
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10", 10);

    let projects = await getProjects(companyId, clientId);

    if (search) {
      projects = projects.filter(
        (p: any) =>
          p.name?.toLowerCase().includes(search) ||
          p.address?.toLowerCase().includes(search)
      );
    }

    const total = projects.length;
    const skip = (page - 1) * limit;
    const paginated = projects.slice(skip, skip + limit);

    // Attach client names
    const clientIds = [...new Set(paginated.map((p: any) => p.clientId))];
    const clientMap = new Map();
    await Promise.all(
      clientIds.map(async (cId) => {
        if (cId) {
          const client = await getClientById(cId);
          if (client) clientMap.set(cId, client.name);
        }
      })
    );

    const result = paginated.map((p: any) => ({
      ...p,
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
    const body = await req.json();
    if (!body.companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }
    const id = generateId();
    const result = await createProject({
      id,
      companyId: body.companyId,
      name: body.name,
      address: body.address,
      type: body.type,
      status: body.status || "pending",
      clientId: body.clientId,
      createdBy: body.createdBy,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}