"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, PROJECT_TYPES, UNITS, generateId } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";

export default function NewQuotationPage() {
  const router = useRouter();
  const { activeCompanyId } = useCompany();
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({
    clientId: "",
    projectId: "",
    templateId: "",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split("T")[0];
    })(),
    sections: [] as any[],
    status: "draft",
    termsAndConditions: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/clients?companyId=${encodeURIComponent(activeCompanyId)}`).then(r => r.json()),
      fetch(`/api/projects?companyId=${encodeURIComponent(activeCompanyId)}`).then(r => r.json()),
      fetch(`/api/templates?companyId=${encodeURIComponent(activeCompanyId)}`).then(r => r.json()),
      fetch(`/api/settings?companyId=${encodeURIComponent(activeCompanyId)}`).then(r => r.json()),
    ]).then(([cl, pr, tl, st]) => {
      // API routes now return { data, total, page, totalPages } for paginated endpoints
      setClients(cl.data || cl);
      setProjects(pr.data || pr);
      setTemplates(tl.data || tl);
      setSettings(st);
      if (st.defaultTerms) setForm((f) => ({ ...f, termsAndConditions: st.defaultTerms }));
    });
  }, [activeCompanyId]);

  const clientProjects = projects.filter((p: any) => p.clientId === form.clientId);
  const filteredTemplates = form.projectId ? templates.filter((t: any) => { const proj = projects.find((p: any) => p.id === form.projectId); return proj && t.projectType === proj.type; }) : templates;

  const loadTemplate = (templateId: string) => {
    const template = templates.find((t: any) => t.id === templateId);
    if (template) {
      const sections = (template.sections || []).map((s: any) => ({
        ...s, id: s.id || generateId(),
        items: (s.items || []).map((i: any) => ({ ...i, id: i.id || generateId(), amount: i.quantity * i.rate })),
      }));
      setForm(f => ({ ...f, templateId, sections }));
    }
  };

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

  const handleSubmit = async (status: string) => {
    const project = projects.find((p: any) => p.id === form.projectId);
    const createResp = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        companyId: activeCompanyId,
        status,
        subtotal,
        gstAmount,
        totalAmount,
        projectType: project?.type,
      }),
    });

    if (!createResp.ok) {
      const err = await createResp.json().catch(() => ({}));
      console.error("Quotation create failed:", createResp.status, err);
      return;
    }

    const created = await createResp.json().catch(() => null);
    const createdId = created?.id || created?._id;

    if (status === "sent" && createdId) {
      await fetch(`/api/quotations/${encodeURIComponent(createdId)}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    }

    router.push("/dashboard/quotations");
  };

  const steps = [
    { num: 1, label: "Select Client" },
    { num: 2, label: "Select Project" },
    { num: 3, label: "Select Template" },
    { num: 4, label: "Edit Items" },
    { num: 5, label: "Review & Save" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">New Quotation</h1><p className="text-gray-500 text-sm mt-1">Create a professional construction quotation</p></div>
        <button onClick={() => router.push("/dashboard/quotations")} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
      </div>
      {/* Steps */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center flex-1">
            <button onClick={() => { if (s.num < step || (s.num === 2 && form.clientId) || (s.num === 3 && form.projectId) || (s.num === 4 && form.templateId) || s.num === 5) setStep(s.num); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium flex-1 ${step === s.num ? "bg-[#1e3a5f] text-white" : step > s.num ? "bg-green-50 text-green-700" : "text-gray-400"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s.num ? "bg-white/20" : step > s.num ? "bg-green-200" : "bg-gray-200"}`}>{step > s.num ? "✓" : s.num}</span>
              <span className="hidden md:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && <div className={`w-4 h-0.5 ${step > s.num ? "bg-green-300" : "bg-gray-200"}`}></div>}
          </div>
        ))}
      </div>

      {/* Step 1: Client */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Select Client</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clients.map((c: any, index: number) => (
              <button
                key={c.id ?? c.email ?? c.phone ?? c.name ?? `client-${index}`}
                onClick={() => { setForm(f => ({ ...f, clientId: c.id, projectId: "" })); setStep(2); }}
                className={`p-4 rounded-xl border-2 text-left transition ${form.clientId === c.id ? "border-[#1e3a5f] bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
              >
                <div className="font-medium text-gray-900">{c.name}</div>
                {c.companyName && <div className="text-sm text-gray-500">{c.companyName}</div>}
                {c.email && <div className="text-xs text-gray-400 mt-1">{c.email}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Project */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Select Project</h2>
          {clientProjects.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No projects found for this client.</p>
              <p className="text-sm mt-2">Please create a project first.</p>
              <button onClick={() => router.push("/dashboard/projects")} className="mt-4 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm">Go to Projects</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clientProjects.map((p: any) => (
                <button key={p.id} onClick={() => { setForm(f => ({ ...f, projectId: p.id, templateId: "" })); setStep(3); }}
                  className={`p-4 rounded-xl border-2 text-left transition ${form.projectId === p.id ? "border-[#1e3a5f] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className="font-medium text-gray-900">{p.name}</div>
                  <div className="text-sm text-blue-600">{PROJECT_TYPES.find(t => t.value === p.type)?.label}</div>
                  {p.address && <div className="text-xs text-gray-400 mt-1">{p.address}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Template */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Select Template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map((t: any) => {
              const totalItems = (t.sections || []).reduce((s: number, sec: any) => s + (sec.items?.length || 0), 0);
              return (
                <button key={t.id} onClick={() => { loadTemplate(t.id); setStep(4); }}
                  className={`p-4 rounded-xl border-2 text-left transition ${form.templateId === t.id ? "border-[#1e3a5f] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className="font-medium text-gray-900">{t.name}</div>
                  <div className="text-sm text-gray-500">{(t.sections || []).length} sections · {totalItems} items</div>
                  {t.description && <div className="text-xs text-gray-400 mt-1 line-clamp-2">{t.description}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 4: Edit Items */}
      {step === 4 && (
        <div className="space-y-4">
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
          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">← Back</button>
            <button onClick={() => setStep(5)} className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#152b48]">Review →</button>
          </div>
        </div>
      )}

      {/* Step 5: Review & Save */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Review Quotation</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500">Client:</span><div className="font-medium">{clients.find(c => c.id === form.clientId)?.name}</div></div>
              <div><span className="text-gray-500">Project:</span><div className="font-medium">{projects.find(p => p.id === form.projectId)?.name}</div></div>
              <div><span className="text-gray-500">Issue Date:</span><div className="font-medium">{form.issueDate}</div></div>
              <div><span className="text-gray-500">Expiry Date:</span><div className="font-medium">{form.expiryDate}</div></div>
            </div>
          </div>
          {form.sections.map((section: any) => (
            <div key={section.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-[#1e3a5f] mb-2">{section.name}</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-500 border-b"><th className="text-left pb-1">Description</th><th className="text-center pb-1">Qty</th><th className="text-center pb-1">Unit</th><th className="text-right pb-1">Rate</th><th className="text-right pb-1">Amount</th></tr></thead>
                <tbody>
                  {(section.items || []).map((item: any) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-1.5 whitespace-pre-wrap break-words">{item.description}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-center">{item.unit}</td>
                      <td className="text-right">{formatCurrency(item.rate)}</td>
                      <td className="text-right font-medium">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">GST ({gstRate}%)</span><span className="font-medium">{formatCurrency(gstAmount)}</span></div>
              <div className="flex justify-between text-lg font-bold text-[#1e3a5f] pt-2 border-t border-gray-200"><span>Total</span><span>{formatCurrency(totalAmount)}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label><textarea value={form.termsAndConditions} onChange={e => setForm({...form, termsAndConditions: e.target.value})} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(4)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">← Back</button>
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
