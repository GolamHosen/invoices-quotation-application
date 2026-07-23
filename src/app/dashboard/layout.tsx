import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDb } from "@/db";
import { Company } from "@/db/schema";
import { ensureCompanies, migrateToMultiCompany } from "@/lib/seed-companies";
import { ClientDashboardLayout } from "./client-layout";
import { cookies } from "next/headers";
import { COMPANY_COOKIE, ALL_COMPANIES } from "@/lib/companies";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // 1. Fetch Session
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  // 2. Fetch Companies
  await connectDb();
  
  const existingCount = await Company.countDocuments({});
  if (existingCount === 0) {
    await ensureCompanies();
  } else if (existingCount === 1) {
    await migrateToMultiCompany();
  }
  
  const companiesDocs = await Company.find().sort({ slug: 1 }).lean();
  const initialCompanies = companiesDocs.map(c => ({
    ...c,
    id: c._id.toString(),
    _id: c._id.toString(),
  }));

  // 3. Get initial company ID from cookie
  const cookieStore = await cookies();
  const initialCompanyId = cookieStore.get(COMPANY_COOKIE)?.value || ALL_COMPANIES;

  return (
    <ClientDashboardLayout 
      user={session as any} 
      initialCompanies={initialCompanies as any} 
      initialCompanyId={initialCompanyId}
    >
      {children}
    </ClientDashboardLayout>
  );
}
