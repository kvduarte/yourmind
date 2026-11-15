"use client";

import React from "react";

import { Theme } from "@/types";
import { useAccent, withAlpha } from "@/lib/theme";
import { getUi } from "@/lib/ui";

interface PageHeaderProps {
  theme: Theme;
  /** pílula acima do título (ex.: "Gestão de Conteúdo") */
  badge: string;
  badgeIcon?: React.ReactNode;
  title: string;
  description?: string;
  /** botões ou indicadores alinhados à direita */
  actions?: React.ReactNode;
}

/** Cabeçalho padrão das telas (Fluxogramas, Anotações, Processos), no estilo da Início. */
export default function PageHeader({
  theme,
  badge,
  badgeIcon,
  title,
  description,
  actions,
}: PageHeaderProps) {
  const ui = getUi(theme === "dark");
  const accent = useAccent();

  return (
    <header
      className={`flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between ${ui.divider}`}
    >
      <div className="space-y-2">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide"
          style={{ backgroundColor: withAlpha(accent, 0.13), color: accent }}
        >
          {badgeIcon ?? (
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
          )}
          <span>{badge}</span>
        </div>

        <h1 className={`text-3xl font-extrabold tracking-tight ${ui.title}`}>{title}</h1>

        {description && (
          <p className={`text-sm font-medium ${ui.subtitle}`}>{description}</p>
        )}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}