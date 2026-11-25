"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeAnnouncements, type ProfileAnnouncement } from "@/lib/qr/announcements";

function AnnouncementItem({ item, decorative = false }: { item: ProfileAnnouncement; decorative?: boolean }) {
  const media = item.mediaUrl && item.type === "image"
    ? <img src={item.mediaUrl} alt={item.text || item.badge || "Announcement image"} className="announcement-ticker-media" />
    : item.mediaUrl && item.type === "video"
      ? <video controls={!decorative} tabIndex={decorative ? -1 : 0} muted playsInline preload="metadata" aria-label={item.text || item.badge || "Announcement video"} className="announcement-ticker-media bg-slate-950"><source src={item.mediaUrl} /></video>
      : null;

  return <div className="announcement-ticker-card">
    {media}
    <div className="announcement-ticker-details">
      {item.badge ? <span className="announcement-ticker-badge">{item.badge}</span> : null}
      {item.text ? <p className="announcement-ticker-caption">{item.text}</p> : null}
      {item.link ? <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={decorative ? -1 : undefined}
        aria-label={`Open announcement${item.text ? `: ${item.text}` : ""}`}
        className="announcement-ticker-link"
      >Open announcement <span aria-hidden="true">↗</span></a> : null}
    </div>
  </div>;
}

export default function AnnouncementTicker({ announcements }: { announcements: ProfileAnnouncement[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(1);
  const safeAnnouncements = useMemo(() => normalizeAnnouncements(announcements), [announcements]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const sequence = sequenceRef.current;
    if (!viewport || !sequence) return;

    const measure = () => {
      const sequenceWidth = sequence.getBoundingClientRect().width;
      if (sequenceWidth <= 0) return;
      const neededCopies = Math.max(1, Math.ceil(viewport.clientWidth / sequenceWidth));
      setCopies((current) => current === neededCopies ? current : neededCopies);
    };

    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(viewport);
    observer?.observe(sequence);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [safeAnnouncements]);

  if (!safeAnnouncements.length) return null;

  return <section ref={viewportRef} role="region" aria-label="Announcements" className="announcement-ticker overflow-hidden bg-emerald-800 text-white">
    <div className="announcement-ticker-track">
      {[0, 1].map((trackIndex) => <div key={trackIndex} aria-hidden={trackIndex === 1} className="announcement-ticker-group">
        {Array.from({ length: copies }, (_, copyIndex) => <div
          key={copyIndex}
          ref={trackIndex === 0 && copyIndex === 0 ? sequenceRef : undefined}
          aria-hidden={trackIndex === 1 || copyIndex > 0 ? true : undefined}
          className="announcement-ticker-set"
        >{safeAnnouncements.map((item, index) => <AnnouncementItem key={`${index}-${item.text}-${item.mediaUrl ?? ""}`} item={item} decorative={trackIndex === 1 || copyIndex > 0} />)}</div>)}
      </div>)}
    </div>
  </section>;
}
