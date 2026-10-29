"use client";

import React, { useState } from "react";
import { Folder as FolderIcon } from "lucide-react";

import { Theme } from "@/types";
import { FOLDER_COLORS } from "@/lib/nav";
import { getUi } from "@/lib/ui";

import ModalShell from "./ModalShell";

interface FolderModalProps {
  theme: Theme;
  mode?: "create" | "edit";
  initialName?: string;
  initialColor?: string;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}

export default function FolderModal({
  theme,
  mode = "create",
  initialName = "",
  initialColor = "blue",
  onClose,
  onSave,
}: FolderModalProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);

  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    onSave(name.trim(), color);
    onClose();
  };

  return (
    <ModalShell
      theme={theme}
      title={mode === "edit" ? "Editar pasta" : "Nova pasta"}
      description="Pastas organizam os fluxogramas por assunto."
      icon={<FolderIcon size={16} />}
      size="sm"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" onClick={onClose} className={ui.btnGhost}>
            Cancelar
          </button>
          <button type="submit" disabled={!name.trim()} className={ui.btnPrimaryMd}>
            {mode === "edit" ? "Salvar" : "Criar pasta"}
          </button>
        </>
      }
    >
      <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-wider ${ui.subtitle}`}>
        Nome
      </label>

      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex: Faculdade, Trabalho, Projetos"
        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors ${ui.field}`}
      />

      <label className={`mb-2 mt-5 block text-[10px] font-bold uppercase tracking-wider ${ui.subtitle}`}>
        Cor
      </label>

      <div className="flex flex-wrap gap-2.5">
        {FOLDER_COLORS.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setColor(item.name)}
            aria-label={`Cor ${item.name}`}
            aria-pressed={color === item.name}
            className={`h-7 w-7 rounded-full transition-transform ${
              color === item.name
                ? `scale-110 ring-2 ring-offset-2 ${
                    dark ? "ring-white/70 ring-offset-zinc-900" : "ring-zinc-900/70 ring-offset-white"
                  }`
                : "opacity-70 hover:opacity-100"
            }`}
            style={{ backgroundColor: item.hex }}
          />
        ))}
      </div>
    </ModalShell>
  );
}