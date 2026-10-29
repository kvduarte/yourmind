"use client";

import React, { createContext, useContext } from "react";

/* =========================================================
   CONFIGURAÇÕES DO APP (salvas no navegador)
========================================================= */

export type UiScale = "normal" | "large" | "xlarge";
export type Radius = "sharp" | "soft" | "round";

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
  /** Nome usado na saudação da tela inicial */
  userName: string;
  /** Velocidade do zoom do fluxograma com a roda do mouse (%) */
  flowZoomSpeed: number;

  /* ---------- imagem de fundo (Configurações > Aparência) ---------- */
  /** Cor de destaque (hex) */
  accentColor?: string;
  /** Link da imagem, ou "idb:<n>" quando a foto veio da galeria (guardada no IndexedDB) */
  bgImageUrl?: string;
  /** 0 a 100 — o quanto a imagem aparece sobre o fundo */
  bgImageOpacity?: number;
  /** 0 a 200 — 0 = preto e branco, 100 = cor original, 200 = cores vivas */
  bgImageSaturation?: number;
  /** 0 a 90 — véu da cor do tema sobre a imagem, para dar leitura ao texto */
  bgImageVeil?: number;
}

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
  flowZoomSpeed: 50,
  userName: "",
  accentColor: "#6366f1",
  bgImageUrl: "",
  bgImageOpacity: 30,
  bgImageSaturation: 100,
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

/** Cor de destaque antiga (vinho). Quem nunca a trocou passa a usar o índigo. */
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
      uiScale: parsed.uiScale && parsed.uiScale in UI_SCALE_PX ? parsed.uiScale : "large",
      radius: parsed.radius && parsed.radius in RADIUS_FACTOR ? parsed.radius : "soft",
      textScaleHome: clamp(parsed.textScaleHome, TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_SETTINGS.textScaleHome),
      textScaleFlows: clamp(parsed.textScaleFlows, TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_SETTINGS.textScaleFlows),
      textScaleNotes: clamp(parsed.textScaleNotes, TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_SETTINGS.textScaleNotes),
      textScaleProcesses: clamp(parsed.textScaleProcesses, TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_SETTINGS.textScaleProcesses),
      userName: typeof parsed.userName === "string" ? parsed.userName.trim().slice(0, 40) : "",
      flowZoomSpeed: clamp(parsed.flowZoomSpeed, 10, 150, DEFAULT_SETTINGS.flowZoomSpeed),
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