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
  const [dataLoading, setDataLoading] = useState(true);
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
    setDataLoading(true);
    // Use limit=1000 to fetch all records for dropdown selections
    Promise.all([
      fetch(`/api/clients?companyId=${encodeURIComponent(activeCompanyId)}&limit=1000`).then(r => r.json()),
      fetch(`/api/projects?companyId=${encodeURIComponent(activeCompanyId)}&limit=1000`).then(r => r.json()),
      fetch(`/api/templates?companyId=${encodeURIComponent(activeCompanyId)}&limit=1000`).then(r => r.json()),
      fetch(`/api/settings?companyId=${encodeURIComponent(activeCompanyId)}`).then(r => r.json()),
    ]).then(([cl, pr, tl, st]) => {
      // API routes now return { data, total, page, totalPages } for paginated endpoints
      setClients(cl.data || cl);
      setProjects(pr.data || pr);
      setTemplates(tl.data || tl);
      setSettings(st);
      if (st.defaultTerms) setForm((f) => ({ ...f, termsAndConditions: st.defaultTerms }));
    }).finally(() => {
      setDataLoading(false);
    });
  }, [activeCompanyId]);

  const clientProjects = projects.filter((p: any) => p.clientId === form.clientId);

  // Project search & inline creation state
  const [projectSearch, setProjectSearch] = useState("");
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", type: "", address: "" });
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectError, setNewProjectError] = useState("");

  const filteredClientProjects = projectSearch.trim()
    ? clientProjects.filter((p: any) =>
        p.name.toLowerCase().includes(projectSearch.toLowerCase())
      )
    : clientProjects;

  const handleCreateProject = async () => {
    setNewProjectError("");
    if (!newProject.name.trim()) { setNewProjectError("Project name is required."); return; }
    if (!newProject.type) { setNewProjectError("Please select a project type."); return; }

    setCreatingProject(true);
    try {
      const resp = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: activeCompanyId,
          clientId: form.clientId,
          name: newProject.name.trim(),
          type: newProject.type,
          address: newProject.address.trim(),
          status: "pending",
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create project");
      }
      const created = await resp.json();
      const createdProject = { ...created, id: created._id || created.id };
      // Add to local projects state
      setProjects(prev => [createdProject, ...prev]);
      // Auto-select the new project and go to step 3
      setForm(f => ({ ...f, projectId: createdProject.id, templateId: "" }));
      setShowNewProjectForm(false);
      setProjectSearch("");
      setNewProject({ name: "", type: "", address: "" });
      setStep(3);
    } catch (err: any) {
      setNewProjectError(err.message || "Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  };

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
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border-2 border-gray-200 space-y-2">
                  <div className="h-5 w-32 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-100 rounded" />
                  <div className="h-3 w-40 bg-gray-50 rounded" />
                </div>
              ))}
            </div>
          ) : (
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
          )}
        </div>
      )}

      {/* Step 2: Project */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Select or Create Project</h2>

          {/* Search input */}
          <div className="relative mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={projectSearch}
              onChange={e => setProjectSearch(e.target.value)}
              placeholder="Search or type a new project name..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] transition"
              autoFocus
            />
          </div>

          {/* Filtered existing projects */}
          {filteredClientProjects.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                {projectSearch.trim() ? "Matching Projects" : "Existing Projects"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredClientProjects.map((p: any) => (
                  <button key={p.id} onClick={() => { setForm(f => ({ ...f, projectId: p.id, templateId: "" })); setProjectSearch(""); setShowNewProjectForm(false); setStep(3); }}
                    className={`p-4 rounded-xl border-2 text-left transition ${form.projectId === p.id ? "border-[#1e3a5f] bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-sm text-blue-600">{PROJECT_TYPES.find(t => t.value === p.type)?.label}</div>
                    {p.address && <div className="text-xs text-gray-400 mt-1">{p.address}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No match message + create prompt */}
          {projectSearch.trim() && filteredClientProjects.length === 0 && !showNewProjectForm && (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl mb-4">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <p className="text-sm text-gray-500">No project found matching <span className="font-semibold text-gray-700">"{projectSearch}"</span></p>
              <button
                onClick={() => { setShowNewProjectForm(true); setNewProject(p => ({ ...p, name: projectSearch.trim() })); }}
                className="mt-3 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152b48] transition inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create "{projectSearch.trim()}"
              </button>
            </div>
          )}

          {/* Always-visible create button when there are existing projects */}
          {!showNewProjectForm && !projectSearch.trim() && (
            <button
              onClick={() => setShowNewProjectForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#1e3a5f] hover:text-[#1e3a5f] text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create New Project
            </button>
          )}

          {/* Inline create project form */}
          {showNewProjectForm && (
            <div className="border-2 border-[#1e3a5f]/20 bg-blue-50/50 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1e3a5f] flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  New Project
                </h3>
                <button onClick={() => setShowNewProjectForm(false)} className="text-gray-400 hover:text-gray-600 transition">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Smith Residence Extension"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Type <span className="text-red-500">*</span></label>
                  <select
                    value={newProject.type}
                    onChange={e => setNewProject(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
                  >
                    <option value="">Select type...</option>
                    {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newProject.address}
                  onChange={e => setNewProject(p => ({ ...p, address: e.target.value }))}
                  placeholder="e.g. 123 Main St, Sydney NSW"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
                />
              </div>

              {/* Recommendation: show matching existing projects while typing */}
              {newProject.name.trim() && (() => {
                const matches = clientProjects.filter((p: any) =>
                  p.name.toLowerCase().includes(newProject.name.toLowerCase())
                );
                if (matches.length === 0) return null;
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Similar project{matches.length > 1 ? "s" : ""} already exist{matches.length === 1 ? "s" : ""}:
                    </p>
                    <div className="space-y-1.5">
                      {matches.map((p: any) => (
                        <button key={p.id} onClick={() => { setForm(f => ({ ...f, projectId: p.id, templateId: "" })); setShowNewProjectForm(false); setProjectSearch(""); setStep(3); }}
                          className="w-full text-left px-3 py-2 bg-white rounded-lg border border-amber-200 hover:border-[#1e3a5f] hover:bg-blue-50 transition text-sm flex items-center justify-between gap-2">
                          <div>
                            <span className="font-medium text-gray-900">{p.name}</span>
                            <span className="text-gray-400 ml-2 text-xs">{PROJECT_TYPES.find(t => t.value === p.type)?.label}</span>
                          </div>
                          <span className="text-xs text-[#1e3a5f] font-medium whitespace-nowrap">Use this →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {newProjectError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {newProjectError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowNewProjectForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">Cancel</button>
                <button
                  onClick={handleCreateProject}
                  disabled={creatingProject}
                  className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152b48] transition disabled:opacity-50 flex items-center gap-2"
                >
                  {creatingProject ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Creating...</>
                  ) : (
                    <>Create & Continue</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Empty state when no search and no projects */}
          {clientProjects.length === 0 && !projectSearch.trim() && !showNewProjectForm && (
            <div className="text-center py-6 text-gray-400 mt-2">
              <p>No projects found for this client.</p>
              <p className="text-sm mt-1">Create one above to continue.</p>
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
