"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { TagInput } from "@/components/ui/TagInput";

const STYLES = [
  "Visual",
  "Hands-on / Project-based",
  "Reading / Writing",
  "Auditory / Discussion",
  "Step-by-step",
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    background: "",
    education: "",
    teachingStyle: STYLES[0],
    learningStyle: STYLES[0],
  });
  const [teachTags, setTeachTags] = useState<string[]>([]);
  const [learnTags, setLearnTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, teachTags, learnTags }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Sign up failed.");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="ss-card p-7">
        <h1 className="text-2xl font-bold text-stone-900">Join SkillSwap</h1>
        <p className="mt-1 text-sm text-stone-500">
          Tell us a bit about yourself so we can match you well. You start with{" "}
          <span className="font-semibold text-brand-600">5 credits</span>.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Jordan Lee"
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
                required
              />
            </Field>
          </div>

          <Field label="Password" hint="At least 6 characters.">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Background">
              <Input
                value={form.background}
                onChange={(e) => set("background", e.target.value)}
                placeholder="e.g. Self-taught designer"
              />
            </Field>
            <Field label="Education">
              <Input
                value={form.education}
                onChange={(e) => set("education", e.target.value)}
                placeholder="e.g. B.A. Communications"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="How you teach best">
              <Select
                value={form.teachingStyle}
                onChange={(e) => set("teachingStyle", e.target.value)}
              >
                {STYLES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="How you learn best">
              <Select
                value={form.learningStyle}
                onChange={(e) => set("learningStyle", e.target.value)}
              >
                {STYLES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Skills you can teach"
            hint="Press Enter or comma to add each skill."
          >
            <TagInput
              value={teachTags}
              onChange={setTeachTags}
              placeholder="e.g. Guitar, Python, Baking"
              tone="brand"
            />
          </Field>

          <Field
            label="Skills you want to learn"
            hint="Shown on your profile so teachers know what you're after."
          >
            <TagInput
              value={learnTags}
              onChange={setLearnTags}
              placeholder="e.g. Public Speaking, Chess"
              tone="accent"
            />
          </Field>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-stone-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
