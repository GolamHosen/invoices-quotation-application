import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { Quotation, Invoice, Client, Company } from "@/db/schema";
import { buildCompanyFilter, ALL_COMPANIES } from "@/lib/companies";

export async function GET(req: NextRequest) {
  const startedAt = Date.now();

  try {
    console.log("[api/dashboard] GET start");
    await connectDb();
    const companyId = req.nextUrl.searchParams.get("companyId");
    const filter = buildCompanyFilter(companyId);

    const [
      totalQuotations,
      totalInvoices,
      pendingQuotations,
      approvedQuotations,
      paidInvoices,
      unpaidInvoices,
      revenueResult,
      outstandingResult,
      recentClients,
      recentQuotations,
      recentInvoices,
    ] = await Promise.all([
      Quotation.countDocuments(filter),
      Invoice.countDocuments(filter),
      Quotation.countDocuments({ ...filter, status: "draft" }),
      Quotation.countDocuments({ ...filter, status: "approved" }),
      Invoice.countDocuments({ ...filter, status: "paid" }),
      Invoice.countDocuments({ ...filter, status: { $ne: "paid" } }),
      Invoice.aggregate([
        { $match: { ...filter, status: "paid" } },
        { $group: { _id: null, total: { $sum: { $toDouble: "$totalAmount" } } } },
      ]),
      Invoice.aggregate([
        { $match: { ...filter, status: { $ne: "paid" } } },
        { $group: { _id: null, total: { $sum: { $toDouble: { $subtract: [{ $toDouble: "$totalAmount" }, { $toDouble: "$paidAmount" }] } } } } },
      ]),
      Client.find(filter).sort({ createdAt: -1 }).limit(5).lean(),
      Quotation.aggregate([
        ...(Object.keys(filter).length > 0 ? [{ $match: filter }] : []),
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        { $lookup: { from: "clients", localField: "clientId", foreignField: "_id", as: "client" } },
        { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, companyId: 1, quotationNumber: 1, status: 1, totalAmount: 1, createdAt: 1, clientName: "$client.name" } },
      ]),
      Invoice.aggregate([
        ...(Object.keys(filter).length > 0 ? [{ $match: filter }] : []),
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        { $lookup: { from: "clients", localField: "clientId", foreignField: "_id", as: "client" } },
        { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, companyId: 1, invoiceNumber: 1, status: 1, totalAmount: 1, createdAt: 1, clientName: "$client.name" } },
      ]),
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total.toString() : "0";
    const outstandingAmount = outstandingResult.length > 0 ? outstandingResult[0].total.toString() : "0";
    
    let byCompany: any[] = [];
    if (!companyId || companyId === ALL_COMPANIES) {
      const [companies, quotationCounts, invoiceStats] = await Promise.all([
        Company.find().lean(),
        Quotation.aggregate([{ $group: { _id: "$companyId", total: { $sum: 1 } } }]),
        Invoice.aggregate([
          {
            $group: {
              _id: "$companyId",
              totalInvoices: { $sum: 1 },
              revenue: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, { $toDouble: "$totalAmount" }, 0] } },
              outstanding: { $sum: { $cond: [{ $ne: ["$status", "paid"] }, { $subtract: [{ $toDouble: "$totalAmount" }, { $toDouble: "$paidAmount" }] }, 0] } },
            },
          },
        ]),
      ]);

      const qMap = new Map(quotationCounts.map(q => [q._id, q.total]));
      const iMap = new Map(invoiceStats.map(i => [i._id, i]));

      byCompany = companies.map(c => {
        const cId = c._id.toString();
        const iStat = iMap.get(cId) || { totalInvoices: 0, revenue: 0, outstanding: 0 };
        return {
          companyId: cId,
          shortName: c.shortName,
          totalQuotations: qMap.get(cId) || 0,
          totalInvoices: iStat.totalInvoices,
          revenue: iStat.revenue.toString(),
          outstanding: iStat.outstanding.toString(),
        };
      });
    }

    console.log(`[api/dashboard] GET done in ${Date.now() - startedAt}ms`);
    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    console.error(`[api/dashboard] GET failed after ${Date.now() - startedAt}ms`);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
