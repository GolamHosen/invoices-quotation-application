"use client";
import { useState, useEffect } from "react";
import { PROJECT_TYPES, PROJECT_STATUSES } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

export default function ProjectsPage() {
  const { activeCompanyId } = useCompany();

  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<any>(null);
  const [form, setForm] = useState({ name: "", address: "", type: "granny_flat" as string, status: "pending" as string, clientId: "" });
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = async (pageNum: number = page) => {
    setLoading(true);
    try {
      const [pr, cl] = await Promise.all([
        fetch(`/api/projects?companyId=${encodeURIComponent(activeCompanyId)}&page=${pageNum}&limit=${PAGE_SIZE}`).then((r) => r.json()),
        fetch(`/api/clients?companyId=${encodeURIComponent(activeCompanyId)}&limit=1000`).then((r) => r.json()),
      ]);
      setProjects(pr.data || pr);
      setTotalItems(pr.total || 0);
      setTotalPages(pr.totalPages || 0);
      setClients(cl.data || cl);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [activeCompanyId]);

  useEffect(() => {
    load(page);
  }, [activeCompanyId, page]);

  const openCreate = () => {
    setEditProject(null);
    setForm({ name: "", address: "", type: "granny_flat", status: "pending", clientId: clients[0]?.id || "" });
    setShowModal(true);
  };

  const openEdit = (p: any) => {
    setEditProject(p);
    setForm({ name: p.name, address: p.address || "", type: p.type, status: p.status, clientId: p.clientId });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editProject) {
      await fetch(`/api/projects/${editProject.id}?companyId=${encodeURIComponent(activeCompanyId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, companyId: activeCompanyId }),
      });
    } else {
      await fetch(`/api/projects?companyId=${encodeURIComponent(activeCompanyId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, companyId: activeCompanyId }),
      });
    }
    setShowModal(false);
    load(page);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this project?")) {
      await fetch(`/api/projects/${id}?companyId=${encodeURIComponent(activeCompanyId)}`, { method: "DELETE" });
      if (projects.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        load(page);
      }
    }
  };

  const statusColors: Record<string, string> = { pending: "bg-gray-100 text-gray-700", in_progress: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700", on_hold: "bg-amber-100 text-amber-700", cancelled: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Projects</h1><p className="text-gray-500 text-sm mt-1">Manage your construction projects</p></div>
        <button onClick={openCreate} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152b48] transition flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Project
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a5f] border-t-transparent mx-auto"></div></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50"><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Project</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Client</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Address</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.clientName || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{PROJECT_TYPES.find(t => t.value === p.type)?.label || p.type}</td>
                    <td className="px-6 py-4"><span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] || "bg-gray-100 text-gray-600"}`}>{PROJECT_STATUSES.find(s => s.value === p.status)?.label || p.status}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{p.address || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && <tr key="empty"><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No projects found</td></tr>}
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
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-semibold">{editProject ? "Edit Project" : "Add Project"}</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Client *</label><select required value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"><option key="" value="">Select client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Project Type *</label><select required value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">{PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">{PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#152b48]">{editProject ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
