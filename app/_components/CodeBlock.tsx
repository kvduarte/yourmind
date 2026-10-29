"use client";

import React, { useDeferredValue, useMemo } from "react";
import { Check, Copy, Link2, Sparkles, X } from "lucide-react";

import { Node } from "@/types";
import { useSettings } from "@/lib/settings";
import {
  AUTO_LANGUAGE,
  LANGUAGES,
  detectLanguage,
  getLanguageInfo,
} from "@/lib/code/highlight";
import { extractSymbols } from "@/lib/code/symbols";

import { CodeEditor } from "./codenode";

interface CodeBlockProps {
  node: Node;
  isDark: boolean;
  copied: boolean;
  /** este bloco é a origem de uma ligação em andamento */
  isSource: boolean;
  onChange: (changes: Partial<Node>) => void;
  onCopy: () => void;
  onDelete: () => void;
  onConnect: () => void;
  onHeaderMouseDown: (e: React.MouseEvent) => void;
}

/** Bloco de código do fluxograma de programação com design limpo e minimalista. */
export default function CodeBlock({
  node,
  isDark,
  copied,
  isSource,
  onChange,
  onCopy,
  onDelete,
  onConnect,
  onHeaderMouseDown,
}: CodeBlockProps) {
  const code = node.code || "";
  const { autoDetectLanguage } = useSettings();
  const deferred = useDeferredValue(code);

  const manual =
    node.language && node.language !== AUTO_LANGUAGE ? node.language : null;

  const detected = useMemo(
    () => (manual || !autoDetectLanguage ? null : detectLanguage(deferred)),
    [manual, autoDetectLanguage, deferred]
  );

  const label = manual ?? detected;
  const info = getLanguageInfo(label ?? undefined);
  const symbols = useMemo(() => extractSymbols(deferred), [deferred]);
  const lines = code ? code.split("\n").length : 0;

  const borderClass = isDark ? "border-zinc-800" : "border-zinc-200";
  const bgBar = isDark ? "bg-zinc-900/80" : "bg-zinc-50";
  const textMuted = "text-zinc-400";
  const iconBtn = isDark
    ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
    : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900";

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border ${borderClass} ${
        isDark ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900"
      } shadow-sm`}
    >
      {/* Cabeçalho (arrastar) */}
      <div
        onMouseDown={onHeaderMouseDown}
        className={`flex h-9 shrink-0 cursor-grab items-center gap-2 border-b px-3 active:cursor-grabbing ${borderClass} ${bgBar}`}
      >
        {/* Indicador de linguagem / ponto */}
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: info?.color ?? (isDark ? "#71717a" : "#a1a1aa") }}
        />

        <input
          value={node.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="arquivo.ext"
          spellCheck={false}
          className={`min-w-0 flex-1 bg-transparent text-xs font-medium outline-none ${
            isDark
              ? "text-zinc-200 placeholder:text-zinc-600"
              : "text-zinc-800 placeholder:text-zinc-400"
          }`}
        />

        {/* Seletor de linguagem */}
        <div className="relative flex items-center">
          {!manual && (
            <Sparkles
              size={10}
              className="pointer-events-none absolute left-2 text-zinc-400"
            />
          )}

          <select
            value={node.language || AUTO_LANGUAGE}
            onChange={(e) => onChange({ language: e.target.value })}
            title="Linguagem (Auto detecta sozinho)"
            className={`cursor-pointer rounded border py-1 pr-1.5 text-[10px] outline-none transition-colors ${
              manual ? "pl-2" : "pl-5"
            } ${borderClass} ${
              isDark
                ? "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                : "bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <option value={AUTO_LANGUAGE}>
              {detected ? `Auto · ${detected}` : "Auto"}
            </option>

            {LANGUAGES.map((language) => (
              <option key={language.label} value={language.label}>
                {language.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botão de Conectar */}
        <button
          onClick={onConnect}
          title="Ligar a outro bloco"
          className={`rounded p-1 transition-colors ${
            isSource
              ? isDark
                ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                : "bg-zinc-200 text-zinc-900 ring-1 ring-zinc-400"
              : iconBtn
          }`}
        >
          <Link2 size={13} />
        </button>

        {/* Botão de Copiar */}
        <button onClick={onCopy} title="Copiar código" className={`rounded p-1 ${iconBtn}`}>
          {copied ? <Check size={13} className={isDark ? "text-zinc-100" : "text-zinc-900"} /> : <Copy size={13} />}
        </button>

        {/* Botão de Excluir */}
        <button
          onClick={onDelete}
          title="Excluir bloco"
          className={`rounded p-1 ${iconBtn} hover:!text-red-500`}
        >
          <X size={13} />
        </button>
      </div>

      {/* Descrição: o que esse arquivo faz */}
      <input
        value={node.description ?? ""}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="O que este bloco faz? (ajuda você e a IA)"
        className={`h-7 shrink-0 border-b bg-transparent px-3 text-[11px] outline-none ${borderClass} ${
          isDark
            ? "text-zinc-300 placeholder:text-zinc-600"
            : "text-zinc-700 placeholder:text-zinc-400"
        }`}
      />

      {/* Resumo: funções e classes encontradas */}
      {symbols.length > 0 && (
        <div className={`flex shrink-0 flex-wrap items-center gap-1.5 border-b px-3 py-1.5 ${borderClass} ${isDark ? "bg-zinc-900/40" : "bg-zinc-50/50"}`}>
          {symbols.slice(0, 7).map((symbol) => (
            <span
              key={`${symbol.kind}-${symbol.name}`}
              className={`flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] ${borderClass} ${
                isDark ? "bg-zinc-900 text-zinc-300" : "bg-zinc-100 text-zinc-700"
              }`}
            >
              <span className="opacity-50">{symbol.kind === "class" ? "C" : "ƒ"}</span>
              {symbol.name}
            </span>
          ))}

          {symbols.length > 7 && (
            <span className={`text-[10px] ${textMuted}`}>+{symbols.length - 7}</span>
          )}
        </div>
      )}

      {/* Editor de código */}
      <CodeEditor
        value={code}
        onChange={(value) => onChange({ code: value })}
        languageLabel={label}
        isDark={isDark}
        placeholder="Cole o código aqui — a linguagem é detectada sozinha"
      />

      {/* Rodapé do bloco */}
      <div
        className={`flex shrink-0 items-center justify-between border-t px-3 py-1 text-[10px] ${borderClass} ${bgBar} ${textMuted}`}
      >
        <span className="flex items-center gap-1.5">
          {info && (
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: info.color }} />
          )}
          {label ?? "Texto simples"}
          {!manual && label && <span className="text-zinc-400/70">auto</span>}
        </span>

        <span>
          {lines} {lines === 1 ? "linha" : "linhas"}
        </span>
      </div>
    </div>
  );
}