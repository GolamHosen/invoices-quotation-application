import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Client } from "@/db/schema";
import { generateId } from "@/lib/utils";
import { buildCompanyFilter } from "@/lib/companies";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const search = req.nextUrl.searchParams.get("search");
    const companyId = req.nextUrl.searchParams.get("companyId");
    const filter = buildCompanyFilter(companyId);
    let result;
    if (search) {
      const regex = new RegExp(search, "i");
      result = await Client.find({
        ...filter,
        $or: [{ name: regex }, { email: regex }, { companyName: regex }],
      }).sort({ createdAt: -1 }).lean();
    } else {
      result = await Client.find(filter).sort({ createdAt: -1 }).lean();
    }
    const formattedResult = result.map(c => ({ ...c, id: c._id }));
    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error("Get clients error:", error);
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
    await Client.create({ _id: id, companyId: body.companyId, name: body.name, companyName: body.companyName, phone: body.phone, email: body.email, address: body.address, notes: body.notes, createdBy: body.createdBy });
    const result = await Client.findById(id).lean();
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
