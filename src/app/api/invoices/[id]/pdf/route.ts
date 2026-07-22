import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Invoice, Client, Project, Company } from "@/db/schema";
import { generateInvoicePdf } from "@/lib/pdf";
import { formatDate, PROJECT_TYPES } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;

    const inv = await Invoice.findOne({ _id: id }).lean();
    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const [client, project, settings] = await Promise.all([
      Client.findOne({ _id: inv.clientId }).lean(),
      Project.findOne({ _id: inv.projectId }).lean(),
      Company.findOne({ _id: inv.companyId }).lean(),
    ]);

    const company =
      settings || {
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

    // Dynamic import for Vercel serverless compatibility
    const pdfMakeModule = await import("pdfmake/build/pdfmake.js");
    const pdfFontsModule = await import("pdfmake/build/vfs_fonts.js");
    const pdfMake = pdfMakeModule.default || pdfMakeModule;
    const pdfFonts = pdfFontsModule.default || pdfFontsModule;
    (pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : pdfFonts;
    const pdfDoc = pdfMake.createPdf(docDefinition);

    const buffer = await pdfDoc.getBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${inv.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Generate invoice PDF error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
