import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Company } from "@/db/schema";
import { getQuotations, getInvoices, getClients, getClientById } from "@/lib/turso-store";
import { ALL_COMPANIES } from "@/lib/companies";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const rawCompanyId = req.nextUrl.searchParams.get("companyId");
    const companyId = rawCompanyId && rawCompanyId !== ALL_COMPANIES ? rawCompanyId : undefined;

    const [allQuotationsRes, allInvoicesRes, allClients] = await Promise.all([
      getQuotations({ companyId, limit: 2000 }),
      getInvoices({ companyId, limit: 2000 }),
      getClients(companyId),
    ]);

    const quotations = allQuotationsRes.data;
    const invoices = allInvoicesRes.data;

    const totalQuotations = quotations.length;
    const totalInvoices = invoices.length;
    const pendingQuotations = quotations.filter((q: any) => q.status === "draft").length;
    const approvedQuotations = quotations.filter((q: any) => q.status === "approved").length;
    const paidInvoices = invoices.filter((i: any) => i.status === "paid").length;
    const unpaidInvoices = invoices.filter((i: any) => i.status !== "paid").length;

    let totalRevenueNum = 0;
    let outstandingAmountNum = 0;

    invoices.forEach((i: any) => {
      const tot = parseFloat(i.totalAmount || "0");
      const paid = parseFloat(i.paidAmount || "0");
      if (i.status === "paid") {
        totalRevenueNum += tot;
      } else {
        outstandingAmountNum += Math.max(0, tot - paid);
      }
    });

    const totalRevenue = totalRevenueNum.toString();
    const outstandingAmount = outstandingAmountNum.toString();

    // Recent entities
    const recentClients = allClients.slice(0, 5).map((c: any) => ({ ...c, _id: c.id }));

    // Enrich recent quotations with client names
    const clientMap = new Map();
    const clientIds = [
      ...new Set([
        ...quotations.slice(0, 5).map((q: any) => q.clientId),
        ...invoices.slice(0, 5).map((i: any) => i.clientId),
      ]),
    ];

    await Promise.all(
      clientIds.map(async (cId) => {
        if (cId) {
          const client = await getClientById(cId);
          if (client) clientMap.set(cId, client.name);
        }
      })
    );

    const recentQuotations = quotations.slice(0, 5).map((q: any) => ({
      _id: q.id,
      id: q.id,
      companyId: q.companyId,
      quotationNumber: q.quotationNumber,
      status: q.status,
      totalAmount: q.totalAmount,
      createdAt: q.createdAt,
      clientName: clientMap.get(q.clientId) || null,
    }));

    const recentInvoices = invoices.slice(0, 5).map((i: any) => ({
      _id: i.id,
      id: i.id,
      companyId: i.companyId,
      invoiceNumber: i.invoiceNumber,
      status: i.status,
      totalAmount: i.totalAmount,
      createdAt: i.createdAt,
      clientName: clientMap.get(i.clientId) || null,
    }));

    let byCompany: any[] = [];
    if (!rawCompanyId || rawCompanyId === ALL_COMPANIES) {
      const companies = await Company.find().lean();
      const allQRes = await getQuotations({ limit: 5000 });
      const allIRes = await getInvoices({ limit: 5000 });

      byCompany = companies.map((c: any) => {
        const cId = c._id.toString();
        const cQuotations = allQRes.data.filter((q: any) => q.companyId === cId);
        const cInvoices = allIRes.data.filter((i: any) => i.companyId === cId);

        let rev = 0;
        let out = 0;
        cInvoices.forEach((inv: any) => {
          const tot = parseFloat(inv.totalAmount || "0");
          const paid = parseFloat(inv.paidAmount || "0");
          if (inv.status === "paid") rev += tot;
          else out += Math.max(0, tot - paid);
        });

        return {
          companyId: cId,
          shortName: c.shortName,
          totalQuotations: cQuotations.length,
          totalInvoices: cInvoices.length,
          revenue: rev.toString(),
          outstanding: out.toString(),
        };
      });
    }

    const payload = {
      stats: {
        totalQuotations,
        totalInvoices,
        pendingQuotations,
        approvedQuotations,
        paidInvoices,
        unpaidInvoices,
        totalRevenue,
        outstandingAmount,
      },
      recentClients,
      recentQuotations,
      recentInvoices,
      byCompany,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Dashboard data API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
