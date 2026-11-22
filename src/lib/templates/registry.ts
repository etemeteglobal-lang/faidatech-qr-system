import { z } from "zod";

export const verticalTemplates = [
  { code: "CONSTRUCTION", label: "Construction & Civil Engineering", fields: ["ecaLicense", "cocLevel", "contractorGrade", "consultantGrade", "projectGallery", "machineryFleet", "tenderRequest", "quoteRequest"] },
  { code: "ARCHITECTURE_INTERIOR", label: "Architecture & Interior Design", fields: ["portfolioBeforeAfter", "studioPackages", "threeDMedia", "consultationBooking", "materialCatalog", "catalog360Url", "catalogPdfUrl"] },
  { code: "CONSTRUCTION_TECHNICIAN", label: "Electrical, Plumbing & Construction Technicians", fields: ["cocCertificate", "skills", "serviceArea", "emergency24h", "tariff", "quoteRequest", "directOrder"] },
  { code: "HEALTHCARE", label: "Healthcare & Medicine", fields: ["specialization", "professionalLicense", "facility", "schedule", "laboratoryServices", "appointmentForm", "insurance", "privacyNote"] },
  { code: "PHARMACY_MEDICAL_SUPPLIES", label: "Pharmacy & Medical Supplies", fields: ["pharmacistLicense", "facilityLicense", "branches", "medicineAvailabilityInquiry", "prescriptionRequest", "deliveryRequest"] },
  { code: "LEGAL_ADVISORY", label: "Legal & Business Advisory", fields: ["advocateTier", "practiceAreas", "lawFirmPartners", "servicePackages", "caseIntake", "consultationIntake", "confidentialAccess"] },
  { code: "ACCOUNTING_TAX", label: "Accounting, Audit & Tax Advisory", fields: ["accountantCredentials", "auditCredentials", "taxServices", "auditServices", "taxCalendar", "reminders", "financialFormDownloads"] },
  { code: "REAL_ESTATE", label: "Real Estate & Property Sales/Rentals", fields: ["agentVCard", "propertyListings", "propertyPhotos", "pricing", "developerProjects", "paymentPlan", "siteMap", "viewingRequest"] },
  { code: "IT_SOFTWARE", label: "Information Technology & Software", fields: ["developerProfile", "companyProfile", "githubUrl", "portfolioUrl", "saasServices", "cloudServices", "erpServices", "slaUrl", "apiDocsUrl", "projectInquiry"] },
  { code: "CREATIVE_MEDIA", label: "Creative, Photography, Video & Graphics", fields: ["portfolio", "showreelUrl", "packages", "multiLinkHub", "studioEquipment", "team", "catalog", "booking"] },
  { code: "EDUCATION_TRAINING", label: "Education, Training & Coaching", fields: ["credentials", "courses", "programs", "enrollmentInfo", "feeInfo", "syllabusPdf", "registration"] },
  { code: "AGRICULTURE_COFFEE", label: "Agriculture, Coffee/Crop Production & Trade", fields: ["farmerProfile", "cooperativeProfile", "exporterProfile", "cropType", "qualityGrade", "collectionPoint", "warehouse", "geolocation", "eudrOriginMetadata"] },
  { code: "VETERINARY_LIVESTOCK", label: "Veterinary & Livestock", fields: ["veterinaryLicense", "fieldArea", "livestockCare", "poultryCare", "petCare", "vaccinationSchedule", "bulkSupport", "emergencySupport"] },
  { code: "MANUFACTURING", label: "Manufacturing & Industry", fields: ["industryType", "factoryCapacity", "qualityCertifications", "b2bCatalog", "sampleRequest", "factoryVisit"] },
  { code: "RETAIL_ECOMMERCE", label: "Retail, Wholesale & E-Commerce", fields: ["merchantInfo", "storeInfo", "branches", "catalog", "pricing", "digitalCatalog", "paymentLinks"] },
  { code: "TRANSPORT_LOGISTICS", label: "Transport, Logistics & Driving", fields: ["licenseClass", "vehicleClass", "routes", "fleet", "freightQuote", "shipmentTrackingUrl", "warehouseInfo", "customsInfo"] },
  { code: "AUTOMOTIVE_REPAIR", label: "Auto Repair & Garage / Automotive", fields: ["mechanicSpecialties", "garageServices", "partsCatalog", "estimateRequest", "maintenanceLog", "towingRequest"] },
  { code: "BEAUTY_FASHION", label: "Beauty, Fashion & Tailoring", fields: ["lookbook", "portfolio", "pricing", "packages", "booking", "measurementForm", "orderForm"] },
  { code: "FOOD_CATERING", label: "Food Preparation, Catering & Chefs", fields: ["chefProfile", "cateringMenu", "eventPackages", "tastingRequest", "orderForm", "dietaryOptions", "allergenInfo"] },
  { code: "TOURISM_TRAVEL", label: "Tourism, Tour Guides & Travel", fields: ["guideLicense", "operatorLicense", "routes", "itinerary", "multilingualGuide", "booking"] },
  { code: "SPORTS_WELLNESS", label: "Sports, Fitness & Wellness", fields: ["trainerCredentials", "gymCredentials", "memberships", "classSchedule", "clientResults", "registration"] },
  { code: "CREATORS_MARKETING", label: "Social Media, Creators & Digital Marketing", fields: ["mediaKit", "multiLinkHub", "campaigns", "seoPackages", "mediaPackages", "sponsorshipIntake"] },
  { code: "GOVERNMENT_MUNICIPAL", label: "Government Services & Municipalities", fields: ["officialName", "officeHours", "serviceChecklists", "complaints", "mesobUrl", "eServicesUrl", "faydaVerificationUrl"] },
  { code: "JUSTICE_EMERGENCY", label: "Justice, Police & Emergency Response", fields: ["officialIdentifier", "station", "emergencyContacts", "policeContact", "fireContact", "incidentReport", "geolocationReport", "legalGuidance"] },
  { code: "RELIGIOUS_CHARITY_NGO", label: "Religious, Charity & NGOs", fields: ["leaderProfile", "volunteerId", "mission", "projects", "reports", "donationIntake", "volunteerIntake", "receiptReference"] },
  { code: "ASSOCIATIONS_COOPERATIVES", label: "Professional Associations, Cooperatives & Iddirs", fields: ["memberCard", "bylaws", "benefits", "minutes", "duesTracking", "contributionLink", "votingLink"] },
  { code: "TEAMS_WORKGROUPS", label: "Business & Project Teams / Workgroups", fields: ["memberRole", "teamDirectory", "portfolio", "bulkSpreadsheet", "hrApprovalWorkflow", "adminApprovalWorkflow"] },
  { code: "JOURNALISM_MEDIA_PR", label: "Journalism, Media & Public Relations", fields: ["pressCardVerification", "articles", "editorialDesk", "adRates", "pressReleases", "tipIntake", "statementIntake"] },
] as const;

export type VerticalSectorCode = (typeof verticalTemplates)[number]["code"];
export type ProfileKindCode = "INDIVIDUAL" | "ORGANIZATION" | "GOVERNMENT" | "GROUP";
export type TemplateField = { key: string; label: string; required?: boolean; kind?: "text" | "url" | "boolean" | "number" | "list" | "json" };

const profileKinds = ["INDIVIDUAL", "ORGANIZATION", "GOVERNMENT", "GROUP"] as const;
const sectorCodes = verticalTemplates.map(({ code }) => code) as [VerticalSectorCode, ...VerticalSectorCode[]];

export const profileSubmissionSchema = z.object({
  sector: z.union([z.enum(sectorCodes), z.literal("OTHER")]),
  customSectorName: z.string().trim().max(120).optional(),
  profileKind: z.enum(profileKinds).default("ORGANIZATION"),
  displayName: z.string().trim().min(1).max(180),
  profileData: z.record(z.string(), z.unknown()).default({}),
  customFields: z.record(z.string(), z.unknown()).default({}),
});

export type ProfileSubmission = z.infer<typeof profileSubmissionSchema>;

export function getTemplate(code: string) {
  return verticalTemplates.find((template) => template.code === code) ?? null;
}

export function jsonObjectBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value ?? {}), "utf8");
}

function isSafeJsonValue(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "string") return value.length <= 20_000;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 200 && value.every((item) => isSafeJsonValue(item, depth + 1));
  if (typeof value === "object") {
    const entries = Object.entries(value);
    return entries.length <= 128 && entries.every(([key, item]) => key.length <= 80 && !["__proto__", "prototype", "constructor"].includes(key) && isSafeJsonValue(item, depth + 1));
  }
  return false;
}

export function validateProfileSubmission(input: unknown) {
  const parsed = profileSubmissionSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };
  const template = getTemplate(parsed.data.sector);
  if (!template && parsed.data.sector !== "OTHER") return { success: false as const, error: { formErrors: ["Unknown sector template."], fieldErrors: {} } };
  if (parsed.data.sector === "OTHER" && !parsed.data.customSectorName?.trim()) return { success: false as const, error: { formErrors: ["Enter a name for the custom sector."], fieldErrors: {} } };
  const registeredFields: readonly string[] = [...(template?.fields ?? []), "_pageBackground", "_qrForeground", "_qrShape", "_qrDots", "_logoPlacement", "_qrLogo"];
  const unsupportedFields = Object.keys(parsed.data.profileData).filter((key) => !registeredFields.includes(key));
  if (unsupportedFields.length) return { success: false as const, error: { formErrors: [`Fields are not registered for ${parsed.data.sector}: ${unsupportedFields.slice(0, 8).join(", ")}. Put organization-specific extensions in customFields.`], fieldErrors: {} } };
  if (!isSafeJsonValue(parsed.data.profileData) || !isSafeJsonValue(parsed.data.customFields)) {
    return { success: false as const, error: { formErrors: ["Profile and custom-field values must be bounded JSON values (maximum nesting depth 8)."], fieldErrors: {} } };
  }
  if (jsonObjectBytes(parsed.data.profileData) > 96_000 || jsonObjectBytes(parsed.data.customFields) > 32_000) {
    return { success: false as const, error: { formErrors: ["Profile JSON exceeds the 96 KiB profile / 32 KiB custom field limit."], fieldErrors: {} } };
  }
  const unsafeKeys = [parsed.data.profileData, parsed.data.customFields].flatMap((record) => Object.keys(record)).filter((key) => ["__proto__", "prototype", "constructor"].includes(key));
  if (unsafeKeys.length) return { success: false as const, error: { formErrors: ["Prototype-related field names are not allowed."], fieldErrors: {} } };
  return { success: true as const, data: parsed.data };
}
