"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

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
  children?: ShowcaseCardItem[];
  childrenLabel?: string;
};

function ShowcaseCard({ item, decorative }: { item: ShowcaseCardItem; decorative: boolean }) {
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
        <div className="profile-showcase-child-list">
          {item.children.map((child) => <div key={child.id} className="profile-showcase-child">
            {child.imageUrl ? <img src={child.imageUrl} alt={child.imageAlt ?? child.title} loading="lazy" decoding="async" className="profile-showcase-child-media" /> : null}
            <div className="profile-showcase-child-body">
              {child.kicker ? <p className="profile-showcase-child-kicker">{child.kicker.split(" · ").at(-1)}</p> : null}
              <div className="flex items-start justify-between gap-2">
                <h4 className="min-w-0 text-sm font-bold text-slate-900">{child.title}</h4>
                {child.badge ? <span className="profile-showcase-badge">{child.badge}</span> : null}
              </div>
              {child.meta ? <p className="mt-1 text-xs font-bold text-emerald-800">{child.meta}</p> : null}
              {child.description ? <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{child.description}</p> : null}
              {child.link ? <a href={child.link} target="_blank" rel="noopener noreferrer" tabIndex={decorative ? -1 : undefined} className="mt-2 inline-flex text-xs font-bold text-emerald-800 underline">{child.linkLabel ?? "View details"}<span aria-hidden="true">↗</span></a> : null}
            </div>
          </div>)}
        </div>
      </div> : null}
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
  const sequenceWidthRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const resumeTimeoutRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const autoScrollingRef = useRef(false);
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
        viewport.scrollLeft += elapsed * 0.014;
        while (viewport.scrollLeft >= sequenceWidthRef.current) viewport.scrollLeft -= sequenceWidthRef.current;
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
    resumeTimeoutRef.current = window.setTimeout(() => {
      interactionUntilRef.current = 0;
    }, 900);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: viewport.scrollLeft,
      moved: false,
    };
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

  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }

  function handleScroll() {
    if (!autoScrollingRef.current) pauseAfterInteraction();
  }

  function handleFocus() {
    focusedRef.current = true;
    pauseAfterInteraction();
  }

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
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
    className={`profile-showcase-scroller ${className}`.trim()}
  >
    <div className="profile-showcase-track">
      {Array.from({ length: copies }, (_, copyIndex) => <div
        key={copyIndex}
        ref={copyIndex === 0 ? sequenceRef : undefined}
        aria-hidden={copyIndex > 0 ? true : undefined}
        className="profile-showcase-sequence"
      >{items.map((item) => <ShowcaseCard key={`${copyIndex}-${item.id}`} item={item} decorative={copyIndex > 0} />)}</div>)}
    </div>
  </div>;
}
