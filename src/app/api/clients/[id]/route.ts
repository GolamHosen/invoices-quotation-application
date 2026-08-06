import { NextRequest, NextResponse } from "next/server";
import {
  getClientById,
  updateClient,
  deleteClient,
  getQuotations,
  deleteQuotation,
  getInvoices,
  deleteInvoice,
  getProjects,
  deleteProject,
} from "@/lib/turso-store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await getClientById(id);
    if (!result) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get client error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const existing = await getClientById(id);
    if (!existing) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const updateData: Record<string, unknown> = { ...body };

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

    const result = await updateClient(id, updateData);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Update client error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rawCompanyId = req.nextUrl.searchParams.get("companyId");
    const companyId = rawCompanyId && rawCompanyId !== "all" ? rawCompanyId : null;

    const client = await getClientById(id);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    if (companyId && client.companyId !== companyId) {
      return NextResponse.json({ error: "Client not found in this company" }, { status: 404 });
    }

    const scopedCompanyId = companyId ?? client.companyId;

    // Cascading deletes in Turso
    const [clientInvoices, clientQuotations, clientProjects] = await Promise.all([
      getInvoices({ companyId: scopedCompanyId, clientId: id, limit: 1000 }),
      getQuotations({ companyId: scopedCompanyId, clientId: id, limit: 1000 }),
      getProjects(scopedCompanyId, id),
    ]);

    await Promise.all([
      ...clientInvoices.data.map((inv: any) => deleteInvoice(inv.id)),
      ...clientQuotations.data.map((q: any) => deleteQuotation(q.id)),
      ...clientProjects.map((p: any) => deleteProject(p.id)),
    ]);

    await deleteClient(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete client error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
