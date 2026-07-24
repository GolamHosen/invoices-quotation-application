"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency, formatDate, INVOICE_STATUSES } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";
import { useInvoices, useInvoiceMutations } from "@/lib/api-hooks";
import Pagination from "@/components/Pagination";

function SendEmailModal({ type, id, number, clientEmail, clientName, onClose, onSent }: {
  type: "quotation" | "invoice";
  id: string;
  number: string;
  clientEmail?: string;
  clientName?: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [to, setTo] = useState(clientEmail || "");
  const [subject, setSubject] = useState(`${type === "quotation" ? "Quotation" : "Invoice"} ${number} from Hujurat Construction`);
  const [message, setMessage] = useState(
    `Dear ${clientName || "Valued Customer"},\n\nPlease find attached the ${type} ${number} for your review.\n\nIf you have any questions or require clarification, please don't hesitate to contact us.\n\nKind regards,\nHujurat Construction Pty Ltd`
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSend = async () => {
    if (!to.trim()) { setError("Please enter a recipient email address."); return; }
    setSending(true);
    setError("");
    try {
      const endpoint = type === "quotation" ? `/api/quotations/${id}/send-email` : `/api/invoices/${id}/send-email`;
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject, message }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to send email");
      setSuccess(`Email sent successfully to ${data.sentTo}`);
      setTimeout(() => { onSent(); onClose(); }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Send {type === "quotation" ? "Quotation" : "Invoice"}</h3>
              <p className="text-sm text-gray-500">{number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {!clientEmail && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              <p className="text-sm text-amber-800">No email address on file for this client. Please enter a recipient email below.</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="client@example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none" />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            <span>PDF will be attached automatically: <span className="font-medium">{type}-{number}.pdf</span></span>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {success}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button onClick={onClose} disabled={sending} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">Cancel</button>
          <button onClick={handleSend} disabled={sending || !!success} className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152b48] transition disabled:opacity-50 flex items-center gap-2">
            {sending ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Sending...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> Send Email</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

function InvoicesContent() {
  const { activeCompanyId } = useCompany();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [emailModal, setEmailModal] = useState<any>(null);
  const [page, setPage] = useState(1);

  const { data: res, isLoading: loading, refetch } = useInvoices({
    page,
    limit: PAGE_SIZE,
    status: statusFilter || undefined,
    companyId: activeCompanyId,
  });

  const { updateStatus, deleteInvoice, duplicateInvoice } = useInvoiceMutations();

  const invoices = res?.data || [];
  const totalItems = res?.total || 0;
  const totalPages = res?.totalPages || 0;

  useEffect(() => {
    setPage(1);
  }, [statusFilter, activeCompanyId]);

  const handleStatusChange = async (id: string, status: string) => {
    await updateStatus.mutateAsync({ id, status });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this invoice?")) {
      await deleteInvoice.mutateAsync(id);
    }
  };

  const handleRecordPayment = async (id: string, currentPaid: number, total: number) => {
    const amount = prompt(`Enter payment amount (Balance: ${formatCurrency(total - currentPaid)}):`);
    if (!amount) return;
    const newPaid = currentPaid + parseFloat(amount);
    const newStatus = newPaid >= total ? "paid" : "partially_paid";
    await updateStatus.mutateAsync({ id, paidAmount: newPaid, status: newStatus });
  };

  const handleDuplicate = async (inv: any) => {
    const { generateInvoiceNumber } = await import("@/lib/utils");
    const newInv = { clientId: inv.clientId, projectId: inv.projectId, quotationId: inv.quotationId, invoiceNumber: generateInvoiceNumber(), status: "draft", sections: inv.sections, subtotal: inv.subtotal, gstAmount: inv.gstAmount, totalAmount: inv.totalAmount, paymentTerms: inv.paymentTerms, notes: inv.notes };
    await duplicateInvoice.mutateAsync(newInv);
  };

  const statusColors: Record<string, string> = { draft: "bg-gray-100 text-gray-700", sent: "bg-blue-100 text-blue-700", partially_paid: "bg-amber-100 text-amber-700", paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Invoices</h1><p className="text-gray-500 text-sm mt-1">Manage your construction invoices</p></div>
        <a href="/dashboard/invoices/new" className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152b48] transition flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Invoice
        </a>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setStatusFilter("")} className={`px-3 py-1.5 rounded-lg text-sm ${!statusFilter ? "bg-[#1e3a5f] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>All</button>
        <button onClick={() => setStatusFilter("unpaid")} className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === "unpaid" ? "bg-[#1e3a5f] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>Unpaid</button>
        {INVOICE_STATUSES.map(s => <button key={s.value} onClick={() => setStatusFilter(s.value)} className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === s.value ? "bg-[#1e3a5f] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{s.label}</button>)}
      </div>
      <div className="bg-white rounded-xl border border-gray-200">
        {loading && !invoices.length ? <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a5f] border-t-transparent mx-auto"></div></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50"><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Client</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Project</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Due Date</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewInvoice(inv)}>
                    <td className="px-6 py-4 font-medium text-blue-600">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{inv.clientName || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{inv.projectName || "-"}</td>
                    <td className="px-6 py-4">
                      <select value={inv.status} onClick={e => e.stopPropagation()} onChange={e => handleStatusChange(inv.id, e.target.value)} className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${statusColors[inv.status]}`}>
                        {INVOICE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-6 py-4 text-sm text-green-600 text-right">{formatCurrency(inv.paidAmount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(inv.dueDate)}</td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" className="text-blue-600 hover:text-blue-800 text-sm mr-2">PDF</a>
                      <button onClick={() => setEmailModal({ id: inv.id, number: inv.invoiceNumber, clientEmail: inv.clientEmail, clientName: inv.clientName })} className="text-purple-600 hover:text-purple-800 text-sm mr-2" title="Send via email">📧 Email</button>
                      <button onClick={() => handleDuplicate(inv)} className="text-gray-600 hover:text-gray-800 text-sm mr-2">Duplicate</button>
                      {inv.status !== "paid" && <button onClick={() => handleRecordPayment(inv.id, parseFloat(inv.paidAmount || "0"), parseFloat(inv.totalAmount || "0"))} className="text-green-600 hover:text-green-800 text-sm mr-2">Pay</button>}
                      <button onClick={() => handleDelete(inv.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr key="empty"><td colSpan={8} className="px-6 py-12 text-center text-gray-400">No invoices found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setPage}
          pageSize={PAGE_SIZE}
        />
      </div>
      {viewInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewInvoice(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-semibold">{viewInvoice.invoiceNumber}</h2>
                <p className="text-sm text-gray-500">{viewInvoice.clientName} — {viewInvoice.projectName}</p>
                {viewInvoice.quotationNumber && (
                  <div className="mt-1 text-sm">
                    <span className="text-gray-500">Quotation:</span>{" "}
                    {viewInvoice.quotationId ? (
                      <a
                        href={`/dashboard/quotations?quotationId=${encodeURIComponent(viewInvoice.quotationId)}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {viewInvoice.quotationNumber}
                      </a>
                    ) : (
                      <span>{viewInvoice.quotationNumber}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setViewInvoice(null); setEmailModal({ id: viewInvoice.id, number: viewInvoice.invoiceNumber, clientEmail: viewInvoice.clientEmail, clientName: viewInvoice.clientName }); }} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Send to Client
                </button>
                <a href={`/api/invoices/${viewInvoice.id}/pdf`} target="_blank" className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-sm">Download PDF</a>
                <button onClick={() => setViewInvoice(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Close</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Status:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[viewInvoice.status]}`}>{viewInvoice.status?.replace("_", " ")}</span></div>
                <div><span className="text-gray-500">Issue Date:</span> <span className="ml-1">{formatDate(viewInvoice.issueDate || viewInvoice.createdAt)}</span></div>
                <div><span className="text-gray-500">Due Date:</span> <span className="ml-1">{formatDate(viewInvoice.dueDate)}</span></div>
              </div>
              {((viewInvoice.sections as any[]) || []).map((section: any) => (
                <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 font-semibold text-sm text-[#1e3a5f]">{section.name}</div>
                  <table className="w-full text-sm">
                    <thead><tr className="border-t border-gray-200"><th className="text-left px-4 py-2 text-xs text-gray-500">Description</th><th className="text-center px-4 py-2 text-xs text-gray-500">Qty</th><th className="text-center px-4 py-2 text-xs text-gray-500">Unit</th><th className="text-right px-4 py-2 text-xs text-gray-500">Rate</th><th className="text-right px-4 py-2 text-xs text-gray-500">Amount</th></tr></thead>
                    <tbody>{(section.items || []).map((item: any) => <tr key={item.id} className="border-t border-gray-100"><td className="px-4 py-2">{item.description}</td><td className="text-center px-4 py-2">{item.quantity}</td><td className="text-center px-4 py-2">{item.unit}</td><td className="text-right px-4 py-2">${item.rate.toFixed(2)}</td><td className="text-right px-4 py-2 font-medium">${item.amount.toFixed(2)}</td></tr>)}</tbody>
                  </table>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(viewInvoice.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">GST (10%)</span><span className="font-medium">{formatCurrency(viewInvoice.gstAmount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold">{formatCurrency(viewInvoice.totalAmount)}</span></div>
                {parseFloat(viewInvoice.paidAmount) > 0 && <><div className="flex justify-between text-green-600"><span>Paid</span><span>-{formatCurrency(viewInvoice.paidAmount)}</span></div><div className="flex justify-between text-lg font-bold text-[#1e3a5f] pt-2 border-t border-gray-200"><span>Balance Due</span><span>{formatCurrency(parseFloat(viewInvoice.totalAmount) - parseFloat(viewInvoice.paidAmount))}</span></div></>}
              </div>
            </div>
          </div>
        </div>
      )}
      {emailModal && (
        <SendEmailModal
          type="invoice"
          id={emailModal.id}
          number={emailModal.number}
          clientEmail={emailModal.clientEmail}
          clientName={emailModal.clientName}
          onClose={() => setEmailModal(null)}
          onSent={() => refetch()}
        />
      )}
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a5f] border-t-transparent mx-auto"></div></div>}>
      <InvoicesContent />
    </Suspense>
  );
}
