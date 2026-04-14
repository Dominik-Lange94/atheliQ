import { useEffect, useMemo, useRef } from "react";
import sqDarkRaw from "../../assets/SQ_LOAD.svg?raw";
import sqLightRaw from "../../assets/SQ_LOAD_LIGHT.svg?raw";

type Props = {
  mode?: "dark" | "light";
  compact?: boolean;
  className?: string;
};

export default function SQLoadingScreen({
  mode = "dark",
  compact = false,
  className = "",
}: Props) {
  const isLight = mode === "light";
  const containerRef = useRef<HTMLDivElement | null>(null);

  const svgMarkup = useMemo(
    () => (isLight ? sqLightRaw : sqDarkRaw),
    [isLight]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    const paths = Array.from(svg.querySelectorAll("path"));

    paths.forEach((path, index) => {
      const length = path.getTotalLength();

      const fillAttr = path.getAttribute("fill");
      const strokeAttr = path.getAttribute("stroke");

      const usableColor =
        strokeAttr && strokeAttr !== "none"
          ? strokeAttr
          : fillAttr && fillAttr !== "none"
          ? fillAttr
          : isLight
          ? "#111111"
          : "#ffffff";

      const baseStrokeWidth = path.getAttribute("stroke-width") || "3";

      path.style.setProperty("--path-length", `${length}`);
      path.style.stroke = usableColor;
      path.style.strokeWidth = compact ? "2" : baseStrokeWidth;
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.style.fill = usableColor;
      path.style.fillOpacity = "0";
      path.style.opacity = "1";
      path.style.animation = "none";
      path.style.animation = `sqDrawFill 3s ease-in-out ${
        index * 0.06
      }s infinite`;
    });

    return () => {
      paths.forEach((path) => {
        path.style.animation = "";
      });
    };
  }, [svgMarkup, isLight, compact]);

  return (
    <div
      className={[
        "w-full overflow-hidden",
        compact
          ? "flex items-center justify-center bg-transparent py-2"
          : `h-screen flex items-center justify-center px-6 ${
              isLight ? "bg-white" : "bg-[#0b0b0f]"
            }`,
        className,
      ].join(" ")}
    >
      <div
        ref={containerRef}
        className={
          compact
            ? "sq-loader-logo w-full max-w-[280px] sm:max-w-[320px] aspect-[1620/413]"
            : "sq-loader-logo w-full max-w-[860px] aspect-[1620/413]"
        }
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />

      <style>{`
        .sq-loader-logo svg {
          width: 100%;
          height: 100%;
          display: block;
          overflow: visible;
        }

        .sq-loader-logo svg path {
          stroke-linecap: round;
          stroke-linejoin: round;
          vector-effect: non-scaling-stroke;
          will-change: stroke-dashoffset, fill-opacity, opacity;
        }

        @keyframes sqDrawFill {
          0% {
            stroke-dashoffset: var(--path-length, 1000);
            fill-opacity: 0;
            opacity: 1;
          }
          50% {
            stroke-dashoffset: 0;
            fill-opacity: 0;
            opacity: 1;
          }
          68% {
            stroke-dashoffset: 0;
            fill-opacity: 1;
            opacity: 1;
          }
          88% {
            stroke-dashoffset: 0;
            fill-opacity: 1;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            fill-opacity: 1;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
