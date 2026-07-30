"use client";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";
import { useClients, useClientMutations } from "@/lib/api-hooks";
import Pagination from "@/components/Pagination";
import ConfirmDialog from "@/components/ConfirmDialog";
import ToastContainer from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import ClientInvoiceHistory from "@/components/ClientInvoiceHistory";
import InvoiceDetailModal from "@/components/InvoiceDetailModal";

const PAGE_SIZE = 10;

function formatDateTime(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return `${formatDate(d)} at ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
}

export default function ClientsPage() {
  const { activeCompanyId } = useCompany();

  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [viewClient, setViewClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [runningReminders, setRunningReminders] = useState(false);

  const [form, setForm] = useState<any>({
    name: "",
    companyName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    autoRemindersEnabled: false,
    reminderIntervalDays: 7,
    customInterval: "",
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: res, isLoading: loading, refetch } = useClients({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    companyId: activeCompanyId,
  });

  const { createClient, updateClient, deleteClient } = useClientMutations();
  const { toasts, dismiss, withToast, addToast } = useToast();

  const clients = res?.data || [];
  const totalItems = res?.total || 0;
  const totalPages = res?.totalPages || 0;

  useEffect(() => {
    setPage(1);
  }, [activeCompanyId]);

  const openCreate = () => {
    setEditClient(null);
    setForm({
      name: "",
      companyName: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      autoRemindersEnabled: false,
      reminderIntervalDays: 7,
      customInterval: "",
    });
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditClient(c);
    const interval = c.reminderIntervalDays || 7;
    const isPreset = [3, 7, 15, 30].includes(interval);
    setForm({
      name: c.name || "",
      companyName: c.companyName || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      notes: c.notes || "",
      autoRemindersEnabled: !!c.autoRemindersEnabled,
      reminderIntervalDays: isPreset ? interval : "custom",
      customInterval: !isPreset ? String(interval) : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editClient;
    setShowModal(false);

    const intervalDays =
      form.reminderIntervalDays === "custom"
        ? parseInt(form.customInterval, 10) || 7
        : Number(form.reminderIntervalDays) || 7;

    const payload = {
      name: form.name,
      companyName: form.companyName,
      phone: form.phone,
      email: form.email,
      address: form.address,
      notes: form.notes,
      autoRemindersEnabled: form.autoRemindersEnabled,
      reminderIntervalDays: intervalDays,
    };

    await withToast({
      loadingMessage: isEdit ? "Updating client..." : "Adding client...",
      successMessage: isEdit ? "Client updated successfully." : "Client added successfully.",
      errorMessage: isEdit ? "Failed to update client." : "Failed to add client.",
      operationKey: isEdit ? `update-client-${editClient.id}` : "create-client",
      fn: async () => {
        if (isEdit) {
          await updateClient.mutateAsync({ id: editClient.id, companyId: activeCompanyId, ...payload });
        } else {
          await createClient.mutateAsync({ ...payload, companyId: activeCompanyId });
        }
      },
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const idToDelete = deleteConfirmId;
    setDeleteConfirmId(null);
    await withToast({
      loadingMessage: "Deleting client...",
      successMessage: "Client deleted successfully.",
      errorMessage: "Failed to delete client.",
      operationKey: `delete-client-${idToDelete}`,
      fn: async () => {
        await deleteClient.mutateAsync({ id: idToDelete, companyId: activeCompanyId });
        if (clients.length === 1 && page > 1) {
          setPage(page - 1);
        }
      },
    });
  };

  const handleRunReminders = async (targetClientId?: string) => {
    setRunningReminders(true);
    try {
      const res = await fetch("/api/reminders/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: targetClientId,
          companyId: activeCompanyId,
          force: !!targetClientId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process reminders");

      if (data.remindersSent > 0) {
        addToast({
          type: "success",
          message: `Successfully sent ${data.remindersSent} payment reminder email(s).`,
        });
      } else if (data.stoppedReminders > 0) {
        addToast({
          type: "info",
          message: "All invoices for this client are paid! Reminders are currently stopped.",
        });
      } else {
        addToast({
          type: "info",
          message: "No payment reminders due at this time.",
        });
      }
      refetch();

      if (viewClient && targetClientId === viewClient.id) {
        // Refresh viewClient state
        const updatedRes = await fetch(`/api/clients/${viewClient.id}`);
        if (updatedRes.ok) {
          setViewClient(await updatedRes.json());
        }
      }
    } catch (err: any) {
      addToast({
        type: "error",
        message: err.message || "Failed to run payment reminders",
      });
    } finally {
      setRunningReminders(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage client profiles and automatic payment reminder settings
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleRunReminders()}
            disabled={runningReminders}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition flex items-center gap-2 disabled:opacity-50"
            title="Check and process payment reminders for all eligible clients"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {runningReminders ? "Processing..." : "Run Reminders"}
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152b48] transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <input
            type="text"
            placeholder="Search clients by name, company, email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full max-w-sm px-4 py-2 bg-gray-100 rounded-lg text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        {loading && !clients.length ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a5f] border-t-transparent mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Name & Company</th>
                  <th className="px-6 py-3 text-left">Contact Info</th>
                  <th className="px-6 py-3 text-left">Auto Reminders</th>
                  <th className="px-6 py-3 text-left">Next Due</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((c: any) => (
                  <tr
                    key={c.id || c.email || c.name}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setViewClient(c)}
                  >
                    {/* Name & Company */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{c.name}</div>
                          {c.companyName && <div className="text-xs text-gray-500">{c.companyName}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{c.email || "-"}</div>
                      <div className="text-xs text-gray-400">{c.phone || ""}</div>
                    </td>

                    {/* Auto Reminders Status */}
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {c.autoRemindersEnabled ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                          On (Every {c.reminderIntervalDays || 7}d)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                          Off
                        </span>
                      )}
                    </td>

                    {/* Next Due */}
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {c.autoRemindersEnabled ? (
                        c.nextReminderDueAt ? (
                          formatDate(c.nextReminderDueAt)
                        ) : (
                          <span className="text-green-600 font-medium">Payment complete</span>
                        )
                      ) : (
                        <span className="text-gray-400">Reminders disabled</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setViewClient(c);
                          setActiveTab("overview");
                        }}
                        className="text-gray-600 hover:text-gray-800 text-sm mr-3 font-medium"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          setViewClient(c);
                          setActiveTab("history");
                        }}
                        className="text-[#1e3a5f] hover:text-blue-800 text-sm mr-3 font-semibold"
                      >
                        Invoices
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="text-blue-600 hover:text-blue-800 text-sm mr-3 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(c.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {clients.length === 0 && (
                  <tr key="empty">
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      No clients found
                    </td>
                  </tr>
                )}
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

      {/* Client Profile / Details & Invoice History Modal */}
      {viewClient && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setViewClient(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header & Tabs */}
            <div className="px-6 pt-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-base font-bold">
                    {viewClient.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{viewClient.name}</h2>
                    {viewClient.companyName && (
                      <p className="text-xs text-gray-500">{viewClient.companyName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const c = viewClient;
                      setViewClient(null);
                      openEdit(c);
                    }}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => setViewClient(null)}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex gap-4 border-t border-gray-100 pt-2 text-sm font-medium">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`pb-2.5 px-1 border-b-2 transition ${
                    activeTab === "overview"
                      ? "border-[#1e3a5f] text-[#1e3a5f] font-bold"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Overview & Reminders
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`pb-2.5 px-1 border-b-2 transition flex items-center gap-1.5 ${
                    activeTab === "history"
                      ? "border-[#1e3a5f] text-[#1e3a5f] font-bold"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span>Invoice History</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {activeTab === "overview" ? (
                <>
                  {/* Contact Information */}
                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div>
                      <span className="text-xs text-gray-400 block uppercase font-semibold">Email</span>
                      <span className="font-medium text-gray-800">{viewClient.email || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block uppercase font-semibold">Phone</span>
                      <span className="font-medium text-gray-800">{viewClient.phone || "N/A"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-gray-400 block uppercase font-semibold">Address</span>
                      <span className="font-medium text-gray-800">{viewClient.address || "N/A"}</span>
                    </div>
                  </div>

                  {/* Automatic Payment Reminder Settings Card */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-gray-900">Automatic Payment Reminders</h3>
                          <p className="text-xs text-gray-500">Per-client reminder configurations</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRunReminders(viewClient.id)}
                        disabled={runningReminders}
                        className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition disabled:opacity-50"
                      >
                        {runningReminders ? "Sending..." : "Send Reminder Now"}
                      </button>
                    </div>

                    <div className="p-4 space-y-3 text-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-gray-500 text-xs">Current Status</span>
                        {viewClient.autoRemindersEnabled ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            ON (Active)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            OFF (Disabled)
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-gray-500 text-xs">Selected Interval</span>
                        <span className="font-semibold text-gray-800">
                          Every {viewClient.reminderIntervalDays || 7} days
                        </span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-gray-500 text-xs">Last Reminder Sent</span>
                        <span className="font-medium text-gray-800">
                          {formatDateTime(viewClient.lastReminderSentAt)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs">Next Scheduled Reminder</span>
                        <span className="font-medium text-blue-700">
                          {viewClient.autoRemindersEnabled ? (
                            viewClient.nextReminderDueAt ? (
                              formatDateTime(viewClient.nextReminderDueAt)
                            ) : (
                              <span className="text-green-600 font-semibold">Payment complete</span>
                            )
                          ) : (
                            <span className="text-gray-400 italic">Reminders turned off</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <ClientInvoiceHistory
                  clientId={viewClient.id}
                  companyId={activeCompanyId}
                  onSelectInvoice={(invId) => setSelectedInvoiceId(invId)}
                />
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewClient(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Overlay Modal */}
      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />

      {/* Add / Edit Client Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {editClient ? "Edit Client" : "Add Client"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Automatic Payment Reminders Settings */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-gray-900 block">
                      Automatic Payment Reminders
                    </span>
                    <span className="text-xs text-gray-500">
                      Send automated email reminders for unpaid invoices
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.autoRemindersEnabled}
                      onChange={(e) => setForm({ ...form, autoRemindersEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {form.autoRemindersEnabled && (
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-700">
                      Reminder Interval
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[3, 7, 15, 30].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setForm({ ...form, reminderIntervalDays: val, customInterval: "" })}
                          className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                            form.reminderIntervalDays === val
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                          }`}
                        >
                          Every {val}d
                        </button>
                      ))}
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, reminderIntervalDays: "custom" })}
                        className={`text-xs font-medium ${
                          form.reminderIntervalDays === "custom"
                            ? "text-amber-600 font-bold"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        + Set Custom Interval (Days)
                      </button>

                      {form.reminderIntervalDays === "custom" && (
                        <div className="mt-2">
                          <input
                            type="number"
                            min="1"
                            max="365"
                            placeholder="Enter custom number of days (e.g. 5, 10, 45)"
                            value={form.customInterval}
                            onChange={(e) => setForm({ ...form, customInterval: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#152b48]"
                >
                  {editClient ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirmId}
        title="Delete Client"
        message="Are you sure you want to delete this client? This action will permanently remove the client and all associated quotations, invoices, projects, documents, and records. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
