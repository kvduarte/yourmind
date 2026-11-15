"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Palette,
  Code2,
  Sparkles,
  Plug,
  Database,
  Moon,
  Sun,
  Download,
  Upload,
  Trash2,
  Settings,
  CheckCircle2,
  AlertTriangle,
  GitFork,
  Bot,
  Terminal,
  Image as ImageIcon,
  Check,
  RotateCcw,
} from "lucide-react";

import { Theme } from "@/types";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
} from "@/lib/settings";
import { highlightCode } from "@/lib/code/highlight";
import {
  BG_IDB_PREFIX,
  deleteBgImage,
  saveBgImage,
  useBgImage,
} from "@/lib/bgImage";
import {
  CURATED_PALETTES,
  PALETTE_GROUPS,
  PRIMARY_BTN,
  buildAccentGradient,
  isLightHex,
  useAccent,
  withAlpha,
} from "@/lib/theme";
import { addGalleryPhoto, setActiveGalleryId } from "@/lib/savedAppearance";
import AppearanceLibrary from "./AppearanceLibrary";
import { useConfirm } from "./ConfirmDialog";

// AppSettings (lib/settings) já tem todos os campos de aparência.
export type ExtendedAppSettings = AppSettings;

interface SettingsModalProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  settings: ExtendedAppSettings;
  setSettings: React.Dispatch<React.SetStateAction<ExtendedAppSettings>>;
  counts: {
    folders: number;
    topics: number;
    tasks: number;
    pipelines?: number;
  };
  onExport: () => void;
  onImport: (raw: string) => string | null;
  onReset: () => void;
  onClose: () => void;
}

type TabId = "appearance" | "editor" | "ai" | "vscode" | "data";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "appearance", label: "Aparência", icon: <Palette size={15} /> },
  { id: "editor", label: "Editor de código", icon: <Code2 size={15} /> },
  { id: "ai", label: "Assistente de IA", icon: <Sparkles size={15} /> },
  { id: "vscode", label: "VS Code", icon: <Plug size={15} /> },
  { id: "data", label: "Dados", icon: <Database size={15} /> },
];

// Cores rápidas: o destaque (1ª cor) de cada paleta, sem repetir
const ACCENT_SWATCHES = Array.from(
  new Set(CURATED_PALETTES.map((p) => p.colors[0].toLowerCase()))
);

const DEFAULT_BG_OPACITY = 30;
const DEFAULT_BG_SATURATION = 100;

const PREVIEW_CODE = `#include <stdio.h>

int main(void) {
  int total = 2 + 40;
  printf("Resultado: %d\\n", total);
  return 0;
}`;

function getUi(dark: boolean) {
  return {
    title: dark ? "text-zinc-100" : "text-zinc-900",
    muted: "text-zinc-500",
    divider: dark ? "border-white/10" : "border-zinc-200/60",
  };
}

function Row({
  dark,
  title,
  description,
  children,
}: {
  dark: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const ui = getUi(dark);

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center justify-between border-b py-4 last:border-b-0 ${ui.divider}`}
    >
      <div className="min-w-0 pr-4">
        <p className={`text-sm font-medium ${ui.title}`}>{title}</p>
        {description && (
          <p className={`mt-1 text-xs leading-relaxed ${ui.muted}`}>
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  dark,
  value,
  onChange,
  accentColor,
}: {
  dark: boolean;
  value: boolean;
  onChange: (value: boolean) => void;
  accentColor: string;
}) {
  const lightBtn = isLightHex(accentColor);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative h-6 w-11 rounded-full transition-colors cursor-pointer"
      style={{
        backgroundColor: value ? accentColor : dark ? "#3f3f46" : "#d4d4d8",
      }}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full shadow transition-all ${
          lightBtn && value ? "bg-zinc-950" : "bg-white"
        } ${value ? "left-6" : "left-0.5"}`}
      />
    </button>
  );
}

function SectionTitle({
  dark,
  title,
  text,
}: {
  dark: boolean;
  title: string;
  text: string;
}) {
  const ui = getUi(dark);

  return (
    <div className="mb-2">
      <h3 className={`text-base font-semibold ${ui.title}`}>{title}</h3>
      <p className={`mt-1 text-xs ${ui.muted}`}>{text}</p>
    </div>
  );
}

export default function SettingsModal({
  theme,
  setTheme,
  settings,
  setSettings,
  counts,
  onExport,
  onImport,
  onReset,
  onClose,
}: SettingsModalProps) {
  const dark = theme === "dark";
  const baseDefault = dark ? "#f4f4f5" : "#18181b";
  const currentAccent = settings.accentColor || baseDefault;
  const colorStyle = settings.colorStyle || "solid";
  const colorPreset = settings.colorPreset || "matcha-espresso";

  const activePalette =
    CURATED_PALETTES.find((p) => p.id === colorPreset) || CURATED_PALETTES[0];
  const previewBackground =
    colorStyle === "gradient"
      ? buildAccentGradient(currentAccent)
      : colorStyle === "preset"
      ? activePalette.gradient
      : currentAccent;

  const btnTextDark = isLightHex(currentAccent);

  useAccent();
  const confirm = useConfirm();

  const bgOpacity = settings.bgImageOpacity ?? DEFAULT_BG_OPACITY;
  const bgSaturation = settings.bgImageSaturation ?? DEFAULT_BG_SATURATION;
  const defaultVeil = dark ? 0 : 40;
  const bgVeil = settings.bgImageVeil ?? defaultVeil;
  const hasBgImage = Boolean(settings.bgImageUrl);
  const bgIsUpload = Boolean(settings.bgImageUrl?.startsWith(BG_IDB_PREFIX));
  const bgPreviewSrc = useBgImage(settings.bgImageUrl);

  const [tab, setTab] = useState<TabId>("appearance");
  const [importMessage, setImportMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = <K extends keyof ExtendedAppSettings>(
    key: K,
    value: ExtendedAppSettings[K]
  ) => setSettings((current) => ({ ...current, [key]: value }));

  const ui = {
    card: dark ? "border-white/10 bg-zinc-900" : "border-zinc-200 bg-white",
    title: dark ? "text-zinc-100" : "text-zinc-900",
    text: dark ? "text-zinc-300" : "text-zinc-700",
    muted: "text-zinc-500",
    divider: dark ? "border-white/10" : "border-zinc-200/60",
    hover: dark ? "hover:bg-white/[0.06]" : "hover:bg-zinc-100",
    soft: dark ? "bg-white/[0.04]" : "bg-zinc-100",
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const error = onImport(String(reader.result));
      setImportMessage(
        error
          ? { ok: false, text: error }
          : { ok: true, text: "Backup importado com sucesso." }
      );
    };
    reader.readAsText(file);
  };

  const handleBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setBgError("Escolha um arquivo de imagem (PNG, JPG, WEBP...).");
      return;
    }

    try {
      await saveBgImage(file);
      update("bgImageUrl", `${BG_IDB_PREFIX}${Date.now()}`);
      setBgError(null);

      // guarda também na galeria para reaproveitar depois
      try {
        const saved = await addGalleryPhoto(
          file,
          file.name,
          `${file.size}:${file.lastModified}:${file.name}`
        );
        setActiveGalleryId(saved.id);
      } catch {
        setActiveGalleryId(null);
      }
    } catch {
      setBgError("Não foi possível salvar a imagem neste navegador.");
    }
  };

  const handleReset = async () => {
    const confirmed = await confirm({
      title: "Apagar todos os dados?",
      description:
        "Todos os projetos, fluxogramas, anotações e processos serão apagados. Essa ação não pode ser desfeita.",
      confirmLabel: "Apagar tudo",
    });

    if (confirmed) {
      onReset();
      setImportMessage({ ok: true, text: "Todos os dados foram apagados." });
    }
  };

  const saturationLabel =
    bgSaturation === 0
      ? "Preto e branco"
      : bgSaturation < 100
      ? "Cores suaves"
      : bgSaturation === 100
      ? "Cor original"
      : "Cores vivas";

  const content: Record<TabId, React.ReactNode> = {
    appearance: (
      <>
        <SectionTitle
          dark={dark}
          title="Aparência & Identidade"
          text="Defina a cor base, estilos de preenchimento ou paletas prontas."
        />

        <Row
          dark={dark}
          title="Seu nome"
          description="Aparece na saudação da tela inicial."
        >
          <input
            type="text"
            value={settings.userName ?? ""}
            maxLength={40}
            onChange={(e) => update("userName", e.target.value)}
            placeholder="Como quer ser chamado(a)"
            className={`w-56 rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors ${
              dark
                ? "border-white/10 bg-white/3 text-zinc-100 placeholder:text-zinc-500 focus:border-white/25"
                : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400"
            }`}
          />
        </Row>

        <Row
          dark={dark}
          title="Tema de Fundo Base"
          description="Alternar entre claro e escuro."
        >
          <div className={`flex rounded-xl p-1 ${ui.soft}`}>
            {(
              [
                ["dark", "Escuro (Pérola)", <Moon key="m" size={14} />],
                ["light", "Claro (Preto)", <Sun key="s" size={14} />],
              ] as const
            ).map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTheme(id);
                  if (
                    !settings.accentColor ||
                    settings.accentColor === "#f4f4f5" ||
                    settings.accentColor === "#18181b"
                  ) {
                    update("accentColor", id === "dark" ? "#f4f4f5" : "#18181b");
                  }
                }}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  theme === id
                    ? dark
                      ? "bg-white text-black font-semibold shadow"
                      : "bg-white text-zinc-900 font-semibold shadow-sm"
                    : ui.muted
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </Row>

        <Row
          dark={dark}
          title="Estilo de Cor"
          description="Escolha entre cor sólida, gradiente dinâmico ou paletas multi-cor."
        >
          <div className={`flex rounded-xl p-1 ${ui.soft}`}>
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
                onClick={() => update("colorStyle", id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  colorStyle === id
                    ? dark
                      ? "bg-white text-black font-semibold shadow"
                      : "bg-white text-zinc-900 font-semibold shadow-sm"
                    : ui.muted
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Row>

        {colorStyle === "preset" ? (
          <div className={`border-b py-4 ${ui.divider}`}>
            <div className="mb-3">
              <p className={`text-sm font-medium ${ui.title}`}>
                Paletas Prontas
              </p>
              <p className={`mt-1 text-xs leading-relaxed ${ui.muted}`}>
                Cada paleta combina 3 cores que se harmonizam pela interface.
              </p>
            </div>

            <div className="space-y-4">
              {PALETTE_GROUPS.map((group) => {
                const items = CURATED_PALETTES.filter(
                  (p) => p.group === group.id
                );
                if (items.length === 0) return null;

                return (
                  <div key={group.id}>
                    <p
                      className={`mb-2 text-[11px] font-semibold ${ui.muted}`}
                    >
                      {group.label}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {items.map((preset) => {
                        const selected = colorPreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              update("colorPreset", preset.id);
                              update("accentColor", preset.colors[0]);
                            }}
                            className={`group overflow-hidden rounded-xl border text-left transition-all cursor-pointer hover:-translate-y-0.5 ${ui.divider}`}
                            style={
                              selected
                                ? {
                                    borderColor: preset.colors[0],
                                    boxShadow: `0 0 0 1px ${preset.colors[0]}, 0 6px 18px -8px ${withAlpha(
                                      preset.colors[0],
                                      0.6
                                    )}`,
                                  }
                                : undefined
                            }
                          >
                            <div
                              className="relative h-12 w-full"
                              style={{ background: preset.gradient }}
                            >
                              {selected && (
                                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
                                  <Check size={12} className="text-white" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                              <span
                                className={`truncate text-xs font-medium ${
                                  selected ? ui.title : ui.text
                                }`}
                              >
                                {preset.name}
                              </span>
                              <span className="flex shrink-0 items-center -space-x-1">
                                {preset.colors.map((c, idx) => (
                                  <span
                                    key={idx}
                                    className="h-3 w-3 rounded-full border border-black/20"
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
          </div>
        ) : (
          <div className={`border-b py-4 ${ui.divider}`}>
            <div className="mb-3">
              <p className={`text-sm font-medium ${ui.title}`}>
                Cor de Destaque
              </p>
              <p className={`mt-1 text-xs leading-relaxed ${ui.muted}`}>
                {colorStyle === "gradient"
                  ? "Escolha a cor base — o gradiente é gerado a partir dela."
                  : "Escolha uma cor rápida ou personalizada."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => update("accentColor", baseDefault)}
                title="Padrão"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-500/40 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                style={{
                  background:
                    colorStyle === "gradient"
                      ? buildAccentGradient(baseDefault)
                      : baseDefault,
                }}
              >
                {currentAccent.toLowerCase() === baseDefault.toLowerCase() && (
                  <Check
                    size={14}
                    className={dark ? "text-zinc-950" : "text-white"}
                  />
                )}
              </button>

              {ACCENT_SWATCHES.map((color) => {
                const selected =
                  currentAccent.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => update("accentColor", color)}
                    title={color}
                    className="relative flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    style={{
                      background:
                        colorStyle === "gradient"
                          ? buildAccentGradient(color)
                          : color,
                      boxShadow: selected
                        ? `0 0 0 2px ${dark ? "#18181b" : "#ffffff"}, 0 0 0 4px ${color}`
                        : undefined,
                    }}
                  >
                    {selected && (
                      <Check
                        size={14}
                        className={
                          isLightHex(color) ? "text-zinc-950" : "text-white"
                        }
                      />
                    )}
                  </button>
                );
              })}

              <label
                title="Escolher cor personalizada"
                className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-zinc-500/60 bg-transparent transition-transform hover:scale-110"
              >
                <input
                  type="color"
                  value={currentAccent}
                  onChange={(e) => update("accentColor", e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span className="text-sm font-bold text-zinc-400">+</span>
              </label>
            </div>
          </div>
        )}

        <div className="my-4">
          <div
            className="relative overflow-hidden rounded-2xl border transition-all"
            style={{
              backgroundColor: dark ? "#09090b" : "#ffffff",
              borderColor: dark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.08)",
            }}
          >
            <div
              className="h-16 w-full"
              style={{ background: previewBackground }}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: withAlpha(currentAccent, 0.14),
                    color: currentAccent,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: previewBackground }}
                  />
                  Pré-visualização do Estilo
                </span>
                {colorStyle === "preset" && (
                  <span className="flex items-center -space-x-1">
                    {activePalette.colors.map((c, idx) => (
                      <span
                        key={idx}
                        className="h-3.5 w-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="h-1.5 w-24 overflow-hidden rounded-full"
                  style={{ background: withAlpha(currentAccent, 0.18) }}
                >
                  <div
                    className="h-full w-2/3 rounded-full"
                    style={{ background: previewBackground }}
                  />
                </div>
                <button
                  type="button"
                  className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold shadow-sm ${
                    btnTextDark ? "text-zinc-950" : "text-white"
                  }`}
                  style={{ background: previewBackground }}
                >
                  Exemplo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sliders de tamanho de texto por funcionalidade */}
        {(
          [
            ["textScaleHome", "Tamanho: Início", "Textos da tela inicial."],
            [
              "textScaleFlows",
              "Tamanho: Fluxogramas",
              "Letras dos blocos e botões dos fluxos.",
            ],
            ["textScaleNotes", "Tamanho: Anotações", "Textos das notas."],
            [
              "textScaleProcesses",
              "Tamanho: Processos",
              "Letras dos cards e etapas.",
            ],
            [
              "textScalePlanning",
              "Tamanho: Planejamento",
              "Blocos das pastas e planejamentos.",
            ],
          ] as const
        ).map(([key, title, text]) => {
          const value = settings[key] ?? DEFAULT_SETTINGS[key];
          return (
            <Row key={key} dark={dark} title={title} description={text}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={TEXT_SCALE_MIN}
                  max={TEXT_SCALE_MAX}
                  step={5}
                  value={value}
                  onChange={(e) => update(key, Number(e.target.value))}
                  className="w-40"
                  style={{ accentColor: currentAccent }}
                />
                <span
                  className={`w-12 text-right text-xs tabular-nums ${ui.muted}`}
                >
                  {value}%
                </span>
                <button
                  type="button"
                  disabled={value === DEFAULT_SETTINGS[key]}
                  onClick={() => update(key, DEFAULT_SETTINGS[key])}
                  className={`rounded-lg p-1.5 ${ui.muted} ${ui.hover} disabled:opacity-30`}
                  title="Restaurar tamanho padrão"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </Row>
          );
        })}

        <Row
          dark={dark}
          title="Imagem de Fundo"
          description="Cole um link ou escolha uma foto da galeria."
        >
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${ui.divider} ${ui.soft}`}
              >
                <ImageIcon size={14} className={ui.muted} />
                <input
                  type="text"
                  placeholder={
                    bgIsUpload
                      ? "Foto da galeria"
                      : "https://exemplo.com/imagem.png"
                  }
                  value={bgIsUpload ? "" : settings.bgImageUrl || ""}
                  onChange={(e) => {
                    setBgError(null);
                    update("bgImageUrl", e.target.value);
                  }}
                  className={`w-44 bg-transparent text-xs outline-none ${ui.text}`}
                />
              </div>

              <button
                type="button"
                onClick={() => bgFileRef.current?.click()}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${ui.divider} ${ui.text} ${ui.hover}`}
              >
                <Upload size={14} /> Galeria
              </button>

              {hasBgImage && (
                <button
                  type="button"
                  onClick={() => {
                    deleteBgImage().catch(() => {});
                    setActiveGalleryId(null);
                    update("bgImageUrl", "");
                    setBgError(null);
                  }}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                >
                  <X size={14} />
                </button>
              )}

              <input
                ref={bgFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBgFile}
              />
            </div>
            {bgError && <p className="text-[11px] text-red-400">{bgError}</p>}
          </div>
        </Row>

        <Row
          dark={dark}
          title="Opacidade da Imagem"
          description="Quanto menor, mais se mistura com o fundo."
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={bgOpacity}
              disabled={!hasBgImage}
              onChange={(e) =>
                update("bgImageOpacity", Number(e.target.value))
              }
              className="w-40 disabled:opacity-40"
              style={{ accentColor: currentAccent }}
            />
            <span
              className={`w-10 text-right text-xs tabular-nums ${ui.muted}`}
            >
              {bgOpacity}%
            </span>
          </div>
        </Row>

        <Row
          dark={dark}
          title="Intensidade das Cores"
          description={`${saturationLabel}.`}
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={200}
              step={1}
              value={bgSaturation}
              disabled={!hasBgImage}
              onChange={(e) =>
                update("bgImageSaturation", Number(e.target.value))
              }
              className="w-40 disabled:opacity-40"
              style={{ accentColor: currentAccent }}
            />
            <span
              className={`w-10 text-right text-xs tabular-nums ${ui.muted}`}
            >
              {bgSaturation}%
            </span>
          </div>
        </Row>

        <Row
          dark={dark}
          title="Véu de Leitura"
          description="Ajusta o véu sobre a imagem."
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={90}
              step={1}
              value={bgVeil}
              disabled={!hasBgImage}
              onChange={(e) => update("bgImageVeil", Number(e.target.value))}
              className="w-40 disabled:opacity-40"
              style={{ accentColor: currentAccent }}
            />
            <span
              className={`w-10 text-right text-xs tabular-nums ${ui.muted}`}
            >
              {bgVeil}%
            </span>
          </div>
        </Row>

        <AppearanceLibrary
          dark={dark}
          ui={ui}
          accent={currentAccent}
          theme={theme}
          setTheme={setTheme}
          settings={settings}
          setSettings={setSettings}
          hasBgImage={hasBgImage}
          bgIsUpload={bgIsUpload}
          bgPreviewSrc={bgPreviewSrc}
        />

        <Row
          dark={dark}
          title="Efeito de Luz em Movimento"
          description="Efeito de luz ao fundo."
        >
          <Toggle
            dark={dark}
            value={settings.animatedBackground}
            onChange={(value) => update("animatedBackground", value)}
            accentColor={currentAccent}
          />
        </Row>
      </>
    ),

    editor: (
      <>
        <SectionTitle
          dark={dark}
          title="Editor de código"
          text="Como os blocos de código aparecem dentro do grafo."
        />
        <Row
          dark={dark}
          title="Tamanho da fonte"
          description={`${settings.editorFontSize}px.`}
        >
          <input
            type="range"
            min={10}
            max={16}
            step={1}
            value={settings.editorFontSize}
            onChange={(e) =>
              update("editorFontSize", Number(e.target.value))
            }
            className="w-40"
            style={{ accentColor: currentAccent }}
          />
        </Row>
        <Row
          dark={dark}
          title="Números de linha"
          description="Mostrar numeração."
        >
          <Toggle
            dark={dark}
            value={settings.editorLineNumbers}
            onChange={(val) => update("editorLineNumbers", val)}
            accentColor={currentAccent}
          />
        </Row>
        <Row
          dark={dark}
          title="Detectar linguagem"
          description="Automático ao colar."
        >
          <Toggle
            dark={dark}
            value={settings.autoDetectLanguage}
            onChange={(val) => update("autoDetectLanguage", val)}
            accentColor={currentAccent}
          />
        </Row>
      </>
    ),

    ai: (
      <>
        <SectionTitle
          dark={dark}
          title="Assistente de IA"
          text="Configurações do co-piloto."
        />
        <Row
          dark={dark}
          title="Abrir chat ao entrar"
          description="Expandido por padrão."
        >
          <Toggle
            dark={dark}
            value={settings.aiChatOpenByDefault}
            onChange={(val) => update("aiChatOpenByDefault", val)}
            accentColor={currentAccent}
          />
        </Row>
      </>
    ),

    vscode: (
      <>
        <SectionTitle
          dark={dark}
          title="Integração com VS Code"
          text="Escreva localmente."
        />
      </>
    ),

    data: (
      <>
        <SectionTitle
          dark={dark}
          title="Dados"
          text="Gerencie seus backups."
        />
        <Row dark={dark} title="Exportar backup" description="Baixa arquivo JSON.">
          <button
            type="button"
            onClick={onExport}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold ${
              btnTextDark ? "text-zinc-950" : "text-white"
            }`}
            style={{ background: previewBackground }}
          >
            <Download size={14} /> Exportar
          </button>
        </Row>
        <Row dark={dark} title="Importar backup" description="Restaurar de arquivo.">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium ${ui.divider} ${ui.text} ${ui.hover}`}
          >
            <Upload size={14} /> Importar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </Row>
        <Row dark={dark} title="Apagar tudo" description="Zera todos os dados.">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
          >
            <Trash2 size={14} /> Apagar
          </button>
        </Row>
      </>
    ),
  };

  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`flex h-165 max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border shadow-2xl ${ui.card}`}
      >
        <nav
          className={`hidden w-56 shrink-0 flex-col border-r p-4 sm:flex ${ui.divider}`}
        >
          <div className="mb-5 flex items-center gap-2.5 px-2 pt-1">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${ui.soft}`}
            >
              <Settings size={16} className={ui.muted} />
            </div>
            <h2 className={`text-sm font-semibold ${ui.title}`}>
              Configurações
            </h2>
          </div>
          <div className="space-y-1">
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                    active
                      ? dark
                        ? "bg-white/8 text-white font-semibold"
                        : "bg-zinc-100 text-zinc-900 font-semibold"
                      : `${ui.muted} ${ui.hover}`
                  }`}
                  style={{
                    borderLeft: active
                      ? `3px solid ${currentAccent}`
                      : "3px solid transparent",
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className={`flex items-center justify-between border-b px-6 py-4 ${ui.divider}`}
          >
            <p className={`hidden text-xs sm:block ${ui.muted}`}>
              As alterações são salvas automaticamente.
            </p>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg p-2 ${ui.muted} ${ui.hover}`}
            >
              <X size={18} />
            </button>
          </div>
          <div className="thin-scroll flex-1 overflow-y-auto px-6 py-6">
            {content[tab]}
          </div>
        </div>
      </div>
    </div>
  );
}