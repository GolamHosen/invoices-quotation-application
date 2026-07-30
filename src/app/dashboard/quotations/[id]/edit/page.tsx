"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, PROJECT_TYPES, UNITS, generateId } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";

export default function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { activeCompanyId } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({
    clientId: "",
    projectId: "",
    issueDate: "",
    expiryDate: "",
    sections: [] as any[],
    status: "draft",
    termsAndConditions: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/quotations/${id}`).then(r => r.json()),
      fetch(`/api/clients?companyId=${encodeURIComponent(activeCompanyId)}&limit=1000`).then(r => r.json()),
      fetch(`/api/projects?companyId=${encodeURIComponent(activeCompanyId)}&limit=1000`).then(r => r.json()),
      fetch(`/api/settings?companyId=${encodeURIComponent(activeCompanyId)}`).then(r => r.json()),
    ]).then(([quotation, cl, pr, st]) => {
      setClients(cl.data || cl);
      setProjects(pr.data || pr);
      setSettings(st);
      setForm({
        clientId: quotation.clientId || "",
        projectId: quotation.projectId || "",
        issueDate: quotation.issueDate ? new Date(quotation.issueDate).toISOString().split("T")[0] : "",
        expiryDate: quotation.expiryDate ? new Date(quotation.expiryDate).toISOString().split("T")[0] : "",
        sections: (quotation.sections || []).map((s: any) => ({
          ...s,
          id: s.id || generateId(),
          items: (s.items || []).map((i: any) => ({
            ...i,
            id: i.id || generateId(),
            amount: i.quantity * i.rate,
          })),
        })),
        status: quotation.status || "draft",
        termsAndConditions: quotation.termsAndConditions || "",
        notes: quotation.notes || "",
      });
      setLoading(false);
    });
  }, [id, activeCompanyId]);

  const clientProjects = projects.filter((p: any) => p.clientId === form.clientId);

  const updateItem = (si: number, ii: number, field: string, value: string | number) => {
    const sections = [...form.sections]; const items = [...sections[si].items];
    items[ii] = { ...items[ii], [field]: value, amount: (field === "quantity" ? Number(value) : items[ii].quantity) * (field === "rate" ? Number(value) : items[ii].rate) };
    sections[si] = { ...sections[si], items }; setForm({ ...form, sections });
  };
  const addItem = (si: number) => {
    const sections = [...form.sections]; sections[si] = { ...sections[si], items: [...sections[si].items, { id: generateId(), description: "", quantity: 1, unit: "sqm", rate: 0, amount: 0 }] };
    setForm({ ...form, sections });
  };
  const removeItem = (si: number, ii: number) => {
    const sections = [...form.sections]; sections[si] = { ...sections[si], items: sections[si].items.filter((_: any, i: number) => i !== ii) }; setForm({ ...form, sections });
  };
  const addSection = () => setForm({ ...form, sections: [...form.sections, { id: generateId(), name: "New Section", items: [{ id: generateId(), description: "", quantity: 1, unit: "sqm", rate: 0, amount: 0 }] }] });
  const removeSection = (si: number) => setForm({ ...form, sections: form.sections.filter((_: any, i: number) => i !== si) });
  const updateSection = (si: number, name: string) => { const sections = [...form.sections]; sections[si] = { ...sections[si], name }; setForm({ ...form, sections }); };

  const subtotal = form.sections.reduce((s: number, sec: any) => s + (sec.items || []).reduce((is: number, item: any) => is + (item.amount || 0), 0), 0);
  const gstRate = parseFloat(settings?.gstRate || "10");
  const gstAmount = subtotal * (gstRate / 100);
  const totalAmount = subtotal + gstAmount;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const project = projects.find((p: any) => p.id === form.projectId);
      const resp = await fetch(`/api/quotations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          companyId: activeCompanyId,
          subtotal,
          gstAmount,
          totalAmount,
          projectType: project?.type,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        console.error("Quotation update failed:", resp.status, err);
        return;
      }
      router.push("/dashboard/quotations");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a5f] border-t-transparent mx-auto"></div>
        <p className="mt-4 text-gray-500 text-sm">Loading quotation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Quotation</h1>
          <p className="text-gray-500 text-sm mt-1">Update quotation details</p>
        </div>
        <button onClick={() => router.push("/dashboard/quotations")} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
      </div>

      {/* Client & Project & Dates */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Quotation Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value, projectId: "" })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
            <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Select project</option>
              {clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
            <input type="date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
            <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* Sections & Items */}
      {form.sections.map((section: any, si: number) => (
        <div key={section.id} className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-t-xl border-b border-gray-200">
            <input value={section.name} onChange={e => updateSection(si, e.target.value)} className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold" />
            <span className="text-xs text-gray-400">{section.items.length} items</span>
            <button onClick={() => removeSection(si)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead><tr className="text-xs text-gray-500"><th className="text-left pb-2">Description</th><th className="text-center pb-2 w-20">Qty</th><th className="text-center pb-2 w-20">Unit</th><th className="text-right pb-2 w-28">Rate ($)</th><th className="text-right pb-2 w-28">Amount ($)</th><th className="w-8"></th></tr></thead>
              <tbody>
                {(section.items || []).map((item: any, ii: number) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="py-2 pr-2">
                      <textarea
                        value={item.description}
                        onChange={e => updateItem(si, ii, "description", e.target.value)}
                        rows={3}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm resize-none"
                        placeholder="Item description"
                      />
                    </td>
                    <td className="py-2 px-1"><input type="number" value={item.quantity} onChange={e => updateItem(si, ii, "quantity", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-center" /></td>
                    <td className="py-2 px-1"><select value={item.unit} onChange={e => updateItem(si, ii, "unit", e.target.value)} className="w-full px-1 py-1 border border-gray-200 rounded text-sm">{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></td>
                    <td className="py-2 px-1"><input type="number" value={item.rate} onChange={e => updateItem(si, ii, "rate", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right" /></td>
                    <td className="py-2 px-1 text-right font-medium">{formatCurrency(item.amount)}</td>
                    <td className="py-2 pl-1"><button onClick={() => removeItem(si, ii)} className="text-red-400 hover:text-red-600 text-xs">✕</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t border-gray-200"><td colSpan={4} className="py-2 text-right font-semibold text-gray-600">Section Total:</td><td className="py-2 text-right font-bold">{formatCurrency((section.items || []).reduce((s: number, i: any) => s + (i.amount || 0), 0))}</td><td></td></tr></tfoot>
            </table>
            <button onClick={() => addItem(si)} className="mt-2 text-sm text-blue-600 hover:text-blue-800">+ Add Item</button>
          </div>
        </div>
      ))}
      <button onClick={addSection} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 text-sm font-medium transition">+ Add Section</button>

      {/* Totals */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">GST ({gstRate}%)</span><span className="font-medium">{formatCurrency(gstAmount)}</span></div>
          <div className="flex justify-between text-lg font-bold text-[#1e3a5f] pt-2 border-t border-gray-200"><span>Total</span><span>{formatCurrency(totalAmount)}</span></div>
        </div>
      </div>

      {/* Terms & Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label><textarea value={form.termsAndConditions} onChange={e => setForm({ ...form, termsAndConditions: e.target.value })} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button onClick={() => router.push("/dashboard/quotations")} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">← Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#152b48] disabled:opacity-50 flex items-center gap-2">
          {saving ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Saving...</>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
