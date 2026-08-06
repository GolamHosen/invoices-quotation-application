import { NextRequest, NextResponse } from "next/server";
import { getClients, createClient } from "@/lib/turso-store";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search")?.toLowerCase();
    const companyId = req.nextUrl.searchParams.get("companyId") || undefined;
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10", 10);

    let allClients = await getClients(companyId);

    if (search) {
      allClients = allClients.filter(
        (c: any) =>
          c.name?.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.companyName?.toLowerCase().includes(search)
      );
    }

    const total = allClients.length;
    const skip = (page - 1) * limit;
    const paginated = allClients.slice(skip, skip + limit);

    return NextResponse.json({
      data: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get clients error:", error);
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
    const autoRemindersEnabled = !!body.autoRemindersEnabled;
    const reminderIntervalDays = parseInt(body.reminderIntervalDays || "7", 10) || 7;

    let nextReminderDueAt: Date | undefined = undefined;
    if (autoRemindersEnabled) {
      const due = new Date();
      due.setDate(due.getDate() + reminderIntervalDays);
      nextReminderDueAt = due;
    }

    const result = await createClient({
      id,
      companyId: body.companyId,
      name: body.name,
      companyName: body.companyName,
      phone: body.phone,
      email: body.email,
      address: body.address,
      notes: body.notes,
      autoRemindersEnabled,
      reminderIntervalDays,
      nextReminderDueAt,
      createdBy: body.createdBy,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
