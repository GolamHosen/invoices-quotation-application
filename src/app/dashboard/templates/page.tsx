"use client";
import { useState, useEffect } from "react";
import { PROJECT_TYPES, generateId, UNITS } from "@/lib/utils";
import { getDefaultTemplateSectionOptions } from "@/lib/template-section-options";
import { useCompany } from "@/lib/company-context";

type Item = { id: string; description: string; quantity: number; unit: string; rate: number };
type Section = { id: string; name: string; items: Item[] };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const { activeCompanyId } = useCompany();

  // Dynamically fetched section options
  const [sectionOptions, setSectionOptions] = useState<string[]>(getDefaultTemplateSectionOptions());

  const [editingCompanyId, setEditingCompanyId] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    projectType: "granny_flat",
    notes: "",
    sections: [] as Section[],
  });

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/templates?companyId=${encodeURIComponent(activeCompanyId)}`);
    if (!r.ok) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setTemplates(await r.json());
    setLoading(false);
  };

  // Fetch section options dynamically from API
  const fetchSectionOptions = async () => {
    if (!activeCompanyId) return;
    try {
      const r = await fetch(`/api/template-sections?companyId=${encodeURIComponent(activeCompanyId)}`);
      if (r.ok) {
        const data = await r.json();
        if (data.length > 0) {
          setSectionOptions(data.map((item: any) => item.name));
        }
      }
    } catch {
      // keep defaults on error
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  useEffect(() => {
    fetchSectionOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const deriveTemplateName = (sections: Section[]) => {
    const names = sections
      .map((s) => (s?.name || "").trim())
      .filter(Boolean);
    return names.join(", ");
  };

  const applyDerivedName = (nextSections: Section[]) => {
    const nextName = deriveTemplateName(nextSections);
    setForm((prev) => ({
      ...prev,
      name: nextName,
      sections: nextSections,
    }));
  };

  const ensureSectionHasItems = (sec: Section): Section => {
    if (sec.items && sec.items.length > 0) return sec;
    return {
      ...sec,
      items: [
        { id: generateId(), description: "", quantity: 1, unit: "sqm", rate: 0 },
      ],
    };
  };

  const openCreate = () => {
    const defaultSectionName = sectionOptions[0] || "New Section";
    setCreating(true);
    setEditing(null);
    setEditingCompanyId(activeCompanyId);

    const sections: Section[] = [
      {
        id: generateId(),
        name: defaultSectionName,
        items: [{ id: generateId(), description: "", quantity: 1, unit: "sqm", rate: 0 }],
      },
    ];

    setForm({
      name: deriveTemplateName(sections),
      description: "",
      projectType: "granny_flat",
      notes: "",
      sections,
    });
  };

  const openEdit = async (t: any) => {
    const res = await fetch(`/api/templates/${t.id}`);
    const full = await res.json();
    const sections: Section[] = (full.sections || []) as Section[];

    setEditing(full);
    setCreating(false);
    setEditingCompanyId(full.companyId || activeCompanyId);

    setForm({
      name: full.name || deriveTemplateName(sections),
      description: full.description || "",
      projectType: full.projectType,
      notes: full.notes || "",
      sections,
    });
  };

  const addSection = () => {
    const defaultSectionName = sectionOptions[0] || "New Section";
    const nextSections: Section[] = [
      ...form.sections,
      {
        id: generateId(),
        name: defaultSectionName,
        items: [{ id: generateId(), description: "", quantity: 1, unit: "sqm", rate: 0 }],
      },
    ];
    applyDerivedName(nextSections);
  };

  const removeSection = (si: number) => {
    const nextSections = form.sections.filter((_, i) => i !== si);
    applyDerivedName(nextSections);
  };

  const moveSection = (si: number, dir: -1 | 1) => {
    const ni = si + dir;
    if (ni < 0 || ni >= form.sections.length) return;

    const nextSections = [...form.sections];
    [nextSections[si], nextSections[ni]] = [nextSections[ni], nextSections[si]];
    applyDerivedName(nextSections);
  };

  const updateSection = (si: number, field: "name" | "items", value: any) => {
    const nextSections = [...form.sections];
    const current = nextSections[si];

    const nextSection: Section =
      field === "items"
        ? { ...current, items: value }
        : { ...current, name: value };

    nextSections[si] = ensureSectionHasItems(nextSection);
    applyDerivedName(nextSections);
  };

  const addItem = (si: number) => {
    const nextSections = [...form.sections];
    const current = nextSections[si];
    nextSections[si] = {
      ...current,
      items: [
        ...(current.items || []),
        { id: generateId(), description: "", quantity: 1, unit: "sqm", rate: 0 },
      ],
    };
    applyDerivedName(nextSections);
  };

  const removeItem = (si: number, ii: number) => {
    const nextSections = [...form.sections];
    nextSections[si] = {
      ...nextSections[si],
      items: nextSections[si].items.filter((_, i) => i !== ii),
    };
    applyDerivedName(nextSections);
  };

  const updateItem = (si: number, ii: number, field: string, value: any) => {
    const nextSections = [...form.sections];
    const items = [...nextSections[si].items];
    items[ii] = { ...items[ii], [field]: value };
    nextSections[si] = { ...nextSections[si], items };
    applyDerivedName(nextSections);
  };

  const handleSave = async () => {
    const body = {
      companyId: editingCompanyId || activeCompanyId,
      name: form.name,
      description: form.description,
      projectType: form.projectType,
      notes: form.notes,
      sections: form.sections,
    };

    try {
      if (editing) {
        const r = await fetch(`/api/templates/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`PUT failed: ${r.status}`);
      } else {
        const r = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, isDefault: false }),
        });
        if (!r.ok) throw new Error(`POST failed: ${r.status}`);
      }
    } catch (e: any) {
      alert(e?.message || "Failed to save template");
      return;
    }

    setEditing(null);
    setCreating(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this template?")) {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      load();
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setCreating(false);
  };

  if (editing || creating)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{editing ? "Edit Template" : "Create Template"}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#152b48]"
            >
              Save Template
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  value={form.name}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-generated from your selected Section dropdowns.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Type *</label>
                <select
                  value={form.projectType}
                  onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {PROJECT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {form.sections.map((section, si) => (
              <div key={section.id} className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-t-xl border-b border-gray-200">
                  <button onClick={() => moveSection(si, -1)} className="p-1 hover:bg-gray-200 rounded" title="Move up">
                    ↑
                  </button>
                  <button onClick={() => moveSection(si, 1)} className="p-1 hover:bg-gray-200 rounded" title="Move down">
                    ↓
                  </button>

                  <select
                    value={section.name}
                    onChange={(e) => {
                      const selected = e.target.value;
                      updateSection(si, "name", selected);
                    }}
                    className="flex-1 min-w-[220px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold bg-white"
                  >
                    {sectionOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  <span className="text-xs text-gray-400">{section.items.length} items</span>
                  <button onClick={() => removeSection(si)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Remove section">
                    ✕
                  </button>
                </div>

                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500">
                        <th className="text-left pb-2">Description</th>
                        <th className="text-center pb-2 w-20">Qty</th>
                        <th className="text-center pb-2 w-20">Unit</th>
                        <th className="text-right pb-2 w-24">Rate</th>
                        <th className="text-right pb-2 w-24">Amount</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item, ii) => (
                        <tr key={item.id} className="border-t border-gray-100">
                          <td className="py-2 pr-2">
                            <textarea
                              value={item.description}
                              onChange={(e) => updateItem(si, ii, "description", e.target.value)}
                              placeholder="Item description"
                              rows={2}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm resize"
                            ></textarea>
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(si, ii, "quantity", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-center"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <select
                              value={item.unit}
                              onChange={(e) => updateItem(si, ii, "unit", e.target.value)}
                              className="w-full px-1 py-1 border border-gray-200 rounded text-sm"
                            >
                              {UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateItem(si, ii, "rate", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right"
                            />
                          </td>
                          <td className="py-2 px-1 text-right font-medium">
                            ${(item.quantity * item.rate).toFixed(2)}
                          </td>
                          <td className="py-2 pl-1">
                            <button onClick={() => removeItem(si, ii)} className="text-red-400 hover:text-red-600 text-xs">
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200">
                        <td colSpan={4} className="py-2 text-right font-semibold text-gray-600">
                          Section Total:
                        </td>
                        <td className="py-2 text-right font-bold">
                          ${section.items.reduce((s, i) => s + i.quantity * i.rate, 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>

                  <button onClick={() => addItem(si)} className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    + Add Item
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={addSection}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 text-sm font-medium transition"
            >
              + Add Section
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Manage quotation templates for different project types</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152b48] transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Template
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a5f] border-t-transparent mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const sections = t.sections || [];
            const totalItems = sections.reduce((s: number, sec: any) => s + (sec.items?.length || 0), 0);
            const totalAmount = sections.reduce(
              (s: number, sec: any) =>
                s +
                (sec.items?.reduce((is: number, item: any) => is + (item.quantity || 0) * (item.rate || 0), 0) || 0),
              0
            );

            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{t.name}</h3>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {PROJECT_TYPES.find((pt) => pt.value === t.projectType)?.label || t.projectType}
                      </span>
                    </div>
                    {t.isDefault && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">Default</span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{t.description || "No description"}</p>

                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                    <span>{sections.length} sections</span>
                    <span>{totalItems} items</span>
                    <span className="font-semibold text-gray-900">${totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
                  <button onClick={() => openEdit(t)} className="flex-1 text-center py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="flex-1 text-center py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {templates.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400">No templates found. Create one to get started.</div>
          )}
        </div>
      )}
    </div>
  );
}
