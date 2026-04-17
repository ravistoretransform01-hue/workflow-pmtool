import logoSymbol from "@/assets/logo-symbol.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  bgColor?: string;
  rounded?: string;
}

export const Logo = ({
  className,
  iconClassName,
  size = 40,
  width,
  height,
  bgColor = "bg-primary/10",
  rounded = "rounded-xl",
}: LogoProps) => {
  const finalWidth = width || size;
  const finalHeight = height || size;

  return (
    <div
      className={cn(
        "flex items-center justify-center border border-white/10 shadow-sm overflow-hidden",
        bgColor,
        rounded,
        className
      )}
      style={{
        width: typeof finalWidth === "number" ? `${finalWidth}px` : finalWidth,
        height: typeof finalHeight === "number" ? `${finalHeight}px` : finalHeight,
      }}
    >
      <img
        src={logoSymbol}
        alt="WorkFlowPM"
        className={cn("object-contain", iconClassName)}
        style={{
          width: "70%",
          height: "70%",
        }}
      />
    </div>
  );
};
