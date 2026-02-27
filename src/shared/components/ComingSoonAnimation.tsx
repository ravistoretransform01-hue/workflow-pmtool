import Lottie from "lottie-react";
import comingSoonData from "@/assets/commingsoon.json";

interface ComingSoonAnimationProps {
  width?: number | string;
  height?: number | string;
  loop?: boolean;
  className?: string;
}

/**
 * A reusable Lottie animation component for "Coming Soon" states.
 * Uses the asset from src/assets/commingsoon.json
 */
export const ComingSoonAnimation = ({
  width = 300,
  height = 300,
  loop = true,
  className = "",
}: ComingSoonAnimationProps) => {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <Lottie
        animationData={comingSoonData}
        loop={loop}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};
