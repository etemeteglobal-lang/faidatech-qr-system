export type UploadStatus = "ready" | "uploading" | "completed" | "failed";

export type UploadProgressState = {
  status: UploadStatus;
  fileName: string;
  percentage: number;
  uploadedBytes: number;
  totalBytes: number;
  error?: string;
};

export type UploadTransferProgress = Pick<UploadProgressState, "percentage" | "uploadedBytes" | "totalBytes">;

export function createUploadProgress(file?: File, status: UploadStatus = "ready"): UploadProgressState {
  return {
    status,
    fileName: file?.name ?? "",
    percentage: status === "completed" ? 100 : 0,
    uploadedBytes: status === "completed" ? file?.size ?? 0 : 0,
    totalBytes: file?.size ?? 0,
  };
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kibibytes = bytes / 1024;
  if (kibibytes < 1024) return `${kibibytes.toFixed(1)} KB`;
  const mebibytes = kibibytes / 1024;
  if (mebibytes < 1024) return `${mebibytes.toFixed(1)} MB`;
  return `${(mebibytes / 1024).toFixed(2)} GB`;
}

export type MultipartUploadResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

export async function uploadMultipartFile<T = Record<string, unknown>>(
  url: string,
  file: File,
  options: {
    fields?: Record<string, string>;
    onProgress?: (progress: UploadTransferProgress) => void;
  } = {},
): Promise<MultipartUploadResult<T>> {
  const body = new FormData();
  body.append("file", file);
  for (const [key, value] of Object.entries(options.fields ?? {})) body.append(key, value);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const ratio = Math.min(1, Math.max(0, event.loaded / event.total));
      options.onProgress?.({
        percentage: Math.round(ratio * 100),
        uploadedBytes: Math.min(file.size, Math.round(file.size * ratio)),
        totalBytes: file.size,
      });
    };
    request.onerror = () => reject(new Error("The upload could not reach the server. Check your connection and try again."));
    request.onabort = () => reject(new Error("The upload was canceled."));
    request.onload = () => {
      const parsed = (() => {
        try {
          return JSON.parse(request.responseText) as T;
        } catch {
          return {} as T;
        }
      })();
      options.onProgress?.({ percentage: 100, uploadedBytes: file.size, totalBytes: file.size });
      const ok = request.status >= 200 && request.status < 300;
      if (ok && typeof window !== "undefined") window.dispatchEvent(new Event("faidatech:storage-quota-refresh"));
      resolve({ ok, status: request.status, data: parsed });
    };
    request.send(body);
  });
}

export type UploadedProfileFile = {
  url: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number;
};

export async function uploadProfileFile(
  file: File,
  onProgress?: (progress: UploadTransferProgress) => void,
  replaceUrl?: string,
): Promise<UploadedProfileFile> {
  const result = await uploadMultipartFile<{
    data?: UploadedProfileFile;
    error?: { message?: string };
  }>("/api/assets/profile", file, { onProgress, fields: replaceUrl ? { replaceUrl } : undefined });
  if (!result.ok || !result.data.data) {
    throw new Error(result.data.error?.message || "The profile file could not be uploaded.");
  }
  return { ...result.data.data, fileSizeBytes: result.data.data.fileSizeBytes ?? file.size };
}
