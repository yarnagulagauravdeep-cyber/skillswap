import { Badge } from "@/components/ui/Badge";
import type { RequestStatus } from "./types";

const MAP: Record<
  RequestStatus,
  { label: string; tone: "brand" | "accent" | "neutral" | "green" | "amber" | "red" }
> = {
  pending: { label: "Pending", tone: "amber" },
  accepted: { label: "Scheduling", tone: "accent" },
  confirmed: { label: "Confirmed", tone: "brand" },
  completed: { label: "Completed", tone: "green" },
  rejected: { label: "Declined", tone: "red" },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const s = MAP[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
