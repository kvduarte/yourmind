"use client";

import React, { useState, useEffect } from "react";
import { Target, ChevronRight, Pencil, Check, X } from "lucide-react";
import { toKey } from "@/lib/dates";
import { useAccent } from "@/lib/theme";

export default function DailyGoalWidget() {
  const todayKey = toKey(new Date());

  const [dailyGoal, setDailyGoal] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState("");

  /* Configurações Dinâmicas Globais */
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const accentColor = useAccent();

  const dark = theme === "dark";

  /* Sincronização Dinâmica com o App (Theme, DailyGoal) */
  const syncSettings = () => {
    if (typeof window === "undefined") return;

    // LER TEMA DO APP
    const savedTheme = localStorage.getItem("app_theme") as "dark" | "light";
    if (savedTheme) setTheme(savedTheme);

    // LER META DO DIA
    const savedGoal = localStorage.getItem(`daily_goal_${todayKey}`);
    setDailyGoal(savedGoal || "");
    if (!isEditing) setTempGoal(savedGoal || "");
  };

  useEffect(() => {
    syncSettings();

    // Event listener para mudanças de localStorage em tempo real
    window.addEventListener("storage", syncSettings);
    const interval = setInterval(syncSettings, 1000);

    return () => {
      window.removeEventListener("storage", syncSettings);
      clearInterval(interval);
    };
  }, [todayKey, isEditing]);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`daily_goal_${todayKey}`, tempGoal);
    }
    setDailyGoal(tempGoal);
    setIsEditing(false);
  };

  if (!dailyGoal && !isEditing) return null;

  return (
    <div className="fixed right-6 top-20 z-[90] flex flex-col items-end select-none font-sans">
      {!isMinimized ? (
        /* CARD EXPANDIDO FIXO À DIREITA COM DESIGN DARK LUXURY */
        <div
          className={`relative w-72 overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-right-5 ${
            dark
              ? "border-white/10 bg-zinc-950/80 text-zinc-100 shadow-black/80"
              : "border-zinc-200/80 bg-white/85 text-zinc-900 shadow-zinc-300/40"
          }`}
        >
          {/* Luz / Glow de Destaque Discreta de Fundo */}
          <div
            className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ backgroundColor: accentColor }}
          />

          {/* Topo do Card */}
          <div className={`relative z-10 flex items-center justify-between border-b pb-2.5 ${dark ? "border-white/10" : "border-zinc-200/60"}`}>
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-lg text-white shadow-xs"
                style={{ backgroundColor: accentColor }}
              >
                <Target size={13} />
              </div>
              <span
                className="text-[10px] font-extrabold uppercase tracking-wider"
                style={{ color: accentColor }}
              >
                Foco do Dia
              </span>
            </div>

            <div className="flex items-center gap-1">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className={`rounded-lg p-1 transition-colors ${dark ? "text-zinc-400 hover:text-zinc-100" : "text-zinc-500 hover:text-zinc-900"}`}
                  title="Editar Meta"
                >
                  <Pencil size={12} />
                </button>
              )}
              <button
                onClick={() => setIsMinimized(true)}
                className={`rounded-lg p-1 transition-colors ${dark ? "text-zinc-400 hover:text-zinc-100" : "text-zinc-500 hover:text-zinc-900"}`}
                title="Minimizar para o canto"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Conteúdo da Meta */}
          <div className="relative z-10 pt-3">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  autoFocus
                  placeholder="Sua meta..."
                  className={`w-full rounded-xl border px-3 py-1.5 text-xs outline-none font-semibold ${
                    dark
                      ? "border-white/15 bg-zinc-900/90 text-zinc-100 placeholder:text-zinc-500"
                      : "border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400"
                  }`}
                />
                <button
                  onClick={handleSave}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white shadow-xs transition-transform active:scale-95"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => {
                    setTempGoal(dailyGoal);
                    setIsEditing(false);
                  }}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    dark ? "border-white/10 text-zinc-400 hover:text-white" : "border-zinc-300 text-zinc-600 hover:text-black"
                  }`}
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <p className={`text-xs font-bold leading-relaxed break-words ${
                dark ? "text-zinc-200" : "text-zinc-800"
              }`}>
                {dailyGoal}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* PÍLULA MINIMIZADA SINTONIZADA COM A COR DAS CONFIGURAÇÕES */
        <div className="group relative">
          <button
            onClick={() => setIsMinimized(false)}
            className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
              dark
                ? "border-white/10 bg-zinc-950/80 text-zinc-100"
                : "border-zinc-200/80 bg-white/90 text-zinc-900"
            }`}
            title="Expandir Foco do Dia"
          >
            <Target size={18} style={{ color: accentColor }} />
            <span
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 shadow-xs"
              style={{
                backgroundColor: accentColor,
                borderColor: dark ? "#09090b" : "#ffffff",
              }}
            />
          </button>

          {/* Tooltip ao passar o mouse quando minimizado */}
          <div className="absolute right-full top-1/2 z-50 mr-3 -translate-y-1/2 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
            <div
              className={`w-52 rounded-2xl border p-3 shadow-2xl backdrop-blur-xl text-xs ${
                dark
                  ? "border-white/10 bg-zinc-950/90 text-zinc-100"
                  : "border-zinc-200/90 bg-white/95 text-zinc-900"
              }`}
            >
              <span
                className="block text-[9px] font-extrabold uppercase tracking-wider mb-1"
                style={{ color: accentColor }}
              >
                Foco de Hoje
              </span>
              <p className="font-bold leading-snug break-words">{dailyGoal}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}