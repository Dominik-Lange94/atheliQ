import { useEffect, useMemo, useRef } from "react";
import sqDarkRaw from "../../assets/SQ_LOAD.svg?raw";
import sqLightRaw from "../../assets/SQ_LOAD_LIGHT.svg?raw";

type Props = {
  mode?: "dark" | "light";
};

export default function SQLoadingScreen({ mode = "dark" }: Props) {
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

      path.style.setProperty("--path-length", `${length}`);
      path.style.stroke = usableColor;
      path.style.strokeWidth = path.getAttribute("stroke-width") || "3";
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.style.fill = "transparent";
      path.style.fillOpacity = "0";
      path.style.opacity = "1";
      path.style.animation = "none";

      path.style.animation = `sqDrawOnly 3s ease-in-out ${
        index * 0.06
      }s infinite`;
    });

    return () => {
      paths.forEach((path) => {
        path.style.animation = "";
      });
    };
  }, [svgMarkup, isLight]);

  return (
    <div
      className={`w-full h-screen flex items-center justify-center overflow-hidden px-6 ${
        isLight ? "bg-white" : "bg-[#0b0b0f]"
      }`}
    >
      <div
        ref={containerRef}
        className="sq-loader-logo w-full max-w-[860px] aspect-[1620/413]"
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
          will-change: stroke-dashoffset, opacity;
        }

        @keyframes sqDrawOnly {
          0% {
            stroke-dashoffset: var(--path-length, 1000);
            opacity: 1;
          }
          55% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          82% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
