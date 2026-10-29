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
import { AppSettings, DEFAULT_SETTINGS, TEXT_SCALE_MAX, TEXT_SCALE_MIN } from "@/lib/settings";
import { highlightCode } from "@/lib/code/highlight";
import {
  BG_IDB_PREFIX,
  deleteBgImage,
  saveBgImage,
  useBgImage,
} from "@/lib/bgImage";
import { DEFAULT_ACCENT, PRIMARY_BTN, useAccent, withAlpha } from "@/lib/theme";
import { useConfirm } from "./ConfirmDialog";

interface ExtendedAppSettings extends AppSettings {
  accentColor?: string;
  bgImageUrl?: string;
  /** 0 a 100 — o quanto a imagem aparece sobre o fundo */
  bgImageOpacity?: number;
  /** 0 a 200 — 0 = preto e branco, 100 = cor original, 200 = cores bem vivas */
  bgImageSaturation?: number;
  /** 0 a 100 — véu de leitura (branco no tema claro, preto no escuro) sobre a imagem */
  bgImageVeil?: number;
}

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
  /** Recebe o texto do arquivo; devolve uma mensagem de erro ou null se deu certo */
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

// Paleta de cores para destaque rápido
const ACCENT_PRESETS = [
  { name: "Índigo (padrão)", hex: "#6366f1" },
  { name: "Violeta", hex: "#8b5cf6" },
  { name: "Ciano", hex: "#06b6d4" },
  { name: "Esmeralda", hex: "#10b981" },
  { name: "Âmbar", hex: "#f59e0b" },
  { name: "Rosa", hex: "#ec4899" },
  { name: "Vinho", hex: "#881337" },
];

const DEFAULT_BG_OPACITY = 30;
const DEFAULT_BG_SATURATION = 100;

const PREVIEW_CODE = `#include <stdio.h>

int main(void) {
  // soma de dois números
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
  accentColor = DEFAULT_ACCENT,
}: {
  dark: boolean;
  value: boolean;
  onChange: (value: boolean) => void;
  accentColor?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative h-6 w-11 rounded-full transition-colors"
      style={{
        backgroundColor: value ? accentColor : dark ? "#3f3f46" : "#d4d4d8",
      }}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          value ? "left-6" : "left-0.5"
        }`}
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
  const currentAccent = settings.accentColor || DEFAULT_ACCENT;
  useAccent(); // mantém a variável --accent em dia
  const confirm = useConfirm();

  const bgOpacity = settings.bgImageOpacity ?? DEFAULT_BG_OPACITY;
  const bgSaturation = settings.bgImageSaturation ?? DEFAULT_BG_SATURATION;
  const defaultVeil = dark ? 0 : 40;
  const bgVeil = settings.bgImageVeil ?? defaultVeil;
  const hasBgImage = Boolean(settings.bgImageUrl);
  const bgIsUpload = Boolean(settings.bgImageUrl?.startsWith(BG_IDB_PREFIX));
  // endereço que o CSS entende (resolve o arquivo original guardado no IndexedDB)
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
    primary: PRIMARY_BTN,
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

  /** Foto da galeria: guarda o arquivo ORIGINAL, sem reduzir nem recomprimir */
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
    } catch {
      setBgError("Não foi possível salvar a imagem neste navegador.");
    }
  };

  const handleReset = async () => {
    const confirmed = await confirm({
      title: "Apagar todos os dados?",
      description:
        "Todos os projetos, fluxogramas, anotações e processos serão apagados. Essa ação não pode ser desfeita. Faça um backup antes.",
      confirmLabel: "Apagar tudo",
    });

    if (confirmed) {
      onReset();
      setImportMessage({ ok: true, text: "Todos os dados foram apagados." });
    }
  };

  /** Descrição amigável do nível de cor */
  const saturationLabel =
    bgSaturation === 0
      ? "Preto e branco"
      : bgSaturation < 100
      ? "Cores suaves"
      : bgSaturation === 100
      ? "Cor original"
      : "Cores vivas";

  /* =======================================================
     ABA APARÊNCIA COM OPÇÕES DE COR E IMAGEM
  ======================================================= */

  const content: Record<TabId, React.ReactNode> = {
    appearance: (
      <>
        <SectionTitle
          dark={dark}
          title="Aparência"
          text="Mantenha a base limpa (Preto ou Branco) e personalize com cores e imagem de fundo."
        />

        {/* NOME NA SAUDAÇÃO */}
        <Row
          dark={dark}
          title="Seu nome"
          description="Aparece na saudação da tela inicial (ex.: Boa tarde, Maria)."
        >
          <input
            type="text"
            value={settings.userName ?? ""}
            maxLength={40}
            onChange={(e) => update("userName", e.target.value)}
            placeholder="Como quer ser chamado(a)"
            aria-label="Seu nome"
            className={`w-56 rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors ${
              dark
                ? "border-white/10 bg-white/3 text-zinc-100 placeholder:text-zinc-500 focus:border-white/25"
                : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400"
            }`}
          />
        </Row>

        {/* MODO CLARO / ESCURO */}
        <Row
          dark={dark}
          title="Tema de Fundo Base"
          description="A cor base permanece estritamente Preta (Modo Escuro) ou Branca (Modo Claro)."
        >
          <div className={`flex rounded-xl p-1 ${ui.soft}`}>
            {(
              [
                ["dark", "Escuro (Preto)", <Moon key="m" size={14} />],
                ["light", "Claro (Branco)", <Sun key="s" size={14} />],
              ] as const
            ).map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
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

        {/* TAMANHO DOS TEXTOS POR FUNCIONALIDADE */}
        {(
          [
            ["textScaleHome", "Tamanho: Início", "Textos da tela inicial."],
            ["textScaleFlows", "Tamanho: Fluxogramas", "Letras dos blocos, botões e listas dos fluxogramas."],
            ["textScaleNotes", "Tamanho: Anotações", "Textos das notas e lembretes."],
            ["textScaleProcesses", "Tamanho: Processos", "Letras dos cards e etapas da pipeline."],
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
                  aria-label={title}
                  className="w-40"
                  style={{ accentColor: currentAccent }}
                />
                <span className={`w-12 text-right text-xs tabular-nums ${ui.muted}`}>{value}%</span>
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

        {/* VELOCIDADE DO ZOOM DO FLUXOGRAMA */}
        <Row
          dark={dark}
          title="Velocidade do zoom"
          description="Sensibilidade da roda do mouse nos fluxogramas. Menor = mais suave e preciso."
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={150}
              step={5}
              value={settings.flowZoomSpeed ?? DEFAULT_SETTINGS.flowZoomSpeed}
              onChange={(e) => update("flowZoomSpeed", Number(e.target.value))}
              aria-label="Velocidade do zoom"
              className="w-40"
              style={{ accentColor: currentAccent }}
            />
            <span className={`w-12 text-right text-xs tabular-nums ${ui.muted}`}>
              {settings.flowZoomSpeed ?? DEFAULT_SETTINGS.flowZoomSpeed}%
            </span>
            <button
              type="button"
              disabled={(settings.flowZoomSpeed ?? DEFAULT_SETTINGS.flowZoomSpeed) === DEFAULT_SETTINGS.flowZoomSpeed}
              onClick={() => update("flowZoomSpeed", DEFAULT_SETTINGS.flowZoomSpeed)}
              className={`rounded-lg p-1.5 ${ui.muted} ${ui.hover} disabled:opacity-30`}
              title="Restaurar velocidade padrão"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </Row>

        {/* COR DE DESTAQUE (ACCENT COLOR) */}
        <Row
          dark={dark}
          title="Cor de Destaque"
          description="Escolha a cor dos detalhes, seleções, botões e bordas destacadas."
        >
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((preset) => {
              const selected = currentAccent === preset.hex;
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => update("accentColor", preset.hex)}
                  title={preset.name}
                  className="group relative flex h-7 w-7 items-center justify-center rounded-full transition-transform active:scale-95"
                  style={{ backgroundColor: preset.hex }}
                >
                  {selected && (
                    <Check size={14} className="text-white drop-shadow-md" />
                  )}
                </button>
              );
            })}

            {/* Input customizado de cor */}
            <label
              title="Cor Personalizada"
              className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-zinc-500/40 bg-transparent transition-transform hover:scale-105"
            >
              <input
                type="color"
                value={currentAccent}
                onChange={(e) => update("accentColor", e.target.value)}
                className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
              />
              <span className="text-[10px] font-bold text-zinc-400">+</span>
            </label>
          </div>
        </Row>

        {/* IMAGEM DE FUNDO: LINK OU GALERIA */}
        <Row
          dark={dark}
          title="Imagem de Fundo"
          description="Cole um link ou escolha uma foto da sua galeria. A foto é guardada no tamanho original, sem perder qualidade."
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
                    bgIsUpload ? "Foto da galeria" : "https://exemplo.com/imagem.png"
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
                <Upload size={14} />
                Galeria
              </button>

              {hasBgImage && (
                <button
                  type="button"
                  onClick={() => {
                    deleteBgImage().catch(() => {});
                    update("bgImageUrl", "");
                    setBgError(null);
                  }}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                  title="Remover imagem"
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

        {/* OPACIDADE DA IMAGEM */}
        <Row
          dark={dark}
          title="Opacidade da Imagem"
          description={
            hasBgImage
              ? "Quanto menor, mais a imagem se mistura com o fundo preto/branco."
              : "Escolha uma imagem de fundo para ajustar a opacidade."
          }
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={bgOpacity}
              disabled={!hasBgImage}
              onChange={(e) => update("bgImageOpacity", Number(e.target.value))}
              className="w-40 disabled:opacity-40"
              style={{ accentColor: currentAccent }}
            />
            <span className={`w-10 text-right text-xs tabular-nums ${ui.muted}`}>
              {bgOpacity}%
            </span>
            <button
              type="button"
              disabled={!hasBgImage || bgOpacity === DEFAULT_BG_OPACITY}
              onClick={() => update("bgImageOpacity", DEFAULT_BG_OPACITY)}
              className={`rounded-lg p-1.5 ${ui.muted} ${ui.hover} disabled:opacity-30`}
              title="Resetar opacidade"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </Row>

        {/* INTENSIDADE DAS CORES DA IMAGEM */}
        <Row
          dark={dark}
          title="Intensidade das Cores"
          description={
            hasBgImage
              ? `${saturationLabel}. Arraste para a esquerda para apagar as cores ou para a direita para deixá-las mais vivas.`
              : "Escolha uma imagem de fundo para ajustar as cores."
          }
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
            <span className={`w-10 text-right text-xs tabular-nums ${ui.muted}`}>
              {bgSaturation}%
            </span>
            <button
              type="button"
              disabled={!hasBgImage || bgSaturation === DEFAULT_BG_SATURATION}
              onClick={() =>
                update("bgImageSaturation", DEFAULT_BG_SATURATION)
              }
              className={`rounded-lg p-1.5 ${ui.muted} ${ui.hover} disabled:opacity-30`}
              title="Resetar cores"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </Row>

        {/* VÉU DE LEITURA */}
        <Row
          dark={dark}
          title="Véu de Leitura"
          description={
            hasBgImage
              ? dark
                ? "Escurece a imagem para os textos claros ficarem legíveis."
                : "Clareia a imagem para os textos escuros ficarem legíveis. Aumente se algum texto estiver difícil de ler."
              : "Escolha uma imagem de fundo para ajustar o véu."
          }
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
            <span className={`w-10 text-right text-xs tabular-nums ${ui.muted}`}>
              {bgVeil}%
            </span>
            <button
              type="button"
              disabled={!hasBgImage || bgVeil === defaultVeil}
              onClick={() => update("bgImageVeil", defaultVeil)}
              className={`rounded-lg p-1.5 ${ui.muted} ${ui.hover} disabled:opacity-30`}
              title="Resetar véu"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </Row>

        {/* PREVIEW DO CARD */}
        <div className="mt-4">
          <p
            className={`mb-2 text-[11px] font-medium uppercase tracking-wider ${ui.muted}`}
          >
            Pré-visualização da Sua Combinação
          </p>

          <div
            className="relative overflow-hidden rounded-2xl border p-5 transition-all"
            style={{
              backgroundColor: dark ? "#000000" : "#ffffff",
              borderColor: dark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            }}
          >
            {hasBgImage && bgPreviewSrc && (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url("${bgPreviewSrc}")`,
                  opacity: bgOpacity / 100,
                  filter: `saturate(${bgSaturation}%)`,
                }}
              />
            )}

            {hasBgImage && bgVeil > 0 && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: dark ? "#000000" : "#ffffff",
                  opacity: bgVeil / 100,
                }}
              />
            )}

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: withAlpha(currentAccent, 0.13),
                    color: currentAccent,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: currentAccent }}
                  />
                  Estilo Selecionado
                </span>
                <h4 className={`mt-2 text-sm font-bold ${ui.title}`}>
                  {dark ? "Fundo Preto com Destaques" : "Fundo Branco com Destaques"}
                </h4>
                <p className={`text-xs ${ui.muted}`}>
                  Sua interface permanecerá limpa e legível.
                </p>
              </div>

              <button
                type="button"
                className="rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: currentAccent }}
              >
                Ação Principal
              </button>
            </div>
          </div>
        </div>

        <Row
          dark={dark}
          title="Efeito de Luz em Movimento"
          description="Efeito de luz ao fundo com a cor de destaque escolhida."
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
          description={`${settings.editorFontSize}px. Aumente se estiver difícil de ler no zoom reduzido.`}
        >
          <input
            type="range"
            min={10}
            max={16}
            step={1}
            value={settings.editorFontSize}
            onChange={(e) => update("editorFontSize", Number(e.target.value))}
            className="w-40"
            style={{ accentColor: currentAccent }}
          />
        </Row>

        <Row
          dark={dark}
          title="Números de linha"
          description="Mostra a numeração ao lado esquerdo do código."
        >
          <Toggle
            dark={dark}
            value={settings.editorLineNumbers}
            onChange={(value) => update("editorLineNumbers", value)}
            accentColor={currentAccent}
          />
        </Row>

        <Row
          dark={dark}
          title="Detectar linguagem automaticamente"
          description="Ao colar um código, descobre se é C, Python, JavaScript etc. e aplica as cores."
        >
          <Toggle
            dark={dark}
            value={settings.autoDetectLanguage}
            onChange={(value) => update("autoDetectLanguage", value)}
            accentColor={currentAccent}
          />
        </Row>

        <div className="mt-5">
          <p
            className={`mb-2 text-[11px] font-medium uppercase tracking-[0.14em] ${ui.muted}`}
          >
            Pré-visualização
          </p>

          <div
            className={`code-hl overflow-hidden rounded-xl border p-3 ${ui.divider} ${
              dark ? "code-hl-dark bg-zinc-950" : "code-hl-light bg-white"
            }`}
          >
            <pre
              className="hljs m-0 overflow-x-auto"
              style={{
                background: "transparent",
                padding: 0,
                fontFamily:
                  "var(--font-geist-mono), ui-monospace, Menlo, Consolas, monospace",
                fontSize: settings.editorFontSize,
                lineHeight: `${Math.round(settings.editorFontSize * 1.65)}px`,
              }}
            >
              <code
                dangerouslySetInnerHTML={{
                  __html: highlightCode(PREVIEW_CODE, "C"),
                }}
              />
            </pre>
          </div>
        </div>
      </>
    ),

    ai: (
      <>
        <SectionTitle
          dark={dark}
          title="Assistente de IA"
          text="O assistente lê o seu fluxograma, inclusive os códigos e as ligações entre eles."
        />

        <Row
          dark={dark}
          title="Abrir o chat ao entrar no grafo"
          description="Se desligado, o chat começa recolhido e abre quando você clica na barra."
        >
          <Toggle
            dark={dark}
            value={settings.aiChatOpenByDefault}
            onChange={(value) => update("aiChatOpenByDefault", value)}
            accentColor={currentAccent}
          />
        </Row>

        <div className={`mt-5 rounded-2xl border p-4 ${ui.divider} ${ui.soft}`}>
          <div className="flex items-center gap-2">
            <Bot size={15} style={{ color: currentAccent }} />
            <p className={`text-xs font-semibold ${ui.title}`}>
              Em desenvolvimento
            </p>
          </div>

          <ul className={`mt-3 space-y-2 text-xs leading-relaxed ${ui.muted}`}>
            <li>
              • Revisão automática: apontar erros e o que está faltando no código
              do grafo.
            </li>
            <li>• Sugestões de melhoria direto no bloco de código.</li>
            <li>• Explicar o fluxo do programa em linguagem simples.</li>
          </ul>
        </div>
      </>
    ),

    vscode: (
      <>
        <SectionTitle
          dark={dark}
          title="Integração com o VS Code"
          text="Escreva o código no VS Code e veja o fluxograma se montar no Your Mind."
        />

        <div className={`rounded-2xl border p-5 ${ui.divider} ${ui.soft}`}>
          <div className="mb-4 flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: withAlpha(currentAccent, 0.13),
                color: currentAccent,
              }}
            >
              Em breve
            </span>
          </div>

          <ol className="space-y-4">
            {(
              [
                [
                  <Terminal key="1" size={15} />,
                  "Extensão no VS Code",
                  "Ao salvar um arquivo, a extensão envia o código para o Your Mind.",
                ],
                [
                  <GitFork key="2" size={15} />,
                  "Fluxograma automático",
                  "Cada arquivo vira um bloco de código no grafo, com as ligações entre eles.",
                ],
                [
                  <Sparkles key="3" size={15} />,
                  "IA acompanhando",
                  "O assistente lê o grafo, aponta erros, sugere melhorias e explica o que cada parte faz.",
                ],
              ] as const
            ).map(([icon, title, text], index) => (
              <li key={index} className="flex gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    dark
                      ? "bg-white/6 text-zinc-300"
                      : "bg-white text-zinc-600"
                  }`}
                >
                  {icon}
                </div>

                <div>
                  <p className={`text-sm font-medium ${ui.title}`}>{title}</p>
                  <p className={`mt-0.5 text-xs leading-relaxed ${ui.muted}`}>
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </>
    ),

    data: (
      <>
        <SectionTitle
          dark={dark}
          title="Dados"
          text="Tudo fica salvo no seu navegador. Faça backup para não perder nada."
        />

        <div className="mb-4 grid grid-cols-3 gap-3">
          {(
            [
              ["Projetos", counts.folders],
              ["Fluxogramas", counts.topics],
              ["Anotações", counts.tasks],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className={`rounded-xl border p-4 ${ui.divider}`}>
              <p className={`text-xl font-semibold ${ui.title}`}>{value}</p>
              <p className={`mt-1 text-xs ${ui.muted}`}>{label}</p>
            </div>
          ))}
        </div>

        <Row
          dark={dark}
          title="Exportar backup"
          description="Baixa um arquivo .json com projetos, fluxogramas e anotações."
        >
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: currentAccent }}
          >
            <Download size={14} />
            Exportar
          </button>
        </Row>

        <Row
          dark={dark}
          title="Importar backup"
          description="Substitui os dados atuais pelos do arquivo escolhido."
        >
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium ${ui.divider} ${ui.text} ${ui.hover}`}
          >
            <Upload size={14} />
            Importar
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </Row>

        <Row
          dark={dark}
          title="Apagar tudo"
          description="Remove todos os dados deste navegador. Não tem volta."
        >
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
          >
            <Trash2 size={14} />
            Apagar
          </button>
        </Row>

        {importMessage && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-xs ${
              importMessage.ok
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {importMessage.ok ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            {importMessage.text}
          </div>
        )}
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
        {/* MENU LATERAL */}
        <nav
          className={`hidden w-56 shrink-0 flex-col border-r p-4 sm:flex ${ui.divider}`}
        >
          <div className="mb-5 flex items-center gap-2.5 px-2 pt-1">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${ui.soft}`}
            >
              <Settings size={16} className={ui.muted} />
            </div>
            <h2 className={`text-sm font-semibold ${ui.title}`}>Configurações</h2>
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

          <button
            type="button"
            onClick={() => setSettings(DEFAULT_SETTINGS)}
            className={`mt-auto rounded-xl px-3 py-2.5 text-left text-[11px] ${ui.muted} ${ui.hover}`}
          >
            Restaurar padrões
          </button>
        </nav>

        {/* CONTEÚDO */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className={`flex items-center justify-between border-b px-6 py-4 ${ui.divider}`}
          >
            {/* Abas no celular */}
            <div className="flex gap-1 overflow-x-auto sm:hidden">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs whitespace-nowrap ${
                    tab === item.id ? `${ui.soft} ${ui.title}` : ui.muted
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <p className={`hidden text-xs sm:block ${ui.muted}`}>
              As alterações são salvas automaticamente.
            </p>

            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg p-2 ${ui.muted} ${ui.hover}`}
              title="Fechar (Esc)"
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