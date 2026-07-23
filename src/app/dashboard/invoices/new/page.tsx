"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, PROJECT_TYPES, UNITS, generateId } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";

export default function NewInvoicePage() {
  const router = useRouter();
  const { activeCompanyId } = useCompany();
  const [mode, setMode] = useState<"select" | "manual">("select");
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [form, setForm] = useState({
    clientId: "",
    projectId: "",
    quotationId: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().split("T")[0];
    })(),
    sections: [] as any[],
    status: "draft",
    paymentTerms: "Payment due within 14 days",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/clients?companyId=${encodeURIComponent(activeCompanyId)}`).then(r => r.json()),
      fetch(`/api/projects?companyId=${encodeURIComponent(activeCompanyId)}`).then(r => r.json()),
      fetch(`/api/quotations?status=approved&companyId=${encodeURIComponent(activeCompanyId)}`).then(r => r.json()),
      fetch(`/api/settings?companyId=${encodeURIComponent(activeCompanyId)}`).then(r => r.json()),
    ]).then(([cl, pr, qu, st]) => {
      // API routes now return { data, total, page, totalPages } for paginated endpoints
      setClients(cl.data || cl);
      setProjects(pr.data || pr);
      setQuotations(qu.data || qu);
      setSettings(st);
    });
  }, [activeCompanyId]);

  const clientProjects = projects.filter((p: any) => p.clientId === form.clientId);

  const quotationRef =
    (form.quotationId && quotations.find((q: any) => q.id === form.quotationId)?.quotationNumber) ||
    selectedQuotation?.quotationNumber ||
    null;

  const loadQuotation = async (qId: string) => {
    const res = await fetch(`/api/quotations/${qId}`);
    const q = await res.json();
    setSelectedQuotation(q);
    setForm(f => ({
      ...f, quotationId: q.id, clientId: q.clientId, projectId: q.projectId,
      sections: q.sections || [], paymentTerms: f.paymentTerms,
    }));
    setMode("manual");
  };

  const updateItem = (si: number, ii: number, field: string, value: string | number) => {
    const sections = [...form.sections]; const items = [...sections[si].items];
    items[ii] = { ...items[ii], [field]: value, amount: (field === "quantity" ? Number(value) : items[ii].quantity) * (field === "rate" ? Number(value) : items[ii].rate) };
    sections[si] = { ...sections[si], items }; setForm({ ...form, sections });
  };
  const addItem = (si: number) => {
    const sections = [...form.sections]; sections[si] = { ...sections[si], items: [...sections[si].items, { id: generateId(), description: "", quantity: 1, unit: "sqm", rate: 0, amount: 0 }] }; setForm({ ...form, sections });
  };
  const removeItem = (si: number, ii: number) => { const sections = [...form.sections]; sections[si] = { ...sections[si], items: sections[si].items.filter((_: any, i: number) => i !== ii) }; setForm({ ...form, sections }); };
  const addSection = () => setForm({ ...form, sections: [...form.sections, { id: generateId(), name: "New Section", items: [{ id: generateId(), description: "", quantity: 1, unit: "sqm", rate: 0, amount: 0 }] }] });
  const removeSection = (si: number) => setForm({ ...form, sections: form.sections.filter((_: any, i: number) => i !== si) });
  const updateSection = (si: number, name: string) => { const sections = [...form.sections]; sections[si] = { ...sections[si], name }; setForm({ ...form, sections }); };

  const subtotal = form.sections.reduce((s: number, sec: any) => s + (sec.items || []).reduce((is: number, item: any) => is + (item.amount || 0), 0), 0);
  const gstRate = parseFloat(settings?.gstRate || "10");
  const gstAmount = subtotal * (gstRate / 100);
  const totalAmount = subtotal + gstAmount;

  const handleSubmit = async (status: string) => {
    const createResp = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        companyId: activeCompanyId,
        status,
        subtotal,
        gstAmount,
        totalAmount,
      }),
    });

    if (!createResp.ok) {
      const err = await createResp.json().catch(() => ({}));
      console.error("Invoice create failed:", createResp.status, err);
      return;
    }

    const created = await createResp.json().catch(() => null);
    const createdId = created?.id || created?._id;

    if (status === "sent" && createdId) {
      await fetch(`/api/invoices/${encodeURIComponent(createdId)}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    }

    router.push("/dashboard/invoices");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">New Invoice</h1><p className="text-gray-500 text-sm mt-1">Create a new invoice</p></div>
        <button onClick={() => router.push("/dashboard/invoices")} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
      </div>

      {mode === "select" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Convert from Approved Quotation</h2>
            {quotations.length === 0 ? <p className="text-gray-400">No approved quotations available.</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {quotations.map((q: any) => (
                  <button key={q.id} onClick={() => loadQuotation(q.id)} className="p-4 rounded-xl border-2 border-gray-200 hover:border-[#1e3a5f] text-left transition">
                    <div className="font-medium text-blue-600">{q.quotationNumber}</div>
                    <div className="text-sm text-gray-600">{q.clientName}</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(q.totalAmount)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="text-center text-gray-400">— OR —</div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Create Manual Invoice</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Client *</label><select value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value, projectId: ""})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option key="" value="">Select client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Project *</label><select value={form.projectId} onChange={e => setForm({...form, projectId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option key="" value="">Select project</option>{clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            </div>
            <button onClick={() => setMode("manual")} disabled={!form.clientId || !form.projectId} className="mt-4 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#152b48] disabled:opacity-50">Continue →</button>
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500">Client:</span> <span className="font-medium">{clients.find(c => c.id === form.clientId)?.name || "N/A"}</span></div>
              <div><span className="text-gray-500">Project:</span> <span className="font-medium">{projects.find(p => p.id === form.projectId)?.name || "N/A"}</span></div>
              <div><label className="block text-gray-500">Issue Date</label><input type="date" value={form.issueDate} onChange={e => setForm({...form, issueDate: e.target.value})} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" /></div>
              <div><label className="block text-gray-500">Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" /></div>
            </div>
          </div>
          {form.sections.map((section: any, si: number) => (
            <div key={section.id} className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-t-xl border-b border-gray-200">
                <input value={section.name} onChange={e => updateSection(si, e.target.value)} className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold" />
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
                </table>
                <button onClick={() => addItem(si)} className="mt-2 text-sm text-blue-600 hover:text-blue-800">+ Add Item</button>
              </div>
            </div>
          ))}
          <button onClick={addSection} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 text-sm font-medium transition">+ Add Section</button>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">GST ({gstRate}%)</span><span className="font-medium">{formatCurrency(gstAmount)}</span></div>
              <div className="flex justify-between text-lg font-bold text-[#1e3a5f] pt-2 border-t border-gray-200"><span>Total</span><span>{formatCurrency(totalAmount)}</span></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label><textarea value={form.paymentTerms} onChange={e => setForm({...form, paymentTerms: e.target.value})} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setMode("select")} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">← Back</button>
            <div className="flex gap-2">
              <button onClick={() => handleSubmit("draft")} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Save as Draft</button>
              <button onClick={() => handleSubmit("sent")} className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#152b48]">Save & Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
