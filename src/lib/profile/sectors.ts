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
