"use client";

import { useEffect, useRef, useState } from "react";
import type { ProfileAnnouncement } from "@/lib/qr/announcements";
import { createUploadProgress, uploadProfileFile, type UploadProgressState } from "@/lib/profile/upload";
import UploadProgressFeedback from "@/components/dashboard/wizard/UploadProgressFeedback";

const MIN_SLOTS = 3;
const MAX_SLOTS = 5;
const emptyAnnouncement = (): ProfileAnnouncement => ({ text: "", badge: "", link: "", type: "text" });

function withMinimumSlots(items: ProfileAnnouncement[]) {
  const slots = items.slice(0, MAX_SLOTS);
  while (slots.length < MIN_SLOTS) slots.push(emptyAnnouncement());
  return slots;
}

async function validateVideoDuration(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => reject(new Error("The selected video could not be read."));
      video.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function AnnouncementItemsEditor({ announcements, onChange }: { announcements: ProfileAnnouncement[]; onChange: (next: ProfileAnnouncement[]) => void }) {
  const slots = withMinimumSlots(announcements);
  const latestItems = useRef(announcements);
  useEffect(() => { latestItems.current = announcements; }, [announcements]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<number, UploadProgressState[]>>({});

  function update(index: number, patch: Partial<ProfileAnnouncement>) {
    onChange(slots.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function clear(index: number) {
    update(index, emptyAnnouncement());
  }

  async function uploadMedia(index: number, files: File[], kind: "image" | "video") {
    setUploadError("");
    if (!files.length) return;
    if (kind === "video" && files.length > 1) {
      setUploadError("Add one video per announcement slot.");
      return;
    }
    const currentSlots = withMinimumSlots(latestItems.current);
    const destinations = [index];
    for (let slotIndex = index + 1; slotIndex < MAX_SLOTS; slotIndex += 1) {
      const slot = currentSlots[slotIndex];
      if (!slot || (!slot.text.trim() && !slot.mediaUrl?.trim())) destinations.push(slotIndex);
    }
    if (files.length > destinations.length) {
      setUploadError(`Only ${destinations.length} empty announcement slot${destinations.length === 1 ? " is" : "s are"} available from this item.`);
      return;
    }
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("Images and videos must be no larger than 10 MiB each.");
        return;
      }
      if (kind === "image" && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        setUploadError("Choose PNG, JPEG, or WebP image files.");
        return;
      }
      if (kind === "video" && !["video/mp4", "video/webm", "video/ogg"].includes(file.type)) {
        setUploadError("Choose an MP4, WebM, or OGG video.");
        return;
      }
      if (kind === "video") {
      try {
        const duration = await validateVideoDuration(file);
        if (!Number.isFinite(duration) || duration > 30) {
          setUploadError("Videos must be 30 seconds or shorter.");
          return;
        }
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "The selected video could not be read.");
        return;
      }
      }
    }

    setUploadingIndex(index);
    try {
      const uploadedFiles = [];
      const states = files.map((file) => createUploadProgress(file, "uploading"));
      setUploadProgress((current) => ({ ...current, [index]: states }));
      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const file = files[fileIndex];
        let progress = states[fileIndex];
        try {
          const replaceUrl = currentSlots[destinations[fileIndex]]?.mediaUrl;
          const uploaded = await uploadProfileFile(file, (transfer) => {
            progress = { ...progress, ...transfer, status: "uploading" };
            states[fileIndex] = progress;
            setUploadProgress((current) => ({ ...current, [index]: [...states] }));
          }, replaceUrl);
          uploadedFiles.push(uploaded);
          progress = { ...progress, status: "completed", percentage: 100, uploadedBytes: file.size, totalBytes: file.size };
          states[fileIndex] = progress;
          setUploadProgress((current) => ({ ...current, [index]: [...states] }));
        } catch (error) {
          progress = { ...progress, status: "failed", error: error instanceof Error ? error.message : "The announcement media could not be uploaded." };
          states[fileIndex] = progress;
          setUploadProgress((current) => ({ ...current, [index]: [...states] }));
          throw error;
        }
      }
      const latestSlots = withMinimumSlots(latestItems.current);
      for (let slotIndex = 0; slotIndex < uploadedFiles.length; slotIndex += 1) {
        while (latestSlots.length <= destinations[slotIndex]) latestSlots.push(emptyAnnouncement());
        const target = destinations[slotIndex];
        latestSlots[target] = { ...latestSlots[target], type: kind, mediaUrl: uploadedFiles[slotIndex].url };
      }
      onChange(latestSlots);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "The announcement media could not be uploaded.");
    } finally {
      setUploadingIndex(null);
    }
  }

  return <section aria-labelledby="announcement-editor-title" className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id="announcement-editor-title" className="font-semibold text-faida-navy">Announcements</h3>
        <p className="mt-1 text-xs leading-5 text-faida-slate">Add up to five Text, Image announcement, or Video items. Image and video uploads are stored with the profile; blank items are skipped when saved.</p>
      </div>
      {slots.length < MAX_SLOTS ? <button type="button" onClick={() => onChange([...slots, emptyAnnouncement()])} className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-faida-navy">+ Add announcement</button> : <span className="text-xs font-medium text-slate-500">Maximum 5 announcements</span>}
    </div>
    <div className="space-y-3">
      {slots.map((item, index) => {
        const type = item.type ?? "text";
        return <article key={index} className="rounded-xl border border-emerald-100 bg-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-800">Announcement #{index + 1}</h4>
            <div className="flex gap-2">
              <button type="button" onClick={() => clear(index)} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">Clear</button>
              {slots.length > MIN_SLOTS ? <button type="button" aria-label={`Remove announcement #${index + 1}`} onClick={() => onChange(slots.filter((_, itemIndex) => itemIndex !== index))} className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">Remove</button> : null}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(10rem,.7fr)_minmax(0,1.5fr)]">
            <label className="block text-sm font-semibold text-slate-700"><span>Announcement format</span><select value={type} onChange={(event) => update(index, { type: event.target.value as ProfileAnnouncement["type"], mediaUrl: "" })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-faida-navy"><option value="text">Text</option><option value="image">Image announcement</option><option value="video">Video</option></select></label>
            <label className="block text-sm font-semibold text-slate-700"><span>{type === "text" ? "Announcement text" : "Caption (optional)"}</span><input type="text" value={item.text} onChange={(event) => update(index, { text: event.target.value })} maxLength={500} placeholder={type === "text" ? "Share a timely update, offer, or news item" : "Add a short caption"} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>
          </div>
          {type === "image" ? <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700"><span>Upload image</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={uploadingIndex !== null} onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); if (files.length) void uploadMedia(index, files, "image"); event.currentTarget.value = ""; }} className="mt-1.5 block w-full text-xs" />{uploadProgress[index]?.length ? uploadProgress[index].map((state, stateIndex) => <UploadProgressFeedback key={`${state.fileName}-${stateIndex}`} state={state} />) : <UploadProgressFeedback />}<span className="mt-1 block text-xs font-normal text-slate-500">Select one or more PNG, JPEG, or WebP files; up to 10 MiB each.</span></label>
            <label className="block text-sm font-semibold text-slate-700"><span>Image URL</span><input type="url" value={item.mediaUrl ?? ""} onChange={(event) => update(index, { mediaUrl: event.target.value })} placeholder="https://example.com/image.jpg" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>
          </div> : null}
          {type === "video" ? <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700"><span>Video URL</span><input type="url" value={item.mediaUrl ?? ""} onChange={(event) => update(index, { mediaUrl: event.target.value })} placeholder="https://example.com/clip.mp4" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>
            <label className="block text-sm font-semibold text-slate-700"><span>Upload video</span><input type="file" accept="video/mp4,video/webm,video/ogg" disabled={uploadingIndex !== null} onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); if (files.length) void uploadMedia(index, files, "video"); event.currentTarget.value = ""; }} className="mt-1.5 block w-full text-xs" />{uploadProgress[index]?.length ? uploadProgress[index].map((state, stateIndex) => <UploadProgressFeedback key={`${state.fileName}-${stateIndex}`} state={state} />) : <UploadProgressFeedback />}<span className="mt-1 block text-xs font-normal text-slate-500">MP4, WebM, or OGG; up to 10 MiB and 30 seconds.</span></label>
          </div> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700"><span>Badge (optional)</span><input type="text" value={item.badge ?? ""} onChange={(event) => update(index, { badge: event.target.value })} maxLength={40} placeholder="e.g. NEW" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>
            <label className="block text-sm font-semibold text-slate-700"><span>Link URL (optional)</span><input type="url" value={item.link ?? ""} onChange={(event) => update(index, { link: event.target.value })} placeholder="https://example.com/news" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>
          </div>
          {item.mediaUrl && type === "image" ? <img src={item.mediaUrl} alt={item.text || item.badge || `Announcement ${index + 1}`} className="mt-3 h-24 w-full rounded-lg object-cover sm:w-48" /> : null}
          {item.mediaUrl && type === "video" ? <video controls playsInline preload="metadata" className="mt-3 max-h-40 w-full rounded-lg bg-black sm:w-72"><source src={item.mediaUrl} /></video> : null}
        </article>;
      })}
    </div>
    {uploadError ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-900">{uploadError}</p> : null}
  </section>;
}
