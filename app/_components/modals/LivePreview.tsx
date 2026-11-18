"use client";

import React, { useEffect, useRef, useState } from "react";

import { Theme } from "@/types";
import { BgPattern, BgVariant, ColorStyle } from "@/lib/settings";
import { CURATED_PALETTES, buildAccentGradient } from "@/lib/theme";
import { CoverFit, PreviewOverride } from "@/lib/savedAppearance";
import AnimatedBackground from "../background/AnimatedBackground";

/* ───────────────────────── estado mostrado na mini-tela ───────────────────────── */

export interface PreviewState {
  theme: Theme;
  accent: string;
  colorStyle: ColorStyle;
  colorPreset: string;
  variant: BgVariant;
  pattern: BgPattern;
  imageUrl?: string;
  imageOpacity: number;
  imageSaturation: number;
  imageVeil?: number;
  cover: { src: string; fit: CoverFit } | null;
}

/** Aplica a prévia (o que está sob o mouse) por cima do estado atual. */
export function applyPreview(
  base: PreviewState,
  o: PreviewOverride | null
): PreviewState {
  if (!o) return base;

  return {
    theme: o.theme ?? base.theme,
    accent: o.accentColor ?? base.accent,
    colorStyle: o.colorStyle ?? base.colorStyle,
    colorPreset: o.colorPreset ?? base.colorPreset,
    variant: o.bgVariant ?? base.variant,
    pattern: o.bgPattern ?? base.pattern,
    imageUrl: o.imageUrl !== undefined ? o.imageUrl || undefined : base.imageUrl,
    imageOpacity: o.imageOpacity ?? base.imageOpacity,
    imageSaturation: o.imageSaturation ?? base.imageSaturation,
    imageVeil: o.imageVeil ?? base.imageVeil,
    cover: o.cover !== undefined ? o.cover : base.cover,
  };
}

/** Cor sólida, gradiente ou paleta, como será usada nos botões e destaques. */
function accentBackground(state: PreviewState): string {
  if (state.colorStyle === "gradient") return buildAccentGradient(state.accent);

  if (state.colorStyle === "preset") {
    const palette =
      CURATED_PALETTES.find((p) => p.id === state.colorPreset) ||
      CURATED_PALETTES[0];
    return palette.gradient;
  }

  return state.accent;
}

/**
 * Guarda a prévia e devolve `peek(...)`: espalhe o resultado num elemento para
 * que passar o mouse nele mostre a prévia e sair do mouse a limpe.
 */
export function usePreviewPeek() {
  const [override, setOverride] = useState<PreviewOverride | null>(null);

  const peek = (o: PreviewOverride) => ({
    onMouseEnter: () => setOverride(o),
    onMouseLeave: () => setOverride(null),
  });

  return { override, setOverride, peek };
}

/* ───────────────────────── mini-tela ───────────────────────── */

interface LivePreviewProps {
  /** como a aparência está agora */
  base: PreviewState;
  /** prévia temporária por cima do estado atual (null = nenhuma) */
  override?: PreviewOverride | null;
  /** texto de saudação no topo (se omitido, mostra só uma barra) */
  greeting?: string;
}

/**
 * Mostra como o app vai ficar: o fundo real (AnimatedBackground) dentro de uma
 * cópia da tela em tamanho cheio, reduzida para caber na caixa. Também mostra
 * a cor de destaque, a foto de fundo e a capa da tela inicial.
 */
export default function LivePreview({
  base,
  override = null,
  greeting,
}: LivePreviewProps) {
  const state = applyPreview(base, override);
  const dark = state.theme === "dark";
  const accentBg = accentBackground(state);

  /* tamanho: a tela inteira é desenhada em tamanho real e reduzida com scale */
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, vw: 1280, vh: 800 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = () => {
      const next = {
        w: el.clientWidth,
        vw: window.innerWidth,
        vh: window.innerHeight,
      };
      setBox((prev) =>
        prev.w === next.w && prev.vw === next.vw && prev.vh === next.vh
          ? prev
          : next
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const scale = box.w / box.vw;
  const cardBg = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const border = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const bar = dark ? "rgba(255,255,255,0.24)" : "rgba(0,0,0,0.2)";

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden rounded-xl border"
      style={{
        height: box.vh * scale,
        borderColor: border,
        backgroundColor: dark ? "#07070a" : "#f6f6f9",
      }}
    >
      <div
        className="absolute left-0 top-0 isolate overflow-hidden"
        style={{
          width: box.vw,
          height: box.vh,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <AnimatedBackground
          contained
          theme={state.theme}
          variant={state.variant}
          pattern={state.pattern}
          accentColor={state.accent}
          imageUrl={state.imageUrl}
          imageOpacity={state.imageOpacity}
          imageSaturation={state.imageSaturation}
          imageVeil={state.imageVeil}
          showLights
        />

        {/* esboço da interface: dá noção de como cores, capa e texto ficam sobre o fundo */}
        <div className="absolute inset-0 flex">
          {/* menu lateral */}
          <div
            className="flex flex-col items-center gap-6 pt-8"
            style={{
              width: "5.5%",
              borderRight: `1px solid ${border}`,
              background: cardBg,
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: "46%",
                  aspectRatio: "1",
                  borderRadius: "28%",
                  background: i === 0 ? accentBg : bar,
                  opacity: i === 0 ? 1 : 0.55,
                }}
              />
            ))}
          </div>

          {/* conteúdo */}
          <div className="min-w-0 flex-1" style={{ padding: "3.5%" }}>
            {state.cover && (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16 / 5",
                  marginBottom: 32,
                  borderRadius: 28,
                  border: `1px solid ${border}`,
                  backgroundColor: dark ? "#0b0b0f" : "#e9e9ee",
                  backgroundImage: `url("${state.cover.src}")`,
                  backgroundSize:
                    state.cover.fit === "contain" ? "contain" : "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              />
            )}

            <div className="flex items-center justify-between">
              <div>
                {greeting ? (
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 800,
                      lineHeight: 1.1,
                      color: dark ? "#fafafa" : "#18181b",
                    }}
                  >
                    {greeting}
                  </div>
                ) : (
                  <div
                    style={{
                      height: 40,
                      width: 300,
                      borderRadius: 999,
                      background: bar,
                    }}
                  />
                )}
                <div
                  style={{
                    height: 18,
                    width: 480,
                    marginTop: 18,
                    borderRadius: 999,
                    background: bar,
                    opacity: 0.55,
                  }}
                />
              </div>

              <div
                style={{
                  height: 52,
                  width: 190,
                  borderRadius: 18,
                  background: accentBg,
                }}
              />
            </div>

            {/* cards */}
            <div className="mt-10 grid grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 230,
                    borderRadius: 24,
                    border: `1px solid ${border}`,
                    background: cardBg,
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      height: 22,
                      width: i === 0 ? 120 : 90,
                      borderRadius: 999,
                      background: i === 0 ? accentBg : bar,
                      opacity: i === 0 ? 0.95 : 0.6,
                    }}
                  />
                  <div
                    style={{
                      height: 14,
                      marginTop: 24,
                      borderRadius: 999,
                      background: bar,
                      opacity: 0.5,
                    }}
                  />
                  <div
                    style={{
                      height: 14,
                      width: "70%",
                      marginTop: 14,
                      borderRadius: 999,
                      background: bar,
                      opacity: 0.35,
                    }}
                  />
                </div>
              ))}
            </div>

            {!state.cover && (
              <div
                className="mt-6"
                style={{
                  height: 260,
                  borderRadius: 24,
                  border: `1px solid ${border}`,
                  background: cardBg,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}