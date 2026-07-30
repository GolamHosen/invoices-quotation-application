"use client";

import { useState, useMemo } from "react";
import { useInvoices } from "@/lib/api-hooks";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ClientInvoiceHistoryProps {
  clientId: string;
  companyId: string;
  onSelectInvoice: (invoiceId: string) => void;
}

type SortOrder = "desc" | "asc";

interface InvoiceGroup {
  dateKey: string;
  displayDate: string;
  count: number;
  invoices: any[];
}

const statusBadgeStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  sent: "bg-blue-100 text-blue-800 border-blue-300",
  partially_paid: "bg-amber-100 text-amber-800 border-amber-300",
  paid: "bg-green-100 text-green-800 border-green-300",
  overdue: "bg-red-100 text-red-800 border-red-300",
};

export default function ClientInvoiceHistory({
  clientId,
  companyId,
  onSelectInvoice,
}: ClientInvoiceHistoryProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data: res, isLoading: loading, error } = useInvoices({
    clientId,
    companyId,
    limit: 1000,
  });

  const invoices = res?.data || [];

  // Group invoices by date and sort
  const groupedData: InvoiceGroup[] = useMemo(() => {
    if (!invoices.length) return [];

    const map = new Map<string, { displayDate: string; invoices: any[] }>();

    for (const inv of invoices) {
      const dateObj = new Date(inv.issueDate || inv.createdAt);
      if (isNaN(dateObj.getTime())) continue;

      // Group key by YYYY-MM-DD
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      const displayDate = dateObj.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      if (!map.has(dateKey)) {
        map.set(dateKey, { displayDate, invoices: [] });
      }

      map.get(dateKey)!.invoices.push({
        ...inv,
        timestamp: dateObj.getTime(),
        issueTimeStr: dateObj.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      });
    }

    const groups: InvoiceGroup[] = [];

    map.forEach((value, dateKey) => {
      // Sort invoices within this date chronologically (by time)
      const sortedInvoices = [...value.invoices].sort((a, b) => {
        return sortOrder === "desc"
          ? b.timestamp - a.timestamp
          : a.timestamp - b.timestamp;
      });

      groups.push({
        dateKey,
        displayDate: value.displayDate,
        count: sortedInvoices.length,
        invoices: sortedInvoices,
      });
    });

    // Sort groups by dateKey
    groups.sort((a, b) => {
      return sortOrder === "desc"
        ? b.dateKey.localeCompare(a.dateKey)
        : a.dateKey.localeCompare(b.dateKey);
    });

    return groups;
  }, [invoices, sortOrder]);

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#1e3a5f] mb-2"></div>
        <p>Loading invoice history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        Failed to load client invoice history.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div>
          <h3 className="font-semibold text-sm text-gray-900">Invoice History</h3>
          <p className="text-xs text-gray-500">
            Total {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} issued to this client
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">Sort Order:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-[#1e3a5f] focus:outline-none"
          >
            <option value="desc">Newest to Oldest</option>
            <option value="asc">Oldest to Newest</option>
          </select>
        </div>
      </div>

      {/* Grouped Invoices List */}
      {groupedData.length === 0 ? (
        <div className="py-12 text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
          <svg
            className="w-10 h-10 mx-auto text-gray-300 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm font-medium text-gray-600">No invoices found for this client</p>
          <p className="text-xs text-gray-400 mt-0.5">Invoices created for this client will appear here grouped by date.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedData.map((group) => (
            <div
              key={group.dateKey}
              className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm transition hover:border-gray-300"
            >
              {/* Date Group Header */}
              <div className="bg-slate-100/80 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1e3a5f]" />
                  <span className="font-bold text-sm text-gray-900">{group.displayDate}</span>
                </div>
                <span className="px-3 py-1 bg-white text-[#1e3a5f] border border-slate-200 rounded-full text-xs font-semibold shadow-xs">
                  {group.count} invoice{group.count !== 1 ? "s" : ""} on {group.displayDate}
                </span>
              </div>

              {/* Invoices List under this Date */}
              <div className="divide-y divide-gray-100">
                {group.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => onSelectInvoice(inv.id)}
                    className="p-4 hover:bg-slate-50/80 transition cursor-pointer flex flex-wrap items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a5f] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#1e3a5f] group-hover:text-white transition-colors">
                        INV
                      </div>

                      {/* Number & Time */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                            {inv.invoiceNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              statusBadgeStyles[inv.status] || "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {(inv.status || "draft").replace("_", " ").toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>📅 Issue Date: <strong className="text-gray-700">{formatDate(inv.issueDate || inv.createdAt)}</strong></span>
                          <span>•</span>
                          <span>⏰ Issue Time: <strong className="text-gray-700">{inv.issueTimeStr}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Amount & Click Hint */}
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="text-xs text-gray-400 uppercase font-semibold block">Total Amount</span>
                        <span className="text-base font-bold text-gray-900">
                          {formatCurrency(inv.totalAmount)}
                        </span>
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
