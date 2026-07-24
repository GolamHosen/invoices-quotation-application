import { Company, Client, Project, Template, Quotation, Invoice } from "@/db/schema";
import { DEFAULT_COMPANIES } from "@/lib/companies";
import { generateId } from "@/lib/utils";
import { ensureHujuratLogo } from "@/lib/ensure-logo";

export async function ensureCompanies(): Promise<{ constructionId: string; engineeringId: string }> {
  await ensureHujuratLogo();
  const ids: Record<string, string> = {};

  for (const def of DEFAULT_COMPANIES) {
    const existing = await Company.findOne({ slug: def.slug }).lean();
    if (existing) {
      ids[def.slug] = existing._id;
    } else {
      const id = generateId();
      await Company.create({ _id: id, ...def });
      ids[def.slug] = id;
    }
  }

  return {
    constructionId: ids.construction,
    engineeringId: ids.engineering,
  };
}

export async function migrateToMultiCompany(): Promise<{
  constructionId: string;
  engineeringId: string;
  backfilled: Record<string, number>;
}> {
  const { constructionId, engineeringId } = await ensureCompanies();

  // Migrate legacy CompanySettings doc fields into Construction company if present
  const legacySettings = await Company.findOne({ slug: { $exists: false } }).lean();
  if (legacySettings) {
    const { slug: _s, shortName: _sn, quotationPrefix: _qp, invoicePrefix: _ip, ...rest } =
      (legacySettings as unknown as Record<string, unknown>);
    await Company.findByIdAndUpdate(constructionId, {
      ...rest,
      slug: "construction",
      shortName: "Construction",
      quotationPrefix: "HC-QUO",
      invoicePrefix: "HC-INV",
    });
    if (legacySettings._id !== constructionId) {
      await Company.deleteOne({ _id: legacySettings._id });
    }
  }

  const backfilled: Record<string, number> = {};

  const collections = [
    { model: Client, name: "clients" },
    { model: Project, name: "projects" },
    { model: Template, name: "templates" },
    { model: Quotation, name: "quotations" },
    { model: Invoice, name: "invoices" },
  ] as const;

  for (const { model, name } of collections) {
    // Cast to any to avoid union typing issues across multiple mongoose models
    const result = await (model as any).updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: "" }] },
      { $set: { companyId: constructionId } }
    );
    backfilled[name] = result.modifiedCount;
  }

  return { constructionId, engineeringId, backfilled };
}
