import { NextRequest, NextResponse } from "next/server";
import { sendInvoiceEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { to, subject, message } = body as { to?: string; subject?: string; message?: string };

    const result = await sendInvoiceEmail(id, { to, subject, message });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Send invoice email error:", error);
    const message = error?.message || "Failed to send email";

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes("No email address") || message.includes("SMTP")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to send email. Please check your SMTP configuration." }, { status: 500 });
  }
}
