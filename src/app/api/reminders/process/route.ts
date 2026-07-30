import { NextRequest, NextResponse } from "next/server";
import { processPaymentReminders } from "@/lib/reminders";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await processPaymentReminders({
      clientId: body.clientId,
      companyId: body.companyId,
      force: body.force === true,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Process reminders error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const companyId = searchParams.get("companyId") || undefined;
    const force = searchParams.get("force") === "true";

    const result = await processPaymentReminders({ clientId, companyId, force });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Process reminders GET error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
