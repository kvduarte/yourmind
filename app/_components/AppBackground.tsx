"use client";

interface AppBackgroundProps {
  imageUrl?: string;
  opacity?: number; // 0 a 100
  saturation?: number; // 0 a 200
}

export default function AppBackground({
  imageUrl,
  opacity = 30,
  saturation = 100,
}: AppBackgroundProps) {
  if (!imageUrl) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundImage: `url("${imageUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        opacity: opacity / 100,
        filter: `saturate(${saturation}%)`,
      }}
    />
  );
}