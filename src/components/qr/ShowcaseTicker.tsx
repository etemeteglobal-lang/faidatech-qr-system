"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type FormEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";

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
  detailHref?: string;
  parentId?: string;
  children?: ShowcaseCardItem[];
  childrenLabel?: string;
};

type ShowcaseRailProps = {
  items: ShowcaseCardItem[];
  ariaLabel: string;
  className?: string;
  child?: boolean;
};

function ShowcaseRail({ items, ariaLabel, className = "", child = false }: ShowcaseRailProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);
  const sequenceWidthRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const resumeTimeoutRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const autoScrollingRef = useRef(false);
  const programmaticScrollUntilRef = useRef(0);
  const scrollPositionRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const interactionUntilRef = useRef(0);
  const suppressClickRef = useRef(false);
  const dragRef = useRef({ active: false, pointerId: null as number | null, startX: 0, startScrollLeft: 0, moved: false });
  const [copies, setCopies] = useState(2);

  useEffect(() => {
    const viewport = viewportRef.current;
    const sequence = sequenceRef.current;
    if (!viewport || !sequence) return;

    const measure = () => {
      const sequenceWidth = sequence.getBoundingClientRect().width;
      if (sequenceWidth <= 0) return;
      sequenceWidthRef.current = sequenceWidth;
      const nextCopies = Math.max(2, Math.ceil(viewport.clientWidth / sequenceWidth) + 1);
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

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => { reducedMotionRef.current = preference.matches; };
    updatePreference();
    preference.addEventListener?.("change", updatePreference);

    const tick = (now: number) => {
      const viewport = viewportRef.current;
      const elapsed = lastFrameRef.current ? Math.min(50, now - lastFrameRef.current) : 16;
      lastFrameRef.current = now;
      if (viewport && !reducedMotionRef.current && !hoveredRef.current && !focusedRef.current && !dragRef.current.active && now >= interactionUntilRef.current && sequenceWidthRef.current > 0) {
        autoScrollingRef.current = true;
        programmaticScrollUntilRef.current = now + 120;
        scrollPositionRef.current += elapsed * 0.028;
        while (scrollPositionRef.current >= sequenceWidthRef.current) scrollPositionRef.current -= sequenceWidthRef.current;
        viewport.scrollLeft = scrollPositionRef.current;
        autoScrollingRef.current = false;
      }
      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
    return () => {
      preference.removeEventListener?.("change", updatePreference);
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      if (resumeTimeoutRef.current !== null) window.clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  if (!items.length) return null;

  function pauseAfterInteraction() {
    interactionUntilRef.current = performance.now() + 850;
    if (resumeTimeoutRef.current !== null) window.clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = window.setTimeout(() => { interactionUntilRef.current = 0; }, 900);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    scrollPositionRef.current = viewport.scrollLeft;
    dragRef.current = { active: true, pointerId: event.pointerId, startX: event.clientX, startScrollLeft: viewport.scrollLeft, moved: false };
    pauseAfterInteraction();
    viewport.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId || !viewport) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 5) drag.moved = true;
    if (!drag.moved) return;
    event.preventDefault();
    viewport.scrollLeft = drag.startScrollLeft - distance;
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    if (viewport?.hasPointerCapture?.(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (drag.moved) suppressClickRef.current = true;
    dragRef.current = { active: false, pointerId: null, startX: 0, startScrollLeft: 0, moved: false };
    pauseAfterInteraction();
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }

  function handleScroll() {
    if (!autoScrollingRef.current && performance.now() >= programmaticScrollUntilRef.current) {
      scrollPositionRef.current = viewportRef.current?.scrollLeft ?? scrollPositionRef.current;
      pauseAfterInteraction();
    }
  }

  function handleFocus() {
    focusedRef.current = true;
    pauseAfterInteraction();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (!next || !(next instanceof Node) || !event.currentTarget.contains(next)) {
      focusedRef.current = false;
      pauseAfterInteraction();
    }
  }

  return <div
    ref={viewportRef}
    role="region"
    aria-label={ariaLabel}
    tabIndex={0}
    onMouseEnter={() => { hoveredRef.current = true; }}
    onMouseLeave={() => { hoveredRef.current = false; pauseAfterInteraction(); }}
    onFocusCapture={handleFocus}
    onBlurCapture={handleBlur}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerEnd}
    onPointerCancel={handlePointerEnd}
    onClickCapture={handleClickCapture}
    onScroll={handleScroll}
    className={`profile-showcase-scroller ${child ? "profile-showcase-scroller--children" : ""} ${className}`.trim()}
  >
    <div className="profile-showcase-track">
      {Array.from({ length: copies }, (_, copyIndex) => <div
        key={copyIndex}
        ref={copyIndex === 0 ? sequenceRef : undefined}
        aria-hidden={copyIndex > 0 ? true : undefined}
        className="profile-showcase-sequence"
      >{items.map((item) => <ShowcaseCard
        key={`${copyIndex}-${item.id}`}
        item={item}
        decorative={copyIndex > 0}
        child={child}
      />)}</div>) }
    </div>
  </div>;
}

function ShowcaseCard({ item, decorative, child }: { item: ShowcaseCardItem; decorative: boolean; child: boolean }) {
  if (child) {
    return <button
      type="button"
      className="profile-showcase-child-card"
      tabIndex={decorative ? -1 : undefined}
      onClick={() => {
        if (item.detailHref) window.location.href = item.detailHref;
      }}
      aria-label={`View details for ${item.title}`}
    >
      {item.imageUrl
        ? <img src={item.imageUrl} alt={item.imageAlt ?? item.title} loading="lazy" decoding="async" className="profile-showcase-child-media" />
        : <div aria-hidden="true" className="profile-showcase-child-placeholder"><span>{item.kicker ?? "Detail"}</span></div>}
      <span className="profile-showcase-child-body">
        {item.kicker ? <span className="profile-showcase-child-kicker">{item.kicker.split(" · ").at(-1)}</span> : null}
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 text-sm font-bold text-slate-900">{item.title}</span>
          {item.badge ? <span className="profile-showcase-badge">{item.badge}</span> : null}
        </span>
        {item.meta ? <span className="mt-1 block text-xs font-bold text-emerald-800">{item.meta}</span> : null}
        {item.description ? <span className="mt-1 block line-clamp-3 text-left text-xs leading-5 text-slate-600">{item.description}</span> : null}
        <span className="mt-2 block text-left text-xs font-bold text-emerald-800 underline">View details <span aria-hidden="true">↗</span></span>
      </span>
    </button>;
  }

  return <article className="profile-showcase-card">
    {item.imageUrl
      ? <img src={item.imageUrl} alt={item.imageAlt ?? item.title} loading="lazy" decoding="async" className="profile-showcase-media" />
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
      {item.children?.length ? <div className="profile-showcase-children">
        <p className="profile-showcase-children-title">{item.childrenLabel ?? "Details"}</p>
        <ShowcaseRail items={item.children} ariaLabel={`${item.title} ${item.childrenLabel ?? "details"}`} child />
      </div> : null}
    </div>
  </article>;
}

type ShowcaseUploadConfig = { accept: string; label: string; helperText: string };

function ShowcaseUploadForm({ config }: { config: ShowcaseUploadConfig }) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      setFile(null);
      setMessage("Files must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }
    setFile(selected);
    setMessage("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(file ? "File selected and ready for submission." : "Choose a file before submitting.");
  }

  function clear() {
    setFile(null);
    setMessage("Selection cleared.");
  }

  return <form className="profile-showcase-upload" onSubmit={submit}>
    <div><h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{config.label}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{config.helperText}</p></div>
    <label className="profile-showcase-upload-picker"><span>Select a file</span><input type="file" accept={config.accept} onChange={selectFile} /></label>
    {file ? <p className="profile-showcase-upload-file"><strong>{file.name}</strong><span>{file.type || "Unknown type"} · {(file.size / 1024 / 1024).toFixed(2)} MB</span></p> : null}
    <div className="flex flex-wrap gap-2"><button type="submit" className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white">Submit file</button>{file ? <button type="button" onClick={clear} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">Clear</button> : null}</div>
    {message ? <p role="status" className="text-sm font-semibold text-slate-700">{message}</p> : null}
  </form>;
}

export function ShowcaseDetailView({ item, backHref, backLabel = "Back to showcase", uploadConfig }: { item: ShowcaseCardItem; backHref: string; backLabel?: string; uploadConfig?: ShowcaseUploadConfig }) {
  return <article className="profile-showcase-detail-page">
    <a href={backHref} className="profile-showcase-back-link">← {backLabel}</a>
    {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt ?? item.title} className="profile-showcase-detail-media" /> : null}
    <div className="profile-showcase-detail-body">
      {item.kicker ? <p className="profile-showcase-kicker">{item.kicker}</p> : null}
      <div className="flex items-start justify-between gap-3"><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{item.title}</h1>{item.badge ? <span className="profile-showcase-badge">{item.badge}</span> : null}</div>
      {item.meta ? <p className="mt-3 text-base font-bold text-emerald-800">{item.meta}</p> : null}
      {item.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.description}</p> : null}
      {item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-emerald-800 underline">{item.linkLabel ?? "View details"}<span aria-hidden="true">↗</span></a> : null}
      {item.children?.length ? <section className="profile-showcase-detail-children" aria-label={item.childrenLabel ?? "More details"}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{item.childrenLabel ?? "More details"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {item.children.map((child) => <article key={child.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            {child.imageUrl ? <img src={child.imageUrl} alt={child.imageAlt ?? child.title} className="mb-3 aspect-[4/3] w-full rounded-lg object-cover" /> : null}
            <div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-slate-900">{child.title}</h3>{child.badge ? <span className="profile-showcase-badge">{child.badge}</span> : null}</div>
            {child.meta ? <p className="mt-1 text-sm font-bold text-emerald-800">{child.meta}</p> : null}
            {child.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{child.description}</p> : null}
            {child.children?.length ? <div className="mt-3 border-t border-slate-200 pt-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{child.childrenLabel ?? "Options"}</p><ul className="mt-2 space-y-2">{child.children.map((nested) => <li key={nested.id} className="text-sm text-slate-700"><strong>{nested.title}</strong>{nested.meta ? ` · ${nested.meta}` : ""}{nested.description ? ` — ${nested.description}` : ""}</li>)}</ul></div> : null}
          </article>)}
        </div>
      </section> : null}
      {uploadConfig ? <ShowcaseUploadForm config={uploadConfig} /> : null}
    </div>
  </article>;
}

export default function ShowcaseTicker({ items, ariaLabel = "Showcase", className = "" }: { items: ShowcaseCardItem[]; ariaLabel?: string; className?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const parentId = new URLSearchParams(window.location.search).get("showcaseParent");
    const restoredIndex = parentId ? items.findIndex((item) => item.id === parentId) : -1;
    setActiveIndex(restoredIndex >= 0 ? restoredIndex : (current) => Math.min(current, Math.max(items.length - 1, 0)));
  }, [items]);
  if (!items.length) return null;
  const activeItem = items[activeIndex] ?? items[0];
  return <>
    <section className={`profile-showcase-parent-stage ${className}`.trim()} aria-label={ariaLabel}>
      <ShowcaseCard item={activeItem} decorative={false} child={false} />
      {items.length > 1 ? <nav className="profile-showcase-parent-navigation" aria-label={`${ariaLabel} navigation`}>
        <button type="button" onClick={() => setActiveIndex((current) => (current - 1 + items.length) % items.length)} aria-label={`Previous ${ariaLabel.toLowerCase()} item`} className="profile-showcase-parent-control">‹</button>
        <span aria-live="polite" className="profile-showcase-parent-indicator">{activeIndex + 1} / {items.length}</span>
        <button type="button" onClick={() => setActiveIndex((current) => (current + 1) % items.length)} aria-label={`Next ${ariaLabel.toLowerCase()} item`} className="profile-showcase-parent-control">›</button>
      </nav> : null}
    </section>
  </>;
}
