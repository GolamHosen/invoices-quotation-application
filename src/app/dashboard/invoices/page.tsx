"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency, formatDate, INVOICE_STATUSES, generateId } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";
import { getCompanyEmailDisplayName } from "@/lib/email-sender";
import { useInvoices, useInvoiceMutations } from "@/lib/api-hooks";
import Pagination from "@/components/Pagination";
import ConfirmDialog from "@/components/ConfirmDialog";

function SendEmailModal({ type, id, number, companyId, clientEmail, clientName, onClose, onSent }: {
  type: "quotation" | "invoice";
  id: string;
  number: string;
  companyId?: string;
  clientEmail?: string;
  clientName?: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const { companies } = useCompany();
  const companyName = getCompanyEmailDisplayName(companies.find(company => company.id === companyId));
  const [to, setTo] = useState(clientEmail || "");
  const [subject, setSubject] = useState(`${type === "quotation" ? "Quotation" : "Invoice"} ${number} from ${companyName}`);
  const [message, setMessage] = useState(
    `Dear ${clientName || "Valued Customer"},\n\nPlease find attached the ${type} ${number} for your review.\n\nIf you have any questions or require clarification, please don't hesitate to contact us.\n\nKind regards,\n${companyName}`
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

function RecordPaymentModal({
  invoice,
  onClose,
  onSave,
}: {
  invoice: any;
  onClose: () => void;
  onSave: (paymentData: { amount: number; date: string; note: string }) => Promise<void>;
}) {
  const total = parseFloat(invoice.totalAmount || "0");
  const paid = parseFloat(invoice.paidAmount || "0");
  const balance = Math.max(0, total - paid);

  const [amount, setAmount] = useState(balance > 0 ? balance.toString() : "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid payment amount greater than 0.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ amount: parsedAmount, date, note });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[65] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
              <p className="text-sm text-gray-500">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex justify-between items-center text-sm">
            <div>
              <span className="text-gray-500 block text-xs">Total Amount</span>
              <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block text-xs">Balance Due</span>
              <span className="font-bold text-blue-700">{formatCurrency(balance)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid ($) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note / Reference (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Bank Transfer, Cheque #104, Direct Deposit"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-200">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2">
              {saving ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Saving...</>
              ) : (
                <>Record Payment</>
              )}
            </button>
          </div>
        </form>
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
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<any>(null);
  const [paymentSortOrder, setPaymentSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    if (activeCompanyId) {
      fetch(`/api/settings?companyId=${encodeURIComponent(activeCompanyId)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => setCompanySettings(data))
        .catch(() => setCompanySettings(null));
    }
  }, [activeCompanyId]);

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

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteInvoice.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const handleSavePayment = async (paymentData: { amount: number; date: string; note: string }) => {
    if (!paymentModalInvoice) return;
    const inv = paymentModalInvoice;
    const existingPayments = inv.payments || [];
    const newPayment = {
      id: generateId(),
      amount: paymentData.amount,
      date: paymentData.date,
      note: paymentData.note,
    };
    const updatedPayments = [...existingPayments, newPayment];
    const newPaid = updatedPayments.reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);
    const total = parseFloat(inv.totalAmount || "0");
    const newStatus = newPaid >= total ? "paid" : newPaid > 0 ? "partially_paid" : "sent";

    await updateStatus.mutateAsync({
      id: inv.id,
      paidAmount: newPaid.toString(),
      payments: updatedPayments,
      status: newStatus,
    });

    const updatedInv = {
      ...inv,
      paidAmount: newPaid.toString(),
      payments: updatedPayments,
      status: newStatus,
    };

    if (viewInvoice && viewInvoice.id === inv.id) {
      setViewInvoice(updatedInv);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!viewInvoice) return;
    const existingPayments = viewInvoice.payments || [];
    const updatedPayments = existingPayments.filter((p: any) => p.id !== paymentId);
    const newPaid = updatedPayments.reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);
    const total = parseFloat(viewInvoice.totalAmount || "0");
    const newStatus = newPaid >= total ? "paid" : newPaid > 0 ? "partially_paid" : "sent";

    await updateStatus.mutateAsync({
      id: viewInvoice.id,
      paidAmount: newPaid.toString(),
      payments: updatedPayments,
      status: newStatus,
    });

    const updatedInv = {
      ...viewInvoice,
      paidAmount: newPaid.toString(),
      payments: updatedPayments,
      status: newStatus,
    };
    setViewInvoice(updatedInv);
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
                      <button onClick={() => setEmailModal({ id: inv.id, number: inv.invoiceNumber, companyId: inv.companyId, clientEmail: inv.clientEmail, clientName: inv.clientName })} className="text-purple-600 hover:text-purple-800 text-sm mr-2" title="Send via email">📧 Email</button>
                      <button onClick={() => handleDuplicate(inv)} className="text-gray-600 hover:text-gray-800 text-sm mr-2">Duplicate</button>
                      {inv.status !== "paid" && <button onClick={() => setPaymentModalInvoice(inv)} className="text-green-600 hover:text-green-800 text-sm mr-2 font-medium">Pay</button>}
                      <a href={`/dashboard/invoices/${inv.id}/edit`} className="text-amber-600 hover:text-amber-800 text-sm mr-2">Edit</a>
                      <button onClick={() => setDeleteConfirmId(inv.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
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
                <button onClick={() => { setViewInvoice(null); setEmailModal({ id: viewInvoice.id, number: viewInvoice.invoiceNumber, companyId: viewInvoice.companyId, clientEmail: viewInvoice.clientEmail, clientName: viewInvoice.clientName }); }} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Send to Client
                </button>
                <a href={`/api/invoices/${viewInvoice.id}/pdf`} target="_blank" className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-sm">Download PDF</a>
                <button onClick={() => setViewInvoice(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Close</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {companySettings?.logoUrl && (
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <img src={companySettings.logoUrl} alt={companySettings.companyName || "Company Logo"} className="h-12 max-w-[200px] object-contain" />
                  <div className="text-right text-xs text-gray-500">
                    <div className="font-semibold text-gray-700 text-sm">{companySettings.companyName}</div>
                    {companySettings.abn && <div>ABN: {companySettings.abn}</div>}
                    {companySettings.phone && <div>Phone: {companySettings.phone}</div>}
                  </div>
                </div>
              )}
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

              {/* Payment History Section */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm mt-6">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-green-700">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">Payment History</h3>
                      <p className="text-xs text-gray-500">
                        {(viewInvoice.payments || []).length} payment{(viewInvoice.payments || []).length !== 1 ? "s" : ""} recorded
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentSortOrder(s => (s === "desc" ? "asc" : "desc"))}
                      className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition flex items-center gap-1 font-medium"
                      title="Toggle chronological sorting"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      <span>{paymentSortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
                    </button>

                    {viewInvoice.status !== "paid" && (
                      <button
                        type="button"
                        onClick={() => setPaymentModalInvoice(viewInvoice)}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-1"
                      >
                        <span>+ Record Payment</span>
                      </button>
                    )}
                  </div>
                </div>

                {(() => {
                  const rawPayments = viewInvoice.payments || [];
                  const paymentsList = [...rawPayments];
                  if (paymentsList.length === 0 && parseFloat(viewInvoice.paidAmount || "0") > 0) {
                    paymentsList.push({
                      id: "initial-payment",
                      amount: parseFloat(viewInvoice.paidAmount),
                      date: viewInvoice.updatedAt || viewInvoice.createdAt,
                      note: "Initial Payment Record",
                    });
                  }

                  const sortedPayments = paymentsList.sort((a: any, b: any) => {
                    const timeA = new Date(a.date).getTime();
                    const timeB = new Date(b.date).getTime();
                    return paymentSortOrder === "desc" ? timeB - timeA : timeA - timeB;
                  });

                  if (sortedPayments.length === 0) {
                    return (
                      <div className="p-6 text-center text-gray-400 text-sm">
                        No payments recorded yet for this invoice.
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50/50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                            <th className="text-left px-4 py-2 font-semibold">Payment Date</th>
                            <th className="text-right px-4 py-2 font-semibold">Amount Paid</th>
                            <th className="text-left px-4 py-2 font-semibold">Note / Reference</th>
                            <th className="text-right px-4 py-2 font-semibold w-16">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {sortedPayments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2.5 text-gray-700 font-medium whitespace-nowrap">
                                {formatDate(p.date)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-green-700 whitespace-nowrap">
                                {formatCurrency(p.amount)}
                              </td>
                              <td className="px-4 py-2.5 text-gray-600 text-xs">
                                {p.note || <span className="text-gray-400 italic">No notes</span>}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {p.id !== "initial-payment" && (
                                  <button
                                    onClick={() => handleDeletePayment(p.id)}
                                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                                    title="Delete payment entry"
                                  >
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      {paymentModalInvoice && (
        <RecordPaymentModal
          invoice={paymentModalInvoice}
          onClose={() => setPaymentModalInvoice(null)}
          onSave={handleSavePayment}
        />
      )}
      {emailModal && (
        <SendEmailModal
          type="invoice"
          id={emailModal.id}
          number={emailModal.number}
          companyId={emailModal.companyId}
          clientEmail={emailModal.clientEmail}
          clientName={emailModal.clientName}
          onClose={() => setEmailModal(null)}
          onSent={() => refetch()}
        />
      )}
      <ConfirmDialog
        open={!!deleteConfirmId}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
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
