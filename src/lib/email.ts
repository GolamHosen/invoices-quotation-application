import nodemailer from "nodemailer";
import { connectDb } from "@/db";
import { Quotation, Invoice, Client, Project, Company } from "@/db/schema";
import { generateQuotationPdf, generateInvoicePdf } from "@/lib/pdf";
import { formatDate, PROJECT_TYPES } from "@/lib/utils";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP credentials not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function getFromAddress(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";
}

async function generatePdfBuffer(docDefinition: any): Promise<Buffer> {
  // Dynamic imports for Vercel serverless compatibility (avoid top-level require)
  const pdfMakeModule = await import("pdfmake/build/pdfmake.js");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts.js");
  const pdfMake = (pdfMakeModule.default || pdfMakeModule) as any;
  const pdfFonts = (pdfFontsModule.default || pdfFontsModule) as any;
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : pdfFonts;
  const pdfDoc = pdfMake.createPdf(docDefinition);
  const buffer = await pdfDoc.getBuffer();
  return Buffer.from(buffer);
}

function getCompanyDefaults() {
  return {
    companyName: "Hujurat Construction Pty Ltd",
    abn: null,
    acn: null,
    address: null,
    phone: null,
    email: null,
    website: null,
    bankName: null,
    bankBsb: null,
    bankAccount: null,
    bankAccountName: null,
    gstEnabled: true,
    gstRate: "10",
    logoUrl: null,
    defaultTerms: null,
  };
}

export async function sendQuotationEmail(
  quotationId: string,
  options?: { to?: string; subject?: string; message?: string }
): Promise<{ success: boolean; sentTo: string }> {
  await connectDb();

  const q = await Quotation.findOne({ _id: quotationId }).lean();
  if (!q) throw new Error("Quotation not found");

  const [client, project, settings] = await Promise.all([
    Client.findOne({ _id: q.clientId }).lean(),
    Project.findOne({ _id: q.projectId }).lean(),
    Company.findOne({ _id: q.companyId }).lean(),
  ]);

  const recipientEmail = options?.to || client?.email;
  if (!recipientEmail) {
    throw new Error("No email address found for this client. Please add a client email or specify a recipient.");
  }

  const company = settings || getCompanyDefaults();
  const companyName = (company as any).companyName || "Hujurat Construction Pty Ltd";

  const docDefinition = generateQuotationPdf({
    company: company as any,
    quotationNumber: q.quotationNumber,
    issueDate: formatDate(q.issueDate),
    expiryDate: formatDate(q.expiryDate),
    client: {
      name: client?.name || "",
      companyName: client?.companyName || undefined,
      email: client?.email || undefined,
      phone: client?.phone || undefined,
      address: client?.address || undefined,
    },
    project: {
      name: project?.name || "",
      address: project?.address || undefined,
      type: PROJECT_TYPES.find((t) => t.value === project?.type)?.label || project?.type || "",
    },
    sections: (q.sections as any[]) || [],
    subtotal: parseFloat(q.subtotal),
    gstAmount: parseFloat(q.gstAmount),
    totalAmount: parseFloat(q.totalAmount),
    termsAndConditions: q.termsAndConditions || undefined,
    notes: q.notes || undefined,
  });

  const pdfBuffer = await generatePdfBuffer(docDefinition);

  const subject = options?.subject || `Quotation ${q.quotationNumber} from ${companyName}`;
  const clientName = client?.name || "Valued Customer";
  const messageBody = options?.message || `Dear ${clientName},\n\nPlease find attached the quotation ${q.quotationNumber} for your review.\n\nIf you have any questions or require clarification, please don't hesitate to contact us.\n\nKind regards,\n${companyName}`;

  const htmlBody = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${companyName}</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Construction Quotation</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="background: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="color: #6b7280; padding: 4px 0;">Quotation Number:</td><td style="font-weight: 600; text-align: right;">${q.quotationNumber}</td></tr>
            <tr><td style="color: #6b7280; padding: 4px 0;">Issue Date:</td><td style="text-align: right;">${formatDate(q.issueDate)}</td></tr>
            <tr><td style="color: #6b7280; padding: 4px 0;">Expiry Date:</td><td style="text-align: right;">${formatDate(q.expiryDate)}</td></tr>
            <tr><td style="color: #6b7280; padding: 4px 0;">Total Amount:</td><td style="font-weight: 700; font-size: 18px; color: #1e3a5f; text-align: right;">$${parseFloat(q.totalAmount).toFixed(2)}</td></tr>
          </table>
        </div>
        <div style="white-space: pre-line; font-size: 14px; line-height: 1.7; color: #4b5563;">${messageBody}</div>
      </div>
      <div style="background: #f9fafb; padding: 20px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">${companyName}${(company as any).phone ? ` | ${(company as any).phone}` : ""}${(company as any).email ? ` | ${(company as any).email}` : ""}</p>
      </div>
    </div>
  `;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: getFromAddress(),
    to: recipientEmail,
    subject,
    text: messageBody,
    html: htmlBody,
    attachments: [
      {
        filename: `quotation-${q.quotationNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  // Update status to "sent" if currently "draft"
  if (q.status === "draft") {
    await Quotation.findByIdAndUpdate(quotationId, { status: "sent", updatedAt: new Date() });
  }

  return { success: true, sentTo: recipientEmail };
}

export async function sendInvoiceEmail(
  invoiceId: string,
  options?: { to?: string; subject?: string; message?: string }
): Promise<{ success: boolean; sentTo: string }> {
  await connectDb();

  const inv = await Invoice.findOne({ _id: invoiceId }).lean();
  if (!inv) throw new Error("Invoice not found");

  const [client, project, settings] = await Promise.all([
    Client.findOne({ _id: inv.clientId }).lean(),
    Project.findOne({ _id: inv.projectId }).lean(),
    Company.findOne({ _id: inv.companyId }).lean(),
  ]);

  const recipientEmail = options?.to || client?.email;
  if (!recipientEmail) {
    throw new Error("No email address found for this client. Please add a client email or specify a recipient.");
  }

  const company = settings || getCompanyDefaults();
  const companyName = (company as any).companyName || "Hujurat Construction Pty Ltd";

  const docDefinition = generateInvoicePdf({
    company: company as any,
    invoiceNumber: inv.invoiceNumber,
    issueDate: formatDate(inv.issueDate),
    dueDate: formatDate(inv.dueDate),
    client: {
      name: client?.name || "",
      companyName: client?.companyName || undefined,
      email: client?.email || undefined,
      phone: client?.phone || undefined,
      address: client?.address || undefined,
    },
    project: {
      name: project?.name || "",
      address: project?.address || undefined,
      type: PROJECT_TYPES.find((t) => t.value === project?.type)?.label || project?.type || "",
    },
    sections: (inv.sections as any[]) || [],
    subtotal: parseFloat(inv.subtotal),
    gstAmount: parseFloat(inv.gstAmount),
    totalAmount: parseFloat(inv.totalAmount),
    paidAmount: parseFloat(inv.paidAmount),
    paymentTerms: inv.paymentTerms || undefined,
    notes: inv.notes || undefined,
    status: inv.status,
  });

  const pdfBuffer = await generatePdfBuffer(docDefinition);

  const subject = options?.subject || `Invoice ${inv.invoiceNumber} from ${companyName}`;
  const clientName = client?.name || "Valued Customer";
  const balanceDue = parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount);
  const messageBody = options?.message || `Dear ${clientName},\n\nPlease find attached the invoice ${inv.invoiceNumber} for your records.\n\nTotal Amount: $${parseFloat(inv.totalAmount).toFixed(2)}${balanceDue > 0 && balanceDue < parseFloat(inv.totalAmount) ? `\nBalance Due: $${balanceDue.toFixed(2)}` : ""}\nDue Date: ${formatDate(inv.dueDate)}\n\nPlease ensure payment is made by the due date. If you have any questions, please don't hesitate to contact us.\n\nKind regards,\n${companyName}`;

  const htmlBody = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${companyName}</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Invoice</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="background: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="color: #6b7280; padding: 4px 0;">Invoice Number:</td><td style="font-weight: 600; text-align: right;">${inv.invoiceNumber}</td></tr>
            <tr><td style="color: #6b7280; padding: 4px 0;">Issue Date:</td><td style="text-align: right;">${formatDate(inv.issueDate)}</td></tr>
            <tr><td style="color: #6b7280; padding: 4px 0;">Due Date:</td><td style="font-weight: 600; text-align: right;">${formatDate(inv.dueDate)}</td></tr>
            <tr><td style="color: #6b7280; padding: 4px 0;">Total Amount:</td><td style="font-weight: 700; font-size: 18px; color: #1e3a5f; text-align: right;">$${parseFloat(inv.totalAmount).toFixed(2)}</td></tr>
            ${balanceDue > 0 && balanceDue < parseFloat(inv.totalAmount) ? `<tr><td style="color: #6b7280; padding: 4px 0;">Balance Due:</td><td style="font-weight: 700; font-size: 16px; color: #dc2626; text-align: right;">$${balanceDue.toFixed(2)}</td></tr>` : ""}
          </table>
        </div>
        <div style="white-space: pre-line; font-size: 14px; line-height: 1.7; color: #4b5563;">${messageBody}</div>
      </div>
      <div style="background: #f9fafb; padding: 20px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">${companyName}${(company as any).phone ? ` | ${(company as any).phone}` : ""}${(company as any).email ? ` | ${(company as any).email}` : ""}</p>
      </div>
    </div>
  `;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: getFromAddress(),
    to: recipientEmail,
    subject,
    text: messageBody,
    html: htmlBody,
    attachments: [
      {
        filename: `invoice-${inv.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  // Update status to "sent" if currently "draft"
  if (inv.status === "draft") {
    await Invoice.findByIdAndUpdate(invoiceId, { status: "sent", updatedAt: new Date() });
  }

  return { success: true, sentTo: recipientEmail };
}
