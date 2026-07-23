"use client";
import { useState, useEffect } from "react";
import { useCompany } from "@/lib/company-context";

export default function SettingsPage() {
  const { activeCompanyId } = useCompany();

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Template section options state
  const [sectionOptions, setSectionOptions] = useState<any[]>([]);
  const [newSectionName, setNewSectionName] = useState("");
  const [addingSection, setAddingSection] = useState(false);

  useEffect(() => {
    setLoading(true);
    const param = `?companyId=${encodeURIComponent(activeCompanyId)}`;
    Promise.all([
      fetch(`/api/settings${param}`).then((r) => r.json()),
      fetch(`/api/template-sections${param}`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([settingsData, sectionsData]) => {
        setSettings(settingsData);
        setSectionOptions(Array.isArray(sectionsData) ? sectionsData : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load settings data:", err);
        setLoading(false);
      });
  }, [activeCompanyId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, companyId: activeCompanyId }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAddSection = async () => {
    const name = newSectionName.trim();
    if (!name) return;

    setAddingSection(true);
    try {
      const r = await fetch("/api/template-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: activeCompanyId, name }),
      });
      if (r.ok) {
        setNewSectionName("");
        const param = `?companyId=${encodeURIComponent(activeCompanyId)}`;
        const sectionsRes = await fetch(`/api/template-sections${param}`);
        if (sectionsRes.ok) setSectionOptions(await sectionsRes.json());
      } else {
        const err = await r.json();
        alert(err.error || "Failed to add section option");
      }
    } catch {
      alert("Failed to add section option");
    } finally {
      setAddingSection(false);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm("Delete this section option? It will be removed from the dropdown in templates.")) return;

    try {
      const r = await fetch(`/api/template-sections/${id}`, { method: "DELETE" });
      if (r.ok) {
        const param = `?companyId=${encodeURIComponent(activeCompanyId)}`;
        const sectionsRes = await fetch(`/api/template-sections${param}`);
        if (sectionsRes.ok) setSectionOptions(await sectionsRes.json());
      } else {
        alert("Failed to delete section option");
      }
    } catch {
      alert("Failed to delete section option");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1e3a5f] border-t-transparent"></div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Company Settings</h1><p className="text-gray-500 text-sm mt-1">Manage your company information and branding</p></div>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152b48] disabled:opacity-50 flex items-center gap-2">
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            Company Information
          </h2>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input value={settings.companyName || ""} onChange={e => setSettings({...settings, companyName: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">ABN</label><input value={settings.abn || ""} onChange={e => setSettings({...settings, abn: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. 12 345 678 901" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">ACN</label><input value={settings.acn || ""} onChange={e => setSettings({...settings, acn: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea value={settings.address || ""} onChange={e => setSettings({...settings, address: e.target.value})} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={settings.phone || ""} onChange={e => setSettings({...settings, phone: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input value={settings.email || ""} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Website</label><input value={settings.website || ""} onChange={e => setSettings({...settings, website: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            Bank Details
          </h2>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label><input value={settings.bankName || ""} onChange={e => setSettings({...settings, bankName: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label><input value={settings.bankAccountName || ""} onChange={e => setSettings({...settings, bankAccountName: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">BSB</label><input value={settings.bankBsb || ""} onChange={e => setSettings({...settings, bankBsb: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. 062-000" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label><input value={settings.bankAccount || ""} onChange={e => setSettings({...settings, bankAccount: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div>
        </div>

        {/* GST Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            GST Settings
          </h2>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.gstEnabled} onChange={e => setSettings({...settings, gstEnabled: e.target.checked})} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">GST Enabled</span>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%)</label><input type="number" step="0.01" value={settings.gstRate || "10"} onChange={e => setSettings({...settings, gstRate: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" /></div>
        </div>

        {/* Default Terms */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Default Terms & Conditions
          </h2>
          <textarea value={settings.defaultTerms || ""} onChange={e => setSettings({...settings, defaultTerms: e.target.value})} rows={10} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Enter default terms and conditions for quotations and invoices..." />
        </div>

        {/* Template Section Options */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Template Section Options
          </h2>
          <p className="text-sm text-gray-500">Manage the section names available in the template builder dropdown.</p>

          {/* Add new section */}
          <div className="flex gap-2">
            <input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSection(); }}
              placeholder="Enter new section name..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={handleAddSection}
              disabled={addingSection || !newSectionName.trim()}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152b48] disabled:opacity-50 whitespace-nowrap"
            >
              {addingSection ? "Adding..." : "Add"}
            </button>
          </div>

          {/* List of existing sections */}
          <div className="max-h-80 overflow-y-auto space-y-1">
            {sectionOptions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No section options yet. Add one above.</p>
            ) : (
              sectionOptions.map((opt: any) => (
                <div key={opt.id || opt._id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg group">
                  <span className="text-sm text-gray-700">{opt.name}</span>
                  <button
                    onClick={() => handleDeleteSection(opt.id || opt._id)}
                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm p-1"
                    title="Delete section option"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
