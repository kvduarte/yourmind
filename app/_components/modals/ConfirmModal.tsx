"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, FolderPlus, X } from "lucide-react";

import { DEFAULT_ACCENT } from "@/lib/theme";

interface ConfirmModalProps {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  // Se informado, mostra um campo de texto (usado para nome de pasta)
  input?: { label: string; placeholder?: string; initial?: string };
  dark: boolean;
  accentColor?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  input,
  dark,
  accentColor = DEFAULT_ACCENT,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [value, setValue] = useState(input?.initial ?? "");

  const confirm = () => {
    if (input && !value.trim()) return;
    onConfirm(input ? value.trim() : undefined);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  const Icon = danger ? AlertTriangle : FolderPlus;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${
          dark ? "border-white/10 bg-zinc-950 text-zinc-100" : "border-zinc-200 bg-white text-zinc-900"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                danger ? "bg-red-500/10 text-red-400" : ""
              }`}
              style={!danger ? { backgroundColor: `${accentColor}22`, color: accentColor } : undefined}
            >
              <Icon size={20} />
            </span>
            <h2 className="text-base font-bold">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            aria-label="Fechar"
            className={`rounded-lg p-1.5 ${dark ? "text-zinc-400 hover:bg-white/8" : "text-zinc-500 hover:bg-zinc-100"}`}
          >
            <X size={16} />
          </button>
        </div>

        {message && (
          <p className={`mt-4 text-sm leading-6 ${dark ? "text-zinc-400" : "text-zinc-600"}`}>{message}</p>
        )}

        {input && (
          <div className="mt-4">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {input.label}
            </label>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirm()}
              placeholder={input.placeholder}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${
                dark
                  ? "border-white/10 bg-zinc-900/60 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600"
                  : "border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400"
              }`}
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors ${
              dark ? "text-zinc-300 hover:bg-white/8" : "text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {cancelLabel}
          </button>
          <button
            onClick={confirm}
            autoFocus={!input}
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 ${
              danger ? "bg-red-500" : ""
            }`}
            style={!danger ? { backgroundColor: accentColor } : undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}