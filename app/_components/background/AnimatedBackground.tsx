"use client";

import React from "react";
import { Theme } from "@/types";
import { BgPattern, BgVariant } from "@/lib/settings";
import { useAccent, withAlpha } from "@/lib/theme";

interface AnimatedBackgroundProps {
  theme: Theme;
  /** luzes do fundo: luzes, bolhas, estrelas, ondas ou nenhuma */
  variant?: BgVariant;
  /** padrão do fundo: grade, pontos, linhas ou liso (pode ficar junto com as luzes) */
  pattern?: BgPattern;
  /** cor de destaque a usar (se omitida, usa a cor de destaque atual do app) */
  accentColor?: string;
  /** URL, data URL ou blob URL da imagem de fundo */
  imageUrl?: string;
  /** 0 a 100 */
  imageOpacity?: number;
  /** 0 a 200 (100 = cor original) */
  imageSaturation?: number;
  /** 0 a 100 — véu da cor do tema sobre a imagem, para dar leitura ao texto */
  imageVeil?: number;
  /** liga/desliga o fundo animado (o formato escolhido) */
  showLights?: boolean;
  /** liga/desliga a grade sutil com máscara radial (só no formato "luzes") */
  showGrid?: boolean;
  /** liga/desliga o grão fino (acabamento de filme, evita banding) */
  showGrain?: boolean;
  /**
   * cor dos efeitos:
   * - "auto": neutros (brancos no escuro, pretos no claro) quando o accent é
   *   básico (preto/branco/cinza); coloridos quando o accent tem cor
   * - "neutral": sempre brancos no escuro e pretos no claro
   * - "accent": sempre na cor do accent
   */
  lightsColor?: "auto" | "neutral" | "accent";
  /**
   * usa `absolute` em vez de `fixed`: serve para mostrar o fundo dentro de uma
   * caixa (pré-visualização das configurações). O pai precisa ser `relative isolate`.
   */
  contained?: boolean;
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

/** Gerador pseudo-aleatório com semente fixa: as posições são sempre as mesmas. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ---------- dados fixos de cada formato ---------- */

/** BOLHAS: círculos que sobem devagar, com um leve balanço */
const BUBBLES = (() => {
  const rnd = seeded(7);
  return Array.from({ length: 16 }, (_, i) => ({
    left: `${Math.round(rnd() * 96)}%`,
    size: Math.round(28 + rnd() * 90),
    duration: Math.round(22 + rnd() * 26),
    delay: -Math.round(rnd() * 40),
    key: i,
  }));
})();

/** ESTRELAS: pontos que piscam em tempos diferentes */
const STARS = (() => {
  const rnd = seeded(23);
  return Array.from({ length: 80 }, (_, i) => ({
    left: `${(rnd() * 100).toFixed(2)}%`,
    top: `${(rnd() * 100).toFixed(2)}%`,
    size: rnd() > 0.88 ? 3 : rnd() > 0.55 ? 2 : 1.5,
    duration: (2.5 + rnd() * 4.5).toFixed(1),
    delay: -(rnd() * 8).toFixed(1),
    key: i,
  }));
})();

/** Caminho de uma onda que se repete (2400 de largura, período de 600) */
const WAVE_PATH =
  "M0 80 q150 -70 300 0 t300 0 t300 0 t300 0 t300 0 t300 0 t300 0 t300 0 V160 H0 Z";

const WAVE_LAYERS = [
  { height: "34vh", a: [0.22, 0.14], duration: 38, reverse: false },
  { height: "28vh", a: [0.3, 0.2], duration: 28, reverse: true },
  { height: "20vh", a: [0.42, 0.28], duration: 20, reverse: false },
];

export default function AnimatedBackground({
  theme,
  variant = "lights",
  pattern = "none",
  accentColor,
  imageUrl,
  imageOpacity = 60,
  imageSaturation = 100,
  imageVeil,
  showLights = true,
  showGrid = true,
  showGrain = true,
  lightsColor = "auto",
  contained = false,
}: AnimatedBackgroundProps) {
  const dark = theme === "dark";
  const appAccent = useAccent();
  const accent = accentColor ?? appAccent;
  const hasImage = Boolean(imageUrl);
  const veil = imageVeil ?? (dark ? 0 : 30);

  const neutral =
    lightsColor === "neutral" ||
    (lightsColor === "auto" && isNeutralColor(accent));

  // Cor dos efeitos: branco no escuro, preto no claro (tema básico) ou accent.
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

  // Cor das linhas dos padrões (grade, pontos, linhas)
  const lineColor = dark ? "255,255,255" : "10,10,30";

  // Se o fundo animado está desligado, nada do formato aparece (só a base)
  const active: BgVariant = showLights ? variant : "none";
  const activePattern: BgPattern = showLights ? pattern : "none";
  const lightsOn = active === "lights";
  // grade sutil de fundo: só acompanha as luzes quando nenhum padrão foi escolhido
  const softGridOn = showGrid && active === "lights" && activePattern === "none";

  return (
    <div
      aria-hidden="true"
      className={`${
        contained ? "absolute inset-0" : "fixed inset-0 -z-10"
      } overflow-hidden select-none pointer-events-none transition-colors duration-500`}
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

      {/* PADRÕES: ficam atrás das luzes, então os dois podem aparecer juntos */}
      {/* GRADE: quadriculado bem marcado, com brilho no topo */}
      {activePattern === "grid" && (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(${lineColor},0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(${lineColor},0.16) 1px, transparent 1px)`,
              backgroundSize: "44px 44px",
              WebkitMaskImage: fadeMask,
              maskImage: fadeMask,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 50% 35% at 50% 0%, ${tint(
                0.28,
                0.14
              )} 0%, transparent 70%)`,
            }}
          />
        </>
      )}

      {/* PONTOS: malha de pontos bem visíveis */}
      {activePattern === "dots" && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(${lineColor},0.45) 1.6px, transparent 2.2px)`,
            backgroundSize: "26px 26px",
            WebkitMaskImage: fadeMask,
            maskImage: fadeMask,
          }}
        />
      )}

      {/* LINHAS: listras diagonais */}
      {activePattern === "lines" && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(135deg, rgba(${lineColor},0.14) 0px, rgba(${lineColor},0.14) 1px, transparent 1px, transparent 16px)`,
            WebkitMaskImage: fadeMask,
            maskImage: fadeMask,
          }}
        />
      )}

      {/* 3. LUZES: três focos menores, com profundidade diferente */}
      {lightsOn && (
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

      {/* 4. GRADE SUTIL: estrutura discreta, só no formato "luzes" */}
      {softGridOn && (
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

      {/* 4b. FORMATOS ALTERNATIVOS — cada um com um desenho bem diferente */}

      {/* BOLHAS: círculos com contorno que sobem devagar */}
      {active === "bubbles" &&
        BUBBLES.map((b) => (
          <div
            key={b.key}
            className="bg-anim absolute rounded-full"
            style={{
              left: b.left,
              bottom: "-20vh",
              width: b.size,
              height: b.size,
              border: `1.5px solid ${tint(0.55, 0.4)}`,
              background: `radial-gradient(circle at 30% 28%, ${tint(
                0.28,
                0.2
              )} 0%, ${tint(0.06, 0.04)} 55%, transparent 72%)`,
              animation: `bgRise ${b.duration}s linear ${b.delay}s infinite`,
            }}
          />
        ))}

      {/* ESTRELAS: céu cheio de pontos que piscam */}
      {active === "stars" &&
        STARS.map((s) => (
          <span
            key={s.key}
            className="bg-anim absolute rounded-full"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              backgroundColor: tint(0.95, dark ? 0.9 : 0.75),
              boxShadow:
                s.size >= 3 ? `0 0 8px 1px ${tint(0.7, 0.55)}` : undefined,
              animation: `bgTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}

      {/* ONDAS: três camadas de onda deslizando na parte de baixo */}
      {active === "waves" &&
        WAVE_LAYERS.map((w, i) => (
          <svg
            key={i}
            className="bg-anim absolute bottom-0 left-0"
            viewBox="0 0 2400 160"
            preserveAspectRatio="none"
            style={{
              width: "200%",
              height: w.height,
              animation: `bgWave ${w.duration}s linear infinite ${
                w.reverse ? "reverse" : "normal"
              }`,
            }}
          >
            <path d={WAVE_PATH} fill={tint(w.a[0], w.a[1])} />
          </svg>
        ))}

      {/* 5. FILETE DE LUZ NO TOPO: uma linha fina que acompanha a cor dos efeitos */}
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
        .bg-light,
        .bg-anim {
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

        /* bolhas subindo com balanço lateral */
        @keyframes bgRise {
          0% {
            transform: translate3d(0, 0, 0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translate3d(24px, -65vh, 0);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate3d(-18px, -135vh, 0);
            opacity: 0;
          }
        }

        /* estrelas piscando */
        @keyframes bgTwinkle {
          0%,
          100% {
            opacity: 0.15;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.25);
          }
        }

        /* ondas deslizando (metade da largura = 2 períodos, loop sem corte) */
        @keyframes bgWave {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bg-light,
          .bg-anim {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}