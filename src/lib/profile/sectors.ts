import type { ProfileAnnouncement } from "@/lib/qr/announcements";

export const sectorOptions = [
  { id: "ARCHITECTURE", label: "Architecture & Design" },
  { id: "ENGINEERING", label: "Engineering & Infrastructure" },
  { id: "CONSTRUCTION", label: "Construction & Real Estate" },
  { id: "BANKING_FINANCE", label: "Banking & Finance" },
  { id: "HEALTHCARE", label: "Healthcare & Medicine" },
  { id: "LEGAL", label: "Legal & Compliance" },
  { id: "EDUCATION", label: "Education & Research" },
  { id: "TECHNOLOGY", label: "Technology & Software" },
  { id: "CONSULTING", label: "Consulting & Advisory" },
  { id: "GOVERNMENT", label: "Government & Public Service" },
  { id: "NONPROFIT", label: "Nonprofit & Development" },
  { id: "TOURISM_HOSPITALITY", label: "Tourism & Hospitality" },
  { id: "MEDIA_CREATIVE", label: "Media & Creative" },
  { id: "MARKETING_COMMUNICATIONS", label: "Marketing & Communications" },
  { id: "RETAIL_COMMERCE", label: "Retail & Commerce" },
  { id: "MANUFACTURING", label: "Manufacturing" },
  { id: "AGRICULTURE", label: "Agriculture & Agribusiness" },
  { id: "TRANSPORT_LOGISTICS", label: "Transport & Logistics" },
  { id: "ENERGY_UTILITIES", label: "Energy & Utilities" },
  { id: "TELECOMMUNICATIONS", label: "Telecommunications" },
  { id: "PROFESSIONAL_SERVICES", label: "Professional Services" },
  { id: "ARTS_CULTURE", label: "Arts & Culture" },
  { id: "SPORTS_FITNESS", label: "Sports & Fitness" },
  { id: "BEAUTY_WELLNESS", label: "Beauty & Wellness" },
  { id: "FOOD_BEVERAGE", label: "Food & Beverage" },
  { id: "SECURITY_SAFETY", label: "Security & Safety" },
  { id: "SCIENCE_RESEARCH", label: "Science & Research" },
  { id: "OTHER", label: "Other sector" },
] as const;

export type SectorId = (typeof sectorOptions)[number]["id"];
export type ShowcaseMode = "PRODUCT_CATALOG" | "SERVICE_MENU" | "PROJECT_PROCESS";
export type SectorShowcaseLabels = {
  sectionTitle: string;
  parentSingular: string;
  parentPlural: string;
  parentTitleLabel: string;
  parentDescriptionLabel: string;
  parentImageLabel: string;
  childSingular: string;
  childPlural: string;
  childTitleLabel: string;
  childDescriptionLabel: string;
  childImageLabel: string;
  addParentLabel: string;
  addChildLabel: string;
  removeParentLabel: string;
};

export function getSectorShowcaseLabels(sector: string, mode: ShowcaseMode, customSectorName = ""): SectorShowcaseLabels {
  const context = `${sector} ${customSectorName}`.toLowerCase();
  const productSector = /retail|commerce|fashion|apparel|clothing|dress|shoe|footwear|manufactur|product|catalog|agriculture|food|beverage|beauty/.test(context);
  const fashionSector = /fashion|apparel|clothing|dress|shoe|footwear|tailor|beauty/.test(context);
  const menuSector = /food|beverage|cater|restaurant|cafe|menu/.test(context);

  if (mode === "PRODUCT_CATALOG" || (mode === "PROJECT_PROCESS" && productSector)) {
    const parentSingular = fashionSector ? "Product / style" : "Product";
    return {
      sectionTitle: fashionSector ? "Products, styles & variants" : "Products & variants",
      parentSingular,
      parentPlural: fashionSector ? "Products / styles" : "Products",
      parentTitleLabel: fashionSector ? "Product or style name" : "Product name",
      parentDescriptionLabel: "Product details",
      parentImageLabel: fashionSector ? "Product / style photo" : "Product photo",
      childSingular: "Variant / type",
      childPlural: "Variants / types",
      childTitleLabel: fashionSector ? "Variant / type name (for example: dress size or shoe style)" : "Variant / type name",
      childDescriptionLabel: "Variant details",
      childImageLabel: "Variant photo",
      addParentLabel: fashionSector ? "+ Add product / style" : "+ Add product",
      addChildLabel: "+ Add variant / type",
      removeParentLabel: fashionSector ? "Remove product / style" : "Remove product",
    };
  }

  if (mode === "SERVICE_MENU") {
    const parentSingular = menuSector ? "Menu item" : "Service / item";
    return {
      sectionTitle: menuSector ? "Menu items & offerings" : "Services & items",
      parentSingular,
      parentPlural: menuSector ? "Menu items" : "Services / items",
      parentTitleLabel: menuSector ? "Menu item name" : "Service or item name",
      parentDescriptionLabel: menuSector ? "Item details" : "Service / item details",
      parentImageLabel: menuSector ? "Menu item photo" : "Service / item photo",
      childSingular: "Option",
      childPlural: "Options",
      childTitleLabel: "Option name",
      childDescriptionLabel: "Option details",
      childImageLabel: "Option photo",
      addParentLabel: menuSector ? "+ Add menu item" : "+ Add service or item",
      addChildLabel: "+ Add option",
      removeParentLabel: menuSector ? "Remove menu item" : "Remove service / item",
    };
  }

  const workflowSector = /construction|architecture|engineering|project|workflow|government|nonprofit|media|creative|arts|science|research|team|education|technology|infrastructure/.test(context);
  const parentSingular = workflowSector ? "Project" : "Showcase item";
  return {
    sectionTitle: workflowSector ? "Projects & process steps" : "Selected items & details",
    parentSingular,
    parentPlural: workflowSector ? "Projects" : "Showcase items",
    parentTitleLabel: workflowSector ? "Project title" : "Item title",
    parentDescriptionLabel: workflowSector ? "Project overview" : "Item description",
    parentImageLabel: workflowSector ? "Project image" : "Item image",
    childSingular: workflowSector ? "Process step" : "Detail / step",
    childPlural: workflowSector ? "Process steps" : "Details / steps",
    childTitleLabel: workflowSector ? "Step title" : "Detail / step title",
    childDescriptionLabel: workflowSector ? "Step details" : "Detail / step description",
    childImageLabel: workflowSector ? "Step image" : "Detail / step image",
    addParentLabel: workflowSector ? "+ Add project" : "+ Add item",
    addChildLabel: workflowSector ? "+ Add process step" : "+ Add detail / step",
    removeParentLabel: workflowSector ? "Remove project" : "Remove item",
  };
}

export type ProfileFieldType = "text" | "link" | "social" | "phone" | "email" | "address" | "file" | "document";

export const profileFieldTypes: { id: ProfileFieldType; label: string }[] = [
  { id: "text", label: "Short text" },
  { id: "link", label: "Website link" },
  { id: "social", label: "Social profile" },
  { id: "phone", label: "Phone number" },
  { id: "email", label: "Email address" },
  { id: "address", label: "Address" },
  { id: "file", label: "File or image" },
  { id: "document", label: "Document or certificate" },
];

export type ProfileSocialLink = { platform: string; label: string; url: string };
export type ProfileProject = { title: string; description?: string; url?: string; imageUrl?: string };
export type ProfileCredential = { title: string; issuer?: string; year?: string; fileUrl: string; fileName: string; mimeType: string };
export type ProfileReview = { name: string; role?: string; rating: number; quote: string };
export type ProfileCustomField = { id: string; label: string; type: ProfileFieldType; value: string };

export type SectorProfilePayload = {
  profileVersion: 1;
  sector: SectorId;
  customSectorName?: string;
  firstName: string;
  lastName: string;
  role: string;
  organization?: string;
  tagline?: string;
  bio?: string;
  spotlight?: string;
  announcements?: ProfileAnnouncement[];
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  mapUrl?: string;
  socialLinks: ProfileSocialLink[];
  projects: ProfileProject[];
  credentials: ProfileCredential[];
  reviews: ProfileReview[];
  customFields: ProfileCustomField[];
  sectionVisibility: { projects: boolean; credentials: boolean; social: boolean; reviews: boolean; contact: boolean };
  branding?: { brandName?: string; logoUrl?: string; accentColor?: string; qrForeground?: string };
  localizedContent?: Record<string, Record<string, unknown>>;
};
