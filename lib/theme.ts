"use client";

import { useEffect, useState } from "react";

/** Cor base do Your Mind. Altere aqui e o app inteiro acompanha. */
export const DEFAULT_ACCENT = "#6366f1";

/** Versão mais clara, para hover e textos de destaque no tema escuro. */
export const ACCENT_SOFT = "#818cf8";

/** Cores semânticas fixas (status). Não mudam com a cor base. */
export const STATUS = {
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
} as const;

/** Botão primário padrão (usa a variável --accent definida por useAccent). */
export const PRIMARY_BTN =
  "bg-[var(--accent)] text-white hover:brightness-110 active:brightness-95";

/** Raios padrão: botões/campos = xl, cards/modais = 2xl. */
export const RADIUS = {
  control: "rounded-xl",
  card: "rounded-2xl",
} as const;

/** Converte "#rrggbb" + opacidade (0–1) em rgba(). */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const n = parseInt(full, 16);

  if (Number.isNaN(n) || full.length !== 6) return hex;

  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function readAccent(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT;

  try {
    const saved = window.localStorage.getItem("app_settings");
    if (!saved) return DEFAULT_ACCENT;

    const parsed = JSON.parse(saved) as { accentColor?: string };
    return parsed.accentColor || DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

/**
 * Lê a cor de acento escolhida em Configurações.
 * Escutamos "storage" (outras abas) e fazemos uma checagem leve
 * a cada 1s, porque o localStorage não avisa mudanças na mesma aba.
 */
export function useAccent(): string {
  const [accent, setAccent] = useState(DEFAULT_ACCENT);

  useEffect(() => {
    const update = () => {
      const next = readAccent();
      setAccent(next);
      document.documentElement.style.setProperty("--accent", next);
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