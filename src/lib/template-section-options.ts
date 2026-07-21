// Default template section options used as fallback when no dynamic options exist
export const DEFAULT_TEMPLATE_SECTION_OPTIONS = [
  "Land Survey",
  "Internal Survey",
  "Storm water design, drawing, certificate",
  "OSD Calculation",
  "Structural design, drawings and certificate",
  "Driveway Cross section",
  "Basix including Govt fees",
  "Nathers",
  "Specification",
  "Sydney water tapin",
  "Sydney water Coordinator",
  "Waste management plan",
  "Planning Portal upload fees",
  "Coordination fees with PCA and other consultant",
  "Section 10.7",
  "Title search",
  "Dial before Digg",
  "SEE (Statement of Environmental effects report)",
  "DP",
  "PCA Fees for complying Development Certificate Ghull",
  "PCA Fees for complying Development Certificate Saboni GST Inc",
  "Construction Certificate (CC) after DA",
  "SOIL TEST",
  "Dilapidation report",
  "Site Inspection",
  "Building Performance Solution",
  "Building Construction",
] as const;

export type TemplateSectionOption = (typeof DEFAULT_TEMPLATE_SECTION_OPTIONS)[number];

// Cache for section options
let cachedOptions: string[] | null = null;
let cachedCompanyId: string | null = null;

/**
 * Fetch template section options dynamically from the API.
 * Falls back to DEFAULT_TEMPLATE_SECTION_OPTIONS if the API call fails.
 */
export async function fetchTemplateSectionOptions(companyId: string): Promise<string[]> {
  if (!companyId) {
    return [...DEFAULT_TEMPLATE_SECTION_OPTIONS];
  }

  // Return cached if same company
  if (cachedOptions && cachedCompanyId === companyId) {
    return cachedOptions;
  }

  try {
    const response = await fetch(`/api/template-sections?companyId=${encodeURIComponent(companyId)}`);
    if (!response.ok) {
      return [...DEFAULT_TEMPLATE_SECTION_OPTIONS];
    }
    const data = await response.json();
    const options = data.map((item: any) => item.name);
    
    // If no options exist yet, use defaults
    if (options.length === 0) {
      // Seed default options
      try {
        await fetch(`/api/template-sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, name: "_seed_defaults" }),
        });
      } catch {
        // ignore seeding errors
      }
      return [...DEFAULT_TEMPLATE_SECTION_OPTIONS];
    }

    cachedOptions = options;
    cachedCompanyId = companyId;
    return options;
  } catch {
    return [...DEFAULT_TEMPLATE_SECTION_OPTIONS];
  }
}

/**
 * Invalidate the cache to force a re-fetch on next call.
 */
export function invalidateTemplateSectionOptionsCache(): void {
  cachedOptions = null;
  cachedCompanyId = null;
}

/**
 * Get the default options synchronously (for SSR or initial state).
 */
export function getDefaultTemplateSectionOptions(): string[] {
  return [...DEFAULT_TEMPLATE_SECTION_OPTIONS];
}
