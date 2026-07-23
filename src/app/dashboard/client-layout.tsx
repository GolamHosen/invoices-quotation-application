"use client";
import { useState, useTransition, ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { CompanyProvider, useCompany } from "@/lib/company-context";
import { Company } from "@/lib/types";

type User = { id: string; name: string; email: string; role: string };

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/dashboard/clients", label: "Clients", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { href: "/dashboard/projects", label: "Projects", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { href: "/dashboard/templates", label: "Templates", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/dashboard/quotations", label: "Quotations", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { href: "/dashboard/invoices", label: "Invoices", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/dashboard/settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/dashboard/reports", label: "Reports", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
];

function DashboardInner({ children, user }: { children: ReactNode; user: User | null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  
  const { companies, activeCompanyId, setActiveCompanyId } = useCompany();

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults(null); setShowSearch(false); return; }
    setShowSearch(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&companyId=${activeCompanyId}`);
    setSearchResults(await res.json());
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const activeCompany = companies.find(c => c.id === activeCompanyId);
  const brandName = activeCompany ? activeCompany.shortName : "Hujurat Group";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top loading bar for navigation transitions */}
      {isPending && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-blue-200">
          <div className="h-full bg-blue-500 animate-[loading_1s_ease-in-out_infinite]" style={{ width: '60%' }} />
        </div>
      )}
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#1e3a5f] transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <div>
            <div className="text-white font-bold text-sm truncate w-40">{brandName}</div>
            <div className="text-blue-300 text-xs">Management System</div>
          </div>
        </div>
        <nav className="mt-4 px-3 space-y-1">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} prefetch={true} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${isActive ? "bg-white/15 text-white" : "text-blue-200 hover:bg-white/10 hover:text-white"}`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold">{user?.name?.charAt(0) ?? "?"}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.name ?? ""}</div>
              <div className="text-blue-300 text-xs truncate">{user?.role ?? ""}</div>
            </div>
            <button onClick={handleLogout} className="text-blue-300 hover:text-white transition" title="Logout">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex-1 max-w-md relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm" />
              {showSearch && searchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
                  {["clients", "projects", "quotations", "invoices"].map(cat => {
                    const items = searchResults[cat] || [];
                    if (items.length === 0) return null;
                    return (
                      <div key={cat} className="p-3 border-b border-gray-100 last:border-0">
                        <div className="text-xs font-semibold text-gray-400 uppercase mb-2">{cat}</div>
                        {items.map((item: any) => (
                          <button key={item.id} onClick={() => { setShowSearch(false); setSearchQuery(""); router.push(`/dashboard/${cat}`); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm">
                            <div className="font-medium text-gray-900">{item.name || item.quotationNumber || item.invoiceNumber}</div>
                            {item.email && <div className="text-xs text-gray-500">{item.email}</div>}
                            {item.totalAmount && <div className="text-xs text-gray-500">${parseFloat(item.totalAmount).toLocaleString()}</div>}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                  {Object.values(searchResults).every((v: any) => !v?.length) && <div className="p-4 text-center text-sm text-gray-500">No results found</div>}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center ml-4">
            <select
              value={activeCompanyId}
              onChange={(e) => setActiveCompanyId(e.target.value)}
              className="bg-gray-100 border-0 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 text-gray-700 font-medium cursor-pointer"
            >
              <option value="all">All Companies</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.shortName}</option>
              ))}
            </select>
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function ClientDashboardLayout({ 
  children,
  user,
  initialCompanies,
  initialCompanyId
}: { 
  children: ReactNode;
  user: User | null;
  initialCompanies: Company[];
  initialCompanyId: string;
}) {
  return (
    <CompanyProvider initialCompanies={initialCompanies} initialCompanyId={initialCompanyId}>
      <DashboardInner user={user}>{children}</DashboardInner>
    </CompanyProvider>
  );
}
