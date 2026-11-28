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
          from { stroke-dashoffset: 400; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes faidatech-arrowhead-enter {
          0% { opacity: 0; transform: scale(.88); }
          100% { opacity: 1; transform: scale(1); }
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
          stroke-dasharray: 400;
          animation: faidatech-arrow-sweep 1.1s cubic-bezier(.2,.75,.25,1) 420ms both;
        }
        .faidatech-arrowhead-enter {
          transform-box: fill-box;
          transform-origin: center;
          animation: faidatech-arrowhead-enter 260ms cubic-bezier(.2,.75,.25,1) 1.38s both;
        }
        @media (prefers-reduced-motion: reduce) {
          .faidatech-logo-settle,
          .faidatech-wordmark-enter,
          .faidatech-arrowhead-enter {
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
            textLength="213"
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
            d="M141 156 C169 187 202 198 231 187 C273 171 303 126 334 51"
            fill="none"
            stroke="white"
            strokeWidth="58"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={animate ? "400" : undefined}
            strokeDashoffset={animate ? "400" : "0"}
            className={animate ? "faidatech-arrow-draw" : undefined}
          />
        </mask>

        <g mask={`url(#${arrowMaskId})`}>
          <path
            d="M141 156 C161 182 189 196 216 195 C257 193 287 160 309 120 C320 99 329 73 338 51 L320 59 C311 90 300 117 282 145 C256 184 223 202 190 198 C169 195 151 178 141 156 Z"
            fill={colors.arrowGreen}
          />
          <path
            d="M142 156 C165 180 189 189 214 187 C249 184 276 151 298 110 C309 89 319 62 328 43 L337 58 C318 111 295 152 268 179 C241 204 209 209 180 194 C163 185 150 169 142 156 Z"
            fill={colors.arrowBlue}
          />
        </g>

        <g className={animate ? "faidatech-arrowhead-enter" : undefined}>
          <path d="M281 53 L332 14 L354 75 L335 60 L317 47 L300 68 Z" fill={colors.arrowGreen} />
          <path d="M281 53 L332 14 L319 49 L300 68 Z" fill={colors.arrowBlue} />
        </g>
      </g>
    </svg>
  );
}
