"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";

interface Swap {
  skill: string;
  cost: number;
  status: "confirmed" | "completed";
  teacherName: string;
  studentName: string;
  updatedAt: string | null;
}

const SAMPLE: Swap = {
  teacherName: "Priya Sharma",
  studentName: "Arjun Rao",
  skill: "React",
  cost: 3,
  status: "confirmed",
  updatedAt: null,
};

function ago(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - Date.parse(iso.replace(" ", "T") + "Z");
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Party({
  name,
  action,
  skill,
  cost,
  tone,
}: {
  name: string;
  action: string;
  skill: string;
  cost?: number;
  tone: "accent" | "brand";
}) {
  const chip =
    tone === "accent"
      ? "bg-accent-50 text-accent-700"
      : "bg-brand-50 text-brand-700";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-white p-3">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-900">{name}</p>
        <p className="text-xs text-stone-400">{action}</p>
      </div>
      <span className={`max-w-[9rem] truncate rounded-lg px-2.5 py-1 text-xs font-medium ${chip}`}>
        {skill}
      </span>
      {cost != null ? (
        <span className="whitespace-nowrap text-sm font-semibold text-stone-500">
          ◈ {cost}
        </span>
      ) : null}
    </div>
  );
}

export function LiveSwap() {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [i, setI] = useState(0);

  // Load + keep fresh so new exchanges appear without a reload.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/swaps/recent");
        const data = await res.json();
        if (active) setSwaps(data.swaps ?? []);
      } catch {
        /* keep whatever we have */
      }
    };
    load();
    const t = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  // Cycle through multiple recent swaps.
  useEffect(() => {
    if (swaps.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % swaps.length), 5000);
    return () => clearInterval(t);
  }, [swaps.length]);

  const live = swaps.length > 0;
  const swap = live ? swaps[i % swaps.length] : SAMPLE;

  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-white/80 p-5 shadow-2xl shadow-brand-900/10 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
          {live ? "Live swap" : "How a swap works"}
        </p>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${live ? "animate-pulse" : ""}`}
          />
          {live ? "just happened" : "sample"}
        </span>
      </div>

      <div key={live ? `${i}-${swap.updatedAt}` : "sample"} className="ss-rise">
        <Party
          name={swap.teacherName}
          action="teaches"
          skill={swap.skill}
          cost={swap.cost}
          tone="accent"
        />

        <div className="relative flex items-center justify-center py-2">
          <div className="absolute inset-x-8 top-1/2 h-px bg-[color:var(--border)]" />
          <span className="ss-float relative grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-lg text-white shadow-lg shadow-brand-500/30">
            ⇅
          </span>
        </div>

        <Party
          name={swap.studentName}
          action="is learning"
          skill={swap.skill}
          tone="brand"
        />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
        <span className="text-xs font-semibold text-emerald-600">
          {swap.status === "completed" ? "Completed 🎉" : "Confirmed ✓"}
        </span>
        <div className="flex items-center gap-2">
          {live && swaps.length > 1 ? (
            <span className="flex items-center gap-1">
              {swaps.map((_, n) => (
                <span
                  key={n}
                  className={`h-1.5 w-1.5 rounded-full transition ${
                    n === i % swaps.length ? "bg-brand-500" : "bg-stone-300"
                  }`}
                />
              ))}
            </span>
          ) : null}
          <span className="text-xs text-stone-400">
            {live ? ago(swap.updatedAt) : "sample exchange"}
          </span>
        </div>
      </div>
    </div>
  );
}
