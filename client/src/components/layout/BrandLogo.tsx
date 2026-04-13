import { useTheme } from "../../hooks/useTheme";
import logoLight from "../../assets/spaq-logo-lightmode.png";
import logoDark from "../../assets/spaq-logo-darkmode.png";

type Props = {
  className?: string;
  imageClassName?: string;
  showText?: boolean;
  textClassName?: string;
};

export default function BrandLogo({
  className = "",
  imageClassName = "h-8 w-auto",
  showText = false,
  textClassName = "",
}: Props) {
  const { resolvedTheme } = useTheme();

  const logoSrc = resolvedTheme === "dark" ? logoDark : logoLight;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={logoSrc}
        alt="SPAQ"
        className={imageClassName}
        draggable={false}
      />
      {showText ? (
        <span className={`font-medium text-primary ${textClassName}`}>
          SPAQ
        </span>
      ) : null}
    </div>
  );
}
