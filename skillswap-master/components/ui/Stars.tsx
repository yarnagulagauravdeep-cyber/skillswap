export function Stars({
  value,
  count,
  size = "sm",
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const rounded = Math.round(value);
  const cls = size === "md" ? "text-base" : "text-sm";
  return (
    <span className={`inline-flex items-center gap-1 ${cls}`}>
      <span className="text-amber-500" aria-hidden>
        {"★".repeat(rounded)}
        <span className="text-stone-300">{"★".repeat(5 - rounded)}</span>
      </span>
      {count !== undefined ? (
        <span className="text-xs text-stone-400">
          {value.toFixed(1)} ({count})
        </span>
      ) : null}
    </span>
  );
}
