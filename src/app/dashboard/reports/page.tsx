"use client";
import { useState, useEffect } from "react";
import { formatCurrency, formatDate, PROJECT_TYPES } from "@/lib/utils";

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "invoices" | "clients" | "projects">("overview");

  useEffect(() => {
    Promise.all([fetch("/api/dashboard").then(r => r.json()), fetch("/api/invoices").then(r => r.json()), fetch("/api/clients").then(r => r.json()), fetch("/api/projects").then(r => r.json())])
      .then(([dash, inv, cli, proj]) => { setData({ dashboard: dash, invoices: inv, clients: cli, projects: proj }); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1e3a5f] border-t-transparent"></div></div>;

  const { dashboard, invoices, clients, projects } = data;

  const paidInvoices = invoices.filter((i: any) => i.status === "paid");
  const unpaidInvoices = invoices.filter((i: any) => i.status !== "paid");
  const totalPaid = paidInvoices.reduce((s: number, i: any) => s + parseFloat(i.totalAmount || "0"), 0);
  const totalUnpaid = unpaidInvoices.reduce((s: number, i: any) => s + parseFloat(i.totalAmount || "0") - parseFloat(i.paidAmount || "0"), 0);

  const invoicesByMonth: Record<string, { total: number; paid: number; count: number }> = {};
  invoices.forEach((inv: any) => {
    const date = new Date(inv.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!invoicesByMonth[key]) invoicesByMonth[key] = { total: 0, paid: 0, count: 0 };
    invoicesByMonth[key].total += parseFloat(inv.totalAmount || "0");
    invoicesByMonth[key].count++;
    if (inv.status === "paid") invoicesByMonth[key].paid += parseFloat(inv.totalAmount || "0");
  });

  const projectsByType: Record<string, number> = {};
  projects.forEach((p: any) => { projectsByType[p.type] = (projectsByType[p.type] || 0) + 1; });

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "invoices" as const, label: "Invoice Reports" },
    { key: "clients" as const, label: "Client Reports" },
    { key: "projects" as const, label: "Project Reports" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Reports</h1><p className="text-gray-500 text-sm mt-1">Business analytics and reports</p></div>
      </div>
      <div className="flex gap-2">
        {tabs.map(t => <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === t.key ? "bg-[#1e3a5f] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{t.label}</button>)}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-5 text-white"><div className="text-sm text-green-100">Total Revenue</div><div className="text-2xl font-bold mt-1">{formatCurrency(totalPaid)}</div></div>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-5 text-white"><div className="text-sm text-amber-100">Outstanding</div><div className="text-2xl font-bold mt-1">{formatCurrency(totalUnpaid)}</div></div>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-5 text-white"><div className="text-sm text-blue-100">Total Invoices</div><div className="text-2xl font-bold mt-1">{invoices.length}</div></div>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-5 text-white"><div className="text-sm text-purple-100">Total Clients</div><div className="text-2xl font-bold mt-1">{clients.length}</div></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Monthly Revenue</h2>
            {Object.keys(invoicesByMonth).length === 0 ? <p className="text-gray-400 text-center py-8">No invoice data available</p> : (
              <div className="space-y-3">
                {Object.entries(invoicesByMonth).sort(([a], [b]) => b.localeCompare(a)).map(([month, data]) => {
                  const maxTotal = Math.max(...Object.values(invoicesByMonth).map(d => d.total));
                  return (
                    <div key={month} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-gray-600">{month}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${(data.total / maxTotal) * 100}%` }}></div>
                        <div className="absolute inset-0 flex items-center justify-between px-3">
                          <span className="text-xs font-medium text-gray-700">{data.count} invoices</span>
                          <span className="text-xs font-bold text-gray-900">{formatCurrency(data.total)}</span>
                        </div>
                      </div>
                      <div className="w-24 text-right text-xs text-green-600">{formatCurrency(data.paid)} paid</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5"><div className="text-sm text-gray-500">Paid Invoices</div><div className="text-2xl font-bold text-green-600 mt-1">{paidInvoices.length}</div><div className="text-sm text-gray-400">{formatCurrency(totalPaid)}</div></div>
            <div className="bg-white rounded-xl border border-gray-200 p-5"><div className="text-sm text-gray-500">Unpaid Invoices</div><div className="text-2xl font-bold text-amber-600 mt-1">{unpaidInvoices.length}</div><div className="text-sm text-gray-400">{formatCurrency(totalUnpaid)}</div></div>
            <div className="bg-white rounded-xl border border-gray-200 p-5"><div className="text-sm text-gray-500">Collection Rate</div><div className="text-2xl font-bold text-blue-600 mt-1">{totalPaid + totalUnpaid > 0 ? Math.round((totalPaid / (totalPaid + totalUnpaid)) * 100) : 0}%</div></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold">Outstanding Invoices</h2></div>
            <table className="w-full"><thead><tr className="bg-gray-50"><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Invoice #</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Client</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Due Date</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Total</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Balance</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{unpaidInvoices.map((inv: any) => (
              <tr key={inv.id} className="hover:bg-gray-50"><td className="px-6 py-3 text-sm font-medium text-blue-600">{inv.invoiceNumber}</td><td className="px-6 py-3 text-sm text-gray-600">{inv.clientName}</td><td className="px-6 py-3 text-sm text-gray-500">{formatDate(inv.dueDate)}</td><td className="px-6 py-3 text-sm text-right">{formatCurrency(inv.totalAmount)}</td><td className="px-6 py-3 text-sm text-right font-semibold text-amber-600">{formatCurrency(parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount || "0"))}</td><td className="px-6 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{inv.status?.replace("_", " ")}</span></td></tr>
            ))}</tbody></table>
          </div>
        </div>
      )}

      {activeTab === "clients" && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold">Client Overview</h2></div>
          <table className="w-full"><thead><tr className="bg-gray-50"><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Client</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Company</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Email</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Projects</th></tr></thead>
          <tbody className="divide-y divide-gray-100">{clients.map((c: any) => (
            <tr key={c.id} className="hover:bg-gray-50"><td className="px-6 py-3 text-sm font-medium">{c.name}</td><td className="px-6 py-3 text-sm text-gray-600">{c.companyName || "-"}</td><td className="px-6 py-3 text-sm text-gray-600">{c.email || "-"}</td><td className="px-6 py-3 text-sm text-right">{projects.filter((p: any) => p.clientId === c.id).length}</td></tr>
          ))}</tbody></table>
        </div>
      )}

      {activeTab === "projects" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(projectsByType).map(([type, count]) => (
              <div key={type} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-sm text-gray-500">{PROJECT_TYPES.find(t => t.value === type)?.label || type}</div>
                <div className="text-2xl font-bold text-[#1e3a5f]">{count}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold">All Projects</h2></div>
            <table className="w-full"><thead><tr className="bg-gray-50"><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Project</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Client</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Type</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{projects.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50"><td className="px-6 py-3 text-sm font-medium">{p.name}</td><td className="px-6 py-3 text-sm text-gray-600">{p.clientName || "-"}</td><td className="px-6 py-3 text-sm">{PROJECT_TYPES.find(t => t.value === p.type)?.label || p.type}</td><td className="px-6 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status === "completed" ? "bg-green-100 text-green-700" : p.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{p.status?.replace("_", " ")}</span></td></tr>
            ))}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
