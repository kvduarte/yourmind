"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  GitFork,
  StickyNote,
  Workflow,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Theme } from "@/types";
import { Section } from "@/lib/nav";
import { useAccent, withAlpha } from "@/lib/theme";

interface SidebarProps {
  section: Section;
  onSelect: (section: Section) => void;
  onOpenSettings: () => void;
  theme: Theme;
}

const ITEMS: {
  id: Section;
  label: string;
  hint: string;
  icon: React.ElementType;
}[] = [
  { id: "home", label: "Início", hint: "Calendário e resumo", icon: LayoutDashboard },
  { id: "flows", label: "Fluxogramas", hint: "Ideias e programação", icon: GitFork },
  { id: "notes", label: "Anotações", hint: "Lembretes e provas", icon: StickyNote },
  { id: "processes", label: "Processos", hint: "Pedidos etapa por etapa", icon: Workflow },
];

export default function Sidebar({
  section,
  onSelect,
  onOpenSettings,
  theme,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const dark = theme === "dark";

  /* Cor de acento escolhida em Configurações (padrão: índigo) */
  const accentColor = useAccent();

  return (
    <aside
      className={`relative z-30 flex h-screen flex-col border-r transition-all duration-300 ease-in-out select-none ${
        collapsed ? "w-16 px-2 py-5" : "w-64 px-4 py-5"
      } ${
        dark
          ? "border-white/[0.08] bg-zinc-950/90 text-zinc-100 backdrop-blur-xl"
          : "border-zinc-200/80 bg-white/90 text-zinc-900 backdrop-blur-xl"
      }`}
    >
      {/* Botão para colapsar / expandir o menu */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expandir menu" : "Minimizar menu"}
        className={`absolute -right-3 top-7 z-40 flex h-6 w-6 items-center justify-center rounded-full border shadow-md transition-all ${
          dark
            ? "border-white/15 bg-zinc-900 text-zinc-400 hover:text-white"
            : "border-zinc-300 bg-white text-zinc-600 hover:text-black"
        }`}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* Header / Logo (Mantém a imagem original /logo.svg) */}
      <div
        onClick={() => onSelect("home")}
        className={`mb-8 flex cursor-pointer items-center gap-3 px-1 transition-opacity hover:opacity-85 ${
          collapsed ? "justify-center" : ""
        }`}
        title="Your Mind - Ir para o início"
      >
        <img
          src="/logo.svg"
          alt="Your Mind"
          className="h-7 w-7 shrink-0 object-contain drop-shadow-sm"
        />

        {!collapsed && (
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="truncate text-sm font-extrabold tracking-tight">
              Your Mind
            </span>
            <span className="truncate text-[11px] font-semibold text-zinc-400">
              Organize suas ideias
            </span>
          </div>
        )}
      </div>

      {/* Navegação principal */}
      <nav className="flex flex-1 flex-col gap-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              title={collapsed ? `${item.label}\n${item.hint}` : undefined}
              className={`group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                collapsed ? "justify-center px-0" : ""
              } ${
                active
                  ? "shadow-sm"
                  : dark
                  ? "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
                  : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
              }`}
              style={
                active
                  ? {
                      backgroundColor: withAlpha(accentColor, 0.12),
                      borderColor: withAlpha(accentColor, 0.3),
                      boxShadow: `0 4px 20px -4px ${withAlpha(accentColor, 0.25)}`,
                    }
                  : undefined
              }
            >
              {/* Barra indicadora lateral na pílula ativa */}
              {active && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                  style={{ backgroundColor: accentColor }}
                />
              )}

              <Icon
                className={`h-4 w-4 shrink-0 transition-colors`}
                style={{
                  color: active ? accentColor : undefined,
                }}
              />

              {!collapsed && (
                <div className="min-w-0 flex-1 overflow-hidden">
                  <span
                    className="block truncate text-xs font-bold leading-tight mb-0.5"
                    style={{ color: active ? (dark ? "#fff" : "#111") : undefined }}
                  >
                    {item.label}
                  </span>
                  <span className="block truncate text-[10px] font-medium text-zinc-400 leading-tight">
                    {item.hint}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Rodapé / Configurações */}
      <button
        onClick={onOpenSettings}
        title={collapsed ? "Configurações" : undefined}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
          collapsed ? "justify-center px-0" : ""
        } ${
          dark
            ? "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
            : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
        }`}
      >
        <Settings className={`h-4 w-4 shrink-0 transition-colors ${dark ? "text-zinc-400 group-hover:text-zinc-200" : "text-zinc-500 group-hover:text-zinc-900"}`} />

        {!collapsed && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <span className="block truncate text-xs font-bold leading-tight mb-0.5">
              Configurações
            </span>
            <span className="block truncate text-[10px] font-medium text-zinc-400 leading-tight">
              Tamanho, cores, backup
            </span>
          </div>
        )}
      </button>
    </aside>
  );
}