interface MyPedalsSectionHeaderProps {
  title: string;
  count: number;
  tone?: "green" | "blue" | "gray";
}

const toneClass: Record<NonNullable<MyPedalsSectionHeaderProps["tone"]>, string> =
  {
    green: "bg-primary/10 text-primary",
    blue: "bg-blue-50 text-blue-700",
    gray: "bg-gray-100 text-text-secondary",
  };

export function MyPedalsSectionHeader({
  title,
  count,
  tone = "gray",
}: MyPedalsSectionHeaderProps) {
  const label = count === 1 ? "1 pedal" : `${count} pedais`;

  return (
    <div className="flex items-center gap-2">
      <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">
        {title}
      </h2>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass[tone]}`}
      >
        {label}
      </span>
    </div>
  );
}
