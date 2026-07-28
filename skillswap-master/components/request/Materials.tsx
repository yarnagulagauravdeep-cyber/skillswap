"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Material } from "./types";

function fmtDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function Materials({
  requestId,
  role,
}: {
  requestId: number;
  role: "teacher" | "student";
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const activeRef = useRef<number | null>(null);
  activeRef.current = activeId;

  const load = useCallback(async () => {
    const res = await fetch(`/api/materials?requestId=${requestId}`);
    if (res.ok) {
      const data = await res.json();
      setMaterials(data.materials ?? []);
    }
  }, [requestId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const track = useCallback((id: number, action: "open" | "close") => {
    return fetch(`/api/materials/${id}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
      keepalive: action === "close",
    });
  }, []);

  // Close the timer if the tab is closed while a PDF is open.
  useEffect(() => {
    function onUnload() {
      if (activeRef.current != null) track(activeRef.current, "close");
    }
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (activeRef.current != null) track(activeRef.current, "close");
    };
  }, [track]);

  async function openPdf(id: number) {
    await track(id, "open");
    setActiveId(id);
  }
  async function closePdf() {
    if (activeId != null) await track(activeId, "close");
    setActiveId(null);
    load();
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("requestId", String(requestId));
    form.set("file", file);
    const res = await fetch("/api/materials", { method: "POST", body: form });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed.");
      return;
    }
    setFile(null);
    load();
  }

  return (
    <div className="space-y-4">
      {role === "teacher" ? (
        <div className="rounded-xl border border-dashed border-[color:var(--border)] p-4">
          <p className="text-sm font-medium text-stone-700">
            Share a lesson PDF
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700"
            />
            <Button size="sm" onClick={upload} disabled={!file || busy}>
              {busy ? "Uploading…" : "Upload"}
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
        </div>
      ) : null}

      {materials.length === 0 ? (
        <p className="text-sm text-stone-500">
          {role === "teacher"
            ? "No materials shared yet."
            : "Your teacher hasn't shared any materials yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-800">
                  📄 {m.filename}
                </p>
                <p className="text-xs text-stone-400">
                  {role === "teacher"
                    ? `Student reading time: ${fmtDuration(m.totalSeconds)}${m.isOpen ? " (reading now…)" : ""}`
                    : `You've spent ${fmtDuration(m.totalSeconds)} on this`}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => openPdf(m.id)}>
                Open
              </Button>
            </li>
          ))}
        </ul>
      )}

      {activeId != null ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 p-4">
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-2">
              <span className="text-sm font-medium text-stone-700">
                Reading — timer running
              </span>
              <Button size="sm" onClick={closePdf}>
                Close &amp; save time
              </Button>
            </div>
            <iframe
              src={`/api/materials/${activeId}/file`}
              className="h-full w-full flex-1"
              title="Lesson PDF"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
