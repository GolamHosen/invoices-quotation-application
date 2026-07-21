import mongoose, { Schema, Model } from "mongoose";

// ===== Document Types (for use with Mongoose) =====

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "staff";
  createdAt: Date;
  updatedAt: Date;
}

export interface IClient {
  _id: string;
  companyId: string;
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject {
  _id: string;
  companyId: string;
  name: string;
  address?: string;
  type: ProjectType;
  status: ProjectStatus;
  clientId: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITemplate {
  _id: string;
  companyId: string;
  name: string;
  description?: string;
  projectType: ProjectType;
  isDefault: boolean;
  sections: TemplateSection[];
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuotation {
  _id: string;
  companyId: string;
  quotationNumber: string;
  clientId: string;
  projectId: string;
  templateId?: string;
  status: QuotationStatus;
  issueDate: Date;
  expiryDate: Date;
  sections: QuotationSection[];
  subtotal: string;
  gstAmount: string;
  totalAmount: string;
  termsAndConditions?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoice {
  _id: string;
  companyId: string;
  invoiceNumber: string;
  quotationId?: string;
  clientId: string;
  projectId: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  sections: InvoiceSection[];
  subtotal: string;
  gstAmount: string;
  totalAmount: string;
  paidAmount: string;
  paymentTerms?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CloudinaryAsset = {
  publicId: string;
  secureUrl: string;
  resourceType?: string;
  format?: string;
  originalName?: string;
  bytes?: number;
};

export interface ICompany {
  _id: string;
  slug: string;
  shortName: string;
  companyName: string;
  quotationPrefix: string;
  invoicePrefix: string;
  abn?: string;
  acn?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  bankName?: string;
  bankBsb?: string;
  bankAccount?: string;
  bankAccountName?: string;
  gstEnabled: boolean;
  gstRate: string;
  logoUrl?: string;
  /** Cloudinary public_id for the company logo asset */
  logoPublicId?: string;
  /** Generic list for future attachments (quotations, invoices, receipts, etc.) */
  attachments?: CloudinaryAsset[];
  defaultTerms?: string;
  updatedAt: Date;
}

/** @deprecated Use ICompany */
export type ICompanySettings = ICompany;

export interface ITemplateSectionOption {
  _id: string;
  companyId: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuditLog {
  _id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

// ===== Shared Types =====

export type ProjectType = "granny_flat" | "single_storey" | "double_storey" | "duplex" | "townhouse" | "villa" | "extension" | "renovation" | "knock_down_rebuild" | "commercial";
export type ProjectStatus = "pending" | "in_progress" | "completed" | "on_hold" | "cancelled";
export type QuotationStatus = "draft" | "sent" | "approved" | "rejected" | "expired";
export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue";

export type TemplateSection = {
  id: string;
  name: string;
  items: TemplateItem[];
};

export type TemplateItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
};

export type QuotationSection = {
  id: string;
  name: string;
  items: QuotationItem[];
};

export type QuotationItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
};

export type InvoiceSection = {
  id: string;
  name: string;
  items: InvoiceItem[];
};

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
};

// ===== Mongoose Schemas =====

const TemplateItemSchema = new Schema<TemplateItem>({
  id: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  rate: { type: Number, required: true },
}, { _id: false });

const TemplateSectionSchema = new Schema<TemplateSection>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  items: { type: [TemplateItemSchema], required: true },
}, { _id: false });

const QuotationItemSchema = new Schema<QuotationItem>({
  id: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const QuotationSectionSchema = new Schema<QuotationSection>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  items: { type: [QuotationItemSchema], required: true },
}, { _id: false });

const InvoiceItemSchema = new Schema<InvoiceItem>({
  id: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const InvoiceSectionSchema = new Schema<InvoiceSection>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  items: { type: [InvoiceItemSchema], required: true },
}, { _id: false });

// ===== Model Schemas =====

const UserSchema = new Schema<IUser>({
  _id: { type: String, required: true },
  name: { type: String, required: true, maxlength: 255 },
  email: { type: String, required: true, unique: true, maxlength: 255 },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "staff"], default: "staff", required: true },
}, { timestamps: true, _id: false });

const ClientSchema = new Schema<IClient>({
  _id: { type: String, required: true },
  companyId: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 255 },
  companyName: { type: String, maxlength: 255 },
  phone: { type: String, maxlength: 50 },
  email: { type: String, maxlength: 255 },
  address: { type: String },
  notes: { type: String },
  createdBy: { type: String },
}, { timestamps: true, _id: false });

const ProjectSchema = new Schema<IProject>({
  _id: { type: String, required: true },
  companyId: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 255 },
  address: { type: String },
  type: { type: String, enum: [
    "granny_flat", "single_storey", "double_storey", "duplex",
    "townhouse", "villa", "extension", "renovation",
    "knock_down_rebuild", "commercial"
  ], required: true },
  status: { type: String, enum: ["pending", "in_progress", "completed", "on_hold", "cancelled"], default: "pending", required: true },
  clientId: { type: String, required: true },
  createdBy: { type: String },
}, { timestamps: true, _id: false });

const TemplateSchema = new Schema<ITemplate>({
  _id: { type: String, required: true },
  companyId: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 255 },
  description: { type: String },
  projectType: { type: String, enum: [
    "granny_flat", "single_storey", "double_storey", "duplex",
    "townhouse", "villa", "extension", "renovation",
    "knock_down_rebuild", "commercial"
  ], required: true },
  isDefault: { type: Boolean, default: false, required: true },
  sections: { type: [TemplateSectionSchema], required: true },
  notes: { type: String },
  createdBy: { type: String },
}, { timestamps: true, _id: false });

const QuotationSchema = new Schema<IQuotation>({
  _id: { type: String, required: true },
  companyId: { type: String, required: true, index: true },
  quotationNumber: { type: String, required: true, maxlength: 50 },
  clientId: { type: String, required: true },
  projectId: { type: String, required: true },
  templateId: { type: String },
  status: { type: String, enum: ["draft", "sent", "approved", "rejected", "expired"], default: "draft", required: true },
  issueDate: { type: Date, default: Date.now, required: true },
  expiryDate: { type: Date, required: true },
  sections: { type: [QuotationSectionSchema], required: true },
  subtotal: { type: String, required: true, default: "0" },
  gstAmount: { type: String, required: true, default: "0" },
  totalAmount: { type: String, required: true, default: "0" },
  termsAndConditions: { type: String },
  notes: { type: String },
  createdBy: { type: String },
}, { timestamps: true, _id: false });
QuotationSchema.index({ companyId: 1, quotationNumber: 1 }, { unique: true });

const InvoiceSchema = new Schema<IInvoice>({
  _id: { type: String, required: true },
  companyId: { type: String, required: true, index: true },
  invoiceNumber: { type: String, required: true, maxlength: 50 },
  quotationId: { type: String },
  clientId: { type: String, required: true },
  projectId: { type: String, required: true },
  status: { type: String, enum: ["draft", "sent", "partially_paid", "paid", "overdue"], default: "draft", required: true },
  issueDate: { type: Date, default: Date.now, required: true },
  dueDate: { type: Date, required: true },
  sections: { type: [InvoiceSectionSchema], required: true },
  subtotal: { type: String, required: true, default: "0" },
  gstAmount: { type: String, required: true, default: "0" },
  totalAmount: { type: String, required: true, default: "0" },
  paidAmount: { type: String, required: true, default: "0" },
  paymentTerms: { type: String },
  notes: { type: String },
  createdBy: { type: String },
}, { timestamps: true, _id: false });
InvoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });

const CloudinaryAssetSubSchema = new Schema<CloudinaryAsset>(
  {
    publicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    resourceType: { type: String },
    format: { type: String },
    originalName: { type: String },
    bytes: { type: Number },
  },
  { _id: false }
);

const CompanySchema = new Schema<ICompany>({
  _id: { type: String, required: true },
  slug: { type: String, required: true, unique: true, maxlength: 50 },
  shortName: { type: String, required: true, maxlength: 100 },
  companyName: { type: String, required: true, default: "Hujurat Construction Pty Ltd", maxlength: 255 },
  quotationPrefix: { type: String, required: true, maxlength: 20 },
  invoicePrefix: { type: String, required: true, maxlength: 20 },
  abn: { type: String, maxlength: 20 },
  acn: { type: String, maxlength: 20 },
  address: { type: String },
  phone: { type: String, maxlength: 50 },
  email: { type: String, maxlength: 255 },
  website: { type: String, maxlength: 255 },
  bankName: { type: String, maxlength: 255 },
  bankBsb: { type: String, maxlength: 20 },
  bankAccount: { type: String, maxlength: 50 },
  bankAccountName: { type: String, maxlength: 255 },
  gstEnabled: { type: Boolean, default: true, required: true },
  gstRate: { type: String, required: true, default: "10.00" },
  logoUrl: { type: String },
  logoPublicId: { type: String },
  attachments: { type: [CloudinaryAssetSubSchema] },
  defaultTerms: { type: String },
}, { timestamps: true, _id: false });

/** @deprecated Use CompanySchema */
const CompanySettingsSchema = CompanySchema;

const TemplateSectionOptionSchema = new Schema<ITemplateSectionOption>({
  _id: { type: String, required: true },
  companyId: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 255 },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true, _id: false });

const AuditLogSchema = new Schema<IAuditLog>({
  _id: { type: String, required: true },
  userId: { type: String },
  action: { type: String, required: true, maxlength: 100 },
  entity: { type: String, required: true, maxlength: 100 },
  entityId: { type: String },
  details: { type: Schema.Types.Mixed },
}, { timestamps: true, _id: false });

// ===== Models =====

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export const Client: Model<IClient> = mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
export const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
export const Template: Model<ITemplate> = mongoose.models.Template || mongoose.model<ITemplate>("Template", TemplateSchema);
export const Quotation: Model<IQuotation> = mongoose.models.Quotation || mongoose.model<IQuotation>("Quotation", QuotationSchema);
export const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
export const Company: Model<ICompany> = mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema);
/** @deprecated Use Company */
export const CompanySettings: Model<ICompany> = mongoose.models.CompanySettings || mongoose.model<ICompany>("CompanySettings", CompanySettingsSchema);
export const TemplateSectionOption: Model<ITemplateSectionOption> = mongoose.models.TemplateSectionOption || mongoose.model<ITemplateSectionOption>("TemplateSectionOption", TemplateSectionOptionSchema);
export const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
