import { useId } from "react";

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
  const arrowMaskId = `faidatech-arrow-mask-${useId().replace(/:/g, "")}`;
  const colors = theme === "dark"
    ? { navy: "#8CC7FF", green: "#8FD49A", arrowBlue: "#75B8F5", arrowGreen: "#83CF91" }
    : { navy: "#143C64", green: "#3F7D4C", arrowBlue: "#143C64", arrowGreen: "#3F7D4C" };
  const arrowSweepPath = "M141 156 C158 181 179 193 204 195 C239 198 269 168 293 127 C306 105 316 80 325 54 C329 42 332 28 332 14";

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
        @keyframes faidatech-wordmark-enter {
          0% { opacity: 0; transform: translateY(7px); }
          72% { opacity: 1; transform: translateY(-1px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes faidatech-arrow-sweep {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes faidatech-logo-settle {
          0% { transform: scale(1); }
          62% { transform: scale(1.012); }
          100% { transform: scale(1); }
        }
        .faidatech-logo-settle {
          transform-box: fill-box;
          transform-origin: center;
          animation: faidatech-logo-settle 360ms cubic-bezier(.2,.75,.25,1) 1.68s both;
        }
        .faidatech-wordmark-enter {
          transform-box: fill-box;
          transform-origin: center;
          animation: faidatech-wordmark-enter 460ms cubic-bezier(.2,.75,.25,1) both;
        }
        .faidatech-arrow-draw {
          stroke-dasharray: 1;
          animation: faidatech-arrow-sweep 1.1s cubic-bezier(.2,.75,.25,1) 460ms both;
        }
        @media (prefers-reduced-motion: reduce) {
          .faidatech-logo-settle,
          .faidatech-wordmark-enter {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .faidatech-arrow-draw {
            animation: none;
            stroke-dashoffset: 0;
          }
        }
      `}</style> : null}

      <g className={animate ? "faidatech-logo-settle" : undefined}>
        <g className={animate ? "faidatech-wordmark-enter" : undefined}>
          <text
            x="75"
            y="145"
            fill={colors.navy}
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="112"
            fontWeight="600"
            letterSpacing="-3"
            textLength="203"
            lengthAdjust="spacingAndGlyphs"
          >FaiD</text>

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

        <mask id={arrowMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="661" height="213">
          <rect width="661" height="213" fill="black" />
          <path
            d={arrowSweepPath}
            fill="none"
            stroke="white"
            strokeWidth="88"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={animate ? 1 : undefined}
            strokeDasharray={animate ? "1" : undefined}
            strokeDashoffset={animate ? "1" : "0"}
            className={animate ? "faidatech-arrow-draw" : undefined}
          />
        </mask>

        <g mask={`url(#${arrowMaskId})`}>
          {/* The green outer ribbon and blue inner ribbon share a curved seam without overlap. */}
          <path
            d="M141 156 C160 183 183 197 210 198 C249 200 282 169 306 128 C320 104 330 78 339 49 L325 54 C316 80 306 105 293 127 C269 168 239 198 204 195 C179 193 158 181 141 156 Z"
            fill={colors.arrowGreen}
          />
          <path
            d="M141 156 C158 181 179 193 204 195 C239 198 269 168 293 127 C306 105 316 80 325 54 L312 58 C303 80 293 104 280 126 C256 166 230 194 198 192 C174 190 156 178 141 156 Z"
            fill={colors.arrowBlue}
          />
          {/* The head keeps the same side-by-side split as the widening shaft. */}
          <path d="M332 14 L354 75 L335 60 L309 58 L325 54 Z" fill={colors.arrowGreen} />
          <path d="M332 14 L281 53 L309 58 L325 54 Z" fill={colors.arrowBlue} />
        </g>
      </g>
    </svg>
  );
}
