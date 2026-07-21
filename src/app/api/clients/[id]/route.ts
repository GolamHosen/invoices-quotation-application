import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Client, Project, Quotation, Invoice } from "@/db/schema";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const result = await Client.findById(id).lean();
    if (!result) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get client error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const body = await req.json();
    await Client.findByIdAndUpdate(id, { ...body, updatedAt: new Date() });
    const result = await Client.findById(id).lean();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Update client error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const companyId = req.nextUrl.searchParams.get("companyId");

    const client = await Client.findById(id).lean();
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    // Prevent cross-company accidental deletion
    if (companyId && client.companyId !== companyId) {
      return NextResponse.json({ error: "Client not found in this company" }, { status: 404 });
    }

    const scopedCompanyId = companyId ?? client.companyId;

    // Cascading delete (no dedicated “documents/notes/attachments” collections exist in schema;
    // quotation/invoice/client/project fields are embedded fields).
    await Promise.all([
      Invoice.deleteMany({ companyId: scopedCompanyId, clientId: id }),
      Quotation.deleteMany({ companyId: scopedCompanyId, clientId: id }),
      Project.deleteMany({ companyId: scopedCompanyId, clientId: id }),
    ]);

    await Client.deleteOne({ _id: id, companyId: scopedCompanyId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete client error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
