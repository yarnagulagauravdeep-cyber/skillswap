"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { WEEKDAYS, type Slot } from "./types";

export function Scheduler({
  onAccept,
  busy,
}: {
  onAccept: (input: {
    teacherAvail: Slot[];
    sessionLenMin: number;
    expectedEnd: string;
    rulesText: string;
  }) => void;
  busy: boolean;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [day, setDay] = useState("Mon");
  const [time, setTime] = useState("18:00");
  const [sessionLenMin, setSessionLenMin] = useState(60);
  const [expectedEnd, setExpectedEnd] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addSlot() {
    if (slots.some((s) => s.day === day && s.time === time)) return;
    setSlots((s) => [...s, { day, time }]);
  }
  function removeSlot(slot: Slot) {
    setSlots((s) => s.filter((x) => !(x.day === slot.day && x.time === slot.time)));
  }

  function submit() {
    setError(null);
    if (!slots.length) return setError("Add at least one weekly time you can teach.");
    if (!expectedEnd) return setError("Pick an expected completion date.");
    onAccept({ teacherAvail: slots, sessionLenMin, expectedEnd, rulesText });
  }

  return (
    <div className="space-y-5">
      <div>
        <span className="ss-label">Weekly times you can teach</span>
        <div className="flex flex-wrap items-end gap-2">
          <Select value={day} onChange={(e) => setDay(e.target.value)} className="w-auto">
            {WEEKDAYS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="ss-input w-auto"
          />
          <Button type="button" variant="secondary" size="sm" onClick={addSlot}>
            + Add slot
          </Button>
        </div>
        {slots.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {slots.map((s) => (
              <span
                key={`${s.day}-${s.time}`}
                className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
              >
                {s.day} {s.time}
                <button type="button" onClick={() => removeSlot(s)} aria-label="Remove">
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Session length">
          <Select
            value={String(sessionLenMin)}
            onChange={(e) => setSessionLenMin(Number(e.target.value))}
          >
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
          </Select>
        </Field>
        <Field label="Expected completion by">
          <input
            type="date"
            value={expectedEnd}
            onChange={(e) => setExpectedEnd(e.target.value)}
            className="ss-input"
          />
        </Field>
      </div>

      <Field label="Rules, prerequisites & expectations">
        <Textarea
          value={rulesText}
          onChange={(e) => setRulesText(e.target.value)}
          placeholder="e.g. Come prepared with a laptop; complete exercises between sessions…"
        />
      </Field>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <Button onClick={submit} disabled={busy}>
        {busy ? "Confirming…" : "Accept & propose schedule"}
      </Button>
    </div>
  );
}
