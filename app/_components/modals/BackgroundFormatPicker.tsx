"use client";

import React from "react";
import { Check } from "lucide-react";

import {
  BG_PATTERNS,
  BG_VARIANTS,
  BgPattern,
  BgVariant,
} from "@/lib/settings";
import { PreviewOverride } from "@/lib/savedAppearance";
import { withAlpha } from "@/lib/theme";

/** Miniatura de cada formato de fundo, desenhada só com CSS. */
export function formatThumbnail(
  id: BgVariant | BgPattern,
  accent: string,
  dark: boolean
): React.CSSProperties {
  const line = dark ? "255,255,255" : "10,10,30";
  const base = dark ? "#07070a" : "#f6f6f9";

  switch (id) {
    case "lights":
      return {
        background: `radial-gradient(circle at 20% 20%, ${withAlpha(
          accent,
          0.5
        )}, transparent 55%), radial-gradient(circle at 85% 90%, ${withAlpha(
          accent,
          0.35
        )}, transparent 55%), ${base}`,
      };
    case "bubbles":
      return {
        backgroundColor: base,
        backgroundImage: [
          `radial-gradient(circle at 22% 70%, transparent 8px, rgba(${line},0.5) 8px, rgba(${line},0.5) 9.5px, transparent 10px)`,
          `radial-gradient(circle at 60% 35%, transparent 13px, rgba(${line},0.5) 13px, rgba(${line},0.5) 14.5px, transparent 15px)`,
          `radial-gradient(circle at 82% 78%, transparent 5px, rgba(${line},0.5) 5px, rgba(${line},0.5) 6.5px, transparent 7px)`,
        ].join(","),
      };
    case "stars":
      return {
        backgroundColor: base,
        backgroundImage: [
          `radial-gradient(circle at 15% 25%, rgba(${line},0.9) 1px, transparent 1.6px)`,
          `radial-gradient(circle at 40% 70%, rgba(${line},0.7) 1px, transparent 1.6px)`,
          `radial-gradient(circle at 62% 30%, rgba(${line},0.95) 1.4px, transparent 2px)`,
          `radial-gradient(circle at 82% 62%, rgba(${line},0.7) 1px, transparent 1.6px)`,
          `radial-gradient(circle at 92% 18%, rgba(${line},0.8) 1px, transparent 1.6px)`,
          `radial-gradient(circle at 28% 88%, rgba(${line},0.6) 1px, transparent 1.6px)`,
        ].join(","),
      };
    case "waves":
      return {
        background: `radial-gradient(ellipse 90% 40% at 30% 112%, ${withAlpha(
          accent,
          0.55
        )} 0%, transparent 100%), radial-gradient(ellipse 90% 35% at 80% 120%, ${withAlpha(
          accent,
          0.4
        )} 0%, transparent 100%), ${base}`,
      };
    case "grid":
      return {
        backgroundColor: base,
        backgroundImage: `linear-gradient(to right, rgba(${line},0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(${line},0.3) 1px, transparent 1px)`,
        backgroundSize: "10px 10px",
      };
    case "dots":
      return {
        backgroundColor: base,
        backgroundImage: `radial-gradient(circle, rgba(${line},0.7) 1.2px, transparent 1.8px)`,
        backgroundSize: "9px 9px",
      };
    case "lines":
      return {
        backgroundColor: base,
        backgroundImage: `repeating-linear-gradient(135deg, rgba(${line},0.4) 0 1px, transparent 1px 7px)`,
      };
    default:
      return { backgroundColor: base };
  }
}

/* ───────────────────────── miniatura clicável ───────────────────────── */

interface TileProps {
  id: BgVariant | BgPattern;
  label: string;
  selected: boolean;
  dark: boolean;
  accent: string;
  onPick: () => void;
  /** o que a pré-visualização mostra enquanto o mouse está sobre a miniatura */
  onPeek?: (override: PreviewOverride | null) => void;
  peekOverride: PreviewOverride;
}

function Tile({
  id,
  label,
  selected,
  dark,
  accent,
  onPick,
  onPeek,
  peekOverride,
}: TileProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      onMouseEnter={() => onPeek?.(peekOverride)}
      onMouseLeave={() => onPeek?.(null)}
      onFocus={() => onPeek?.(peekOverride)}
      onBlur={() => onPeek?.(null)}
      className={`overflow-hidden rounded-xl border text-left transition-all cursor-pointer hover:-translate-y-0.5 ${
        dark ? "border-white/10" : "border-zinc-200/60"
      }`}
      style={
        selected
          ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}` }
          : undefined
      }
    >
      <div
        className="relative h-14 w-full"
        style={formatThumbnail(id, accent, dark)}
      >
        {selected && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
            <Check size={12} className="text-white" />
          </span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <span
          className={`text-xs font-medium ${
            selected
              ? dark
                ? "text-zinc-100"
                : "text-zinc-900"
              : dark
              ? "text-zinc-300"
              : "text-zinc-700"
          }`}
        >
          {label}
        </span>
      </div>
    </button>
  );
}

/* ───────────────────────── seletor de formato do fundo ───────────────────────── */

interface BackgroundFormatPickerProps {
  dark: boolean;
  accent: string;
  /** luz escolhida ("none" = sem luzes) */
  variant: BgVariant;
  /** padrão escolhido ("none" = liso) */
  pattern: BgPattern;
  onChangeVariant: (variant: BgVariant) => void;
  onChangePattern: (pattern: BgPattern) => void;
  onPeek?: (override: PreviewOverride | null) => void;
}

/**
 * Escolha do fundo animado: uma luz e um padrão, que podem ficar juntos.
 * É o mesmo bloco usado nas Configurações e no assistente inicial.
 */
export default function BackgroundFormatPicker({
  dark,
  accent,
  variant,
  pattern,
  onChangeVariant,
  onChangePattern,
  onPeek,
}: BackgroundFormatPickerProps) {
  const heading = `mb-2 text-[11px] font-semibold text-zinc-500`;

  return (
    <div>
      <div className="mb-4">
        <p className={heading}>Luzes</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {BG_VARIANTS.map((v) => (
            <Tile
              key={v.id}
              id={v.id}
              label={v.label}
              selected={variant === v.id}
              dark={dark}
              accent={accent}
              /* clicar de novo na luz escolhida desliga */
              onPick={() => onChangeVariant(variant === v.id ? "none" : v.id)}
              onPeek={onPeek}
              peekOverride={{ bgVariant: v.id }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className={heading}>Padrões</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {BG_PATTERNS.map((p) => (
            <Tile
              key={p.id}
              id={p.id}
              label={p.label}
              selected={pattern === p.id}
              dark={dark}
              accent={accent}
              onPick={() => onChangePattern(p.id)}
              onPeek={onPeek}
              peekOverride={{ bgPattern: p.id }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}