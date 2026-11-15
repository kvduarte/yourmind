"use client";

import { useEffect, useState } from "react";

export const DEFAULT_ACCENT = "#6366f1";
export const ACCENT_SOFT = "#818cf8";

export const STATUS = {
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
} as const;

export const PRIMARY_BTN =
  "bg-[var(--accent)] text-white hover:brightness-110 active:brightness-95";

export const RADIUS = {
  control: "rounded-xl",
  card: "rounded-2xl",
} as const;

/* ───────────────────────── Conversões de cor (OKLab) ───────────────────── */

type Oklab = { L: number; a: number; b: number };
type Oklch = { L: number; C: number; h: number };

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

const toSrgb = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

function normalizeHex(hex: string): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  return h.length === 6 ? h : "808080";
}

function hexToOklab(hex: string): Oklab {
  const h = normalizeHex(hex);
  const r = toLinear(parseInt(h.slice(0, 2), 16) / 255);
  const g = toLinear(parseInt(h.slice(2, 4), 16) / 255);
  const b = toLinear(parseInt(h.slice(4, 6), 16) / 255);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** Converte OKLab → [r,g,b] linear (pode sair do gamut, 0..1). */
function oklabToLinear({ L, a, b }: Oklab): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: number[]) =>
  rgb.every((v) => v >= -0.0005 && v <= 1.0005);

function linearToHex([r, g, b]: [number, number, number]): string {
  const to = (v: number) =>
    Math.round(clamp(toSrgb(clamp(v, 0, 1)), 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function oklabToHex(lab: Oklab): string {
  return linearToHex(oklabToLinear(lab));
}

function hexToOklch(hex: string): Oklch {
  const { L, a, b } = hexToOklab(hex);
  const C = Math.sqrt(a * a + b * b);
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { L, C, h };
}

/** OKLCH → hex, reduzindo o croma até caber no gamut sRGB (sem cores estouradas). */
function oklchToHex({ L, C, h }: Oklch): string {
  const rad = (h * Math.PI) / 180;
  let c = C;
  for (let i = 0; i < 14; i++) {
    const rgb = oklabToLinear({
      L,
      a: c * Math.cos(rad),
      b: c * Math.sin(rad),
    });
    if (inGamut(rgb)) return linearToHex(rgb);
    c *= 0.92;
  }
  return oklabToHex({ L, a: 0, b: 0 });
}

function mixOklab(from: string, to: string, t: number): string {
  const a = hexToOklab(from);
  const b = hexToOklab(to);
  return oklabToHex({
    L: a.L + (b.L - a.L) * t,
    a: a.a + (b.a - a.a) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

/* ───────────────────────────── Gradientes ──────────────────────────────── */

/**
 * Gradiente suave entre N cores. Insere paradas intermediárias calculadas em
 * OKLab para a transição ficar contínua em qualquer navegador.
 */
export function buildSmoothGradient(colors: string[], angle = 135): string {
  if (colors.length === 0) return "transparent";
  if (colors.length === 1) return colors[0];

  const INTERIOR = 3; // paradas extras por trecho
  const segments = colors.length - 1;
  const stops: { color: string; pos: number }[] = [];

  for (let i = 0; i < segments; i++) {
    for (let k = 0; k <= INTERIOR; k++) {
      if (i > 0 && k === 0) continue; // evita duplicar a junção
      const t = k / (INTERIOR + 1);
      stops.push({
        color:
          k === 0 ? colors[i] : mixOklab(colors[i], colors[i + 1], t),
        pos: ((i + t) / segments) * 100,
      });
    }
  }
  stops.push({ color: colors[colors.length - 1], pos: 100 });

  return `linear-gradient(${angle}deg, ${stops
    .map((s) => `${s.color} ${s.pos.toFixed(1)}%`)
    .join(", ")})`;
}

/**
 * Gradiente a partir de UMA cor de destaque.
 * - Cores com croma: início mais claro com matiz levemente deslocado,
 *   cor original no meio, fim mais profundo e um pouco mais saturado
 *   (variação análoga, sempre harmônica).
 * - Cores neutras (branco/preto/cinza): degradê só de luminosidade.
 */
export function buildAccentGradient(
  hex: string | undefined | null,
  angle = 135
): string {
  if (!hex || !hex.startsWith("#")) hex = DEFAULT_ACCENT;
  const { L, C, h } = hexToOklch(hex);

  // neutro
  if (C < 0.03) {
    const light = L > 0.6;
    const stops = light
      ? [L, L - 0.1, L - 0.22]
      : [L + 0.24, L + 0.11, L];
    return buildSmoothGradient(
      stops.map((l) => oklabToHex({ L: clamp(l, 0, 1), a: 0, b: 0 })),
      angle
    );
  }

  const start = oklchToHex({
    L: clamp(L + 0.08, 0, 0.96),
    C: C * 0.95,
    h: h - 24,
  });
  const end = oklchToHex({
    L: clamp(L - 0.09, 0.15, 1),
    C: Math.min(C * 1.1, 0.37),
    h: h + 30,
  });

  return buildSmoothGradient([start, hex, end], angle);
}

/* ────────────────────────────── Paletas ────────────────────────────────── */

export interface ColorPalette {
  id: string;
  name: string;
  group: "classicas" | "vivas" | "naturais" | "suaves" | "sofisticadas";
  /** 3 cores que se misturam na paleta (Primária/destaque, Secundária, Terciária) */
  colors: [string, string, string];
  gradient: string;
}

export const PALETTE_GROUPS: { id: ColorPalette["group"]; label: string }[] = [
  { id: "classicas", label: "Clássicas" },
  { id: "vivas", label: "Vivas" },
  { id: "naturais", label: "Naturais" },
  { id: "suaves", label: "Suaves" },
  { id: "sofisticadas", label: "Sofisticadas" },
];

type PaletteDef = Omit<ColorPalette, "gradient"> & {
  /** paradas do gradiente, se forem diferentes das 3 cores (ex.: tons mais profundos) */
  stops?: string[];
};

const PALETTE_DEFS: PaletteDef[] = [
  // ── Clássicas (as suas, com ids e cores originais)
  {
    id: "matcha-espresso",
    name: "Matcha, Café & Creme",
    group: "classicas",
    colors: ["#10b981", "#92400e", "#fef3c7"],
    stops: ["#10b981", "#78350f", "#f59e0b"],
  },
  {
    id: "bordeaux-gold",
    name: "Bordeaux, Ouro & Pérola",
    group: "classicas",
    colors: ["#be123c", "#d97706", "#f4f4f5"],
    stops: ["#9f1239", "#d97706", "#fde68a"],
  },
  {
    id: "ocean-terracotta",
    name: "Oceano, Terracota & Areia",
    group: "classicas",
    colors: ["#0284c7", "#ea580c", "#fed7aa"],
    stops: ["#0369a1", "#c2410c", "#fdba74"],
  },
  {
    id: "forest-sand",
    name: "Floresta, Caramelo & Marfim",
    group: "classicas",
    colors: ["#059669", "#b45309", "#fafaf9"],
    stops: ["#047857", "#92400e", "#e7e5e4"],
  },
  {
    id: "plum-rose",
    name: "Ameixa, Rosé & Champagne",
    group: "classicas",
    colors: ["#7e22ce", "#e11d48", "#fce7f3"],
    stops: ["#6b21a8", "#be123c", "#fbcfe8"],
  },
  {
    id: "nordic-slate",
    name: "Nórdico, Cobre & Neve",
    group: "classicas",
    colors: ["#3b82f6", "#c2410c", "#f8fafc"],
    stops: ["#2563eb", "#9a3412", "#e2e8f0"],
  },

  // ── Vivas
  { id: "indigo-aurora", name: "Índigo Aurora", group: "vivas", colors: ["#6366f1", "#8b5cf6", "#ec4899"] },
  { id: "por-do-sol", name: "Pôr do sol", group: "vivas", colors: ["#fb923c", "#f43f5e", "#a855f7"] },
  { id: "neon-noite", name: "Neon noturno", group: "vivas", colors: ["#22d3ee", "#a855f7", "#f472b6"] },
  { id: "aurora-boreal", name: "Aurora boreal", group: "vivas", colors: ["#34d399", "#22d3ee", "#818cf8"] },
  { id: "brasa", name: "Brasa", group: "vivas", colors: ["#ef4444", "#f97316", "#facc15"] },
  { id: "eletrico", name: "Elétrico", group: "vivas", colors: ["#3b82f6", "#8b5cf6", "#22d3ee"] },

  // ── Naturais
  { id: "floresta", name: "Floresta viva", group: "naturais", colors: ["#34d399", "#15803d", "#a3e635"] },
  { id: "deserto", name: "Deserto", group: "naturais", colors: ["#e0a15a", "#c2703d", "#f3d9a4"] },
  { id: "oceano-profundo", name: "Oceano profundo", group: "naturais", colors: ["#38bdf8", "#2563eb", "#14b8a6"] },
  { id: "musgo-pedra", name: "Musgo & pedra", group: "naturais", colors: ["#8fb996", "#4f7a5c", "#a8a29e"] },

  // ── Suaves
  { id: "lavanda", name: "Lavanda", group: "suaves", colors: ["#a78bfa", "#f0abfc", "#7dd3fc"] },
  { id: "algodao-doce", name: "Algodão-doce", group: "suaves", colors: ["#f9a8d4", "#c4b5fd", "#93c5fd"] },
  { id: "menta-gelo", name: "Menta gelada", group: "suaves", colors: ["#6ee7b7", "#7dd3fc", "#c7d2fe"] },
  { id: "pessego", name: "Pêssego", group: "suaves", colors: ["#fdba74", "#fda4af", "#fde68a"] },

  // ── Sofisticadas
  { id: "ametista", name: "Ametista", group: "sofisticadas", colors: ["#a855f7", "#6d28d9", "#e879f9"] },
  { id: "rubi-noite", name: "Rubi noturno", group: "sofisticadas", colors: ["#fb7185", "#be123c", "#7c3aed"] },
  { id: "cobre", name: "Cobre", group: "sofisticadas", colors: ["#d98a52", "#a4532c", "#f0c27b"] },
  { id: "ouro-negro", name: "Ouro & grafite", group: "sofisticadas", colors: ["#fbbf24", "#d97706", "#a8a29e"] },
  { id: "artico", name: "Ártico", group: "sofisticadas", colors: ["#cbd5e1", "#64748b", "#38bdf8"] },
  { id: "grafite-azul", name: "Grafite azulado", group: "sofisticadas", colors: ["#94a3b8", "#475569", "#818cf8"] },
];

export const CURATED_PALETTES: ColorPalette[] = PALETTE_DEFS.map(
  ({ stops, ...p }) => ({
    ...p,
    gradient: buildSmoothGradient(stops ?? p.colors, 135),
  })
);

export function isLightHex(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62;
}

export function withAlpha(hex: string | undefined | null, alpha: number): string {
  if (typeof hex !== "string" || !hex.startsWith("#")) {
    hex = DEFAULT_ACCENT;
  }

  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean;

  const n = parseInt(full, 16);

  if (Number.isNaN(n) || full.length !== 6) return `rgba(99, 102, 241, ${alpha})`;

  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function readAccent(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT;

  try {
    const saved = window.localStorage.getItem("app_settings");
    const isDark =
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const defaultBase = isDark ? "#f4f4f5" : "#18181b";

    if (!saved) return defaultBase;

    const parsed = JSON.parse(saved) as { accentColor?: string };
    return parsed.accentColor || defaultBase;
  } catch {
    return DEFAULT_ACCENT;
  }
}

/**
 * Lê cor + estilo salvos e devolve o fundo de destaque já pronto:
 * cor sólida, gradiente gerado da cor, ou o gradiente da paleta escolhida.
 */
function readAppearance(): { accent: string; background: string } {
  const accent = readAccent();

  try {
    const saved = window.localStorage.getItem("app_settings");
    if (saved) {
      const parsed = JSON.parse(saved) as {
        colorStyle?: string;
        colorPreset?: string;
      };

      if (parsed.colorStyle === "preset") {
        const palette = CURATED_PALETTES.find((p) => p.id === parsed.colorPreset);
        if (palette) return { accent, background: palette.gradient };
      }

      if (parsed.colorStyle === "gradient") {
        return { accent, background: buildAccentGradient(accent) };
      }
    }
  } catch {
    /* usa a cor sólida */
  }

  return { accent, background: accent };
}

export function useAccent(): string {
  const [accent, setAccent] = useState(DEFAULT_ACCENT);

  useEffect(() => {
    const update = () => {
      const next = readAppearance();
      setAccent(next.accent);
      const root = document.documentElement.style;
      root.setProperty("--accent", next.accent);
      // Use em qualquer componente: style={{ background: "var(--accent-bg)" }}
      root.setProperty("--accent-bg", next.background);
    };

    update();
    window.addEventListener("storage", update);
    const interval = window.setInterval(update, 1000);

    return () => {
      window.removeEventListener("storage", update);
      window.clearInterval(interval);
    };
  }, []);

  return accent;
}