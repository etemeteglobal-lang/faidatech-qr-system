export type UploadedProfileFile = {
  url: string;
  fileName: string;
  mimeType: string;
};

export async function uploadProfileFile(file: File): Promise<UploadedProfileFile> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/assets/profile", { method: "POST", body });
  const result = await response.json().catch(() => ({})) as {
    data?: UploadedProfileFile;
    error?: { message?: string };
  };
  if (!response.ok || !result.data) {
    throw new Error(result.error?.message || "The profile file could not be uploaded.");
  }
  return result.data;
}
