"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";

export default function TeachPage() {
  const router = useRouter();
  const [skill, setSkill] = useState("");
  const [cost, setCost] = useState(2);
  const [estDays, setEstDays] = useState(5);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill, cost, estDays, description }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create course.");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl py-4">
      <p className="text-sm font-medium text-brand-600">Teach a skill</p>
      <h1 className="text-2xl font-bold text-stone-900">List a new course</h1>
      <p className="mt-1 text-sm text-stone-500">
        Learners spend credits to take it — and you earn them.
      </p>

      <form onSubmit={submit} className="ss-card mt-6 space-y-5 p-6">
        <Field label="Skill / course name">
          <Input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="e.g. Intro to Watercolour"
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Credits to learn" hint="Between 1 and 4 credits.">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCost(n)}
                  className={`h-11 flex-1 rounded-xl border text-sm font-semibold transition ${
                    cost === n
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-[color:var(--border)] bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  ◈ {n}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Estimated length (days)"
            hint="Assuming about 1 hour per day."
          >
            <Input
              type="number"
              min={1}
              max={60}
              value={estDays}
              onChange={(e) => setEstDays(Number(e.target.value))}
              required
            />
          </Field>
        </div>

        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will learners be able to do by the end? Any prerequisites?"
          />
        </Field>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Publishing…" : "Publish course"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => router.push("/home")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
