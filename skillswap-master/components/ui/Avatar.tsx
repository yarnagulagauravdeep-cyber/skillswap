function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Deterministic warm-ish gradient per name.
const palettes = [
  "from-brand-400 to-brand-600",
  "from-accent-400 to-accent-600",
  "from-rose-400 to-rose-600",
  "from-amber-400 to-orange-600",
  "from-violet-400 to-violet-600",
  "from-emerald-400 to-teal-600",
];

function paletteFor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return palettes[sum % palettes.length];
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: keyof typeof sizes;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ${paletteFor(name)} ${sizes[size]}`}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
