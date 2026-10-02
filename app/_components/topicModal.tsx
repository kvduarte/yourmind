"use client";

import React, { useState } from "react";
import {
  Folder,
  GitFork,
  X,
  CalendarDays,
} from "lucide-react";
import { Folder as FolderType } from "@/types";

interface TopicModalProps {
  folders: FolderType[];
  onClose: () => void;
  onCreateTopic: (
    name: string,
    folderId?: string,
    dueDate?: string
  ) => void;
}

export default function TopicModal({
  folders,
  onClose,
  onCreateTopic,
}: TopicModalProps) {
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState(
    folders[0]?.id || ""
  );

  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!name.trim()) return;

    onCreateTopic(
      name.trim(),
      folderId || undefined,
      dueDate || undefined
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <GitFork
                size={16}
                className="text-zinc-400"
              />

              <h2 className="text-sm font-semibold text-zinc-100">
                Novo Fluxograma
              </h2>
            </div>

            <p className="text-[11px] text-zinc-500 mt-1">
              Crie um fluxograma dentro de um projeto.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200"
          >
            <X size={17} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1.5">
              Nome do Fluxograma
            </label>

            <input
              type="text"
              required
              autoFocus
              placeholder="Ex: Prova de Algoritmos"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 block mb-1.5">
              Data da prova / trabalho
            </label>

            <div className="relative">
              <CalendarDays
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />

              <input
                type="date"
                value={dueDate}
                onChange={(e) =>
                  setDueDate(e.target.value)
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 block mb-1.5">
              Projeto
            </label>

            {folders.length > 0 ? (
              <div className="relative">
                <Folder
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />

                <select
                  value={folderId}
                  onChange={(e) =>
                    setFolderId(e.target.value)
                  }
                  className="w-full appearance-none bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-600"
                >
                  {folders.map((folder) => (
                    <option
                      key={folder.id}
                      value={folder.id}
                    >
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 p-3 text-[11px] text-zinc-500">
                Nenhum projeto criado.
                <br />
                Crie uma pasta primeiro no Sidebar.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!folders.length}
              className="bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-medium px-4 py-2 rounded-xl text-xs hover:bg-zinc-200 transition-colors"
            >
              Criar Fluxograma
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}