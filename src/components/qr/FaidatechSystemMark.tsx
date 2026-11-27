type FaidatechSystemMarkProps = {
  size?: number;
  theme?: "light" | "dark";
  className?: string;
  title?: string;
};

export default function FaidatechSystemMark({
  size = 48,
  theme = "light",
  className,
  title,
}: FaidatechSystemMarkProps) {
  const colors = theme === "dark"
    ? { surface: "#101C2C", outline: "#294056", blue: "#67E8F9", purple: "#C4B5FD", green: "#6EE7B7" }
    : { surface: "#FFFFFF", outline: "#DCE5EF", blue: "#2563EB", purple: "#7C3AED", green: "#059669" };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <rect x="2.75" y="2.75" width="50.5" height="50.5" rx="17" fill={colors.surface} stroke={colors.outline} strokeWidth="1.5" />
      <path d="M20 12h-4a4 4 0 0 0-4 4v4" stroke={colors.blue} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M36 12h4a4 4 0 0 1 4 4v4" stroke={colors.purple} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12 36v4a4 4 0 0 0 4 4h4" stroke={colors.green} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M36 44h4a4 4 0 0 0 4-4v-4" stroke={colors.blue} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M17.5 28h6l4.5-7 5 14 4.5-7h2" stroke={colors.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="28" cy="28" r="3.1" fill={colors.surface} stroke={colors.purple} strokeWidth="2.2" />
    </svg>
  );
}
