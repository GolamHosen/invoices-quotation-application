export type Company = {
  id: string;
  slug: string;
  shortName: string;
  companyName: string;
  quotationPrefix: string;
  invoicePrefix: string;
  abn: string | null;
  acn: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bankName: string | null;
  bankBsb: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
  gstEnabled: boolean;
  gstRate: string;
  logoUrl: string | null;
  defaultTerms: string | null;
  updatedAt: Date;
};

/** @deprecated Use Company */
export type CompanySettings = Company;

export type Client = {
  id: string;
  companyId: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Project = {
  id: string;
  companyId: string;
  name: string;
  address: string | null;
  type: string;
  status: string;
  clientId: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Template = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  projectType: string;
  isDefault: boolean;
  sections: import("@/db/schema").TemplateSection[];
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Quotation = {
  id: string;
  companyId: string;
  quotationNumber: string;
  clientId: string;
  projectId: string;
  templateId: string | null;
  status: string;
  issueDate: Date;
  expiryDate: Date;
  sections: import("@/db/schema").QuotationSection[];
  subtotal: string;
  gstAmount: string;
  totalAmount: string;
  termsAndConditions: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Invoice = {
  id: string;
  companyId: string;
  invoiceNumber: string;
  quotationId: string | null;
  clientId: string;
  projectId: string;
  status: string;
  issueDate: Date;
  dueDate: Date;
  sections: import("@/db/schema").InvoiceSection[];
  subtotal: string;
  gstAmount: string;
  totalAmount: string;
  paidAmount: string;
  paymentTerms: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};
