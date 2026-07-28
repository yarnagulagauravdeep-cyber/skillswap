"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import { Scheduler } from "@/components/request/Scheduler";
import { Materials } from "@/components/request/Materials";
import { ReviewForm } from "@/components/request/ReviewForm";
import { StatusBadge } from "@/components/request/StatusBadge";
import { useCurrentUser, usePoll } from "@/components/hooks";
import type {
  RequestDetail,
  Slot,
  StudentContext,
  TimetableSession,
} from "@/components/request/types";

interface DetailResponse {
  request: RequestDetail;
  timetable: TimetableSession[];
  student: StudentContext;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ss-card p-6">
      <h2 className="mb-4 text-lg font-semibold text-stone-900">{title}</h2>
      {children}
    </div>
  );
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useCurrentUser();
  const { data, refresh } = usePoll<DetailResponse>(async () => {
    const res = await fetch(`/api/requests/${id}`);
    if (!res.ok) throw new Error("failed");
    return res.json();
  }, 4000);

  const [busy, setBusy] = useState(false);
  const [meetLink, setMeetLink] = useState("");
  const [pickedSlots, setPickedSlots] = useState<Slot[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const req = data?.request;
  const isTeacher = !!user && !!req && user.id === req.teacherId;
  const isStudent = !!user && !!req && user.id === req.studentId;
  const other = req
    ? isTeacher
      ? { id: req.studentId, name: req.studentName }
      : { id: req.teacherId, name: req.teacherName }
    : null;

  const slotKey = (s: Slot) => `${s.day}|${s.time}`;
  const pickedSet = useMemo(
    () => new Set(pickedSlots.map(slotKey)),
    [pickedSlots],
  );

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    setActionError(null);
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error ?? "Something went wrong.");
      return false;
    }
    await refresh();
    return true;
  }

  function togglePick(slot: Slot) {
    setPickedSlots((cur) =>
      cur.some((s) => slotKey(s) === slotKey(slot))
        ? cur.filter((s) => slotKey(s) !== slotKey(slot))
        : [...cur, slot],
    );
  }

  if (!req || !user || !other) {
    return <p className="py-10 text-center text-stone-500">Loading exchange…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-4">
      {/* Header */}
      <div className="ss-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-600">
              {isTeacher ? "You're teaching" : "You're learning"}
            </p>
            <h1 className="text-2xl font-bold text-stone-900">{req.skill}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-stone-600">
              <Avatar name={other.name} size="sm" />
              <span>
                {isTeacher ? "Learner" : "Teacher"}: {other.name}
              </span>
              <span className="text-stone-300">·</span>
              <span>◈ {req.cost} credits</span>
            </div>
          </div>
          <StatusBadge status={req.status} />
        </div>
        {req.rulesText ? (
          <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">
            <p className="mb-1 font-medium text-stone-700">
              Rules &amp; expectations
            </p>
            {req.rulesText}
          </div>
        ) : null}
        {actionError ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {actionError}
          </p>
        ) : null}
      </div>

      {/* PENDING */}
      {req.status === "pending" && isTeacher ? (
        <>
          <Section title="About this learner">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-stone-400">Reputation</p>
                <Stars
                  value={data!.student.rating.avg}
                  count={data!.student.rating.count}
                />
              </div>
              <div>
                <p className="text-xs uppercase text-stone-400">Learning style</p>
                <p className="text-sm text-stone-700">
                  {data!.student.learningStyle || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-stone-400">
                  Skills learned before
                </p>
                <p className="text-sm text-stone-700">
                  {data!.student.pastSkills.length
                    ? data!.student.pastSkills.join(", ")
                    : "First exchange"}
                </p>
              </div>
            </div>
          </Section>
          <Section title="Accept & propose a schedule">
            <Scheduler
              busy={busy}
              onAccept={(input) => act({ action: "accept", ...input })}
            />
            <div className="mt-4 border-t border-[color:var(--border)] pt-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => act({ action: "reject" })}
              >
                Decline this request
              </Button>
            </div>
          </Section>
        </>
      ) : null}

      {req.status === "pending" && isStudent ? (
        <Section title="Request sent">
          <p className="text-sm text-stone-600">
            Waiting for {req.teacherName} to review your request and propose
            times. This page updates automatically.
          </p>
        </Section>
      ) : null}

      {/* ACCEPTED — student picks slots */}
      {req.status === "accepted" ? (
        <Section title="Proposed times">
          <p className="mb-3 text-sm text-stone-600">
            {req.teacherName} can teach at these weekly times (
            {req.sessionLenMin} min each, wrapping up by{" "}
            {req.expectedEnd || "—"}).
          </p>
          {isStudent ? (
            <>
              <div className="flex flex-wrap gap-2">
                {req.teacherAvail.map((s) => {
                  const on = pickedSet.has(slotKey(s));
                  return (
                    <button
                      key={slotKey(s)}
                      onClick={() => togglePick(s)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        on
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-[color:var(--border)] bg-white text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {s.day} {s.time}
                    </button>
                  );
                })}
              </div>
              <Button
                className="mt-4"
                disabled={busy || pickedSlots.length === 0}
                onClick={() => act({ action: "confirm", slots: pickedSlots })}
              >
                {busy ? "Confirming…" : "Confirm these times"}
              </Button>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              {req.teacherAvail.map((s) => (
                <Badge key={slotKey(s)} tone="neutral">
                  {s.day} {s.time}
                </Badge>
              ))}
              <p className="mt-3 w-full text-sm text-stone-500">
                Waiting for {req.studentName} to pick times.
              </p>
            </div>
          )}
        </Section>
      ) : null}

      {/* CONFIRMED / COMPLETED — timetable, class, materials */}
      {(req.status === "confirmed" || req.status === "completed") &&
      data!.timetable.length ? (
        <Section title="Timetable">
          <ul className="divide-y divide-[color:var(--border)]">
            {data!.timetable.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="text-sm text-stone-700">
                  {fmtDateTime(t.startsAt)}
                </span>
                <span className="text-xs text-stone-400">
                  {req.sessionLenMin} min
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {req.status === "confirmed" ? (
        <Section title="Live class">
          {isTeacher ? (
            <div className="space-y-3">
              <p className="text-sm text-stone-600">
                Share a meeting link so {req.studentName} can join.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  placeholder={req.meetLink || "https://meet.google.com/…"}
                  className="ss-input flex-1"
                />
                <Button
                  size="sm"
                  disabled={busy || !meetLink}
                  onClick={() =>
                    act({ action: "meetlink", meetLink }).then(
                      (ok) => ok && setMeetLink(""),
                    )
                  }
                >
                  {req.meetLink ? "Update link" : "Share link"}
                </Button>
              </div>
              {req.meetLink ? (
                <p className="text-sm text-emerald-600">
                  Current link shared: {req.meetLink}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                disabled={!req.meetLink}
                onClick={() => window.open(req.meetLink, "_blank")}
              >
                {req.meetLink ? "Join class" : "Waiting for link…"}
              </Button>
              {!req.meetLink ? (
                <p className="text-sm text-stone-500">
                  The join button activates once {req.teacherName} shares the
                  meeting link.
                </p>
              ) : null}
            </div>
          )}
        </Section>
      ) : null}

      {req.status === "confirmed" || req.status === "completed" ? (
        <Section title="Lesson materials">
          <Materials
            requestId={req.id}
            role={isTeacher ? "teacher" : "student"}
          />
        </Section>
      ) : null}

      {/* Complete */}
      {req.status === "confirmed" ? (
        <Section title="Wrap up">
          <p className="mb-3 text-sm text-stone-600">
            When the course is finished, mark it complete to release{" "}
            <span className="font-medium text-brand-600">◈ {req.cost}</span>{" "}
            from {req.studentName} to {req.teacherName}.
          </p>
          <Button
            disabled={busy}
            onClick={() => act({ action: "complete" })}
          >
            Mark exchange complete
          </Button>
        </Section>
      ) : null}

      {req.status === "completed" ? (
        <Section title="Exchange complete 🎉">
          <p className="text-sm text-stone-600">
            ◈ {req.cost} credits moved from {req.studentName} to{" "}
            {req.teacherName}. Nice work!
          </p>
        </Section>
      ) : null}

      {/* Reviews — available once scheduling has begun */}
      {req.status === "confirmed" || req.status === "completed" ? (
        <Section title={`Review ${other.name}`}>
          <ReviewForm
            revieweeId={other.id}
            revieweeName={other.name}
            requestId={req.id}
            onDone={refresh}
          />
        </Section>
      ) : null}

      {req.status === "rejected" ? (
        <Section title="Request declined">
          <p className="text-sm text-stone-600">
            This request was declined. No credits changed hands.
          </p>
        </Section>
      ) : null}
    </div>
  );
}
