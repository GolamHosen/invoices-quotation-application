"use client";

import React, { createContext, useContext, useState } from "react";
import { Company } from "./types";
import { ALL_COMPANIES, COMPANY_COOKIE } from "./companies";

type CompanyContextType = {
  companies: Company[];
  activeCompanyId: string;
  setActiveCompanyId: (id: string) => void;
  isLoading: boolean;
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ 
  children,
  initialCompanies = [],
  initialCompanyId = ALL_COMPANIES,
}: { 
  children: React.ReactNode;
  initialCompanies?: Company[];
  initialCompanyId?: string;
}) {
  const [companies] = useState<Company[]>(initialCompanies);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string>(initialCompanyId);
  const [isLoading] = useState(false);

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
