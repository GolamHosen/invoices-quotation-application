import nodemailer from "nodemailer";
import { connectDb } from "@/db";
import { Client, Invoice, Company, EmailLog } from "@/db/schema";
import { formatDate, formatCurrency, generateId } from "@/lib/utils";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secureEnv = process.env.SMTP_SECURE;
  const secure = secureEnv !== undefined ? secureEnv === "true" : port === 465;

  if (!host || !user || !pass) {
    throw new Error("SMTP credentials not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function getFromAddress(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";
}

export async function processPaymentReminders(options?: {
  clientId?: string;
  companyId?: string;
  force?: boolean;
}): Promise<{
  processedClients: number;
  remindersSent: number;
  stoppedReminders: number;
  errors: string[];
}> {
  await connectDb();

  const now = new Date();
  const filter: Record<string, any> = {};

  if (options?.clientId) {
    filter._id = options.clientId;
  }
  if (options?.companyId && options.companyId !== "all") {
    filter.companyId = options.companyId;
  }
  if (!options?.force) {
    filter.autoRemindersEnabled = true;
  }

  const clients = await Client.find(filter).lean();
  let remindersSent = 0;
  let stoppedReminders = 0;
  const errors: string[] = [];

  for (const client of clients) {
    if (!client.email) continue;

    // Check if client is due for a reminder unless forced
    if (!options?.force && client.autoRemindersEnabled) {
      if (client.nextReminderDueAt && new Date(client.nextReminderDueAt) > now) {
        continue; // Not due yet
      }
    }

    // Fetch unpaid invoices for this client
    const invoices = await Invoice.find({
      clientId: client._id,
      status: { $in: ["sent", "partially_paid", "overdue"] },
    }).lean();

    const unpaidInvoices = invoices.filter((inv: any) => {
      const total = parseFloat(inv.totalAmount || "0");
      const paid = parseFloat(inv.paidAmount || "0");
      return total - paid > 0.01;
    });

    // Requirement: Stop automatic reminders immediately once the client has completed payment
    if (unpaidInvoices.length === 0) {
      await Client.findByIdAndUpdate(client._id, {
        nextReminderDueAt: null,
        updatedAt: new Date(),
      });
      stoppedReminders++;
      continue;
    }

    // Calculate overall balance due
    const totalBalanceDue = unpaidInvoices.reduce((sum: number, inv: any) => {
      return sum + (parseFloat(inv.totalAmount || "0") - parseFloat(inv.paidAmount || "0"));
    }, 0);

    const company = await Company.findById(client.companyId).lean();
    const companyName = company?.companyName || "Hujurat Construction Pty Ltd";
    const intervalDays: number = Number(client.reminderIntervalDays) || 7;

    const subject = `Payment Reminder: Unpaid Invoices for ${client.name}`;

    const invoiceRowsHtml = unpaidInvoices.map((inv: any) => {
      const total = parseFloat(inv.totalAmount || "0");
      const paid = parseFloat(inv.paidAmount || "0");
      const balance = total - paid;
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${inv.invoiceNumber}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(inv.dueDate)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(total)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #059669;">${formatCurrency(paid)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; color: #dc2626;">${formatCurrency(balance)}</td>
        </tr>
      `;
    }).join("");

    const messageText = `Dear ${client.name},\n\nThis is a friendly payment reminder regarding your outstanding invoice(s) with ${companyName}.\n\nYou have ${unpaidInvoices.length} unpaid invoice(s) totaling ${formatCurrency(totalBalanceDue)}.\n\nPlease review and settle your payment at your earliest convenience.\n\nThank you,\n${companyName}`;

    const htmlBody = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">${companyName}</h1>
          <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Automatic Payment Reminder</p>
        </div>
        <div style="background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 15px; font-weight: 600; margin-top: 0;">Dear ${client.name},</p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
            This is a friendly reminder regarding your outstanding invoice balance with <strong>${companyName}</strong>.
          </p>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <thead>
                <tr style="background: #fee2e2; color: #991b1b; text-align: left;">
                  <th style="padding: 8px 12px;">Invoice #</th>
                  <th style="padding: 8px 12px;">Due Date</th>
                  <th style="padding: 8px 12px; text-align: right;">Total</th>
                  <th style="padding: 8px 12px; text-align: right;">Paid</th>
                  <th style="padding: 8px 12px; text-align: right;">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceRowsHtml}
              </tbody>
            </table>
            <div style="text-align: right; margin-top: 12px; font-size: 15px; font-weight: 700; color: #991b1b;">
              Total Outstanding: ${formatCurrency(totalBalanceDue)}
            </div>
          </div>

          <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
            If you have already processed this payment, please disregard this notice. Otherwise, we kindly ask that you settle the balance promptly.
          </p>
        </div>
        <div style="background: #f9fafb; padding: 16px 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">${companyName} | Automatic Reminders System</p>
        </div>
      </div>
    `;

    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: getFromAddress(),
        to: client.email,
        subject,
        text: messageText,
        html: htmlBody,
      });

      const nextDue = new Date(now.getTime() + (intervalDays * 24 * 60 * 60 * 1000));

      await Client.findByIdAndUpdate(client._id, {
        lastReminderSentAt: now,
        nextReminderDueAt: nextDue,
        updatedAt: new Date(),
      });

      const primaryDocNumber = unpaidInvoices[0]?.invoiceNumber || "REMINDER";
      await EmailLog.create({
        _id: generateId(),
        companyId: client.companyId,
        type: "invoice",
        documentId: unpaidInvoices[0]?._id || client._id,
        documentNumber: primaryDocNumber,
        recipientEmail: client.email,
        recipientName: client.name,
        subject,
        message: messageText,
        status: "sent",
        sentAt: now,
      });

      remindersSent++;
    } catch (err: any) {
      const errMsg = err?.message || "Failed to send reminder email";
      errors.push(`Client ${client.name}: ${errMsg}`);

      await EmailLog.create({
        _id: generateId(),
        companyId: client.companyId,
        type: "invoice",
        documentId: unpaidInvoices[0]?._id || client._id,
        documentNumber: unpaidInvoices[0]?.invoiceNumber || "REMINDER",
        recipientEmail: client.email,
        recipientName: client.name,
        subject,
        message: messageText,
        status: "failed",
        errorMessage: errMsg,
        sentAt: now,
      }).catch(() => {});
    }
  }

  return {
    processedClients: clients.length,
    remindersSent,
    stoppedReminders,
    errors,
  };
}
