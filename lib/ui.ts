import type { CSSProperties } from "react";

import { PRIMARY_BTN } from "./theme";

/**
 * KIT DE ESTILO DO YOUR MIND (baseado na tela Início).
 * Todas as telas e modais usam estes tokens, então mudar aqui muda o app todo.
 *
 * Regras de design:
 *  - cards e modais: rounded-2xl | botões grandes: rounded-2xl | campos e botões pequenos: rounded-xl
 *  - títulos de página: text-3xl font-extrabold | rótulos: text-[10px] uppercase tracking-wider
 *  - ações principais usam a cor de destaque; o resto é neutro (zinc)
 */
export function getUi(dark: boolean) {
  return {
    /** Cartão / seção */
    panel: dark
      ? "border-white/[0.08] bg-zinc-900/50 backdrop-blur-md shadow-lg"
      : "border-zinc-200/80 bg-white/90 shadow-xs",
    /** Cartão clicável (lista de processos, pastas...) */
    panelHover: dark ? "hover:border-white/20" : "hover:border-zinc-300",

    title: dark ? "text-zinc-100" : "text-zinc-900",
    text: dark ? "text-zinc-300" : "text-zinc-700",
    subtitle: dark ? "text-zinc-400" : "text-zinc-500",
    muted: "text-zinc-500",

    hover: dark ? "hover:bg-white/[0.05]" : "hover:bg-zinc-100/70",
    divider: dark ? "border-white/10" : "border-zinc-200/60",
    soft: dark ? "bg-white/[0.04]" : "bg-zinc-100",

    /** Campo de texto */
    field: dark
      ? "border-white/10 bg-white/[0.03] text-zinc-100 placeholder:text-zinc-500 focus:border-white/25"
      : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400",

    /** Caixa de entrada com ícone (foco no container) */
    inputBox: dark
      ? "border-white/10 bg-white/[0.03] focus-within:border-white/20"
      : "border-zinc-200 bg-zinc-50 focus-within:border-zinc-300",

    /** Botão principal (cor de destaque) */
    btnPrimary: `inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold shadow-md transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${PRIMARY_BTN}`,
    btnPrimarySm: `inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 ${PRIMARY_BTN}`,

    btnPrimaryMd: `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-md transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${PRIMARY_BTN}`,

    /** Botão secundário (borda) */
    btnSecondary: dark
      ? "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/70 px-5 py-3 text-xs font-bold text-zinc-200 shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-zinc-900/90 active:scale-[0.98]"
      : "inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white/90 px-5 py-3 text-xs font-bold text-zinc-800 shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-white active:scale-[0.98]",

    /** Botão discreto (Cancelar, Fechar) */
    btnGhost: dark
      ? "rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/15"
      : "rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-200",

    /** Botão só com ícone */
    iconBtn: dark
      ? "rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
      : "rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900",

    /** Opção de lista dentro de um modal (enviar imagem, escolher modelo...) */
    option: dark
      ? "border-white/10 bg-white/[0.02] text-zinc-200 hover:bg-white/[0.06]"
      : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100",

    /** Cartão do modal */
    modalCard: dark ? "border-white/10 bg-zinc-900" : "border-zinc-200 bg-white",

    /** Pílula pequena (etiquetas) */
    chip: dark
      ? "bg-white/[0.07] text-zinc-300 hover:bg-white/[0.13]"
      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",

    /** Botão de exclusão (preenchido) */
    btnDangerSolid:
      "inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-red-600 active:scale-[0.98]",

    /** Botão de perigo */
    btnDanger:
      "inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20",
  };
}

export type Ui = ReturnType<typeof getUi>;

/** Tamanhos base (rem) dos textos do Tailwind v4 */
const TEXT_BASE_REM: Record<string, number> = {
  xs: 0.75,
  sm: 0.875,
  base: 1,
  lg: 1.125,
  xl: 1.25,
  "2xl": 1.5,
  "3xl": 1.875,
  "4xl": 2.25,
};

/**
 * Escala todos os textos (text-xs, text-sm, text-base...) de uma área.
 * Use no elemento que envolve a funcionalidade: style={textScaleStyle(115)}.
 * Funciona porque o Tailwind v4 lê os tamanhos de variáveis CSS (--text-*),
 * e variáveis redefinidas num elemento valem só para o que está dentro dele.
 */
export function textScaleStyle(percent: number): CSSProperties {
  const factor = percent / 100;

  if (!Number.isFinite(factor) || factor === 1) return {};

  const vars: Record<string, string> = {};

  for (const [name, rem] of Object.entries(TEXT_BASE_REM)) {
    vars[`--text-${name}`] = `${(rem * factor).toFixed(4)}rem`;
  }

  return vars as CSSProperties;
}