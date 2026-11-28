type FaidatechSystemMarkProps = {
  /** Rendered logo height in pixels; the wordmark keeps its wide brand ratio. */
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
    ? { navy: "#8CC7FF", green: "#8FD49A", arrowBlue: "#75B8F5", arrowGreen: "#83CF91" }
    : { navy: "#143C64", green: "#3F7D4C", arrowBlue: "#143C64", arrowGreen: "#3F7D4C" };

  return (
    <svg
      width={size * (661 / 213)}
      height={size}
      viewBox="0 0 661 213"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {animate ? <style>{`
        @keyframes faidatech-wordmark-arrive {
          0% { opacity: 0; transform: scale(.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes faidatech-arrow-arrive {
          0% { opacity: 0; transform: scale(.32); }
          100% { opacity: 1; transform: scale(1); }
        }
        .faidatech-wordmark-motion {
          transform-box: fill-box;
          transform-origin: center;
          animation: faidatech-wordmark-arrive 760ms cubic-bezier(.2,.75,.25,1) both;
        }
        .faidatech-arrow-motion {
          transform-box: fill-box;
          transform-origin: left bottom;
          animation: faidatech-arrow-arrive 980ms cubic-bezier(.2,.75,.25,1) 180ms both;
        }
        @media (prefers-reduced-motion: reduce) {
          .faidatech-wordmark-motion,
          .faidatech-arrow-motion {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style> : null}

      <g className={animate ? "faidatech-wordmark-motion" : undefined}>
        <text
          x="75"
          y="145"
          fill={colors.navy}
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="112"
          fontWeight="600"
          letterSpacing="-3"
          textLength="213"
          lengthAdjust="spacingAndGlyphs"
        >Faid</text>

        <text
          x="278"
          y="145"
          fill={colors.green}
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="112"
          fontWeight="600"
          letterSpacing="-2"
          textLength="77"
          lengthAdjust="spacingAndGlyphs"
        >A</text>

        <text
          x="369"
          y="145"
          fill={colors.green}
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="112"
          fontWeight="600"
          letterSpacing="-3"
          textLength="216"
          lengthAdjust="spacingAndGlyphs"
        >Tech</text>
      </g>

      <g className={animate ? "faidatech-arrow-motion" : undefined}>
        <path
          d="M141 156 C161 182 189 196 216 195 C257 193 287 160 309 120 C320 99 329 73 338 39 L316 49 L332 14 L354 75 L337 61 C318 115 297 157 270 184 C242 212 207 218 177 202 C160 193 148 176 141 156 Z"
          fill={colors.arrowGreen}
        />
        <path
          d="M142 156 C165 180 189 189 214 187 C249 184 276 151 298 110 C309 89 319 62 328 38 L337 57 C318 111 295 152 268 179 C241 204 209 209 180 194 C163 185 150 169 142 156 Z"
          fill={colors.arrowBlue}
        />
        <path d="M281 53 L332 14 L319 49 L300 68 Z" fill={colors.arrowBlue} />
      </g>
    </svg>
  );
}
