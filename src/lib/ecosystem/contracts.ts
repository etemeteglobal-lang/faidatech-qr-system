export type VerificationHookRequest = {
  organizationId: string;
  subjectType: "BUSINESS_PROFILE" | "DOCUMENT" | "LICENSE";
  subjectReference: string;
  provider: "FAYDA" | "MESOB" | "MANUAL";
  callbackUrl?: string;
};

export type VerificationHookResult = {
  status: "PENDING" | "VERIFIED" | "REJECTED";
  providerReferenceHash?: string;
  safeMetadata?: Record<string, string | number | boolean | null>;
  // Raw Fayda identifiers, document images, tokens, or provider secrets are not accepted here.
};

export interface CredentialVerificationAdapter {
  start(request: VerificationHookRequest): Promise<VerificationHookResult>;
}

export type PaymentAttachmentProvider = "TELEBIRR" | "CHAPA" | "STRIPE" | "BANK" | "OTHER";
export type Pillar3OriginMetadata = { countryCode?: string; region?: string; farmOrFacilityRef?: string; harvestAt?: string; certifications?: string[] };
export type ScanAnomalyFlag = "DUPLICATE_BURST" | "OUT_OF_REGION" | "INVALID_SERIAL" | "UNEXPECTED_TIME";
export type CmmsMaintenanceInput = { assetTag: string; recordType: "INSPECTION" | "MAINTENANCE" | "FAULT" | "PART_REPLACEMENT"; title: string; details?: Record<string, unknown>; faultReported?: boolean };
