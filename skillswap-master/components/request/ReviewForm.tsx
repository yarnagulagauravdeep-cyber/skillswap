"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ReviewForm({
  revieweeId,
  revieweeName,
  requestId,
  onDone,
}: {
  revieweeId: number;
  revieweeName: string;
  requestId?: number;
  onDone?: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revieweeId, rating, text, requestId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not submit review.");
      return;
    }
    setDone(true);
    onDone?.();
  }

  if (done)
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        Thanks — your review of {revieweeName} was recorded.
      </p>
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className={`text-2xl transition ${
              n <= (hover || rating) ? "text-amber-500" : "text-stone-300"
            }`}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Share how it went with ${revieweeName}…`}
        className="ss-input min-h-[80px] resize-y"
      />
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <Button size="sm" onClick={submit} disabled={busy}>
        {busy ? "Submitting…" : "Submit review"}
      </Button>
    </div>
  );
}
