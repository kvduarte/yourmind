"use client";

import React, { useState } from "react";
import { Workflow } from "lucide-react";

import { Theme } from "@/types";
import { PIPELINE_TEMPLATES } from "@/lib/pipeline";
import { useAccent } from "@/lib/theme";
import { getUi } from "@/lib/ui";

import ModalShell from "./ModalShell";

interface PipelineModalProps {
  theme: Theme;
  onClose: () => void;
  onCreate: (name: string, templateId: string) => void;
}

export default function PipelineModal({ theme, onClose, onCreate }: PipelineModalProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);
  const accent = useAccent();

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(PIPELINE_TEMPLATES[0].id);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    onCreate(name.trim(), templateId);
    onClose();
  };

  return (
    <ModalShell
      theme={theme}
      title="Novo processo"
      description="Etapas pelas quais cada item vai passando. Você edita tudo depois."
      icon={<Workflow size={16} />}
      size="lg"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" onClick={onClose} className={ui.btnGhost}>
            Cancelar
          </button>
          <button type="submit" className={ui.btnPrimaryMd}>
            Criar processo
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-wider ${ui.subtitle}`}>
            Nome do processo
          </label>

          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Vendas, Compras da loja, Clientes novos"
            className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${ui.field}`}
          />
        </div>

        <div>
          <label className={`mb-2 block text-[10px] font-bold uppercase tracking-wider ${ui.subtitle}`}>
            Comece por um modelo
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PIPELINE_TEMPLATES.map((template) => {
              const selected = template.id === templateId;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setTemplateId(template.id)}
                  aria-pressed={selected}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    selected ? (dark ? "bg-white/[0.06]" : "bg-zinc-50") : `${ui.divider} ${ui.hover}`
                  }`}
                  style={selected ? { borderColor: accent } : undefined}
                >
                  <p className={`text-sm font-bold ${ui.title}`}>{template.name}</p>
                  <p className={`mt-1 text-xs ${ui.subtitle}`}>{template.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {template.stages.map((stage, index) => (
                      <span
                        key={index}
                        className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${ui.soft} ${ui.text}`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}