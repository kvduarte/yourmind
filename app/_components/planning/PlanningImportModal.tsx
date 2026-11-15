"use client";

import React, { useState } from "react";
import { X, Upload, FileText, CheckCircle2 } from "lucide-react";
import { Theme } from "@/types";
import { getUi } from "@/lib/ui";

interface PlanningImportModalProps {
  theme: Theme;
  onClose: () => void;
  onImport: (rawContent: string) => string | null;
}

export default function PlanningImportModal({
  theme,
  onClose,
  onImport,
}: PlanningImportModalProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);

  const [rawText, setRawText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        setErrorMsg(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Não foi possível ler o arquivo enviado.");
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setErrorMsg("Insira o texto ou carregue um arquivo de planejamento válido.");
      return;
    }

    const err = onImport(rawText);
    if (err) {
      setErrorMsg(err);
      setSuccessMsg(false);
    } else {
      setErrorMsg(null);
      setSuccessMsg(true);
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${ui.modalCard}`}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
              <Upload size={18} />
            </div>
            <div>
              <h2 className={`text-base font-bold ${ui.title}`}>
                Importar Planejamento
              </h2>
              <p className={`text-xs ${ui.subtitle}`}>
                Cole dados em JSON ou envie um arquivo de backup estruturado.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleConfirmImport} className="space-y-4">
          {/* Upload de Arquivo */}
          <div>
            <label
              htmlFor="planning-file-input"
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-4 text-xs font-semibold text-zinc-300 transition-colors hover:border-[var(--accent)] hover:bg-white/[0.05]`}
            >
              <FileText size={16} className="text-[var(--accent)]" />
              <span>Carregar arquivo de planejamento (.json)</span>
            </label>
            <input
              id="planning-file-input"
              type="file"
              accept=".json,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="relative flex items-center justify-center">
            <span className="absolute bg-zinc-900 px-2 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              ou cole o conteúdo abaixo
            </span>
            <div className="w-full border-t border-white/10" />
          </div>

          {/* Textarea para colar o conteúdo */}
          <div>
            <textarea
              rows={6}
              placeholder="Cole o código JSON do seu planejamento aqui..."
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setErrorMsg(null);
              }}
              className={`w-full rounded-xl border p-3 text-xs font-mono outline-none resize-none ${ui.field}`}
            />
          </div>

          {/* Mensagens de Erro ou Sucesso */}
          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              <CheckCircle2 size={15} /> Planejamento importado com sucesso!
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className={ui.btnGhost}
            >
              Cancelar
            </button>
            <button type="submit" className={ui.btnPrimarySm}>
              Importar Dados
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}