"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PersonaTile from "./PersonaTile";
import { focusRing } from "./site-ui";

export type PersonaCarouselItem = {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  status: "live" | "waitlist";
};

type Props = {
  items: PersonaCarouselItem[];
};

export default function PersonaCarousel({ items }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < maxScroll - 4);
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;
    let closest = 0;
    let closestDelta = Number.POSITIVE_INFINITY;
    const scrollerLeft = el.getBoundingClientRect().left;
    children.forEach((child, i) => {
      const delta = Math.abs(child.getBoundingClientRect().left - scrollerLeft);
      if (delta < closestDelta) {
        closestDelta = delta;
        closest = i;
      }
    });
    setActiveIndex(closest);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    const onScroll = () => updateEdges();
    el.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => updateEdges();
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [updateEdges]);

  const scrollToIndex = useCallback(
    (idx: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const children = Array.from(el.children) as HTMLElement[];
      const target = children[Math.max(0, Math.min(items.length - 1, idx))];
      if (!target) return;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({
        left: target.offsetLeft - el.offsetLeft,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    },
    [items.length],
  );

  const onPrev = () => scrollToIndex(activeIndex - 1);
  const onNext = () => scrollToIndex(activeIndex + 1);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onPrev();
    }
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Choose your path — persona options"
        className={`flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${focusRing("rounded-2xl")}`}
      >
        {items.map((p) => (
          <div
            key={p.href}
            className="w-[85%] flex-none snap-start sm:w-[60%] md:w-[45%] lg:w-[calc((100%-2rem)/3.25)]"
          >
            <PersonaTile {...p} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            aria-label="Previous persona"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/80 transition-colors hover:border-[#C9A961]/60 hover:text-[#C9A961] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-white/80 ${focusRing("rounded-full")}`}
          >
            <span aria-hidden>←</span>
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            aria-label="Next persona"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/80 transition-colors hover:border-[#C9A961]/60 hover:text-[#C9A961] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-white/80 ${focusRing("rounded-full")}`}
          >
            <span aria-hidden>→</span>
          </button>
        </div>

        <div className="flex items-center gap-2" role="tablist" aria-label="Persona slides">
          {items.map((p, i) => (
            <button
              key={p.href}
              type="button"
              role="tab"
              aria-selected={activeIndex === i}
              aria-label={`Go to ${p.eyebrow}`}
              onClick={() => scrollToIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                activeIndex === i
                  ? "w-6 bg-[#C9A961]"
                  : "w-1.5 bg-white/25 hover:bg-white/40"
              } ${focusRing("rounded-full")}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
