"use client";

import React from "react";
import { Theme } from "@/types";
import { useAccent, withAlpha } from "@/lib/theme";

interface AnimatedBackgroundProps {
  theme: Theme;
  /** URL, data URL ou blob URL da imagem de fundo */
  imageUrl?: string;
  /** 0 a 100 */
  imageOpacity?: number;
  /** 0 a 200 (100 = cor original) */
  imageSaturation?: number;
  /** 0 a 100 — véu da cor do tema (branco no claro, preto no escuro) sobre a imagem, para dar leitura ao texto */
  imageVeil?: number;
  /** liga/desliga as luzes em movimento (a imagem e a cor base continuam) */
  showLights?: boolean;
}

export default function AnimatedBackground({
  theme,
  imageUrl,
  imageOpacity = 30,
  imageSaturation = 100,
  imageVeil,
  showLights = true,
}: AnimatedBackgroundProps) {
  const dark = theme === "dark";
  const accent = useAccent();
  const hasImage = Boolean(imageUrl);
  // padrão: 40% no tema claro (texto escuro precisa de fundo claro), 0% no escuro
  const veil = imageVeil ?? (dark ? 0 : 40);

  return (
    <div
      className={`fixed inset-0 -z-10 overflow-hidden select-none pointer-events-none transition-colors duration-500 ${
        dark ? "bg-black" : "bg-white"
      }`}
    >
      {/* IMAGEM DE FUNDO (acima da cor base, abaixo das luzes) */}
      {hasImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("${imageUrl}")`,
            opacity: imageOpacity / 100,
            filter: `saturate(${imageSaturation}%)`,
          }}
        />
      )}

      {/* VÉU DE LEITURA (clareia no tema claro, escurece no tema escuro) */}
      {hasImage && veil > 0 && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: dark ? "#000000" : "#ffffff",
            opacity: veil / 100,
          }}
        />
      )}

      {/* LUZES EM MOVIMENTO */}
      {showLights && (
        <>
          <div
            className="absolute -top-10 -left-10 w-125 h-125 rounded-full blur-[120px] opacity-40"
            style={{
              background: dark
                ? "radial-gradient(circle, rgba(60,60,67,0.8) 0%, rgba(20,20,23,0.3) 60%, rgba(0,0,0,0) 80%)"
                : "radial-gradient(circle, rgba(180,180,190,0.45) 0%, rgba(230,230,235,0.2) 60%, rgba(255,255,255,0) 80%)",
              animation: "moveLeftToRight 8s ease-in-out infinite alternate",
            }}
          />

          <div
            className="absolute -bottom-10 -right-10 w-150 h-150 rounded-full blur-[140px] opacity-35"
            style={{
              background: dark
                ? "radial-gradient(circle, rgba(50,50,55,0.7) 0%, rgba(15,15,18,0.2) 60%, rgba(0,0,0,0) 80%)"
                : "radial-gradient(circle, rgba(190,190,200,0.5) 0%, rgba(240,240,245,0.2) 60%, rgba(255,255,255,0) 80%)",
              animation: "moveRightToLeft 10s ease-in-out infinite alternate",
            }}
          />

          <div
            className="absolute top-1/3 left-1/3 w-115 h-115 rounded-full blur-[100px] opacity-25"
            style={{
              background: dark
                ? `radial-gradient(circle, ${withAlpha(accent, 0.28)} 0%, ${withAlpha(accent, 0.06)} 60%, rgba(0,0,0,0) 80%)`
                : `radial-gradient(circle, ${withAlpha(accent, 0.22)} 0%, ${withAlpha(accent, 0.05)} 60%, rgba(255,255,255,0) 80%)`,
              animation:
                "moveLeftToRight 6s ease-in-out infinite alternate-reverse",
            }}
          />
        </>
      )}

      {/* DEGRADÊ: só sem imagem, para não escurecer a foto */}
      {!hasImage && (
        <div
          className={`absolute inset-0 ${
            dark
              ? "bg-linear-to-b from-black/20 via-transparent to-black"
              : "bg-linear-to-b from-white/10 via-transparent to-white/40"
          }`}
        />
      )}

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