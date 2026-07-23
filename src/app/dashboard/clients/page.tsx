"use client";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

export default function ClientsPage() {
  const { activeCompanyId } = useCompany();

  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [form, setForm] = useState({ name: "", companyName: "", phone: "", email: "", address: "", notes: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = async (pageNum: number = page, searchTerm: string = search) => {
    setLoading(true);
    try {
      let url = `/api/clients?companyId=${encodeURIComponent(activeCompanyId)}&page=${pageNum}&limit=${PAGE_SIZE}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      const r = await fetch(url);
      const res = await r.json();
      setClients(res.data);
      setTotalItems(res.total);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [activeCompanyId]);

  useEffect(() => {
    load(page, search);
  }, [activeCompanyId, page]);

  const openCreate = () => { setEditClient(null); setForm({ name: "", companyName: "", phone: "", email: "", address: "", notes: "" }); setShowModal(true); };
  const openEdit = (c: any) => { setEditClient(c); setForm({ name: c.name, companyName: c.companyName || "", phone: c.phone || "", email: c.email || "", address: c.address || "", notes: c.notes || "" }); setShowModal(true); };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editClient) {
      await fetch(`/api/clients/${editClient.id}?companyId=${encodeURIComponent(activeCompanyId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, companyId: activeCompanyId }),
      });
    } else {
      await fetch("/api/clients?companyId=" + encodeURIComponent(activeCompanyId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, companyId: activeCompanyId }),
      });
    }
    setShowModal(false);
    load(page);
  };

  const handleDelete = async (id: string) => {
    const message =
      "Are you sure you want to delete this client? This action will permanently remove the client and all associated quotations, invoices, projects, documents, and records. This action cannot be undone.";
    if (confirm(message)) {
      await fetch(`/api/clients/${id}?companyId=${encodeURIComponent(activeCompanyId)}`, { method: "DELETE" });
      if (clients.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        load(page);
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    load(1, value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Clients</h1><p className="text-gray-500 text-sm mt-1">Manage your client relationships</p></div>
        <button onClick={openCreate} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152b48] transition flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Client
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full max-w-sm px-4 py-2 bg-gray-100 rounded-lg text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
        {loading ? <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a5f] border-t-transparent mx-auto"></div></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50"><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Company</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Address</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((c: any) => (
                  <tr key={c.id || c.email || c.phone || c.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-sm font-bold">{c.name.charAt(0)}</div><span className="font-medium text-gray-900">{c.name}</span></div></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.companyName || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.phone || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.email || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{c.address || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">Edit</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && <tr key="empty"><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No clients found</td></tr>}
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
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-semibold">{editClient ? "Edit Client" : "Add Client"}</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#152b48]">{editClient ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
