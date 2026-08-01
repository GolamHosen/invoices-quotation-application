type CompanyEmailIdentity = {
  slug?: string | null;
  companyName?: string | null;
} | null | undefined;

const CONSTRUCTION_EMAIL_NAME = "Hujurat Construction Pty Ltd";
const ENGINEERING_EMAIL_NAME = "Hujurat Engineering Consultants";

export function getCompanyEmailDisplayName(company: CompanyEmailIdentity): string {
  if (company?.slug === "engineering") return ENGINEERING_EMAIL_NAME;
  if (company?.slug === "construction") return CONSTRUCTION_EMAIL_NAME;
  return company?.companyName || CONSTRUCTION_EMAIL_NAME;
}

export function getFromAddress(company: CompanyEmailIdentity): string {
  const configuredAddress = (process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com").trim();
  const address = configuredAddress.match(/<([^<>]+)>$/)?.[1] || configuredAddress;
  const displayName = getCompanyEmailDisplayName(company).replace(/["\\]/g, "\\$&");

  return `"${displayName}" <${address}>`;
}
