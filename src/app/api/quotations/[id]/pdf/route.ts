import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Quotation, Client, Project, Company } from "@/db/schema";
import { generateQuotationPdf } from "@/lib/pdf";
import { formatDate, PROJECT_TYPES } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;

    const q = await Quotation.findOne({ _id: id }).lean();
    if (!q) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

    const [client, project, settings] = await Promise.all([
      Client.findOne({ _id: q.clientId }).lean(),
      Project.findOne({ _id: q.projectId }).lean(),
      Company.findOne({ _id: q.companyId }).lean(),
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

    // Avoid runtime failure when Roboto TTF is missing from pdfmake VFS.
    // Use a font that is guaranteed to exist in pdfmake's bundled VFS.
    (docDefinition as any).defaultStyle = {
      ...(docDefinition as any).defaultStyle,
      font: "Times-Roman",
    };

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
        "Content-Disposition": `inline; filename="quotation-${q.quotationNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Generate quotation PDF error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
