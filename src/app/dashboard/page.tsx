"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";

type Stats = { totalQuotations: number; totalInvoices: number; pendingQuotations: number; approvedQuotations: number; paidInvoices: number; unpaidInvoices: number; totalRevenue: string; outstandingAmount: string; };

const statCards = [
  { key: "totalQuotations" as const, label: "Total Quotations", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z", color: "bg-blue-500", bg: "bg-blue-50", href: "/dashboard/quotations" },
  { key: "totalInvoices" as const, label: "Total Invoices", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", color: "bg-purple-500", bg: "bg-purple-50", href: "/dashboard/invoices" },
  { key: "pendingQuotations" as const, label: "Pending Quotations", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "bg-amber-500", bg: "bg-amber-50", href: "/dashboard/quotations?status=draft" },
  { key: "approvedQuotations" as const, label: "Approved Quotations", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "bg-green-500", bg: "bg-green-50", href: "/dashboard/quotations?status=approved" },
  { key: "paidInvoices" as const, label: "Paid Invoices", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", color: "bg-emerald-500", bg: "bg-emerald-50", href: "/dashboard/invoices?status=paid" },
  { key: "unpaidInvoices" as const, label: "Unpaid Invoices", icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "bg-red-500", bg: "bg-red-50", href: "/dashboard/invoices?status=unpaid" },
];

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { activeCompanyId, isLoading } = useCompany();

  useEffect(() => {
    if (isLoading) return;

    const startedAt = Date.now();
    console.log(`[dashboard-page] fetching /api/dashboard?companyId=${activeCompanyId}...`);
    fetch(`/api/dashboard?companyId=${activeCompanyId}`)
      .then((r) => {
        console.log(
          `[dashboard-page] /api/dashboard responded in ${Date.now() - startedAt}ms with status ${r.status}`
        );
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(`[dashboard-page] /api/dashboard failed after ${Date.now() - startedAt}ms:`, err);
        setLoading(false);
      });
  }, [activeCompanyId, isLoading]);

  if (loading || isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1e3a5f] border-t-transparent"></div>
      </div>
    );

  const stats = data?.stats || {} as Stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back! Here&apos;s your business overview.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/quotations/new" className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152b48] transition">+ New Quotation</Link>
          <Link href="/dashboard/invoices/new" className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">+ New Invoice</Link>
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] rounded-xl p-6 text-white">
          <div className="text-sm text-blue-100 mb-1">Total Revenue (Paid)</div>
          <div className="text-3xl font-bold">{formatCurrency(stats.totalRevenue || "0")}</div>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
          <div className="text-sm text-amber-100 mb-1">Outstanding Amount</div>
          <div className="text-3xl font-bold">{formatCurrency(stats.outstandingAmount || "0")}</div>
        </div>
      </div>
      
      {/* Company Breakdown */}
      {data?.byCompany && data.byCompany.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.byCompany.map((c: any) => (
            <div key={c.companyId} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">{c.shortName}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Revenue</div>
                  <div className="font-medium text-emerald-600">{formatCurrency(c.revenue)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Outstanding</div>
                  <div className="font-medium text-amber-600">{formatCurrency(c.outstanding)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Quotations</div>
                  <div className="font-medium">{c.totalQuotations}</div>
                </div>
                <div>
                  <div className="text-gray-500">Invoices</div>
                  <div className="font-medium">{c.totalInvoices}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(card => (
          <Link key={card.key} href={card.href} className={`${card.bg} rounded-xl p-4 block hover:opacity-90 transition-opacity hover:shadow-sm`}>
            <div className={`${card.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} /></svg>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats[card.key] || 0}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Quotations */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Quotations</h2>
            <Link href="/dashboard/quotations" className="text-sm text-blue-600 hover:text-blue-800">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(data?.recentQuotations || []).map((q: any, index: number) => (
              <div
                key={
                  q.id ??
                  q.quotationNumber ??
                  `${q.clientName ?? "client"}-${index}`
                }
                className="px-6 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{q.quotationNumber}</div>
                  <div className="text-xs text-gray-500">{q.clientName || "Unknown"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(q.totalAmount)}</div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${q.status === "approved" ? "bg-green-100 text-green-700" : q.status === "draft" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700"}`}>{q.status}</span>
                </div>
              </div>
            ))}
            {(!data?.recentQuotations?.length) && <div className="px-6 py-8 text-center text-gray-400 text-sm">No quotations yet</div>}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Invoices</h2>
            <Link href="/dashboard/invoices" className="text-sm text-blue-600 hover:text-blue-800">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(data?.recentInvoices || []).map((inv: any, index: number) => (
              <div
                key={
                  inv.id ??
                  inv.invoiceNumber ??
                  `${inv.clientName ?? "client"}-${index}`
                }
                className="px-6 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</div>
                  <div className="text-xs text-gray-500">{inv.clientName || "Unknown"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(inv.totalAmount)}</div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : inv.status === "partially_paid" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{inv.status?.replace("_", " ")}</span>
                </div>
              </div>
            ))}
            {(!data?.recentInvoices?.length) && <div className="px-6 py-8 text-center text-gray-400 text-sm">No invoices yet</div>}
          </div>
        </div>

        {/* Recent Clients */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Clients</h2>
            <Link href="/dashboard/clients" className="text-sm text-blue-600 hover:text-blue-800">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(data?.recentClients || []).map((c: any, index: number) => (
              <div
                key={
                  c.id ??
                  c.email ??
                  c.phone ??
                  `${c.name ?? "client"}-${index}`
                }
                className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50"
              >
                <div className="w-9 h-9 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-sm font-bold">{c.name.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                  <div className="text-xs text-gray-500 truncate">{c.email || c.phone || "No contact"}</div>
                </div>
              </div>
            ))}
            {(!data?.recentClients?.length) && <div className="px-6 py-8 text-center text-gray-400 text-sm">No clients yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
