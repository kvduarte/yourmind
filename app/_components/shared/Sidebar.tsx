"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Command,
  GitFork,
  StickyNote,
  Workflow,
  ListChecks,
  Users,
  Database,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar,
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

interface NavItem {
  id: Section;
  label: string;
  hint: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Geral",
    items: [
      { id: "home", label: "Início", hint: "Calendário e resumo", icon: LayoutDashboard },
      { id: "ai" as Section, label: "Assistente Mindi", hint: "Chat, customização e boneco", icon: Command },
    ],
  },
  {
    title: "Workspace",
    items: [
      { id: "flows", label: "Fluxogramas", hint: "Ideias e mapas visuais", icon: GitFork },
      { id: "notes", label: "Anotações", hint: "Lembretes e rascunhos", icon: StickyNote },
      { id: "processes", label: "Processos", hint: "Etapa por etapa", icon: Workflow },
      { id: "central", label: "Central Info", hint: "Livros, mídias e guardados", icon: Database },
    ],
  },
  {
    title: "Gestão",
    items: [
      { id: "calendar" as Section, label: "Agenda", hint: "Compromissos e rotina diária", icon: Calendar },
      { id: "planning", label: "Planejamento", hint: "Evolução e prazos", icon: ListChecks },
      { id: "clients", label: "Pessoas & Contatos", hint: "Lembretes e contatos", icon: Users },
      { id: "personal", label: "Organização Pessoal", hint: "Inbox, metas e hábitos", icon: CheckSquare },
    ],
  },
];

export default function Sidebar({
  section,
  onSelect,
  onOpenSettings,
  theme,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("your_mind_sidebar_collapsed");
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [toggleHovered, setToggleHovered] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);

  const [tooltip, setTooltip] = useState<{
    title: string;
    subtitle: string;
    top: number;
    left: number;
  } | null>(null);
  
  const dark = theme === "dark";
  const accentColor = useAccent();

  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    if (typeof window !== "undefined") {
      localStorage.setItem("your_mind_sidebar_collapsed", JSON.stringify(newState));
    }
    setTooltip(null);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>, title: string, subtitle: string) => {
    if (!collapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      title,
      subtitle,
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <aside
      className={`relative z-30 flex h-screen flex-col border-r transition-all duration-300 ease-in-out select-none overflow-visible ${
        collapsed ? "w-16 px-2 py-5" : "w-64 px-4 py-5"
      } ${
        dark
          ? "border-white/8 bg-zinc-950/95 text-zinc-100 backdrop-blur-xl"
          : "border-zinc-200/80 bg-white/95 text-zinc-900 backdrop-blur-xl"
      }`}
    >
      <div className="relative">
        <button
          onClick={handleToggleCollapse}
          onMouseEnter={(e) => {
            setToggleHovered(true);
            handleMouseEnter(e, "Expandir menu", "Mostrar barra lateral");
          }}
          onMouseLeave={() => {
            setToggleHovered(false);
            handleMouseLeave();
          }}
          aria-label={collapsed ? "Expandir menu" : "Minimizar menu"}
          className="absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer border shadow-sm"
          style={{
            color: toggleHovered ? accentColor : dark ? "#a1a1aa" : "#71717a",
            backgroundColor: dark ? "#09090b" : "#ffffff",
            borderColor: dark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)",
          }}
        >
          {collapsed ? (
            <ChevronRight size={14} strokeWidth={2.5} />
          ) : (
            <ChevronLeft size={14} strokeWidth={2.5} />
          )}
        </button>
      </div>

      <div
        onClick={() => onSelect("home")}
        onMouseEnter={(e) => {
          setLogoHovered(true);
          handleMouseEnter(e, "Your Mind", "Ir para o início");
        }}
        onMouseLeave={() => {
          setLogoHovered(false);
          handleMouseLeave();
        }}
        className={`relative mb-6 flex cursor-pointer items-center gap-3 px-1 transition-opacity hover:opacity-85 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <img
          src="/logo2.png"
          alt="Your Mind"
          className="h-8 w-8 shrink-0 object-contain drop-shadow-sm"
        />

        {!collapsed && (
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="truncate text-xs font-bold tracking-normal">
              Your Mind
            </span>
            <span className="truncate text-[10px] font-medium text-zinc-400">
              Structured ideas
            </span>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto overflow-x-visible pr-0.5 scrollbar-none">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx} className="flex flex-col gap-1">
            {!collapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400/70 mb-1.5">
                {group.title}
              </span>
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              const isHovered = hoveredId === item.id;
              const isHighlighted = active || isHovered;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  onMouseEnter={(e) => {
                    setHoveredId(item.id);
                    handleMouseEnter(e, item.label, item.hint);
                  }}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    handleMouseLeave();
                  }}
                  className={`group relative flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all duration-200 w-full transform hover:-translate-y-0.5 ${
                    collapsed ? "justify-center px-0 py-2.5 mx-auto w-10 h-10" : ""
                  } ${
                    active
                      ? "shadow-sm"
                      : dark
                      ? "border-transparent text-zinc-400 hover:text-zinc-200"
                      : "border-transparent text-zinc-600 hover:text-zinc-900"
                  }`}
                  style={
                    isHighlighted
                      ? {
                          backgroundColor: withAlpha(accentColor, active ? 0.14 : 0.08),
                          borderColor: withAlpha(accentColor, active ? 0.35 : 0.2),
                          boxShadow:
                            active && !collapsed
                              ? `0 0 20px -4px ${withAlpha(accentColor, 0.3)}, 0 4px 12px -2px ${withAlpha(accentColor, 0.2)}`
                              : undefined,
                        }
                      : undefined
                  }
                >
                  {!collapsed && active && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full shadow-sm"
                      style={{
                        backgroundColor: accentColor,
                        boxShadow: `0 0 8px ${accentColor}`,
                      }}
                    />
                  )}

                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                      collapsed && isHovered ? "scale-110" : ""
                    }`}
                    style={{
                      color: isHighlighted ? accentColor : undefined,
                    }}
                  />

                  {!collapsed && (
                    <span
                      className="truncate font-semibold tracking-tight transition-colors flex-1"
                      style={{
                        color: active
                          ? dark
                            ? "#fff"
                            : "#111"
                          : isHovered
                          ? accentColor
                          : undefined,
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={`pt-2 mt-2 border-t ${dark ? "border-white/8" : "border-zinc-200/60"}`}>
        <button
          onClick={onOpenSettings}
          onMouseEnter={(e) => {
            setHoveredId("settings");
            handleMouseEnter(e, "Configurações", "Tamanho, cores, backup");
          }}
          onMouseLeave={() => {
            setHoveredId(null);
            handleMouseLeave();
          }}
          className={`group relative flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-xs font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
            collapsed ? "justify-center px-0 mx-auto w-10 h-10" : ""
          } ${
            dark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-600 hover:text-zinc-900"
          }`}
          style={
            hoveredId === "settings"
              ? {
                  backgroundColor: withAlpha(accentColor, 0.08),
                  borderColor: withAlpha(accentColor, 0.2),
                }
              : undefined
          }
        >
          <Settings
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
              collapsed && hoveredId === "settings" ? "scale-110" : ""
            }`}
            style={{
              color: hoveredId === "settings" ? accentColor : dark ? "#a1a1aa" : "#71717a",
            }}
          />

          {!collapsed && (
            <span
              className="truncate font-semibold tracking-tight transition-colors flex-1"
              style={{
                color: hoveredId === "settings" ? accentColor : undefined,
              }}
            >
              Configurações
            </span>
          )}
        </button>
      </div>

      {collapsed && tooltip && (
        <div
          className={`fixed z-[999999] flex flex-col rounded-xl px-3 py-2 whitespace-nowrap text-left border shadow-2xl backdrop-blur-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-150 ${
            dark
              ? "bg-zinc-900/98 border-white/20 text-zinc-100 shadow-black/90"
              : "bg-white/98 border-zinc-200 text-zinc-900 shadow-zinc-300/80"
          }`}
          style={{
            top: tooltip.top,
            left: tooltip.left,
            transform: "translateY(-50%)",
          }}
        >
          <span className="text-xs font-bold leading-tight" style={{ color: accentColor }}>
            {tooltip.title}
          </span>
          <span className="text-[10px] font-medium text-zinc-400 leading-tight mt-0.5">
            {tooltip.subtitle}
          </span>
        </div>
      )}
    </aside>
  );
}