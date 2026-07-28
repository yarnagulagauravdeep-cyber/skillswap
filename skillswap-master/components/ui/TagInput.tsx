"use client";

import { useState, type KeyboardEvent } from "react";

export function TagInput({
  value,
  onChange,
  placeholder,
  tone = "brand",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  tone?: "brand" | "accent";
}) {
  const [draft, setDraft] = useState("");
  const chip =
    tone === "brand"
      ? "bg-brand-50 text-brand-700 border-brand-100"
      : "bg-accent-50 text-accent-700 border-accent-100";

  function add(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  }

  function remove(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div className="ss-input flex flex-wrap items-center gap-1.5 py-2">
      {value.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${chip}`}
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            className="text-current/70 hover:text-current"
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[8ch] flex-1 border-none bg-transparent p-0 text-sm outline-none placeholder:text-stone-400 focus:ring-0"
      />
    </div>
  );
}
