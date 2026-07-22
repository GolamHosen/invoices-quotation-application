/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import type { CompanySettings } from "./types";

type AnyContent = any;

export function generateQuotationPdf(data: {
  company: CompanySettings;
  quotationNumber: string;
  issueDate: string;
  expiryDate: string;
  client: { name: string; companyName?: string; email?: string; phone?: string; address?: string };
  project: { name: string; address?: string; type: string };
  sections: { name: string; items: { description: string; quantity: number; unit: string; rate: number; amount: number }[] }[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  termsAndConditions?: string;
  notes?: string;
}): TDocumentDefinitions {
  const { company, quotationNumber, issueDate, expiryDate, client, project, sections, subtotal, gstAmount, totalAmount, termsAndConditions, notes } = data;

  // Register Roboto font family (bundled with pdfmake's vfs_fonts.js)
  const fonts = {
    Roboto: {
      normal: "Roboto-Regular",
      bold: "Roboto-Medium",
      italics: "Roboto-Italic",
      bolditalics: "Roboto-MediumItalic",
    },
  };

  const sectionTables: AnyContent[] = [];
  for (const section of sections) {
    const sectionTotal = section.items.reduce((sum, item) => sum + item.amount, 0);
    sectionTables.push(
      { text: section.name, style: "sectionHeader", margin: [0, 12, 0, 4] as [number,number,number,number] },
      {
          table: {
            headerRows: 1,
            widths: ["*", 60, 50, 70, 80],
            body: [
              [
                { text: "Description", style: "tableHeader" },
                { text: "Qty", style: "tableHeader", alignment: "center" as const },
                { text: "Unit", style: "tableHeader", alignment: "center" as const },
                { text: "Rate ($)", style: "tableHeader", alignment: "center" as const },
                { text: "Amount ($)", style: "tableHeader", alignment: "center" as const },
              ],
              ...section.items.map((item) => [
                { text: item.description, margin: [0, 2, 0, 2] as [number, number, number, number] },
                { text: item.quantity.toString(), alignment: "center" as const, margin: [0, 2, 0, 2] as [number, number, number, number] },
                { text: item.unit, alignment: "center" as const },
                { text: item.rate.toFixed(2), alignment: "center" as const, margin: [0, 2, 0, 2] as [number, number, number, number] },
                { text: item.amount.toFixed(2), alignment: "center" as const, margin: [0, 2, 0, 2] as [number, number, number, number] },
              ]),
              [
                { text: `Subtotal - ${section.name}`, colSpan: 4, alignment: "right" as const, style: "sectionSubtotal" },
                {} as AnyContent,
                {} as AnyContent,
                {} as AnyContent,
                { text: sectionTotal.toFixed(2), alignment: "right" as const, style: "sectionSubtotal" },
              ],
            ],
          },
          layout: {
            fillColor: (rowIndex: number) => rowIndex === 0 ? "#1e3a5f" : null,
            hLineColor: () => "#d1d5db",
            vLineColor: () => "#d1d5db",
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
      }
    );
  }

  const content: AnyContent[] = [
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: "QUOTATION", style: "documentTitle" },
            { text: quotationNumber, style: "documentNumber" },
          ],
        },
        {
          width: "auto",
          stack: [
            { text: `Issue Date: ${issueDate}`, style: "metaInfo" },
            { text: `Expiry Date: ${expiryDate}`, style: "metaInfo" },
          ],
        },
      ],
      margin: [0, 0, 0, 20] as [number,number,number,number],
    },
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: "From:", style: "labelHeader" },
            { text: company.companyName, style: "companyName" },
            ...(company.abn ? [{ text: `ABN: ${company.abn}`, style: "companyDetail" }] : []),
            ...(company.acn ? [{ text: `ACN: ${company.acn}`, style: "companyDetail" }] : []),
            ...(company.address ? [{ text: company.address, style: "companyDetail" }] : []),
            ...(company.phone ? [{ text: `Phone: ${company.phone}`, style: "companyDetail" }] : []),
            ...(company.email ? [{ text: `Email: ${company.email}`, style: "companyDetail" }] : []),
          ],
        },
        {
          width: "*",
          stack: [
            { text: "To:", style: "labelHeader" },
            { text: client.name, style: "clientName" },
            ...(client.companyName ? [{ text: client.companyName, style: "clientDetail" }] : []),
            ...(client.email ? [{ text: `Email: ${client.email}`, style: "clientDetail" }] : []),
            ...(client.phone ? [{ text: `Phone: ${client.phone}`, style: "clientDetail" }] : []),
            ...(client.address ? [{ text: client.address, style: "clientDetail" }] : []),
          ],
        },
      ],
      margin: [0, 0, 0, 20] as [number,number,number,number],
    },
    {
      table: {
        widths: ["*", "*"],
        body: [
          [
            { text: "Project Details", style: "tableHeader", colSpan: 2 },
            {} as AnyContent,
          ],
          [
            { text: `Project: ${project.name}` },
            { text: `Type: ${project.type}` },
          ],
          ...(project.address ? [[{ text: `Address: ${project.address}`, colSpan: 2 }, {} as AnyContent]] : []),
        ],
      },
      layout: {
        fillColor: (rowIndex: number) => rowIndex === 0 ? "#1e3a5f" : null,
        hLineColor: () => "#d1d5db",
        vLineColor: () => "#d1d5db",
      },
      margin: [0, 0, 0, 16] as [number,number,number,number],
    },
    ...sectionTables,
    {
      table: {
        widths: ["*", 120],
        body: [
          [{ text: "Subtotal", alignment: "right" as const, style: "summaryLabel" }, { text: `$${subtotal.toFixed(2)}`, alignment: "right" as const, style: "summaryValue" }],
          [{ text: `GST (${company.gstRate || "10"}%)`, alignment: "right" as const, style: "summaryLabel" }, { text: `$${gstAmount.toFixed(2)}`, alignment: "right" as const, style: "summaryValue" }],
          [{ text: "TOTAL", alignment: "right" as const, style: "totalLabel" }, { text: `$${totalAmount.toFixed(2)}`, alignment: "right" as const, style: "totalValue" }],
        ],
      },
      layout: "noBorders",
      margin: [0, 16, 0, 16] as [number,number,number,number],
    },
    ...(termsAndConditions ? [
      { text: "Terms & Conditions", style: "sectionHeader", margin: [0, 12, 0, 4] as [number,number,number,number] },
      { text: termsAndConditions, style: "termsText" },
    ] : []),
    ...(notes ? [
      { text: "Notes", style: "sectionHeader", margin: [0, 12, 0, 4] as [number,number,number,number] },
      { text: notes, style: "termsText" },
    ] : []),
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: "Authorized Signature:", style: "signatureLabel", margin: [0, 40, 0, 4] as [number,number,number,number] },
            { canvas: [{ type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: "#374151" }], margin: [0, 0, 0, 4] as [number,number,number,number] },
            { text: "Name & Title", style: "signatureDetail" },
            { text: "Date", style: "signatureDetail" },
          ],
        },
        {
          width: "*",
          stack: [
            { text: "Client Acceptance:", style: "signatureLabel", margin: [0, 40, 0, 4] as [number,number,number,number] },
            { canvas: [{ type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: "#374151" }], margin: [0, 0, 0, 4] as [number,number,number,number] },
            { text: "Name & Title", style: "signatureDetail" },
            { text: "Date", style: "signatureDetail" },
          ],
        },
      ],
      margin: [0, 20, 0, 0] as [number,number,number,number],
    },
  ];

  const result: AnyContent = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    fonts,
    header: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: company.companyName, style: "headerCompanyName" },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: "right" as const, fontSize: 8, color: "#6b7280", margin: [0, 4, 0, 0] as [number,number,number,number] },
      ],
      margin: [40, 20, 40, 0] as [number,number,number,number],
    }),
    footer: () => ({
      columns: [
        {
          text: [
            company.companyName,
            company.abn ? ` | ABN: ${company.abn}` : "",
            company.acn ? ` | ACN: ${company.acn}` : "",
            company.phone ? ` | ${company.phone}` : "",
            company.email ? ` | ${company.email}` : "",
          ],
          fontSize: 7,
          color: "#6b7280",
        },
        { text: `Quotation ${quotationNumber}`, alignment: "right" as const, fontSize: 7, color: "#6b7280" },
      ],
      margin: [40, 10, 40, 20] as [number,number,number,number],
    }),
    content,
    styles: {
      headerCompanyName: { fontSize: 10, color: "#1e3a5f" },
      documentTitle: { fontSize: 24, color: "#1e3a5f" },
      documentNumber: { fontSize: 14, color: "#6b7280", margin: [0, 2, 0, 0] as [number,number,number,number] },
      metaInfo: { fontSize: 10, color: "#6b7280" },
      labelHeader: { fontSize: 9, color: "#6b7280", margin: [0, 0, 0, 4] as [number,number,number,number] },
      companyName: { fontSize: 12, color: "#1e3a5f" },
      companyDetail: { fontSize: 9, color: "#374151", margin: [0, 1, 0, 0] as [number,number,number,number] },
      clientName: { fontSize: 12, color: "#1e3a5f" },
      clientDetail: { fontSize: 9, color: "#374151", margin: [0, 1, 0, 0] as [number,number,number,number] },
      tableHeader: { fontSize: 9, color: "#ffffff" },
      sectionHeader: { fontSize: 12, color: "#1e3a5f" },
      sectionSubtotal: { fontSize: 9, color: "#374151" },
      summaryLabel: { fontSize: 10, color: "#374151" },
      summaryValue: { fontSize: 10, color: "#374151" },
      totalLabel: { fontSize: 13, color: "#1e3a5f" },
      totalValue: { fontSize: 13, color: "#1e3a5f" },
      termsText: { fontSize: 8, color: "#6b7280", lineHeight: 1.4 },
      signatureLabel: { fontSize: 9, color: "#374151" },
      signatureDetail: { fontSize: 8, color: "#6b7280", margin: [0, 1, 0, 0] as [number,number,number,number] },
    },
    defaultStyle: {
      fontSize: 9,
      color: "#374151",
      font: "Roboto",
    },
  };
  return result as TDocumentDefinitions;
}

export function generateInvoicePdf(data: {
  company: CompanySettings;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  client: { name: string; companyName?: string; email?: string; phone?: string; address?: string };
  project: { name: string; address?: string; type: string };
  sections: { name: string; items: { description: string; quantity: number; unit: string; rate: number; amount: number }[] }[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  paymentTerms?: string;
  notes?: string;
  status: string;
}): TDocumentDefinitions {
  const { company, invoiceNumber, issueDate, dueDate, client, project, sections, subtotal, gstAmount, totalAmount, paidAmount, paymentTerms, notes, status } = data;

  // Register Roboto font family (bundled with pdfmake's vfs_fonts.js)
  const fonts = {
    Roboto: {
      normal: "Roboto-Regular",
      bold: "Roboto-Medium",
      italics: "Roboto-Italic",
      bolditalics: "Roboto-MediumItalic",
    },
  };
  const balanceDue = totalAmount - paidAmount;

  const statusColors: Record<string, string> = {
    draft: "#6b7280",
    sent: "#2563eb",
    partially_paid: "#d97706",
    paid: "#059669",
    overdue: "#dc2626",
  };

  const sectionTables: AnyContent[] = [];
  for (const section of sections) {
    const sectionTotal = section.items.reduce((sum, item) => sum + item.amount, 0);
    sectionTables.push(
      { text: section.name, style: "sectionHeader", margin: [0, 12, 0, 4] as [number,number,number,number] },
      {
        table: {
          headerRows: 1,
          widths: ["*", 60, 50, 70, 80],
          body: [
            [
              { text: "Description", style: "tableHeader" },
              { text: "Qty", style: "tableHeader", alignment: "center" as const },
              { text: "Unit", style: "tableHeader", alignment: "center" as const },
              { text: "Rate ($)", style: "tableHeader", alignment: "center" as const },
              { text: "Amount ($)", style: "tableHeader", alignment: "center" as const },
            ],
            ...section.items.map((item) => [
              item.description,
              { text: item.quantity.toString(), alignment: "center" as const },
              { text: item.unit, alignment: "center" as const },
              { text: item.rate.toFixed(2), alignment: "center" as const },
              { text: item.amount.toFixed(2), alignment: "center" as const },
            ]),
            [
              { text: `Subtotal - ${section.name}`, colSpan: 4, alignment: "right" as const, style: "sectionSubtotal" },
              {} as AnyContent,
              {} as AnyContent,
              {} as AnyContent,
              { text: sectionTotal.toFixed(2), alignment: "right" as const, style: "sectionSubtotal" },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => rowIndex === 0 ? "#1e3a5f" : null,
          hLineColor: () => "#d1d5db",
          vLineColor: () => "#d1d5db",
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      }
    );
  }

  const content: AnyContent[] = [
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: "INVOICE", style: "documentTitle" },
            { text: invoiceNumber, style: "documentNumber" },
          ],
        },
        {
          width: "auto",
          stack: [
            { text: `Status: ${status.replace("_", " ").toUpperCase()}`, color: statusColors[status] || "#6b7280", fontSize: 11 },
            { text: `Issue Date: ${issueDate}`, style: "metaInfo", margin: [0, 4, 0, 0] as [number,number,number,number] },
            { text: `Due Date: ${dueDate}`, style: "metaInfo" },
          ],
        },
      ],
      margin: [0, 0, 0, 20] as [number,number,number,number],
    },
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: "From:", style: "labelHeader" },
            { text: company.companyName, style: "companyName" },
            ...(company.abn ? [{ text: `ABN: ${company.abn}`, style: "companyDetail" }] : []),
            ...(company.acn ? [{ text: `ACN: ${company.acn}`, style: "companyDetail" }] : []),
            ...(company.address ? [{ text: company.address, style: "companyDetail" }] : []),
            ...(company.phone ? [{ text: `Phone: ${company.phone}`, style: "companyDetail" }] : []),
            ...(company.email ? [{ text: `Email: ${company.email}`, style: "companyDetail" }] : []),
          ],
        },
        {
          width: "*",
          stack: [
            { text: "Bill To:", style: "labelHeader" },
            { text: client.name, style: "clientName" },
            ...(client.companyName ? [{ text: client.companyName, style: "clientDetail" }] : []),
            ...(client.email ? [{ text: `Email: ${client.email}`, style: "clientDetail" }] : []),
            ...(client.phone ? [{ text: `Phone: ${client.phone}`, style: "clientDetail" }] : []),
            ...(client.address ? [{ text: client.address, style: "clientDetail" }] : []),
          ],
        },
      ],
      margin: [0, 0, 0, 20] as [number,number,number,number],
    },
    {
      table: {
        widths: ["*", "*"],
        body: [
          [
            { text: "Project Details", style: "tableHeader", colSpan: 2 },
            {} as AnyContent,
          ],
          [
            { text: `Project: ${project.name}` },
            { text: `Type: ${project.type}` },
          ],
          ...(project.address ? [[{ text: `Address: ${project.address}`, colSpan: 2 }, {} as AnyContent]] : []),
        ],
      },
      layout: {
        fillColor: (rowIndex: number) => rowIndex === 0 ? "#1e3a5f" : null,
        hLineColor: () => "#d1d5db",
        vLineColor: () => "#d1d5db",
      },
      margin: [0, 0, 0, 16] as [number,number,number,number],
    },
    ...sectionTables,
    {
      table: {
        widths: ["*", 120],
        body: [
          [{ text: "Subtotal", alignment: "right" as const, style: "summaryLabel" }, { text: `$${subtotal.toFixed(2)}`, alignment: "right" as const, style: "summaryValue" }],
          [{ text: `GST (${company.gstRate || "10"}%)`, alignment: "right" as const, style: "summaryLabel" }, { text: `$${gstAmount.toFixed(2)}`, alignment: "right" as const, style: "summaryValue" }],
          [{ text: "TOTAL", alignment: "right" as const, style: "totalLabel" }, { text: `$${totalAmount.toFixed(2)}`, alignment: "right" as const, style: "totalValue" }],
          ...(paidAmount > 0 ? [
            [{ text: "Paid", alignment: "right" as const, style: "summaryLabel", color: "#059669" }, { text: `-$${paidAmount.toFixed(2)}`, alignment: "right" as const, style: "summaryValue", color: "#059669" }],
            [{ text: "BALANCE DUE", alignment: "right" as const, style: "totalLabel" }, { text: `$${balanceDue.toFixed(2)}`, alignment: "right" as const, style: "totalValue" }],
          ] : []),
        ],
      },
      layout: "noBorders",
      margin: [0, 16, 0, 16] as [number,number,number,number],
    },
    ...(company.bankName ? [
      { text: "Payment Details", style: "sectionHeader", margin: [0, 12, 0, 4] as [number,number,number,number] },
      {
        table: {
          widths: [120, "*"],
          body: [
            [{ text: "Bank", style: "bankLabel" }, { text: company.bankName, style: "bankValue" }],
            ...(company.bankAccountName ? [[{ text: "Account Name", style: "bankLabel" }, { text: company.bankAccountName, style: "bankValue" }]] : []),
            ...(company.bankBsb ? [[{ text: "BSB", style: "bankLabel" }, { text: company.bankBsb, style: "bankValue" }]] : []),
            ...(company.bankAccount ? [[{ text: "Account Number", style: "bankLabel" }, { text: company.bankAccount, style: "bankValue" }]] : []),
          ],
        },
        layout: "noBorders",
      },
    ] : []),
    ...(paymentTerms ? [
      { text: "Payment Terms", style: "sectionHeader", margin: [0, 12, 0, 4] as [number,number,number,number] },
      { text: paymentTerms, style: "termsText" },
    ] : []),
    ...(notes ? [
      { text: "Notes", style: "sectionHeader", margin: [0, 12, 0, 4] as [number,number,number,number] },
      { text: notes, style: "termsText" },
    ] : []),
  ];

  const result: AnyContent = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    fonts,
    header: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: company.companyName, style: "headerCompanyName" },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: "right" as const, fontSize: 8, color: "#6b7280", margin: [0, 4, 0, 0] as [number,number,number,number] },
      ],
      margin: [40, 20, 40, 0] as [number,number,number,number],
    }),
    footer: () => ({
      columns: [
        {
          text: [
            company.companyName,
            company.abn ? ` | ABN: ${company.abn}` : "",
            company.acn ? ` | ACN: ${company.acn}` : "",
            company.phone ? ` | ${company.phone}` : "",
            company.email ? ` | ${company.email}` : "",
          ],
          fontSize: 7,
          color: "#6b7280",
        },
        { text: `Invoice ${invoiceNumber}`, alignment: "right" as const, fontSize: 7, color: "#6b7280" },
      ],
      margin: [40, 10, 40, 20] as [number,number,number,number],
    }),
    content,
    styles: {
      headerCompanyName: { fontSize: 10, color: "#1e3a5f" },
      documentTitle: { fontSize: 24, color: "#1e3a5f" },
      documentNumber: { fontSize: 14, color: "#6b7280", margin: [0, 2, 0, 0] as [number,number,number,number] },
      metaInfo: { fontSize: 10, color: "#6b7280" },
      labelHeader: { fontSize: 9, color: "#6b7280", margin: [0, 0, 0, 4] as [number,number,number,number] },
      companyName: { fontSize: 12, color: "#1e3a5f" },
      companyDetail: { fontSize: 9, color: "#374151", margin: [0, 1, 0, 0] as [number,number,number,number] },
      clientName: { fontSize: 12, color: "#1e3a5f" },
      clientDetail: { fontSize: 9, color: "#374151", margin: [0, 1, 0, 0] as [number,number,number,number] },
      tableHeader: { fontSize: 9, color: "#ffffff" },
      sectionHeader: { fontSize: 12, color: "#1e3a5f" },
      sectionSubtotal: { fontSize: 9, color: "#374151" },
      summaryLabel: { fontSize: 10, color: "#374151" },
      summaryValue: { fontSize: 10, color: "#374151" },
      totalLabel: { fontSize: 13, color: "#1e3a5f" },
      totalValue: { fontSize: 13, color: "#1e3a5f" },
      bankLabel: { fontSize: 9, color: "#6b7280" },
      bankValue: { fontSize: 9, color: "#374151" },
      termsText: { fontSize: 8, color: "#6b7280", lineHeight: 1.4 },
    },
    defaultStyle: {
      fontSize: 9,
      color: "#374151",
      font: "Roboto",
    },
  };
  return result as TDocumentDefinitions;
}
