"use client";

import { useState, useEffect } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface InvoiceDetailModalProps {
  invoiceId: string | null;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  sent: "bg-blue-100 text-blue-800 border-blue-300",
  partially_paid: "bg-amber-100 text-amber-800 border-amber-300",
  paid: "bg-green-100 text-green-800 border-green-300",
  overdue: "bg-red-100 text-red-800 border-red-300",
};

export default function InvoiceDetailModal({ invoiceId, onClose }: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load invoice details");
        return res.json();
      })
      .then((data) => {
        setInvoice(data);
      })
      .catch((err) => {
        setError(err.message || "An error occurred");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [invoiceId]);

  if (!invoiceId) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {loading ? "Loading Invoice..." : invoice?.invoiceNumber || "Invoice Details"}
            </h2>
            {invoice && (
              <p className="text-xs text-gray-500">
                {invoice.clientName || "Client"} {invoice.projectName ? `— ${invoice.projectName}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {invoice && (
              <a
                href={`/api/invoices/${invoice.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-xs font-semibold hover:bg-[#152b48] transition"
              >
                Download PDF
              </a>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {loading && (
            <div className="py-12 text-center text-gray-400 text-sm">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#1e3a5f] mb-2"></div>
              <p>Fetching invoice details...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {!loading && invoice && (
            <>
              {/* Top metadata grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm">
                <div>
                  <span className="text-xs text-gray-500 block font-semibold uppercase">Status</span>
                  <span
                    className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      statusColors[invoice.status] || "bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    {(invoice.status || "draft").replace("_", " ").toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block font-semibold uppercase">Issue Date</span>
                  <span className="font-medium text-gray-800">
                    {formatDate(invoice.issueDate || invoice.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block font-semibold uppercase">Issue Time</span>
                  <span className="font-medium text-gray-800">
                    {new Date(invoice.issueDate || invoice.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block font-semibold uppercase">Due Date</span>
                  <span className="font-medium text-gray-800">{formatDate(invoice.dueDate)}</span>
                </div>
              </div>

              {/* Sections / Line Items */}
              {((invoice.sections as any[]) || []).map((sec: any, idx: number) => (
                <div key={sec.id || idx} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-4 py-2.5 font-semibold text-sm text-[#1e3a5f] border-b border-gray-200">
                    {sec.name || `Section ${idx + 1}`}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50/50 text-gray-500 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 font-medium">Description</th>
                          <th className="px-4 py-2 font-medium text-center">Qty</th>
                          <th className="px-4 py-2 font-medium text-center">Unit</th>
                          <th className="px-4 py-2 font-medium text-right">Rate</th>
                          <th className="px-4 py-2 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(sec.items || []).map((item: any, iIdx: number) => (
                          <tr key={item.id || iIdx} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 font-medium text-gray-800">{item.description}</td>
                            <td className="px-4 py-2.5 text-center text-gray-600">{item.quantity}</td>
                            <td className="px-4 py-2.5 text-center text-gray-600">{item.unit}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">${Number(item.rate || 0).toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                              ${Number(item.amount || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Totals Summary */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2 text-sm max-w-sm ml-auto">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST (10%)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(invoice.gstAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total Amount</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>

                {parseFloat(invoice.paidAmount || "0") > 0 && (
                  <>
                    <div className="flex justify-between text-green-600 text-sm font-medium">
                      <span>Paid Amount</span>
                      <span>-{formatCurrency(invoice.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-[#1e3a5f] pt-2 border-t border-gray-200">
                      <span>Balance Due</span>
                      <span>
                        {formatCurrency(
                          Math.max(
                            0,
                            parseFloat(invoice.totalAmount || "0") - parseFloat(invoice.paidAmount || "0")
                          )
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
