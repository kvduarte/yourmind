"use client";

import React, { useEffect, useState } from "react";
import { X, FolderPlus, Pencil } from "lucide-react";

interface FolderModalProps {
  onClose: () => void;
  onSave: (name: string) => void;
  initialName?: string;
  mode?: "create" | "edit";
}

export default function FolderModal({
  onClose,
  onSave,
  initialName = "",
  mode = "create",
}: FolderModalProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    onSave(name.trim());
    onClose();
  };

  const editing = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            {editing ? (
              <Pencil size={16} className="text-zinc-400" />
            ) : (
              <FolderPlus size={16} className="text-zinc-400" />
            )}

            <h2 className="text-sm font-semibold text-zinc-100">
              {editing ? "Editar Pasta" : "Nova Pasta"}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1.5">
              Nome da pasta
            </label>

            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Provas"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600"
            />
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
              className="bg-white text-black font-semibold px-4 py-2 rounded-lg text-xs hover:bg-zinc-200 transition-colors"
            >
              {editing ? "Salvar" : "Criar Pasta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}