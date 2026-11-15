"use client";

import React, { useState } from "react";
import {
  X,
  User,
  Mail,
  Lock,
  Camera,
  LogOut,
  Shield,
  Check,
} from "lucide-react";

import { Theme } from "@/types";
import { useAccent, withAlpha } from "@/lib/theme";

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

export default function RightSidebar({
  isOpen,
  onClose,
  theme,
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [name, setName] = useState("Kamylle Duarte");
  const [email, setEmail] = useState("kamylle@exemplo.com");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saved, setSaved] = useState(false);

  const dark = theme === "dark";
  const accentColor = useAccent();

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none animate-in fade-in duration-200">
      {/* Overlay escuro de fundo */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar 2 (Direita) - Exclusiva para Conta e Perfil */}
      <aside
        className={`relative z-10 flex h-full w-full max-w-md flex-col border-l shadow-2xl transition-transform duration-300 ease-in-out ${
          dark
            ? "border-white/10 bg-zinc-950 text-zinc-100"
            : "border-zinc-200 bg-white text-zinc-900"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-6 py-5 ${dark ? "border-white/8" : "border-zinc-200/80"}`}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-bold shadow-sm"
              style={{
                backgroundColor: withAlpha(accentColor, 0.15),
                borderColor: withAlpha(accentColor, 0.3),
                color: accentColor,
              }}
            >
              KD
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Perfil & Conta</h2>
              <p className="text-[11px] text-zinc-400">Informações pessoais e segurança</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar painel"
            className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-200 hover:scale-105 cursor-pointer ${
              dark
                ? "border-white/10 bg-zinc-900 text-zinc-400 hover:text-white"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Abas Internas (Meu Perfil vs Segurança) */}
        <div className={`flex border-b px-6 gap-6 text-xs font-semibold ${dark ? "border-white/8" : "border-zinc-200/80"}`}>
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 pt-3 relative transition-colors cursor-pointer ${
              activeTab === "profile"
                ? dark ? "text-white" : "text-zinc-900"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Meu Perfil
            {activeTab === "profile" && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-3 pt-3 relative transition-colors cursor-pointer ${
              activeTab === "security"
                ? dark ? "text-white" : "text-zinc-900"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Segurança & Senha
            {activeTab === "security" && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
            )}
          </button>
        </div>

        {/* Formulário de Gestão de Conta */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
          <form onSubmit={handleSave} className="flex flex-col gap-6">
            {activeTab === "profile" ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-2xl border text-lg font-bold overflow-hidden shadow-inner"
                      style={{
                        backgroundColor: withAlpha(accentColor, 0.2),
                        borderColor: withAlpha(accentColor, 0.4),
                        color: accentColor,
                      }}
                    >
                      KD
                    </div>
                    <label
                      htmlFor="avatar-upload-right"
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer text-white"
                      title="Alterar foto"
                    >
                      <Camera size={18} />
                    </label>
                    <input id="avatar-upload-right" type="file" accept="image/*" className="hidden" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Foto de perfil</span>
                    <span className="text-[11px] text-zinc-400">PNG ou JPG (max 2MB)</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                    <User size={13} /> Nome Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium outline-none transition-all ${
                      dark
                        ? "border-white/10 bg-zinc-900 text-white focus:border-white/30"
                        : "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                    <Mail size={13} /> E-mail da Conta
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium outline-none transition-all ${
                      dark
                        ? "border-white/10 bg-zinc-900 text-white focus:border-white/30"
                        : "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                    }`}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                    <Lock size={13} /> Senha Atual
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium outline-none transition-all ${
                      dark
                        ? "border-white/10 bg-zinc-900 text-white focus:border-white/30"
                        : "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                    <Shield size={13} /> Nova Senha
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium outline-none transition-all ${
                      dark
                        ? "border-white/10 bg-zinc-900 text-white focus:border-white/30"
                        : "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                    }`}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow-md transition-all duration-200 hover:opacity-90 active:scale-95 cursor-pointer"
              style={{ backgroundColor: accentColor }}
            >
              {saved ? (
                <>
                  <Check size={15} /> Alterações Salvas!
                </>
              ) : (
                "Salvar Alterações"
              )}
            </button>
          </form>
        </div>

        {/* Rodapé com Logout */}
        <div className={`p-6 border-t ${dark ? "border-white/8" : "border-zinc-200/80"}`}>
          <button
            onClick={() => alert("Sessão encerrada.")}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
              dark
                ? "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            <LogOut size={15} /> Encerrar Sessão (Logout)
          </button>
        </div>
      </aside>
    </div>
  );
}