export const COMPANY_COOKIE = "hujurat_company_id";
export const ALL_COMPANIES = "all";

export const DEFAULT_COMPANIES = [
  {
    slug: "construction",
    shortName: "Construction",
    companyName: "Hujurat Construction PTY Ltd",
    logoUrl: "/hujurat-logo.png",
    quotationPrefix: "HC-QUO",
    invoicePrefix: "HC-INV",
    abn: "12 345 678 901",
    acn: "123 456 789",
    address: "123 Builder Street, Sydney NSW 2000",
    phone: "02 9000 0001",
    email: "info@hujuratconstruction.com.au",
    website: "www.hujuratconstruction.com.au",
    bankName: "Commonwealth Bank",
    bankBsb: "062-000",
    bankAccount: "12345678",
    bankAccountName: "Hujurat Construction PTY Ltd",
    gstEnabled: true,
    gstRate: "10.00",
    defaultTerms: "Payment terms: 50% deposit upon acceptance, 50% upon completion. This quotation is valid for 30 days from the issue date.",
  },
  {
    slug: "engineering",
    shortName: "Engineering",
    companyName: "Hujurat Engineering Consultant",
    quotationPrefix: "HEC-QUO",
    invoicePrefix: "HEC-INV",
    abn: "98 765 432 109",
    acn: "987 654 321",
    address: "456 Engineer Avenue, Sydney NSW 2000",
    phone: "02 9000 0002",
    email: "info@hujuratengineering.com.au",
    website: "www.hujuratengineering.com.au",
    bankName: "NAB",
    bankBsb: "082-000",
    bankAccount: "87654321",
    bankAccountName: "Hujurat Engineering Consultant",
    gstEnabled: true,
    gstRate: "10.00",
    defaultTerms: "Payment terms: Net 14 days from invoice date. All engineering services are subject to our standard terms and conditions.",
  },
] as const;

export function withCompanyId(url: string, companyId: string | null | undefined): string {
  if (!companyId || companyId === ALL_COMPANIES) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}companyId=${encodeURIComponent(companyId)}`;
}

export function companyFilter(companyId: string | null | undefined): Record<string, string> | undefined {
  if (!companyId || companyId === ALL_COMPANIES) return undefined;
  return { companyId };
}

export function buildCompanyFilter(companyId: string | null | undefined, base: Record<string, unknown> = {}): Record<string, unknown> {
  const cf = companyFilter(companyId);
  return cf ? { ...base, ...cf } : base;
}
