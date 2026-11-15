"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PALETTE } from "@/lib/pipeline";
import { withAlpha } from "@/lib/theme";
import { Ui } from "@/lib/ui";

/* =========================================================
   PEÇAS VISUAIS DO PLANEJAMENTO
========================================================= */

export function StatCard({
  ui,
  accent,
  icon,
  value,
  label,
}: {
  ui: Ui;
  accent: string;
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${ui.panel}`}>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: withAlpha(accent, 0.1), color: accent }}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <span className={`block text-2xl font-black tracking-tight ${ui.title}`}>{value}</span>
        <span className={`block truncate text-[11px] font-semibold ${ui.subtitle}`}>{label}</span>
      </div>
    </div>
  );
}

export function Card({ ui, title, children }: { ui: Ui; title: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-5 ${ui.panel}`}>
      <h2 className={`mb-3 text-[10px] font-bold uppercase tracking-wider ${ui.subtitle}`}>{title}</h2>

      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function MiniRow({
  ui,
  title,
  meta,
  metaClass,
  onClick,
}: {
  ui: Ui;
  title: string;
  meta?: string;
  metaClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${ui.hover}`}
    >
      <span className={`truncate text-xs font-semibold ${ui.title}`}>{title}</span>

      {meta && <span className={`shrink-0 text-[11px] font-semibold ${metaClass ?? ui.subtitle}`}>{meta}</span>}
    </button>
  );
}

export function Empty({ ui, children }: { ui: Ui; children: React.ReactNode }) {
  return <p className={`px-2 py-3 text-center text-xs ${ui.subtitle}`}>{children}</p>;
}

export function ProgressBar({
  percent,
  color,
  dark,
  className = "",
}: {
  percent: number;
  color: string;
  dark: boolean;
  className?: string;
}) {
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full ${dark ? "bg-white/8" : "bg-zinc-200"} ${className}`}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  );
}

/**
 * Escolha de cor da bolinha. "Auto" volta para a cor do status.
 * value = "" (automática) ou um hexadecimal da paleta.
 */
export function ColorSwatches({
  value,
  onChange,
  dark,
  size = 22,
  allowAuto = true,
}: {
  value: string;
  onChange: (color: string) => void;
  dark: boolean;
  size?: number;
  /** mostra o botão "Auto" (segue a cor do planejamento) */
  allowAuto?: boolean;
}) {
  const ring = dark ? "ring-white/70 ring-offset-zinc-900" : "ring-zinc-900/70 ring-offset-white";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowAuto && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Cor automática (pelo status)"
          aria-pressed={value === ""}
          title="Automática (cor do status)"
          className={`flex items-center justify-center rounded-full border border-dashed text-[9px] font-bold transition-transform ${
            dark ? "border-zinc-500 text-zinc-400" : "border-zinc-400 text-zinc-500"
          } ${value === "" ? `scale-110 ring-2 ring-offset-2 ${ring}` : "opacity-70 hover:opacity-100"}`}
          style={{ width: size, height: size }}
        >
          Auto
        </button>
      )}

      {PALETTE.map((hex) => (
        <button
          key={hex}
          type="button"
          onClick={() => onChange(hex)}
          aria-label={`Cor ${hex}`}
          aria-pressed={value === hex}
          className={`rounded-full transition-transform ${
            value === hex ? `scale-110 ring-2 ring-offset-2 ${ring}` : "opacity-80 hover:opacity-100"
          }`}
          style={{ width: size, height: size, backgroundColor: hex }}
        />
      ))}
    </div>
  );
}

/* =========================================================
   PAINEL FLUTUANTE (menus e escolha de cor)
   Fica fora dos cartões (no <body>), então nunca é cortado nem
   fica por baixo de outro cartão. Abre para cima se faltar espaço.
========================================================= */

export interface Anchor {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function toAnchor(rect: DOMRect): Anchor {
  return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
}

export function FloatingPanel({
  anchor,
  width,
  onClose,
  className = "",
  children,
}: {
  anchor: Anchor;
  width: number;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) return;

    const height = el.offsetHeight;
    const below = window.innerHeight - anchor.bottom;
    const top = below >= height + 12 ? anchor.bottom + 6 : Math.max(8, anchor.top - height - 6);
    const left = Math.min(Math.max(8, anchor.right - width), window.innerWidth - width - 8);

    setPos({ top, left });
  }, [anchor, width]);

  useEffect(() => {
    const onScroll = (e: Event) => {
      /* rolar dentro do próprio painel não fecha */
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;

      onClose();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60]" onMouseDown={onClose} aria-hidden />

      <div
        ref={ref}
        className={`thin-scroll fixed z-[61] overflow-y-auto ${className}`}
        style={{
          top: pos?.top ?? -9999,
          left: pos?.left ?? -9999,
          width,
          maxHeight: "min(26rem, calc(100vh - 16px))",
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}