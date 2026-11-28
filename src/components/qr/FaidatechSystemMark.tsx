type FaidatechSystemMarkProps = {
  size?: number;
  theme?: "light" | "dark";
  className?: string;
  title?: string;
  animate?: boolean;
};

export default function FaidatechSystemMark({
  size = 48,
  theme = "light",
  className,
  title,
  animate = false,
}: FaidatechSystemMarkProps) {
  const colors = theme === "dark"
    ? { surface: "#101C2C", outline: "#294056", blue: "#67E8F9", purple: "#C4B5FD", green: "#6EE7B7", glow: "rgba(103, 232, 249, .38)" }
    : { surface: "#FFFFFF", outline: "#DCE5EF", blue: "#2563EB", purple: "#7C3AED", green: "#059669", glow: "rgba(37, 99, 235, .3)" };

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
      {animate ? <style>{`
        @keyframes faidatech-mark-reveal {
          0% { opacity: 0; transform: scale(.82); filter: drop-shadow(0 0 0 ${colors.glow}); }
          68% { opacity: 1; transform: scale(1.045); filter: drop-shadow(0 0 9px ${colors.glow}); }
          100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 2px ${colors.glow}); }
        }
        .faidatech-mark-motion { transform-box: fill-box; transform-origin: center; animation: faidatech-mark-reveal 1.35s cubic-bezier(.2,.75,.25,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .faidatech-mark-motion { animation: none; }
        }
      `}</style> : null}
      <g className={animate ? "faidatech-mark-motion" : undefined}>
        <rect x="2.75" y="2.75" width="50.5" height="50.5" rx="17" fill={colors.surface} stroke={colors.outline} strokeWidth="1.5" />
        <path d="M20 12h-4a4 4 0 0 0-4 4v4" stroke={colors.blue} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M36 12h4a4 4 0 0 1 4 4v4" stroke={colors.purple} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M12 36v4a4 4 0 0 0 4 4h4" stroke={colors.green} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M36 44h4a4 4 0 0 0 4-4v-4" stroke={colors.blue} strokeWidth="3.5" strokeLinecap="round" />
        <path d="m16.5 37.5 7.5-7.5 5 4 10.5-12" stroke={colors.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M33.5 22h6v6" stroke={colors.purple} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
