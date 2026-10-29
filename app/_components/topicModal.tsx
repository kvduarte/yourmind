"use client";

import React, { useState } from "react";
import { Folder, GitFork, CalendarDays, Link2, Code2 } from "lucide-react";

import { Folder as FolderType, Theme } from "@/types";
import { normalizeUrl } from "@/lib/link";
import { useAccent } from "@/lib/theme";
import { getUi } from "@/lib/ui";

import ModalShell from "./ModalShell";

export type TopicKind = "general" | "code";

interface TopicModalProps {
  folders: FolderType[];
  onClose: () => void;
  onCreateTopic: (
    name: string,
    folderId?: string,
    dueDate?: string,
    link?: string,
    kind?: TopicKind
  ) => void;
  theme?: Theme;
  defaultFolderId?: string;
  defaultKind?: TopicKind;
}

const KINDS: { id: TopicKind; title: string; text: string; icon: React.ReactNode }[] = [
  {
    id: "general",
    title: "Normal",
    text: "Ideias, estudos, planejamento, anotações e imagens.",
    icon: <GitFork size={16} />,
  },
  {
    id: "code",
    title: "Programação",
    text: "Blocos de código coloridos, ligações e IA que revisa.",
    icon: <Code2 size={16} />,
  },
];

const LABEL = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider";

export default function TopicModal({
  folders,
  onClose,
  onCreateTopic,
  theme = "dark",
  defaultFolderId,
  defaultKind = "general",
}: TopicModalProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);
  const accent = useAccent();

  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState(
    defaultFolderId && folders.some((f) => f.id === defaultFolderId)
      ? defaultFolderId
      : folders[0]?.id || ""
  );
  const [dueDate, setDueDate] = useState("");
  const [link, setLink] = useState("");
  const [kind, setKind] = useState<TopicKind>(defaultKind);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !folders.length) return;

    onCreateTopic(
      name.trim(),
      folderId || undefined,
      dueDate || undefined,
      normalizeUrl(link) || undefined,
      kind
    );

    onClose();
  };

  const fieldBase = `w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-colors ${ui.field}`;

  return (
    <ModalShell
      theme={theme}
      title="Novo fluxograma"
      description="Crie um fluxograma dentro de um projeto."
      icon={<GitFork size={16} />}
      size="md"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" onClick={onClose} className={ui.btnGhost}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!folders.length || !name.trim()}
            className={ui.btnPrimaryMd}
          >
            Criar fluxograma
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={`${LABEL} ${ui.subtitle}`}>Tipo de fluxograma</label>

          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((item) => {
              const selected = kind === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setKind(item.id)}
                  aria-pressed={selected}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    selected ? (dark ? "bg-white/[0.06]" : "bg-zinc-50") : `${ui.divider} ${ui.hover}`
                  }`}
                  style={selected ? { borderColor: accent } : undefined}
                >
                  <div className={`flex items-center gap-2 text-xs font-bold ${ui.title}`}>
                    <span style={{ color: selected ? accent : undefined }} className={selected ? "" : ui.muted}>
                      {item.icon}
                    </span>
                    {item.title}
                  </div>

                  <p className={`mt-1.5 text-[10px] leading-snug ${ui.subtitle}`}>{item.text}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={`${LABEL} ${ui.subtitle}`}>Nome do fluxograma</label>

          <input
            type="text"
            required
            autoFocus
            placeholder={kind === "code" ? "Ex: API de pagamentos" : "Ex: Prova de Algoritmos"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldBase}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={`${LABEL} ${ui.subtitle}`}>Data da prova / trabalho</label>

            <div className="relative">
              <CalendarDays
                size={14}
                className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ui.muted}`}
              />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`${fieldBase} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={`${LABEL} ${ui.subtitle}`}>
              Link <span className="font-medium normal-case opacity-60">(vídeo, site, doc)</span>
            </label>

            <div className="relative">
              <Link2
                size={14}
                className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ui.muted}`}
              />
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="youtube.com/watch?v=..."
                className={`${fieldBase} pl-9`}
              />
            </div>
          </div>
        </div>

        <div>
          <label className={`${LABEL} ${ui.subtitle}`}>Projeto</label>

          {folders.length > 0 ? (
            <div className="relative">
              <Folder
                size={14}
                className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ui.muted}`}
              />
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className={`${fieldBase} appearance-none pl-9`}
              >
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className={`rounded-xl border border-dashed p-3 text-[11px] ${ui.divider} ${ui.muted}`}>
              Nenhum projeto criado. Crie uma pasta primeiro na tela de Fluxogramas.
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}