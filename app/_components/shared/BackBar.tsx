"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";

import { Theme } from "@/types";
import { useAccent, withAlpha } from "@/lib/theme";

interface BackBarProps {
  theme: Theme;
  backLabel: string;
  onBack: () => void;
  title: string;
  badge?: string;
  color?: string;
  icon: React.ReactNode;
}

/** Barra superior de navegação interna: limpa, minimalista e monocromática. */
export default function BackBar({
  theme,
  backLabel,
  onBack,
  title,
  badge,
  icon,
}: BackBarProps) {
  const dark = theme === "dark";
  const accent = useAccent();

  return (
    <header
      className={`flex h-14 shrink-0 items-center gap-3 border-b px-4 transition-colors ${
        dark
          ? "border-white/[0.08] bg-zinc-950/90 text-zinc-100 backdrop-blur-xl"
          : "border-zinc-200/80 bg-white/90 text-zinc-900 backdrop-blur-xl"
      }`}
    >
      {/* Botão Voltar */}
      <button
        onClick={onBack}
        className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
          dark
            ? "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1] hover:text-white"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900"
        }`}
      >
        <ArrowLeft size={14} className="shrink-0" />
        <span>{backLabel}</span>
      </button>

      {/* Divisor vertical */}
      <span
        className={`h-4 w-px ${dark ? "bg-zinc-800" : "bg-zinc-200"}`}
        aria-hidden="true"
      />

      {/* Ícone da Seção */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-sm"
        style={{
          borderColor: withAlpha(accent, 0.3),
          backgroundColor: withAlpha(accent, 0.12),
          color: accent,
        }}
      >
        {icon}
      </div>

      {/* Título */}
      <h1 className="truncate text-sm font-semibold tracking-tight">
        {title}
      </h1>

      {/* Badge opcional */}
      {badge && (
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none ${
            dark
              ? "border-zinc-800 bg-zinc-900 text-zinc-400"
              : "border-zinc-200 bg-zinc-100 text-zinc-600"
          }`}
        >
          {badge}
        </span>
      )}
    </header>
  );
}