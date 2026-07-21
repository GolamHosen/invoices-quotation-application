"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Company } from "./types";
import { ALL_COMPANIES, COMPANY_COOKIE } from "./companies";

type CompanyContextType = {
  companies: Company[];
  activeCompanyId: string;
  setActiveCompanyId: (id: string) => void;
  isLoading: boolean;
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string>(() => {
    if (typeof document === "undefined") return ALL_COMPANIES;
    const match = document.cookie.match(new RegExp("(^| )" + COMPANY_COOKIE + "=([^;]+)"));
    const savedCompanyId = match ? match[2] : null;
    return savedCompanyId || ALL_COMPANIES;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanies() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);

      const startedAt = Date.now();
      try {
        console.log("[company-context] fetching /api/companies...");
        const res = await fetch("/api/companies", { signal: controller.signal });
        const elapsedMs = Date.now() - startedAt;
        console.log(`[company-context] /api/companies responded in ${elapsedMs}ms with status ${res.status}`);

        if (res.ok) {
          const data = await res.json();
          setCompanies(Array.isArray(data) ? data : data.companies || []);
        } else {
          console.error("Failed to fetch companies:", res.status, await res.text().catch(() => ""));
        }
      } catch (error) {
        const elapsedMs = Date.now() - startedAt;
        console.error(`[company-context] Failed to fetch companies after ${elapsedMs}ms:`, error);
      } finally {
        window.clearTimeout(timeout);
        setIsLoading(false);
      }
    }
    fetchCompanies();
  }, []);

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    document.cookie = `${COMPANY_COOKIE}=${id}; path=/; max-age=31536000`;
    // Reload the page to ensure all components refetch with the new companyId
    window.location.reload();
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompanyId,
        setActiveCompanyId,
        isLoading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
