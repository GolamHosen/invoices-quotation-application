"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ────────────────────────────────────────────────────────
//  Generic fetcher
// ────────────────────────────────────────────────────────
async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────
type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
};

type DashboardData = {
  stats: {
    totalQuotations: number;
    totalInvoices: number;
    pendingQuotations: number;
    approvedQuotations: number;
    paidInvoices: number;
    unpaidInvoices: number;
    totalRevenue: string;
    outstandingAmount: string;
  };
  recentClients: any[];
  recentQuotations: any[];
  recentInvoices: any[];
  byCompany: any[];
};

// ────────────────────────────────────────────────────────
//  Query key factories — ensures consistent cache keys
// ────────────────────────────────────────────────────────
export const queryKeys = {
  quotations: {
    all: ["quotations"] as const,
    list: (params: Record<string, string | number>) =>
      ["quotations", "list", params] as const,
    detail: (id: string) => ["quotations", "detail", id] as const,
  },
  invoices: {
    all: ["invoices"] as const,
    list: (params: Record<string, string | number>) =>
      ["invoices", "list", params] as const,
    detail: (id: string) => ["invoices", "detail", id] as const,
  },
  clients: {
    all: ["clients"] as const,
    list: (params: Record<string, string | number>) =>
      ["clients", "list", params] as const,
    detail: (id: string) => ["clients", "detail", id] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (params: Record<string, string | number>) =>
      ["projects", "list", params] as const,
    detail: (id: string) => ["projects", "detail", id] as const,
  },
  dashboard: (companyId: string) => ["dashboard", companyId] as const,
};

// ────────────────────────────────────────────────────────
//  URL builder helper
// ────────────────────────────────────────────────────────
function buildUrl(base: string, params: Record<string, string | number | undefined>) {
  const url = new URL(base, window.location.origin);
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== "") {
      url.searchParams.set(key, String(val));
    }
  }
  return url.toString();
}

// ────────────────────────────────────────────────────────
//  QUOTATION HOOKS
// ────────────────────────────────────────────────────────
export function useQuotations(params: {
  page?: number;
  limit?: number;
  status?: string;
  companyId?: string;
}) {
  const { page = 1, limit = 10, status, companyId } = params;
  const qParams = { page, limit, ...(status ? { status } : {}), ...(companyId ? { companyId } : {}) };

  return useQuery({
    queryKey: queryKeys.quotations.list(qParams),
    queryFn: () =>
      apiFetch<PaginatedResponse<any>>(
        buildUrl("/api/quotations", qParams)
      ),
  });
}

export function useQuotationMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.quotations.all });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/quotations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: invalidate,
  });

  const deleteQuotation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/quotations/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const duplicateQuotation = useMutation({
    mutationFn: (body: any) =>
      fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const convertToInvoice = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/quotations/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });

  return { updateStatus, deleteQuotation, duplicateQuotation, convertToInvoice };
}

// ────────────────────────────────────────────────────────
//  INVOICE HOOKS
// ────────────────────────────────────────────────────────
export function useInvoices(params: {
  page?: number;
  limit?: number;
  status?: string;
  companyId?: string;
  quotationId?: string;
}) {
  const { page = 1, limit = 10, status, companyId, quotationId } = params;
  const qParams = {
    page,
    limit,
    ...(status ? { status } : {}),
    ...(companyId ? { companyId } : {}),
    ...(quotationId ? { quotationId } : {}),
  };

  return useQuery({
    queryKey: queryKeys.invoices.list(qParams),
    queryFn: () =>
      apiFetch<PaginatedResponse<any>>(buildUrl("/api/invoices", qParams)),
  });
}

export function useInvoiceMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.invoices.all });

  const updateStatus = useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: any }) =>
      fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const deleteInvoice = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/invoices/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const duplicateInvoice = useMutation({
    mutationFn: (body: any) =>
      fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  return { updateStatus, deleteInvoice, duplicateInvoice };
}

// ────────────────────────────────────────────────────────
//  CLIENT HOOKS
// ────────────────────────────────────────────────────────
export function useClients(params: {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
}) {
  const { page = 1, limit = 10, search, companyId } = params;
  const qParams = {
    page,
    limit,
    ...(search ? { search } : {}),
    ...(companyId ? { companyId } : {}),
  };

  return useQuery({
    queryKey: queryKeys.clients.list(qParams),
    queryFn: () =>
      apiFetch<PaginatedResponse<any>>(buildUrl("/api/clients", qParams)),
  });
}

export function useClientMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.clients.all });
    // Client changes can affect quotation/invoice client names
    qc.invalidateQueries({ queryKey: queryKeys.dashboard("") });
  };

  const createClient = useMutation({
    mutationFn: (body: any) =>
      fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const updateClient = useMutation({
    mutationFn: ({ id, companyId, ...body }: { id: string; companyId: string; [key: string]: any }) =>
      fetch(`/api/clients/${id}?companyId=${encodeURIComponent(companyId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, companyId }),
      }),
    onSuccess: invalidate,
  });

  const deleteClient = useMutation({
    mutationFn: ({ id, companyId }: { id: string; companyId: string }) =>
      fetch(`/api/clients/${id}?companyId=${encodeURIComponent(companyId)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  return { createClient, updateClient, deleteClient };
}

// ────────────────────────────────────────────────────────
//  PROJECT HOOKS
// ────────────────────────────────────────────────────────
export function useProjects(params: {
  page?: number;
  limit?: number;
  search?: string;
  clientId?: string;
  companyId?: string;
}) {
  const { page = 1, limit = 10, search, clientId, companyId } = params;
  const qParams = {
    page,
    limit,
    ...(search ? { search } : {}),
    ...(clientId ? { clientId } : {}),
    ...(companyId ? { companyId } : {}),
  };

  return useQuery({
    queryKey: queryKeys.projects.list(qParams),
    queryFn: () =>
      apiFetch<PaginatedResponse<any>>(buildUrl("/api/projects", qParams)),
  });
}

// ────────────────────────────────────────────────────────
//  DASHBOARD HOOK
// ────────────────────────────────────────────────────────
export function useDashboardData(companyId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard(companyId),
    queryFn: () =>
      apiFetch<DashboardData>(
        buildUrl("/api/dashboard", { companyId })
      ),
    // Dashboard data can be slightly stale — 60s is fine
    staleTime: 60 * 1000,
  });
}

// ────────────────────────────────────────────────────────
//  INVALIDATION HELPERS
// ────────────────────────────────────────────────────────

/** Invalidate ALL cached data — used when company switches */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}
