"use client";

import React, { useState } from "react";
import {
  User,
  Palette,
  LayoutTemplate,
  Sparkles,
  Check,
  Moon,
  Sun,
  Command,
  Layers,
} from "lucide-react";

import { Theme } from "@/types";
import ModalShell from "./ModalShell";
import {
  CURATED_PALETTES,
  PALETTE_GROUPS,
  buildAccentGradient,
  isLightHex,
  withAlpha,
} from "@/lib/theme";
import { BgPattern, BgVariant } from "@/lib/settings";
import BackgroundFormatPicker from "./BackgroundFormatPicker";
import LivePreview, { usePreviewPeek } from "./LivePreview";

interface OnboardingWizardProps {
  isOpen: boolean;
  theme: Theme;
  onComplete: (config: {
    name: string;
    theme: Theme;
    accentColor: string;
    colorStyle: "solid" | "gradient" | "preset";
    colorPreset: string;
    bgVariant: BgVariant;
    bgPattern: BgPattern;
    homeCoverImage?: string;
  }) => void;
}

const DARK_HOME_COVERS = [
  { id: "dark_1", name: "Estilo 01", url: "/paginicial.jfif" },
  { id: "dark_2", name: "Estilo 02", url: "/paginicial2.jfif" },
  { id: "dark_3", name: "Estilo 03", url: "/paginicial3.jfif" },
  { id: "dark_4", name: "Estilo 04", url: "/paginicial4.jfif" },
];

const LIGHT_HOME_COVERS = [
  {
    id: "light_1",
    name: "Pearl Clean",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "light_2",
    name: "Ivory Soft",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "light_3",
    name: "Sand Silk",
    url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop",
  },
];

const ACCENT_SWATCHES = Array.from(
  new Set(CURATED_PALETTES.map((p) => p.colors[0].toLowerCase()))
);

export default function OnboardingWizardModal({
  isOpen,
  theme: initialTheme,
  onComplete,
}: OnboardingWizardProps) {
  const [name, setName] = useState<string>("");
  const [selectedTheme, setSelectedTheme] = useState<Theme>(initialTheme || "dark");
  const [selectedCover, setSelectedCover] = useState<string>(
    (initialTheme || "dark") === "dark"
      ? DARK_HOME_COVERS[0].url
      : LIGHT_HOME_COVERS[0].url
  );
  const [colorStyle, setColorStyle] = useState<"solid" | "gradient" | "preset">("preset");
  const [colorPreset, setColorPreset] = useState<string>("matcha-espresso");
  const [accentColor, setAccentColor] = useState<string>(
    CURATED_PALETTES[0]?.colors[0] || "#f4f4f5"
  );
  const [bgVariant, setBgVariant] = useState<BgVariant>("lights");
  const [bgPattern, setBgPattern] = useState<BgPattern>("none");

  const {
    override: previewOverride,
    setOverride: setPreviewOverride,
    peek,
  } = usePreviewPeek();

  if (!isOpen) return null;

  const isDark = selectedTheme === "dark";
  const btnTextDark = isLightHex(accentColor);

  const activePalette =
    CURATED_PALETTES.find((p) => p.id === colorPreset) || CURATED_PALETTES[0];

  const previewBackground =
    colorStyle === "gradient"
      ? buildAccentGradient(accentColor)
      : colorStyle === "preset"
      ? activePalette.gradient
      : accentColor;

  const ui = {
    label: isDark ? "text-zinc-400" : "text-zinc-500",
    title: isDark ? "text-zinc-100" : "text-zinc-900",
    text: isDark ? "text-zinc-300" : "text-zinc-700",
    divider: isDark ? "border-white/10" : "border-zinc-200",
    soft: isDark ? "bg-white/[0.03]" : "bg-zinc-100/80",
    cardBorder: isDark ? "border-white/10" : "border-zinc-200/80",
    input: isDark
      ? "border-white/10 bg-white/[0.03] text-zinc-100 placeholder:text-zinc-600 focus:border-white/30"
      : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400",
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onComplete({
      name: name.trim(),
      theme: selectedTheme,
      accentColor,
      colorStyle,
      colorPreset,
      bgVariant,
      bgPattern,
      homeCoverImage: selectedCover,
    });
  };

  return (
    <ModalShell
      theme={selectedTheme}
      title="Configuração Inicial"
      description="Personalize sua identidade visual, tema, grade e o banner da Visão Geral."
      icon={<Command size={15} />}
      size="xl"
      onClose={() => {}}
      footer={
        <div
          className={`flex flex-col sm:flex-row items-center justify-between w-full border-t pt-4 mt-1 gap-3 ${ui.divider}`}
        >
          <p className="text-[11px] text-zinc-500 font-medium">
            * Você pode alterar estas preferências a qualquer momento nas Configurações.
          </p>
          <button
            type="submit"
            form="onboarding-form"
            disabled={!name.trim()}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-40 shrink-0 ${
              btnTextDark ? "text-zinc-950" : "text-white"
            }`}
            style={{ background: previewBackground }}
          >
            <Check size={14} strokeWidth={3} /> Concluir e Entrar
          </button>
        </div>
      }
    >
      <form
        id="onboarding-form"
        onSubmit={handleFinish}
        className="grid grid-cols-1 lg:grid-cols-12 gap-7 py-2"
      >
        {/* COLUNA ESQUERDA: OPÇÕES DE PERSONALIZAÇÃO */}
        <div className="lg:col-span-7 space-y-6 max-h-[62vh] overflow-y-auto thin-scroll pr-2">
          {/* 1. NOME */}
          <div className="space-y-2">
            <label
              className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${ui.label}`}
            >
              <User size={13} /> Como podemos te chamar? *
            </label>
            <input
              autoFocus
              required
              type="text"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome..."
              className={`w-full rounded-xl border px-4 py-3 text-xs font-medium outline-none transition-all ${ui.input}`}
            />
          </div>

          {/* 2. TEMA DA INTERFACE */}
          <div className="space-y-2">
            <label
              className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${ui.label}`}
            >
              <Palette size={13} /> Tema Base
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                {...peek({ theme: "dark" })}
                onClick={() => {
                  setSelectedTheme("dark");
                  setSelectedCover(DARK_HOME_COVERS[0].url);
                }}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  selectedTheme === "dark"
                    ? "border-white/30 bg-zinc-900 text-white shadow-md ring-1 ring-white/15"
                    : `${ui.cardBorder} ${ui.soft} ${ui.label} hover:opacity-90`
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 shrink-0">
                  <Moon size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold">Escuro (Pérola)</div>
                  <div className="text-[10px] text-zinc-500">Contraste profundo</div>
                </div>
              </button>

              <button
                type="button"
                {...peek({ theme: "light" })}
                onClick={() => {
                  setSelectedTheme("light");
                  setSelectedCover(LIGHT_HOME_COVERS[0].url);
                }}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  selectedTheme === "light"
                    ? "border-zinc-300 bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-300"
                    : `${ui.cardBorder} ${ui.soft} ${ui.label} hover:opacity-90`
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-200/80 text-zinc-800 shrink-0">
                  <Sun size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold">Claro (Preto)</div>
                  <div className="text-[10px] text-zinc-500">Visual luminoso</div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. CAPA DA VISÃO GERAL */}
          <div className="space-y-2">
            <label
              className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${ui.label}`}
            >
              <LayoutTemplate size={13} /> Capa da Visão Geral
            </label>
            <div className={`grid gap-2.5 ${isDark ? "grid-cols-4" : "grid-cols-3"}`}>
              {(isDark ? DARK_HOME_COVERS : LIGHT_HOME_COVERS).map((cover) => {
                const isSelected = selectedCover === cover.url;
                return (
                  <button
                    key={cover.id}
                    type="button"
                    {...peek({ cover: { src: cover.url, fit: "cover" } })}
                    onClick={() => setSelectedCover(cover.url)}
                    className={`group relative h-20 overflow-hidden rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? isDark
                          ? "border-white ring-2 ring-white/40 shadow-md scale-[1.02]"
                          : "border-zinc-900 ring-2 ring-zinc-900/20 shadow-md scale-[1.02]"
                        : `${ui.cardBorder} opacity-65 hover:opacity-100`
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover.url}
                      alt={cover.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent flex items-end justify-between p-1.5">
                      <span className="text-[9px] font-semibold text-white truncate">
                        {cover.name}
                      </span>
                      {isSelected && (
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-black">
                          <Check size={9} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. COLORAÇÃO DE DESTAQUE */}
          <div className="space-y-3">
            <label
              className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${ui.label}`}
            >
              <Sparkles size={13} /> Estilo & Coloração
            </label>

            <div className={`flex rounded-xl p-1 border ${ui.cardBorder} ${ui.soft}`}>
              {(
                [
                  ["solid", "Cor Sólida"],
                  ["gradient", "Gradiente"],
                  ["preset", "Paletas Prontas"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  {...peek({ colorStyle: id })}
                  onClick={() => setColorStyle(id)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    colorStyle === id
                      ? isDark
                        ? "bg-white text-zinc-950 font-semibold shadow-xs"
                        : "bg-white text-zinc-900 font-semibold shadow-xs"
                      : `${ui.label} hover:opacity-80`
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {colorStyle === "preset" ? (
              <div className="space-y-3 pt-1">
                {PALETTE_GROUPS.map((group) => {
                  const items = CURATED_PALETTES.filter((p) => p.group === group.id);
                  if (items.length === 0) return null;

                  return (
                    <div key={group.id}>
                      <p className={`mb-1.5 text-[10px] font-semibold ${ui.label}`}>
                        {group.label}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {items.map((preset) => {
                          const selected = colorPreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              {...peek({
                                accentColor: preset.colors[0],
                                colorStyle: "preset",
                                colorPreset: preset.id,
                              })}
                              onClick={() => {
                                setColorPreset(preset.id);
                                setAccentColor(preset.colors[0]);
                              }}
                              className={`group overflow-hidden rounded-xl border text-left transition-all cursor-pointer hover:-translate-y-0.5 ${ui.cardBorder}`}
                              style={
                                selected
                                  ? {
                                      borderColor: preset.colors[0],
                                      boxShadow: `0 0 0 1px ${preset.colors[0]}, 0 4px 12px -4px ${withAlpha(
                                        preset.colors[0],
                                        0.5
                                      )}`,
                                    }
                                  : undefined
                              }
                            >
                              <div
                                className="relative h-8 w-full"
                                style={{ background: preset.gradient }}
                              >
                                {selected && (
                                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/50 backdrop-blur-xs">
                                    <Check size={10} className="text-white" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-1.5 px-2 py-1.5">
                                <span
                                  className={`truncate text-[10px] font-medium ${
                                    selected ? ui.title : ui.text
                                  }`}
                                >
                                  {preset.name}
                                </span>
                                <span className="flex shrink-0 items-center -space-x-1">
                                  {preset.colors.map((c, idx) => (
                                    <span
                                      key={idx}
                                      className="h-2.5 w-2.5 rounded-full border border-black/20"
                                      style={{ backgroundColor: c }}
                                    />
                                  ))}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {ACCENT_SWATCHES.map((color) => {
                  const selected = accentColor.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      {...peek({ accentColor: color })}
                      onClick={() => setAccentColor(color)}
                      className="relative flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110 cursor-pointer shadow-xs"
                      style={{
                        background:
                          colorStyle === "gradient"
                            ? buildAccentGradient(color)
                            : color,
                        boxShadow: selected
                          ? `0 0 0 2px ${isDark ? "#18181b" : "#ffffff"}, 0 0 0 4px ${color}`
                          : undefined,
                      }}
                    >
                      {selected && (
                        <Check
                          size={12}
                          className={isLightHex(color) ? "text-zinc-950" : "text-white"}
                        />
                      )}
                    </button>
                  );
                })}

                <label
                  title="Cor personalizada"
                  className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-dashed transition-transform hover:scale-110 ${
                    isDark ? "border-zinc-600 text-zinc-400" : "border-zinc-400 text-zinc-600"
                  }`}
                >
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <span className="text-xs font-bold">+</span>
                </label>
              </div>
            )}
          </div>

          {/* 5. FORMATO DO FUNDO & GRADE */}
          <div className={`space-y-2.5 border-t pt-4 ${ui.divider}`}>
            <div>
              <label
                className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${ui.label}`}
              >
                <Layers size={13} /> Formato do Fundo & Grade
              </label>
              <p className={`mt-1 text-[11px] ${ui.label}`}>
                Combine efeitos de luz com padrões de grade ou pontos ao fundo.
              </p>
            </div>

            <BackgroundFormatPicker
              dark={isDark}
              accent={accentColor}
              variant={bgVariant}
              pattern={bgPattern}
              onChangeVariant={setBgVariant}
              onChangePattern={setBgPattern}
              onPeek={setPreviewOverride}
            />
          </div>
        </div>

        {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO EM TEMPO REAL */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div>
            <label
              className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${ui.label}`}
            >
              Pré-visualização em Tempo Real
            </label>
            <p className={`mt-1 text-[11px] leading-relaxed ${ui.label}`}>
              Passe o mouse sobre cores, capas, luzes ou grades para testar antes de aplicar.
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <LivePreview
              override={previewOverride}
              base={{
                theme: selectedTheme,
                accent: accentColor,
                colorStyle,
                colorPreset,
                variant: bgVariant,
                pattern: bgPattern,
                imageOpacity: 30,
                imageSaturation: 100,
                cover: { src: selectedCover, fit: "cover" },
              }}
            />
          </div>

          <div
            className={`rounded-xl border p-3 text-[11px] flex items-center justify-between ${ui.cardBorder} ${ui.soft}`}
          >
            <span className={ui.label}>
              {previewOverride
                ? "Visualizando prévia ao passar o mouse"
                : `Saudação: "${name.trim() || "Visitante"}"`}
            </span>
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: previewBackground }}
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}