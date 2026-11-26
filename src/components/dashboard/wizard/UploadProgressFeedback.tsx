import { createUploadProgress, formatFileSize, type UploadProgressState } from "@/lib/profile/upload";

export default function UploadProgressFeedback({ state, className = "" }: { state?: UploadProgressState; className?: string }) {
  const progress = state ?? createUploadProgress();
  const label = progress.status === "uploading"
    ? "Uploading"
    : progress.status === "completed"
      ? "Completed"
      : progress.status === "failed"
        ? "Failed"
        : "Ready";
  const color = progress.status === "failed" ? "text-rose-700" : progress.status === "completed" ? "text-emerald-800" : "text-slate-600";

  return <div className={`mt-1.5 space-y-1 text-[11px] font-normal ${className}`.trim()}>
    <p role="status" aria-live="polite" className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${color}`}>
      <span className="font-semibold">{label}</span>
      {progress.fileName ? <span className="max-w-full truncate">{progress.fileName}</span> : null}
      <span>{progress.percentage}%</span>
      <span>{formatFileSize(progress.uploadedBytes)} / {formatFileSize(progress.totalBytes)}</span>
    </p>
    {progress.status !== "ready" ? <div className="h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={progress.fileName ? `Upload progress for ${progress.fileName}` : "File upload progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}>
      <span className={`block h-full rounded-full transition-[width] ${progress.status === "failed" ? "bg-rose-500" : progress.status === "completed" ? "bg-emerald-600" : "bg-teal-600"}`} style={{ width: `${progress.percentage}%` }} />
    </div> : null}
    {progress.error ? <p role="alert" className="text-rose-700">{progress.error}</p> : null}
  </div>;
}
