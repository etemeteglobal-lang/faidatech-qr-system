"use client";

import { useEffect, useRef, useState } from "react";
import type { ProfileAnnouncement } from "@/lib/qr/announcements";

function AnnouncementItem({ item, decorative = false }: { item: ProfileAnnouncement; decorative?: boolean }) {
  const content = <>
    {item.badge ? <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">{item.badge}</span> : null}
    <span>{item.text}</span>
    <span aria-hidden="true" className="text-emerald-200">·</span>
  </>;

  if (item.link) return <a href={item.link} target="_blank" rel="noopener noreferrer" tabIndex={decorative ? -1 : undefined} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-1 py-1 text-sm text-white underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{content}</a>;
  return <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-1 py-1 text-sm text-white">{content}</span>;
}

export default function AnnouncementTicker({ announcements }: { announcements: ProfileAnnouncement[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(1);

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
  }, [announcements]);

  if (!announcements.length) return null;

  return <section ref={viewportRef} role="region" aria-label="Announcements" className="announcement-ticker overflow-hidden bg-emerald-800 text-white">
    <div className="announcement-ticker-track">
      {[0, 1].map((trackIndex) => <div key={trackIndex} aria-hidden={trackIndex === 1} className="announcement-ticker-group">
        {Array.from({ length: copies }, (_, copyIndex) => <div
          key={copyIndex}
          ref={trackIndex === 0 && copyIndex === 0 ? sequenceRef : undefined}
          aria-hidden={trackIndex === 1 || copyIndex > 0 ? true : undefined}
          className="announcement-ticker-set"
        >{announcements.map((item, index) => <AnnouncementItem key={`${index}-${item.text}`} item={item} decorative={trackIndex === 1 || copyIndex > 0} />)}</div>)}
      </div>)}
    </div>
  </section>;
}
