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
  /** 0 a 100 — véu da cor do tema sobre a imagem, para dar leitura ao texto */
  imageVeil?: number;
  /** liga/desliga as luzes em movimento */
  showLights?: boolean;
  /** liga/desliga a grade sutil com máscara radial */
  showGrid?: boolean;
  /** liga/desliga o grão fino (acabamento de filme, evita banding) */
  showGrain?: boolean;
  /**
   * cor das luzes:
   * - "auto": neutras (brancas no escuro, pretas no claro) quando o accent é
   *   básico (preto/branco/cinza); coloridas quando o accent tem cor
   * - "neutral": sempre brancas no escuro e pretas no claro
   * - "accent": sempre na cor do accent
   */
  lightsColor?: "auto" | "neutral" | "accent";
}

/** Grão fino gerado em SVG (sem arquivo externo). Branco no escuro, preto no claro. */
function grainDataUrl(dark: boolean) {
  const c = dark ? "1" : "0";
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>` +
    `<filter id='n' x='0' y='0' width='100%' height='100%'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 ${c}  0 0 0 0 ${c}  0 0 0 0 ${c}  0 0 0 0.9 0'/>` +
    `</filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${svg}")`;
}

/** Detecta se a cor é "básica" (preto, branco ou cinza), ou seja, sem saturação. */
function isNeutralColor(color: string | undefined): boolean {
  if (!color) return true;
  const c = color.trim().toLowerCase();

  if (c === "white" || c === "black" || c === "gray" || c === "grey") return true;

  // #rgb e #rrggbb (aceita alfa no fim)
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (Math.max(r, g, b) - Math.min(r, g, b)) / 255 < 0.12;
  }

  // rgb() / rgba()
  const rgb = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (rgb) {
    const [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    return (Math.max(r, g, b) - Math.min(r, g, b)) / 255 < 0.12;
  }

  // hsl() / hsla()
  const hsl = c.match(/^hsla?\(\s*[\d.]+(?:deg)?[\s,]+([\d.]+)%/);
  if (hsl) return Number(hsl[1]) < 12;

  return false;
}

export default function AnimatedBackground({
  theme,
  imageUrl,
  imageOpacity = 60,
  imageSaturation = 100,
  imageVeil,
  showLights = true,
  showGrid = true,
  showGrain = true,
  lightsColor = "auto",
}: AnimatedBackgroundProps) {
  const dark = theme === "dark";
  const accent = useAccent();
  const hasImage = Boolean(imageUrl);
  const veil = imageVeil ?? (dark ? 0 : 30);

  const neutral =
    lightsColor === "neutral" ||
    (lightsColor === "auto" && isNeutralColor(accent));

  // Cor das luzes: branco no escuro, preto no claro (tema básico) ou accent.
  // Os alphas do modo neutro são calibrados à parte: branco sobre preto
  // precisa de mais força que o accent colorido para aparecer com a mesma presença.
  const tint = (accentAlpha: number, neutralAlpha: number) =>
    neutral
      ? dark
        ? `rgba(255,255,255,${neutralAlpha})`
        : `rgba(0,0,0,${neutralAlpha})`
      : withAlpha(accent, accentAlpha);

  // Base: preto profundo com uma gota de azul (não chapado), e branco levemente frio.
  const base = dark ? "#07070a" : "#f6f6f9";

  // Máscara radial compartilhada: o efeito vive no centro-alto e some nas bordas.
  const fadeMask =
    "radial-gradient(ellipse 75% 65% at 50% 38%, #000 25%, transparent 100%)";

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden select-none pointer-events-none transition-colors duration-500"
      style={{ backgroundColor: base }}
    >
      {/* 1. IMAGEM DE FUNDO */}
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

      {/* 2. VÉU DE LEITURA */}
      {hasImage && veil > 0 && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: dark ? "#000000" : "#ffffff",
            opacity: veil / 100,
          }}
        />
      )}

      {/* 3. LUZES: três focos menores, com profundidade diferente */}
      {showLights && (
        <>
          {/* foco principal, canto superior esquerdo */}
          <div
            className="bg-light absolute rounded-full"
            style={{
              top: "-8%",
              left: "-4%",
              width: "max(32vw, 300px)",
              height: "max(32vw, 300px)",
              background: `radial-gradient(circle, ${tint(
                dark ? 0.34 : 0.26,
                dark ? 0.2 : 0.16
              )} 0%, ${tint(dark ? 0.09 : 0.07, dark ? 0.05 : 0.04)} 45%, transparent 70%)`,
              filter: "blur(28px)",
              animation: "bgDriftA 34s ease-in-out infinite alternate",
            }}
          />

          {/* foco secundário, canto inferior direito, mais difuso */}
          <div
            className="bg-light absolute rounded-full"
            style={{
              bottom: "-10%",
              right: "-6%",
              width: "max(38vw, 340px)",
              height: "max(38vw, 340px)",
              background: `radial-gradient(circle, ${tint(
                dark ? 0.22 : 0.17,
                dark ? 0.14 : 0.12
              )} 0%, ${tint(dark ? 0.05 : 0.04, dark ? 0.035 : 0.03)} 50%, transparent 72%)`,
              filter: "blur(36px)",
              animation: "bgDriftB 42s ease-in-out infinite alternate",
            }}
          />

          {/* respiração neutra no centro: dá volume sem competir com a cor */}
          <div
            className="bg-light absolute rounded-full"
            style={{
              top: "34%",
              left: "42%",
              width: "max(22vw, 220px)",
              height: "max(22vw, 220px)",
              background: dark
                ? "radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 68%)"
                : "radial-gradient(circle, rgba(0,0,0,0.06) 0%, transparent 68%)",
              filter: "blur(30px)",
              animation: "bgDriftC 38s ease-in-out infinite alternate-reverse",
            }}
          />
        </>
      )}

      {/* 4. GRADE SUTIL: estrutura discreta, visível só perto do centro */}
      {showGrid && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: dark
              ? "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)"
              : "linear-gradient(to right, rgba(10,10,30,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(10,10,30,0.045) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            backgroundPosition: "center top",
            WebkitMaskImage: fadeMask,
            maskImage: fadeMask,
            opacity: hasImage ? 0.6 : 1,
          }}
        />
      )}

      {/* 5. FILETE DE LUZ NO TOPO: uma linha fina que acompanha a cor das luzes */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${tint(
            dark ? 0.55 : 0.4,
            dark ? 0.3 : 0.25
          )} 50%, transparent 100%)`,
          opacity: 0.55,
        }}
      />

      {/* 6. GRÃO FINO: textura de acabamento, evita faixas nos degradês */}
      {showGrain && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: grainDataUrl(dark),
            backgroundSize: "200px 200px",
            opacity: dark ? 0.05 : 0.045,
            mixBlendMode: dark ? "overlay" : "multiply",
          }}
        />
      )}

      {/* 7. VINHETA: puxa o olhar para o centro, também sobre imagens */}
      <div
        className="absolute inset-0"
        style={{
          background: dark
            ? `radial-gradient(ellipse at center, transparent ${
                hasImage ? 45 : 38
              }%, rgba(0,0,0,${hasImage ? 0.55 : 0.72}) 100%)`
            : `radial-gradient(ellipse at center, transparent ${
                hasImage ? 55 : 48
              }%, rgba(255,255,255,${hasImage ? 0.45 : 0.65}) 100%)`,
        }}
      />

      <style jsx>{`
        .bg-light {
          will-change: transform;
          backface-visibility: hidden;
        }

        @keyframes bgDriftA {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(22vw, 14vh, 0) scale(1.15);
          }
        }

        @keyframes bgDriftB {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-24vw, -16vh, 0) scale(1.12);
          }
        }

        @keyframes bgDriftC {
          0% {
            transform: translate3d(-10vw, 6vh, 0) scale(0.95);
          }
          100% {
            transform: translate3d(12vw, -10vh, 0) scale(1.1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bg-light {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}