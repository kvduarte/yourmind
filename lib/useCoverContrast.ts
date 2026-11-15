"use client";

import { useEffect, useState } from "react";
import { Theme } from "@/types";

export interface CoverContrast {
  /** título e textos principais */
  text: string;
  /** subtítulo e textos secundários */
  muted: string;
  /** fundo da etiqueta (chip) */
  chipBg: string;
  /** borda da etiqueta */
  chipBorder: string;
  /** sombra do texto, ajuda quando a foto tem áreas misturadas */
  textShadow: string;
  /** "0,0,0" ou "255,255,255": para montar o rgba() do véu sobre a foto */
  scrimRgb: string;
  /** força do véu sobre a foto (0 quando não há imagem) */
  scrimAlpha: number;
}

interface Options {
  theme: Theme;
  /** URL, data URL ou blob URL da capa (vazio = sem capa) */
  imageUrl?: string;
  /**
   * Mede a imagem para decidir a cor. Passe false quando a imagem não
   * preenche a capa (modo "contain"): aí decide só pelo tema.
   */
  measure?: boolean;
  /** força do véu aplicado sobre a foto na faixa do texto (0 a 1) */
  scrimAlpha?: number;
  /**
   * Região da imagem onde o texto fica, de 0 a 1.
   * Padrão: lado esquerdo (65% da largura), altura toda.
   */
  region?: { x: number; y: number; w: number; h: number };
}

/* ---------- luminância e contraste (WCAG) ---------- */

function channel(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(r: number, g: number, b: number) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(l1: number, l2: number) {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const DARK_TEXT_LUM = luminance(11, 11, 16); // #0b0b10
const MIN_CONTRAST = 4.5; // WCAG AA para texto normal

/* ---------- decisão ---------- */

function build(useWhiteText: boolean, hasImage: boolean, alpha: number): CoverContrast {
  const scrimAlpha = hasImage ? alpha : 0;

  if (useWhiteText) {
    return {
      text: "#ffffff",
      muted: "rgba(255,255,255,0.80)",
      chipBg: "rgba(0,0,0,0.32)",
      chipBorder: "rgba(255,255,255,0.18)",
      textShadow: "0 1px 14px rgba(0,0,0,0.35)",
      scrimRgb: "0,0,0",
      scrimAlpha,
    };
  }

  return {
    text: "#0b0b10",
    muted: "rgba(11,11,16,0.72)",
    chipBg: "rgba(255,255,255,0.62)",
    chipBorder: "rgba(0,0,0,0.12)",
    textShadow: "0 1px 10px rgba(255,255,255,0.40)",
    scrimRgb: "255,255,255",
    scrimAlpha,
  };
}

/**
 * Escolhe a combinação texto + véu:
 *  - texto branco com véu preto, ou
 *  - texto escuro com véu branco.
 * O tema define a preferência; só troca de lado quando a preferida não
 * alcança contraste AA sobre aquela foto.
 */
function decide(
  measured: number | null,
  theme: Theme,
  hasImage: boolean,
  alpha: number
): CoverContrast {
  const preferWhite = theme === "dark";

  if (measured === null) return build(preferWhite, hasImage, alpha);

  const whiteOnBlackScrim = contrast(1, measured * (1 - alpha));
  const darkOnWhiteScrim = contrast(DARK_TEXT_LUM, measured * (1 - alpha) + alpha);

  const preferred = preferWhite ? whiteOnBlackScrim : darkOnWhiteScrim;
  const useWhite =
    preferred >= MIN_CONTRAST ? preferWhite : whiteOnBlackScrim >= darkOnWhiteScrim;

  return build(useWhite, hasImage, alpha);
}

/* ---------- medição da imagem ---------- */

// cache simples: não refaz a medição para a mesma imagem/região
const cache = new Map<string, number>();

function measureImage(
  url: string,
  region: { x: number; y: number; w: number; h: number }
): Promise<number | null> {
  const key = `${url.length}:${url.slice(-64)}|${region.x},${region.y},${region.w},${region.h}`;
  const hit = cache.get(key);
  if (hit !== undefined) return Promise.resolve(hit);

  return new Promise((resolve) => {
    const img = new Image();
    // necessário para URLs de outro domínio; data/blob URL ignoram
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const SIZE = 48; // miniatura: rápida e suficiente para a média
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);

        ctx.drawImage(img, 0, 0, SIZE, SIZE);

        const sx = Math.floor(region.x * SIZE);
        const sy = Math.floor(region.y * SIZE);
        const sw = Math.max(1, Math.floor(region.w * SIZE));
        const sh = Math.max(1, Math.floor(region.h * SIZE));
        const { data } = ctx.getImageData(sx, sy, sw, sh);

        let total = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 16) continue; // ignora pixels transparentes
          total += luminance(data[i], data[i + 1], data[i + 2]);
          count++;
        }
        if (count === 0) return resolve(null);

        const avg = total / count;
        cache.set(key, avg);
        resolve(avg);
      } catch {
        // canvas "contaminado" (imagem de outro domínio sem CORS): usa o tema
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/* ---------- hook ---------- */

const DEFAULT_REGION = { x: 0, y: 0, w: 0.65, h: 1 };

export function useCoverContrast({
  theme,
  imageUrl,
  measure = true,
  scrimAlpha = 0.5,
  region = DEFAULT_REGION,
}: Options): CoverContrast {
  const { x, y, w, h } = region;
  const hasImage = Boolean(imageUrl);

  // valor inicial pelo tema, para não piscar enquanto mede
  const [result, setResult] = useState<CoverContrast>(() =>
    decide(null, theme, hasImage, scrimAlpha)
  );

  useEffect(() => {
    let cancelled = false;

    if (!imageUrl || !measure) {
      setResult(decide(null, theme, hasImage, scrimAlpha));
      return;
    }

    measureImage(imageUrl, { x, y, w, h }).then((lum) => {
      if (!cancelled) setResult(decide(lum, theme, true, scrimAlpha));
    });

    return () => {
      cancelled = true;
    };
  }, [theme, imageUrl, measure, hasImage, scrimAlpha, x, y, w, h]);

  return result;
}