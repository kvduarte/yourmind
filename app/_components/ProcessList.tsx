"use client";

import React from "react";
import { Plus, Trash2, Workflow, Layers, ArrowRight } from "lucide-react";

import { Theme } from "@/types";
import { Pipeline } from "@/lib/pipeline";
import { DEFAULT_ACCENT, withAlpha } from "@/lib/theme";
import { getUi } from "@/lib/ui";
import PageHeader from "./PageHeader";

interface ProcessListProps {
  pipelines: Pipeline[];
  theme: Theme;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (pipeline: Pipeline) => void;
  settings?: { accentColor?: string };
}

/** Todos os processos com design moderno e refinado. */
export default function ProcessList({
  pipelines,
  theme,
  onOpen,
  onCreate,
  onDelete,
  settings,
}: ProcessListProps) {
  const dark = theme === "dark";
  const accentColor = settings?.accentColor || DEFAULT_ACCENT;

  const ui = getUi(dark);
  const panel = `${ui.panel} ${ui.panelHover}`;
  const titleColor = ui.title;
  const subtitleColor = ui.subtitle;

  return (
    <div className="thin-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-8 p-6 sm:p-10">
        
        <PageHeader
          theme={theme}
          badge="Gestão de fluxos e etapas"
          badgeIcon={<Layers size={14} />}
          title="Processos"
          description="Acompanhe pedidos, vendas ou entregas etapa por etapa em quadros interativos."
          actions={
            <button onClick={onCreate} className={ui.btnPrimary}>
              <Plus size={16} />
              Novo processo
            </button>
          }
        />

        {/* GRID DE PROCESSOS */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pipelines.map((pipeline) => {
            const total = pipeline.cards.length;

            return (
              <div
                key={pipeline.id}
                onClick={() => onOpen(pipeline.id)}
                className={`group relative cursor-pointer rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${panel}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110"
                    style={{ backgroundColor: withAlpha(accentColor, 0.08), color: accentColor }}
                  >
                    <Workflow size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-bold ${titleColor}`}>
                      {pipeline.name}
                    </p>
                    <span className={`block truncate text-xs font-semibold ${subtitleColor}`}>
                      {total} {total === 1 ? "card cadastrado" : "cards cadastrados"}
                    </span>
                  </div>
                </div>

                {/* Barra de progresso proporcional das etapas */}
                <div
                  className={`mt-6 flex h-2 overflow-hidden rounded-full ${
                    dark ? "bg-white/6" : "bg-zinc-100"
                  }`}
                >
                  {pipeline.stages.map((stage) => {
                    const count = pipeline.cards.filter((c) => c.stageId === stage.id).length;

                    return count > 0 && total > 0 ? (
                      <div
                        key={stage.id}
                        style={{ width: `${(count / total) * 100}%`, backgroundColor: stage.color }}
                        title={`${stage.name}: ${count}`}
                      />
                    ) : null;
                  })}
                </div>

                {/* Legenda das etapas compacta */}
                <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
                  {pipeline.stages.map((stage) => {
                    const count = pipeline.cards.filter((c) => c.stageId === stage.id).length;
                    return (
                      <span key={stage.id} className={`flex items-center gap-1.5 text-[11px] font-medium ${subtitleColor}`}>
                        <span className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: stage.color }} />
                        {stage.name} <strong className={titleColor}>{count}</strong>
                      </span>
                    );
                  })}
                </div>

                {/* Ações e indicador de hover */}
                <div className={`mt-6 flex items-center justify-between pt-4 border-t ${dark ? "border-white/6" : "border-zinc-200/50"}`}>
                  <span className="flex items-center gap-1 text-xs font-bold transition-colors group-hover:underline" style={{ color: accentColor }}>
                    Abrir processo
                    <ArrowRight size={13} />
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(pipeline);
                    }}
                    title="Excluir processo"
                    className="rounded-xl p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Botão de Criar Novo Processo em Card Tracejado */}
          <button
            onClick={onCreate}
            className={`group flex min-h-55 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 hover:scale-[0.99] ${
              dark
                ? "border-white/10 bg-white/1 hover:border-white/30 hover:bg-white/3"
                : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 hover:bg-zinc-100/50"
            }`}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110"
              style={{ backgroundColor: withAlpha(accentColor, 0.08), color: accentColor }}
            >
              <Plus size={22} />
            </div>
            <div>
              <span className={`block text-sm font-bold ${titleColor}`}>Criar Novo Processo</span>
              <span className={`mt-0.5 block text-xs font-medium ${subtitleColor}`}>
                Configure um novo fluxo de etapas
              </span>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}