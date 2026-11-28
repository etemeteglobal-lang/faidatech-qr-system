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
    ? { navy: "#8CC7FF", green: "#8FD49A", arrowBlue: "#75B8F5", arrowGreen: "#83CF91", cutout: "#020617" }
    : { navy: "#143C64", green: "#3F7D4C", arrowBlue: "#143C64", arrowGreen: "#3F7D4C", cutout: "#FFFFFF" };
  const arrowSweepPath = "M141 156 C158 175 179 184 204 185 C239 198 259 168 283 127 C296 105 310 80 325 54 C329 42 332 28 332 14";
  const arrowBodyGreenPath = "M141 156 C161 178 186 188 213 190 C250 202 278 169 303 128 C319 104 333 77 347 45 L325 54 C310 80 296 105 283 127 C259 168 239 198 204 185 C179 184 158 175 141 156 Z";
  const arrowBodyBluePath = "M141 156 C158 175 179 184 204 185 C239 198 259 168 283 127 C296 105 310 80 325 54 L308 59 C299 80 289 104 266 126 C242 162 227 184 196 182 C172 180 155 171 141 156 Z";
  const arrowHeadGreenPath = "M332 14 L359 75 L339 61 L309 58 L325 54 Z";
  const arrowHeadBluePath = "M332 14 L286 53 L309 58 L325 54 Z";

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
          0% { opacity: 0; transform: translateY(9px) scale(.9); }
          68% { opacity: 1; transform: translateY(-1px) scale(1.04); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes faidatech-arrow-sweep {
          from { stroke-dashoffset: 400; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes faidatech-logo-settle {
          0% { transform: scale(1); }
          62% { transform: scale(1.04); }
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
            strokeDasharray={animate ? "400" : undefined}
            strokeDashoffset={animate ? "400" : "0"}
            className={animate ? "faidatech-arrow-draw" : undefined}
          />
        </mask>

        <g mask={`url(#${arrowMaskId})`}>
          {/* The background keyline separates the curve cleanly from D and A where they meet. */}
          <g fill="none" stroke={colors.cutout} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={arrowBodyGreenPath} />
            <path d={arrowBodyBluePath} />
            <path d={arrowHeadGreenPath} />
            <path d={arrowHeadBluePath} />
          </g>
          {/* Adjacent ribbons share one center seam; matching halves continue into the head. */}
          <path d={arrowBodyGreenPath} fill={colors.arrowGreen} />
          <path d={arrowBodyBluePath} fill={colors.arrowBlue} />
          <path d={arrowHeadGreenPath} fill={colors.arrowGreen} />
          <path d={arrowHeadBluePath} fill={colors.arrowBlue} />
        </g>
      </g>
    </svg>
  );
}
