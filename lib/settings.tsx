"use client";

import React, { createContext, useContext } from "react";

import { CURATED_PALETTES } from "@/lib/theme";

/* =========================================================
   CONFIGURAÇÕES DO APP (salvas no navegador)
========================================================= */

export type UiScale = "normal" | "large" | "xlarge";
export type Radius = "sharp" | "soft" | "round";
export type ColorStyle = "solid" | "gradient" | "preset";

/** Formatos de fundo disponíveis em Configurações > Aparência */
/** Luzes do fundo (uma por vez; "none" = sem luzes) */
export type BgVariant = "lights" | "bubbles" | "stars" | "waves" | "none";

/** Padrões do fundo (um por vez; "none" = liso). Podem ficar junto com as luzes. */
export type BgPattern = "grid" | "dots" | "lines" | "none";

export const BG_VARIANTS: { id: Exclude<BgVariant, "none">; label: string }[] = [
  { id: "lights", label: "Luzes" },
  { id: "bubbles", label: "Bolhas" },
  { id: "stars", label: "Estrelas" },
  { id: "waves", label: "Ondas" },
];

export const BG_PATTERNS: { id: BgPattern; label: string }[] = [
  { id: "grid", label: "Grade" },
  { id: "dots", label: "Pontos" },
  { id: "lines", label: "Linhas" },
  { id: "none", label: "Liso" },
];

/**
 * Lê o fundo salvo. Antes existia um único campo (bgVariant) que misturava
 * luzes e padrões: grade/pontos/linhas/liso viram `bgPattern`.
 */
function migrateBackground(parsed: Partial<AppSettings>): {
  bgVariant: BgVariant;
  bgPattern: BgPattern;
} {
  const rawVariant = String(parsed.bgVariant ?? "");
  const rawPattern = String(parsed.bgPattern ?? "");

  const isLight = (v: string) =>
    v === "none" || BG_VARIANTS.some((x) => x.id === v);
  const isPattern = (v: string) => BG_PATTERNS.some((x) => x.id === v);
  const oldPattern = ["grid", "dots", "lines"].includes(rawVariant);

  const bgVariant: BgVariant = isLight(rawVariant)
    ? (rawVariant as BgVariant)
    : oldPattern || rawVariant === "solid"
    ? "none"
    : "lights";

  const bgPattern: BgPattern = isPattern(rawPattern)
    ? (rawPattern as BgPattern)
    : oldPattern
    ? (rawVariant as BgPattern)
    : "none";

  return { bgVariant, bgPattern };
}

export interface AppSettings {
  /** Tamanho de tudo: textos, ícones, botões */
  uiScale: UiScale;
  /** Cantos: retos, suaves ou bem arredondados */
  radius: Radius;
  /** Bolhas animadas no fundo (somente no tema escuro) */
  animatedBackground: boolean;
  /** Tamanho da fonte do editor de código (px) */
  editorFontSize: number;
  /** Mostrar números de linha no editor */
  editorLineNumbers: boolean;
  /** Detectar a linguagem do código automaticamente */
  autoDetectLanguage: boolean;
  /** Abrir o chat da IA já expandido ao entrar no grafo */
  aiChatOpenByDefault: boolean;

  /* ---------- tamanho dos textos de cada funcionalidade (%) ---------- */
  textScaleHome: number;
  textScaleFlows: number;
  textScaleNotes: number;
  textScaleProcesses: number;
  /** lista de planejamentos, pastas e janelas de criar */
  textScalePlanning: number;
  /** Nome usado na saudação da tela inicial */
  userName: string;
  /** Velocidade do zoom do fluxograma com a roda do mouse (%) */
  flowZoomSpeed: number;

  /* ---------- imagem de fundo e cores (Configurações > Aparência) ---------- */
  /** Cor de destaque (hex) */
  accentColor?: string;
  /** Estilo de cor: cor sólida, gradiente dinâmico ou paleta pronta */
  colorStyle?: ColorStyle;
  /** ID da paleta pronta selecionada */
  colorPreset?: string;
  /** Link da imagem, ou "idb:<n>" quando a foto veio da galeria (guardada no IndexedDB) */
  bgImageUrl?: string;
  /** 0 a 100 — o quanto a imagem aparece sobre o fundo */
  bgImageOpacity?: number;
  /** 0 a 200 — 0 = preto e branco, 100 = cor original, 200 = cores vivas */
  bgImageSaturation?: number;
  /** 0 a 90 — véu da cor do tema sobre a imagem, para dar leitura ao texto */
  bgImageVeil?: number;
  /** Luzes do fundo: luzes, bolhas, estrelas, ondas ou nenhuma */
  bgVariant?: BgVariant;
  /** Padrão do fundo: grade, pontos, linhas ou liso (pode ficar junto com as luzes) */
  bgPattern?: BgPattern;
}

/** Paleta pronta padrão (precisa existir em CURATED_PALETTES) */
const DEFAULT_PRESET = "matcha-espresso";

export const DEFAULT_SETTINGS: AppSettings = {
  uiScale: "large",
  radius: "soft",
  animatedBackground: false,
  editorFontSize: 14,
  editorLineNumbers: true,
  autoDetectLanguage: true,
  aiChatOpenByDefault: true,
  textScaleHome: 100,
  textScaleFlows: 115,
  textScaleNotes: 100,
  textScaleProcesses: 115,
  textScalePlanning: 100,
  flowZoomSpeed: 50,
  userName: "",
  accentColor: "",
  colorStyle: "solid",
  colorPreset: DEFAULT_PRESET,
  bgImageUrl: "",
  bgImageOpacity: 30,
  bgImageSaturation: 100,
  bgVariant: "lights",
  bgPattern: "none",
};

/** tamanho base da página (px) e multiplicador dos cantos */
export const UI_SCALE_PX: Record<UiScale, number> = {
  normal: 16,
  large: 18,
  xlarge: 20,
};

export const RADIUS_FACTOR: Record<Radius, number> = {
  sharp: 0.35,
  soft: 1,
  round: 1.7,
};

const STORAGE_KEY = "app_settings";

/** Limites do tamanho de texto por funcionalidade (%) */
export const TEXT_SCALE_MIN = 80;
export const TEXT_SCALE_MAX = 200;

/** Cor de destaque antiga (vinho). Quem nunca a trocou passa a usar o padrão. */
const LEGACY_ACCENT = "#881337";

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<AppSettings>;

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      accentColor:
        !parsed.accentColor || parsed.accentColor.toLowerCase() === LEGACY_ACCENT
          ? DEFAULT_SETTINGS.accentColor
          : parsed.accentColor,
      colorStyle:
        parsed.colorStyle && ["solid", "gradient", "preset"].includes(parsed.colorStyle)
          ? parsed.colorStyle
          : "solid",
      colorPreset:
        typeof parsed.colorPreset === "string" &&
        CURATED_PALETTES.some((p) => p.id === parsed.colorPreset)
          ? parsed.colorPreset
          : DEFAULT_PRESET,
      uiScale: parsed.uiScale && parsed.uiScale in UI_SCALE_PX ? parsed.uiScale : "large",
      radius: parsed.radius && parsed.radius in RADIUS_FACTOR ? parsed.radius : "soft",
      textScaleHome: clamp(parsed.textScaleHome, TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_SETTINGS.textScaleHome),
      textScaleFlows: clamp(parsed.textScaleFlows, TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_SETTINGS.textScaleFlows),
      textScaleNotes: clamp(parsed.textScaleNotes, TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_SETTINGS.textScaleNotes),
      textScaleProcesses: clamp(parsed.textScaleProcesses, TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_SETTINGS.textScaleProcesses),
      textScalePlanning: clamp(parsed.textScalePlanning, TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_SETTINGS.textScalePlanning),
      userName: typeof parsed.userName === "string" ? parsed.userName.trim().slice(0, 40) : "",
      flowZoomSpeed: clamp(parsed.flowZoomSpeed, 10, 150, DEFAULT_SETTINGS.flowZoomSpeed),
      ...migrateBackground(parsed),
      bgImageOpacity: clamp(parsed.bgImageOpacity, 0, 100, 30),
      bgImageSaturation: clamp(parsed.bgImageSaturation, 0, 200, 100),
      bgImageVeil:
        parsed.bgImageVeil === undefined
          ? undefined
          : clamp(parsed.bgImageVeil, 0, 90, 0),
      editorFontSize: Math.min(
        20,
        Math.max(10, Number(parsed.editorFontSize) || DEFAULT_SETTINGS.editorFontSize)
      ),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignora */
  }
}

const SettingsContext = createContext<AppSettings>(DEFAULT_SETTINGS);

export const SettingsProvider = SettingsContext.Provider;

export function useSettings() {
  return useContext(SettingsContext);
}