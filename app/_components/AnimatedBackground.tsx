"use client";

import React from "react";
import { Theme } from "@/types";

interface AnimatedBackgroundProps {
  theme: Theme;
}

export default function AnimatedBackground({
  theme,
}: AnimatedBackgroundProps) {
  const dark = theme === "dark";

  return (
    <div
      className={`fixed inset-0 -z-10 overflow-hidden select-none pointer-events-none transition-colors duration-500 ${
        dark ? "bg-black" : "bg-white"
      }`}
    >
      <div
        className="absolute -top-10 -left-10 w-[500px] h-[500px] rounded-full blur-[120px] opacity-40"
        style={{
          background: dark
            ? "radial-gradient(circle, rgba(60,60,67,0.8) 0%, rgba(20,20,23,0.3) 60%, rgba(0,0,0,0) 80%)"
            : "radial-gradient(circle, rgba(180,180,190,0.45) 0%, rgba(230,230,235,0.2) 60%, rgba(255,255,255,0) 80%)",
          animation:
            "moveLeftToRight 8s ease-in-out infinite alternate",
        }}
      />

      <div
        className="absolute -bottom-10 -right-10 w-[600px] h-[600px] rounded-full blur-[140px] opacity-35"
        style={{
          background: dark
            ? "radial-gradient(circle, rgba(50,50,55,0.7) 0%, rgba(15,15,18,0.2) 60%, rgba(0,0,0,0) 80%)"
            : "radial-gradient(circle, rgba(190,190,200,0.5) 0%, rgba(240,240,245,0.2) 60%, rgba(255,255,255,0) 80%)",
          animation:
            "moveRightToLeft 10s ease-in-out infinite alternate",
        }}
      />

      <div
        className="absolute top-1/3 left-1/3 w-[450px] h-[450px] rounded-full blur-[100px] opacity-25"
        style={{
          background: dark
            ? "radial-gradient(circle, rgba(80,80,90,0.5) 0%, rgba(25,25,30,0.15) 60%, rgba(0,0,0,0) 80%)"
            : "radial-gradient(circle, rgba(160,160,170,0.4) 0%, rgba(235,235,240,0.15) 60%, rgba(255,255,255,0) 80%)",
          animation:
            "moveLeftToRight 6s ease-in-out infinite alternate-reverse",
        }}
      />

      <div
        className={`absolute inset-0 ${
          dark
            ? "bg-gradient-to-b from-black/20 via-transparent to-black"
            : "bg-gradient-to-b from-white/10 via-transparent to-white/40"
        }`}
      />

      <style jsx>{`
        @keyframes moveLeftToRight {
          0% {
            transform: translateX(0px) translateY(0px) scale(1);
          }

          50% {
            transform: translateX(120px) translateY(40px) scale(1.1);
          }

          100% {
            transform: translateX(250px) translateY(-30px) scale(0.95);
          }
        }

        @keyframes moveRightToLeft {
          0% {
            transform: translateX(0px) translateY(0px) scale(1);
          }

          50% {
            transform: translateX(-150px) translateY(-50px) scale(1.15);
          }

          100% {
            transform: translateX(-300px) translateY(20px) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}