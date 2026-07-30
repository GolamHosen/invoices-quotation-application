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
    const existing = await Client.findById(id).lean();
    if (!existing) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };

    if (body.autoRemindersEnabled !== undefined) {
      updateData.autoRemindersEnabled = !!body.autoRemindersEnabled;
    }
    if (body.reminderIntervalDays !== undefined) {
      updateData.reminderIntervalDays = parseInt(body.reminderIntervalDays, 10) || 7;
    }

    const isEnabled = updateData.autoRemindersEnabled !== undefined ? Boolean(updateData.autoRemindersEnabled) : Boolean(existing.autoRemindersEnabled);
    const rawInterval = updateData.reminderIntervalDays !== undefined ? updateData.reminderIntervalDays : existing.reminderIntervalDays;
    const intervalDays: number = typeof rawInterval === "number" ? rawInterval : parseInt(String(rawInterval || "7"), 10) || 7;

    if (!isEnabled) {
      updateData.nextReminderDueAt = null;
    } else if (body.autoRemindersEnabled === true || body.reminderIntervalDays !== undefined) {
      const baseDate = existing.lastReminderSentAt ? new Date(existing.lastReminderSentAt) : new Date();
      const nextDue = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      updateData.nextReminderDueAt = nextDue;
    }

    await Client.findByIdAndUpdate(id, updateData);
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
    const rawCompanyId = req.nextUrl.searchParams.get("companyId");
    const companyId = rawCompanyId && rawCompanyId !== "all" ? rawCompanyId : null;

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
