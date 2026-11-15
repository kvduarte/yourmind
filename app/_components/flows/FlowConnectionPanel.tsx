"use client";

import React from "react";
import { ArrowLeftRight, Trash2, X } from "lucide-react";

import { Connection } from "@/types";
import {
  ARROW_MODES,
  BRANCHES,
  CONNECTION_COLORS,
  CONNECTION_SHAPES,
  LINE_STYLES,
  connectionLook,
} from "@/lib/flow";

interface FlowConnectionPanelProps {
  connection: Connection;
  fromTitle: string;
  toTitle: string;
  dark: boolean;
  onChange: (changes: Partial<Connection>) => void;
  onReverse: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const LABEL = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400";

/** Painel que abre ao clicar numa linha: cor, espessura, tracejado, setas, direção e legenda. */
export default function FlowConnectionPanel({
  connection,
  fromTitle,
  toTitle,
  dark,
  onChange,
  onReverse,
  onDelete,
  onClose,
}: FlowConnectionPanelProps) {
  const look = connectionLook(connection);

  const chip = (active: boolean) =>
    `rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
      active
        ? "border-[var(--accent)] text-[var(--accent)]"
        : dark
          ? "border-white/10 text-zinc-300 hover:bg-white/5"
          : "border-zinc-200 text-zinc-700 hover:bg-zinc-100"
    }`;

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className={`thin-scroll absolute right-4 top-4 z-40 max-h-[calc(100%-2rem)] w-72 overflow-y-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
        dark ? "border-white/10 bg-zinc-900/95 text-zinc-100" : "border-zinc-200 bg-white/95 text-zinc-900"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold">Conexão</p>
          <p className="mt-0.5 truncate text-[11px] text-zinc-400">
            {fromTitle} → {toTitle}
          </p>
        </div>

        <button type="button" onClick={onClose} aria-label="Fechar painel" className="rounded-lg p-1 text-zinc-400 hover:text-zinc-100">
          <X size={15} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <span className={LABEL}>Legenda (texto sobre a linha)</span>
          <input
            value={connection.label ?? ""}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={connection.branch ? BRANCHES[connection.branch].label : "Ex.: se aprovado"}
            className={`w-full rounded-xl border px-3 py-2 text-xs outline-none ${
              dark
                ? "border-white/10 bg-white/[0.03] placeholder:text-zinc-500 focus:border-white/25"
                : "border-zinc-200 bg-zinc-50 placeholder:text-zinc-400 focus:border-zinc-400"
            }`}
          />

          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ branch: "yes", label: "SIM", color: BRANCHES.yes.color })}
              className={chip(connection.branch === "yes")}
            >
              SIM
            </button>
            <button
              type="button"
              onClick={() => onChange({ branch: "no", label: "NÃO", color: BRANCHES.no.color })}
              className={chip(connection.branch === "no")}
            >
              NÃO
            </button>
            <button
              type="button"
              onClick={() => onChange({ branch: undefined, label: "", color: undefined })}
              className={chip(false)}
            >
              Limpar
            </button>
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-zinc-400">
            Use SIM e NÃO quando o bloco anterior é uma pergunta, por exemplo “Pagamento aprovado?”.
          </p>
        </div>

        <div>
          <span className={LABEL}>Cor</span>
          <div className="flex flex-wrap gap-1.5">
            {CONNECTION_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ color })}
                aria-label={`Cor ${color}`}
                className={`h-5 w-5 rounded-full transition-transform ${
                  look.color === color ? "scale-125 ring-2 ring-white/70 ring-offset-2 ring-offset-zinc-900" : "opacity-80 hover:opacity-100"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className={LABEL}>Espessura · {look.width}px</span>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={look.width}
            onChange={(e) => onChange({ width: Number(e.target.value) })}
            className="w-full"
            style={{ accentColor: "var(--accent)" }}
          />
        </div>

        <div>
          <span className={LABEL}>Tipo de linha</span>
          <div className="flex flex-wrap gap-1.5">
            {LINE_STYLES.map((item) => (
              <button key={item.id} type="button" onClick={() => onChange({ style: item.id })} className={chip(look.style === item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={LABEL}>Formato</span>
          <div className="flex flex-wrap gap-1.5">
            {CONNECTION_SHAPES.map((item) => (
              <button key={item.id} type="button" onClick={() => onChange({ shape: item.id })} className={chip(look.shape === item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={LABEL}>Setas e direção</span>
          <div className="grid grid-cols-2 gap-1.5">
            {ARROW_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.hint}
                onClick={() => onChange({ arrow: item.id })}
                className={chip(look.arrow === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button type="button" onClick={onReverse} className={`${chip(false)} mt-2 flex w-full items-center justify-center gap-1.5`}>
            <ArrowLeftRight size={12} />
            Inverter direção
          </button>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
        >
          <Trash2 size={13} />
          Excluir conexão
        </button>
      </div>
    </div>
  );
}