"use client";

import React, { useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  User,
  BookOpen,
  Keyboard,
  Camera,
  Check,
  Command,
  Calendar,
  StickyNote,
  GitFork,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Theme } from "@/types";
import { withAlpha, DEFAULT_ACCENT } from "@/lib/theme";

interface RightSidebarProps {
  theme: Theme;
  userName?: string;
  userAvatar?: string;
  onUpdateUserName?: (name: string) => void;
  onUpdateUserAvatar?: (avatarUrl: string) => void;
  accentColor?: string;
}

type RightTab = "profile" | "tutorial" | "keybinds";

export default function RightSidebar({
  theme,
  userName = "Kamylle",
  userAvatar,
  onUpdateUserName,
  onUpdateUserAvatar,
  accentColor = DEFAULT_ACCENT,
}: RightSidebarProps) {
  const dark = theme === "dark";
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<RightTab>("profile");
  const [editingName, setEditingName] = useState(userName);
  const [isEditingName, setIsEditingName] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectTab = (tab: RightTab) => {
    if (expanded && activeTab === tab) {
      setExpanded(false);
    } else {
      setActiveTab(tab);
      setExpanded(true);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateUserAvatar) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpdateUserAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateUserName && editingName.trim()) {
      onUpdateUserName(editingName.trim());
    }
    setIsEditingName(false);
  };

  const navItems: Array<{
    id: RightTab;
    label: string;
    icon: React.ElementType;
  }> = [
    { id: "profile", label: "Conta & Perfil", icon: User },
    { id: "tutorial", label: "Tutorial do App", icon: BookOpen },
    { id: "keybinds", label: "Teclas & Atalhos", icon: Keyboard },
  ];

  return (
    <aside
      className={`relative z-30 flex h-full shrink-0 flex-col border-l transition-all duration-300 select-none ${
        expanded ? "w-76" : "w-[72px]"
      } ${
        dark
          ? "border-white/8 bg-[#09090b]/95 text-zinc-100 backdrop-blur-2xl"
          : "border-zinc-200/80 bg-white/95 text-zinc-900 backdrop-blur-2xl"
      }`}
    >
      {/* BOTÃO REDONDO NA BORDA ESQUERDA (ESPELHADO COM A SIDEBAR ESQUERDA) */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        title={expanded ? "Recolher barra" : "Expandir barra"}
        className={`absolute -left-3.5 top-12 z-40 flex h-7 w-7 items-center justify-center rounded-full border shadow-md transition-transform hover:scale-110 cursor-pointer ${
          dark
            ? "border-white/12 bg-zinc-900 text-zinc-300 hover:text-white"
            : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900"
        }`}
      >
        {expanded ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* TOPO: FOTO DE PERFIL / AVATAR DA PESSOA */}
      <div className="flex flex-col items-center pt-5 pb-4 px-3">
        <div className="relative group">
          <button
            onClick={() => {
              setActiveTab("profile");
              setExpanded(true);
            }}
            title="Perfil e Conta"
            className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border shadow-sm transition-transform hover:scale-105 cursor-pointer"
            style={{
              borderColor: withAlpha(accentColor, 0.35),
              backgroundColor: withAlpha(accentColor, 0.15),
              color: accentColor,
            }}
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-black">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </button>

          {/* Indicador de status online */}
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
            style={{
              backgroundColor: accentColor,
              borderColor: dark ? "#09090b" : "#ffffff",
            }}
          />
        </div>

        {expanded && (
          <div className="mt-2.5 text-center animate-in fade-in duration-200">
            <p className="text-xs font-black truncate max-w-[200px]">{userName}</p>
            <span className="text-[10px] font-semibold text-zinc-400">
              Conta Pessoal
            </span>
          </div>
        )}
      </div>

      <div className="mx-4 border-t border-zinc-500/10" />

      {/* NAVEGAÇÃO DE ÍCONES (MESMA VIBE DA SIDEBAR ESQUERDA) */}
      <nav className="flex flex-col gap-2.5 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = expanded && activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              title={!expanded ? item.label : undefined}
              className={`group flex items-center rounded-2xl transition-all cursor-pointer ${
                expanded
                  ? "w-full gap-3 px-3.5 py-2.5 justify-start"
                  : "mx-auto h-11 w-11 justify-center"
              } ${
                isActive
                  ? "border font-bold shadow-xs"
                  : dark
                  ? "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: withAlpha(accentColor, 0.14),
                      borderColor: withAlpha(accentColor, 0.3),
                      color: accentColor,
                    }
                  : undefined
              }
            >
              <Icon size={18} strokeWidth={isActive ? 2.3 : 1.9} className="shrink-0" />
              {expanded && (
                <span className="truncate text-xs tracking-tight">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ÁREA DE CONTEÚDO QUANDO EXPANDIDA */}
      {expanded && (
        <div className="flex-1 overflow-y-auto px-4 pb-5 space-y-4 thin-scroll animate-in fade-in duration-200">
          <div className="border-t border-zinc-500/10 pt-4" />

          {/* CONTEÚDO: CONTA & PERFIL */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              {/* Upload de Foto */}
              <div
                className={`rounded-2xl border p-3.5 space-y-3 ${
                  dark ? "border-white/8 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Foto de Perfil
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-[11px] font-bold hover:opacity-80 cursor-pointer"
                    style={{ color: accentColor }}
                  >
                    <Camera size={12} /> Alterar
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* Editar Nome */}
                <div className="space-y-1.5 pt-1 border-t border-zinc-500/10">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Nome de Exibição
                  </span>
                  {isEditingName ? (
                    <form onSubmit={handleSaveName} className="flex gap-1.5">
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className={`min-w-0 flex-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold outline-none ${
                          dark
                            ? "border-white/15 bg-zinc-900 text-white"
                            : "border-zinc-300 bg-white text-zinc-900"
                        }`}
                      />
                      <button
                        type="submit"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white cursor-pointer"
                        style={{ backgroundColor: accentColor }}
                      >
                        <Check size={14} />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{userName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(userName);
                          setIsEditingName(true);
                        }}
                        className="text-[11px] font-bold hover:opacity-80 cursor-pointer"
                        style={{ color: accentColor }}
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status da Conta */}
              <div
                className={`rounded-2xl border p-3.5 space-y-2 ${
                  dark ? "border-white/8 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <ShieldCheck size={14} style={{ color: accentColor }} />
                  <span>Workspace Local Ativo</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Seus dados, notas e fluxogramas são salvos automaticamente neste navegador.
                </p>
              </div>
            </div>
          )}

          {/* CONTEÚDO: TUTORIAL */}
          {activeTab === "tutorial" && (
            <div className="space-y-3">
              {[
                {
                  title: "Busca Rápida (Ctrl + K)",
                  desc: "Pressione Ctrl + K ou Cmd + K em qualquer tela para navegar e criar itens.",
                  icon: Command,
                },
                {
                  title: "Agenda & Semana",
                  desc: "Alterne entre Mês, Semana em linhas e Visão Anual no topo da agenda.",
                  icon: Calendar,
                },
                {
                  title: "Notas & Pastas",
                  desc: "Crie cadernos e anotações organizadas por pastas coloridas.",
                  icon: StickyNote,
                },
                {
                  title: "Fluxogramas",
                  desc: "Conecte ideias ou blocos de código visualmente na aba de fluxos.",
                  icon: GitFork,
                },
              ].map((step, i) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border p-3 space-y-1 ${
                      dark ? "border-white/8 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <StepIcon size={13} style={{ color: accentColor }} />
                      <h4 className="text-xs font-black">{step.title}</h4>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* CONTEÚDO: ATALHOS */}
          {activeTab === "keybinds" && (
            <div className="space-y-3">
              <div
                className={`rounded-2xl border overflow-hidden ${
                  dark ? "border-white/8 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
                }`}
              >
                {[
                  ["Command Palette", "Ctrl + K"],
                  ["Fechar Modais", "ESC"],
                  ["Navegar Listas", "↑ / ↓"],
                  ["Confirmar", "Enter"],
                ].map(([label, shortcut], i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2.5 text-[11px] font-bold border-b border-zinc-500/10 last:border-0"
                  >
                    <span>{label}</span>
                    <kbd className="rounded-md bg-black/10 dark:bg-white/10 px-2 py-0.5 text-[10px] font-extrabold text-zinc-400">
                      {shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RODAPÉ MINIMALISTA QUANDO RECOLHIDO */}
      {!expanded && (
        <div className="mt-auto pb-5 flex flex-col items-center gap-3">
          <div className="w-8 border-t border-zinc-500/10" />
          <button
            onClick={() => {
              setActiveTab("tutorial");
              setExpanded(true);
            }}
            title="Ajuda & Tutorial"
            className={`flex h-10 w-10 items-center justify-center rounded-2xl transition cursor-pointer ${
              dark
                ? "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            }`}
          >
            <Sparkles size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}