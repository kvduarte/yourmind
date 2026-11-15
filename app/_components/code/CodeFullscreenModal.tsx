"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Minus, Plus, X } from "lucide-react";

import { Node } from "@/types";
import { AUTO_LANGUAGE, LANGUAGES, detectLanguage, getLanguageInfo } from "@/lib/code/highlight";
import { extractSymbols } from "@/lib/code/symbols";
import { FileTypeIcon, fileTypeOf } from "@/lib/fileIcons";

import { CodeEditor } from "./codenode";

interface CodeFullscreenModalProps {
  node: Node;
  /** texto do caminho (ex.: app/lib) mostrado ao lado do nome */
  path?: string;
  onChange: (changes: Partial<Node>) => void;
  onClose: () => void;
}

/**
 * Editor de código em tela cheia. Tudo o que você escreve é salvo na hora.
 * Visual de editor (sempre escuro), para diferenciar dos pop-ups comuns do app.
 */
export default function CodeFullscreenModal({ node, path, onChange, onClose }: CodeFullscreenModalProps) {
  const code = node.code ?? "";
  const manual = node.language && node.language !== AUTO_LANGUAGE ? node.language : null;
  const detected = useMemo(() => (manual ? null : detectLanguage(code)), [manual, code]);
  const label = manual ?? detected;
  const info = getLanguageInfo(label ?? undefined);
  const type = fileTypeOf(node.title, label ?? undefined);
  const symbols = useMemo(() => extractSymbols(code, 40), [code]);
  const lines = code ? code.split("\n").length : 0;

  const [fontSize, setFontSize] = useState(15);
  const [wrap, setWrap] = useState(false);
  const [copied, setCopied] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  /* Esc fecha; trava a rolagem da página por baixo */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", onKey, true);

    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const jumpTo = (name: string) => {
    const textarea = areaRef.current?.querySelector("textarea");

    if (!textarea) return;

    const list = code.split("\n");
    const index = Math.max(0, list.findIndex((line) => line.includes(name)));
    const lineHeight = Math.round(fontSize * 1.65);
    const offset = list.slice(0, index).join("\n").length + (index > 0 ? 1 : 0);

    textarea.focus();
    textarea.setSelectionRange(offset, offset + (list[index]?.length ?? 0));
    textarea.scrollTop = Math.max(0, index * lineHeight - 80);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignora */
    }
  };

  const bar = "border-[#2a2a31] bg-[#16161a]";
  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0d0d10] text-zinc-100" role="dialog" aria-modal="true" aria-label="Editor de código">
      {/* barra de título */}
      <div className={`flex h-12 shrink-0 items-center gap-3 border-b px-4 ${bar}`}>
        <FileTypeIcon name={node.title} language={label ?? undefined} size={20} />

        <input
          autoFocus={!code}
          value={node.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="nome-do-arquivo.ext"
          spellCheck={false}
          className="w-64 min-w-0 bg-transparent text-sm font-semibold outline-none placeholder:text-zinc-600"
        />

        {path && <span className="hidden truncate text-xs text-zinc-500 md:block">em {path}</span>}

        <span className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:flex" style={{ backgroundColor: `${type.color}22`, color: type.color }}>
          {type.label}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <select
            value={node.language || AUTO_LANGUAGE}
            onChange={(e) => onChange({ language: e.target.value })}
            title="Linguagem (Auto detecta sozinho)"
            className="h-8 cursor-pointer rounded-md border border-[#2a2a31] bg-[#1c1c22] px-2 text-xs text-zinc-300 outline-none"
          >
            <option value={AUTO_LANGUAGE}>{detected ? `Auto · ${detected}` : "Auto"}</option>
            {LANGUAGES.map((language) => (
              <option key={language.label} value={language.label}>
                {language.label}
              </option>
            ))}
          </select>

          <span className="mx-1 h-5 w-px bg-[#2a2a31]" />

          <button onClick={() => setFontSize((v) => Math.max(11, v - 1))} className={iconBtn} title="Diminuir letra" aria-label="Diminuir letra">
            <Minus size={14} />
          </button>

          <span className="w-8 text-center text-[11px] text-zinc-500">{fontSize}px</span>

          <button onClick={() => setFontSize((v) => Math.min(26, v + 1))} className={iconBtn} title="Aumentar letra" aria-label="Aumentar letra">
            <Plus size={14} />
          </button>

          <button
            onClick={() => setWrap((v) => !v)}
            className={`${iconBtn} ${wrap ? "!bg-white/10 !text-zinc-100" : ""}`}
            title="Quebrar linhas longas"
            aria-label="Quebrar linhas longas"
          >
            <span className="text-[13px] font-bold leading-none">↵</span>
          </button>

          <button onClick={copy} className={iconBtn} title="Copiar código" aria-label="Copiar código">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>

          <button
            onClick={onClose}
            className="ml-1 flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-3 text-xs font-semibold text-zinc-100 hover:bg-white/15"
            title="Fechar (Esc)"
          >
            <X size={14} />
            Fechar
          </button>
        </div>
      </div>

      {/* descrição */}
      <input
        value={node.description ?? ""}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="O que este arquivo faz? (ajuda você e a IA)"
        className={`h-9 shrink-0 border-b bg-transparent px-4 text-xs text-zinc-300 outline-none placeholder:text-zinc-600 ${bar}`}
      />

      {/* corpo */}
      <div className="flex min-h-0 flex-1">
        {symbols.length > 0 && (
          <aside className={`thin-scroll hidden w-60 shrink-0 overflow-y-auto border-r p-3 md:block ${bar}`}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Funções e classes</p>

            <ul className="space-y-0.5">
              {symbols.map((symbol) => (
                <li key={`${symbol.kind}-${symbol.name}`}>
                  <button
                    onClick={() => jumpTo(symbol.name)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-mono text-xs text-zinc-300 hover:bg-white/10"
                  >
                    <span className="w-3 text-center text-zinc-500">{symbol.kind === "class" ? "C" : "ƒ"}</span>
                    <span className="truncate">{symbol.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div ref={areaRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
          <CodeEditor
            value={code}
            onChange={(value) => onChange({ code: value })}
            languageLabel={label}
            isDark
            fontSize={fontSize}
            wrap={wrap}
            autoFocus={!!code}
            placeholder="Cole ou escreva o código aqui — a linguagem é detectada sozinha"
          />
        </div>
      </div>

      {/* barra de status */}
      <div className={`flex h-7 shrink-0 items-center justify-between border-t px-4 text-[11px] text-zinc-500 ${bar}`}>
        <span className="flex items-center gap-2">
          {info && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: info.color }} />}
          {label ?? "Texto simples"}
          {!manual && label && <span className="text-zinc-600">detectado</span>}
        </span>

        <span>
          {lines} {lines === 1 ? "linha" : "linhas"} · {code.length} caracteres · salvo automaticamente
        </span>
      </div>
    </div>
  );
}