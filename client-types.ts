export type ManagedQRCode = {
  id: string;
  title: string;
  description: string | null;
  shortCode: string;
  destinationType: "LANDING_PAGE" | "URL" | "VCARD" | "MENU" | "TOURISM_AUDIO" | "PDF";
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  campaign?: { id: string; name: string; status: string } | null;
  _count?: { scanEvents: number };
};

export type QRWorkspaceSummary = {
  totalQrCodes: number;
  activeQrCodes: number;
  totalScans: number;
};

export type QRListPagination = {
  limit: number;
  offset: number;
  totalCount: number;
  nextOffset: number | null;
};

export type TopScanQRCode = {
  id: string;
  title: string;
  shortCode: string;
  destinationType: ManagedQRCode["destinationType"];
  scanCount: number;
};

export type ApiErrorEnvelope = {
  error?: { code?: string; message?: string; issues?: unknown };
};

export function errorMessage(body: ApiErrorEnvelope, fallback: string): string {
  if (body.error?.code === "database_not_configured") {
    return "Connect an external PostgreSQL database to load or save QR records.";
  }
  return body.error?.message || fallback;
}
