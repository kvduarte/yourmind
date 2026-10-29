"use client";

import React, { useState } from "react";
import { Palette, UserRound } from "lucide-react";

import { Theme } from "@/types";
import { getUi } from "@/lib/ui";

import ModalShell from "./ModalShell";

interface NameModalProps {
  theme: Theme;
  initialName?: string;
  onSave: (name: string) => void;
  onSkip: () => void;
  /**
   * Opcional: salva o nome e abre as Configurações para a pessoa
   * escolher tema, cores e imagens agora. Sem isso, o botão não aparece.
   */
  onCustomize?: (name: string) => void;
}

/** Primeiro acesso: pergunta como a pessoa quer ser chamada na saudação. */
export default function NameModal({
  theme,
  initialName = "",
  onSave,
  onSkip,
  onCustomize,
}: NameModalProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);
  const [name, setName] = useState(initialName);

  const clean = name.trim().slice(0, 40);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (clean) onSave(clean);
  };

  return (
    <ModalShell
      theme={theme}
      title="Bem-vindo(a) ao Your Mind"
      description="Como você gostaria de ser chamado(a)? Usamos só na saudação da tela inicial."
      icon={<UserRound size={16} />}
      size="sm"
      onClose={onSkip}
      onSubmit={submit}
      footer={
        <>
          <button type="button" onClick={onSkip} className={ui.btnGhost}>
            Agora não
          </button>

          {onCustomize && (
            <button
              type="button"
              disabled={!clean}
              onClick={() => clean && onCustomize(clean)}
              className={ui.btnSecondary}
            >
              Salvar e personalizar
            </button>
          )}

          <button type="submit" disabled={!clean} className={ui.btnPrimaryMd}>
            Salvar
          </button>
        </>
      }
    >
      <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-wider ${ui.subtitle}`}>
        Seu nome
      </label>

      <input
        autoFocus
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex: Kamylle"
        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors ${ui.field}`}
      />

      <div
        className={`mt-4 flex items-start gap-3 rounded-xl border p-3 ${
          dark ? "border-white/10 bg-white/3" : "border-zinc-200 bg-zinc-50"
        }`}
      >
        <Palette size={16} className={`mt-0.5 shrink-0 ${ui.subtitle}`} />

        <p className={`text-xs leading-relaxed ${ui.subtitle}`}>
          Você também pode deixar o site do seu jeito: escolher o <strong>tema</strong> (claro ou escuro), as{" "}
          <strong>cores</strong> e as <strong>imagens</strong>. Dá para fazer isso agora ou depois, quando quiser,
          em Configurações.
        </p>
      </div>
    </ModalShell>
  );
}