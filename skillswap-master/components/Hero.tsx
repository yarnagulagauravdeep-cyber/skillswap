"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ButtonLink } from "@/components/ui/Button";
import { LiveSwap } from "@/components/LiveSwap";

const ConstellationBg = dynamic(
  () => import("@/components/ConstellationBg").then((m) => m.ConstellationBg),
  { ssr: false },
);

export function Hero() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      gsap.set(el, { opacity: 1 });
      if (reduced) return;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".h-brand", { y: -12, opacity: 0, duration: 0.5 })
        .from(".h-eyebrow", { y: 16, opacity: 0, duration: 0.5 }, "-=0.2")
        .from(
          ".h-line",
          { yPercent: 120, duration: 0.85, stagger: 0.12 },
          "-=0.15",
        )
        .from(".h-sub", { y: 14, opacity: 0, duration: 0.5 }, "-=0.35")
        .from(
          ".h-cta",
          { y: 12, opacity: 0, duration: 0.5, stagger: 0.08 },
          "-=0.3",
        )
        .from(".h-note", { opacity: 0, duration: 0.4 }, "-=0.2")
        .from(".h-card", { y: 34, opacity: 0, duration: 0.8 }, "-=0.7");
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="opacity-0">
      {/* Fills the viewport (no navbar when logged out) so the hero fits one screen. */}
      <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col">
        <ConstellationBg />

        <div className="h-brand relative z-10 flex items-center gap-2.5 pt-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 font-display text-base font-bold text-white shadow-sm">
            S
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-stone-900">
            Skill<span className="text-brand-600">Swap</span>
          </span>
        </div>

        <div className="relative z-10 grid flex-1 items-center gap-8 py-2 lg:grid-cols-[1.06fr_1fr] lg:gap-12">
          {/* Left — thesis */}
          <div>
            <span className="h-eyebrow inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent-700 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
              Trade time, not money
            </span>

            <h1 className="mt-6 font-display text-5xl font-bold leading-[0.98] tracking-tight text-stone-900 sm:text-6xl lg:text-7xl">
              <span className="block overflow-hidden pb-1">
                <span className="h-line block">
                  Teach what you{" "}
                  <em className="not-italic text-accent-600">know.</em>
                </span>
              </span>
              <span className="block overflow-hidden pb-1">
                <span className="h-line block">
                  Learn what you{" "}
                  <em className="not-italic text-brand-600">love.</em>
                </span>
              </span>
            </h1>

            <p className="h-sub mt-6 max-w-md text-lg leading-relaxed text-stone-600">
              SkillSwap pairs you with people who want what you can teach — and
              can teach what you want. Every exchange is settled in community
              credits, never cash.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="h-cta inline-block">
                <ButtonLink href="/signup" size="lg">
                  Start swapping — free
                </ButtonLink>
              </span>
              <span className="h-cta inline-block">
                <ButtonLink href="/login" variant="secondary" size="lg">
                  Log in
                </ButtonLink>
              </span>
            </div>

            <p className="h-note mt-6 text-sm text-stone-400">
              Peek at the demo:{" "}
              <span className="font-medium text-stone-500">priya@demo.dev</span>{" "}
              or{" "}
              <span className="font-medium text-stone-500">arjun@demo.dev</span>{" "}
              · password{" "}
              <span className="font-medium text-stone-500">password</span>
            </p>
          </div>

          {/* Right — the signature: real, live exchanges */}
          <div className="h-card relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-brand-200/50 via-transparent to-accent-200/50 blur-2xl"
            />
            <LiveSwap />
          </div>
        </div>
      </section>
    </div>
  );
}
