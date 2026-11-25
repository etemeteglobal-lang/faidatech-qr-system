"use client";

import { useEffect, useRef, useState } from "react";

export type ShowcaseCardItem = {
  id: string;
  title: string;
  imageUrl?: string;
  imageAlt?: string;
  kicker?: string;
  badge?: string;
  meta?: string;
  description?: string;
  link?: string;
  linkLabel?: string;
};

function ShowcaseCard({ item, decorative }: { item: ShowcaseCardItem; decorative: boolean }) {
  return <article className="profile-showcase-card">
    {item.imageUrl
      ? <img src={item.imageUrl} alt={item.imageAlt ?? item.title} className="profile-showcase-media" />
      : <div aria-hidden="true" className="profile-showcase-placeholder"><span>{item.kicker ?? "Showcase"}</span></div>}
    <div className="profile-showcase-card-body">
      {item.kicker ? <p className="profile-showcase-kicker">{item.kicker}</p> : null}
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-base font-bold text-slate-900">{item.title}</h3>
        {item.badge ? <span className="profile-showcase-badge">{item.badge}</span> : null}
      </div>
      {item.meta ? <p className="mt-2 text-sm font-bold text-emerald-800">{item.meta}</p> : null}
      {item.description ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.description}</p> : null}
      {item.link ? <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={decorative ? -1 : undefined}
        className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-emerald-800 underline underline-offset-2 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >{item.linkLabel ?? "View details"}<span aria-hidden="true">↗</span></a> : null}
    </div>
  </article>;
}

export default function ShowcaseTicker({
  items,
  ariaLabel = "Showcase",
  className = "",
}: {
  items: ShowcaseCardItem[];
  ariaLabel?: string;
  className?: string;
}) {
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
      const nextCopies = Math.max(1, Math.ceil(viewport.clientWidth / sequenceWidth));
      setCopies((current) => current === nextCopies ? current : nextCopies);
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
  }, [items.length]);

  if (!items.length) return null;

  return <div ref={viewportRef} role="region" aria-label={ariaLabel} className={`profile-showcase-scroller ${className}`.trim()}>
    <div className="profile-showcase-track">
      {[0, 1].map((trackIndex) => <div key={trackIndex} aria-hidden={trackIndex === 1} className="profile-showcase-group">
        {Array.from({ length: copies }, (_, copyIndex) => <div
          key={copyIndex}
          ref={trackIndex === 0 && copyIndex === 0 ? sequenceRef : undefined}
          aria-hidden={trackIndex === 1 || copyIndex > 0 ? true : undefined}
          className="profile-showcase-sequence"
        >{items.map((item) => <ShowcaseCard key={`${copyIndex}-${item.id}`} item={item} decorative={trackIndex === 1 || copyIndex > 0} />)}</div>)}
      </div>)}
    </div>
  </div>;
}
