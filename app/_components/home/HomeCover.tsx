"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Crop,
  Link as LinkIcon,
  Maximize2,
  Move,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";

import { Theme } from "@/types";
import { withAlpha } from "@/lib/theme";
import { getUi } from "@/lib/ui";
import { normalizeImageUrl } from "@/lib/link";

import ModalShell from "../modals/ModalShell";
import CoverGrid from "../modals/CoverGrid";
import {
  COVER_CHANGED_EVENT,
  addCover,
  notifyCoverChanged,
  readCurrentCover,
  useCovers,
} from "@/lib/savedAppearance";

/** Tamanho final da capa (faixa 16:5) */
const COVER_W = 1920;
const COVER_H = 600;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export type CoverFit = "cover" | "contain";

interface UseHomeCoverOptions {
  theme: Theme;
  accentColor: string;
}

interface UseHomeCoverResult {
  /** endereço da imagem salva (vazio = sem capa) */
  coverImage: string;
  /** como a imagem preenche o banner */
  fitMode: CoverFit;
  /** abre a janela "Foto de capa" (botão do pincel no banner) */
  openConfig: () => void;
  /** as duas janelas da capa; renderize em qualquer lugar do JSX da Home */
  modals: React.ReactNode;
}

/**
 * Tudo da capa da tela inicial: estado, gravação no navegador (localStorage),
 * enquadramento e as duas janelas (Foto de capa e Ajustar enquadramento).
 * Saiu da Home.tsx sem mudar o comportamento.
 */
export function useHomeCover({ theme, accentColor }: UseHomeCoverOptions): UseHomeCoverResult {
  const ui = getUi(theme === "dark");

  const [coverImage, setCoverImage] = useState<string>("");
  const [fitMode, setFitMode] = useState<CoverFit>("cover");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState("");
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [coverError, setCoverError] = useState("");
  const [showLinkField, setShowLinkField] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  /* enquadramento: zoom (1 = preenche a faixa) e deslocamento em pixels da moldura */
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });

  /* capas já salvas na biblioteca (aparecem na janela "Foto de capa") */
  const { covers: savedCovers, activeSig: activeCoverSig } = useCovers();

  const frameRef = useRef<HTMLDivElement | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedSrc = localStorage.getItem("home_cover_src");
      const savedFit = localStorage.getItem("home_cover_fit");
      if (savedSrc) setCoverImage(savedSrc);
      if (savedFit === "cover" || savedFit === "contain") setFitMode(savedFit);

      /* a capa que já estava salva entra na biblioteca (sem duplicar) */
      if (savedSrc) {
        addCover(savedSrc, savedFit === "contain" ? "contain" : "cover").catch(
          () => {}
        );
      }
    } catch {
      /* ignora */
    }
  }, []);

  /* quando a capa muda por fora (ex.: modelo aplicado nas Configurações) */
  useEffect(() => {
    const reload = () => {
      const current = readCurrentCover();
      setCoverImage(current?.src ?? "");
      if (current) setFitMode(current.fit);
    };

    window.addEventListener(COVER_CHANGED_EVENT, reload);
    return () => window.removeEventListener(COVER_CHANGED_EVENT, reload);
  }, []);

  /** Salva a capa. Devolve false se o navegador recusar (armazenamento cheio). */
  const saveCover = (newSrc: string, fit?: CoverFit): boolean => {
    const newFit = fit || fitMode;

    try {
      if (newSrc) {
        localStorage.setItem("home_cover_src", newSrc);
      } else {
        localStorage.removeItem("home_cover_src");
      }

      localStorage.setItem("home_cover_fit", newFit);
    } catch {
      setCoverError(
        "Não foi possível salvar: a imagem é pesada demais para o armazenamento do navegador. Tente uma menor."
      );

      return false;
    }

    setCoverImage(newSrc);
    setFitMode(newFit);
    setCoverError("");

    /* guarda na biblioteca de capas e avisa o resto do app */
    if (newSrc) addCover(newSrc, newFit).catch(() => {});
    notifyCoverChanged();

    return true;
  };

  const toggleFitMode = (mode: CoverFit) => {
    setFitMode(mode);

    try {
      localStorage.setItem("home_cover_fit", mode);
    } catch {
      /* ignora */
    }
  };

  const closeConfig = () => {
    setShowConfigModal(false);
    setShowLinkField(false);
    setLinkValue("");
    setCoverError("");
  };

  const closeCrop = () => {
    setShowCropModal(false);
    setRawImageSrc("");
    setIsDragging(false);
    dragRef.current = null;
  };

  const prepareEditor = (src: string) => {
    const imgObj = new Image();
    imgObj.crossOrigin = "anonymous";

    imgObj.onload = () => {
      setNaturalDimensions({
        width: imgObj.naturalWidth || 1920,
        height: imgObj.naturalHeight || 1080,
      });
      setRawImageSrc(src);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      closeConfig();
      setShowCropModal(true);
    };

    /* Sites que bloqueiam o editor: usa a imagem como está, sem enquadrar */
    imgObj.onerror = () => {
      if (saveCover(src, "cover")) closeConfig();
    };

    imgObj.src = src;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    e.target.value = ""; // permite escolher o mesmo arquivo de novo

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCoverError("Escolha um arquivo de imagem.");

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") prepareEditor(reader.result);
    };

    reader.onerror = () => setCoverError("Não consegui ler esse arquivo.");
    reader.readAsDataURL(file);
  };

  const handleLinkSubmit = () => {
    const url = normalizeImageUrl(linkValue);

    if (!url) {
      setCoverError("Cole um link de imagem válido.");

      return;
    }

    prepareEditor(url);
  };

  /* ---------- geometria do enquadramento ---------- */
  const baseScale =
    naturalDimensions.width && frameSize.w
      ? Math.max(frameSize.w / naturalDimensions.width, frameSize.h / naturalDimensions.height)
      : 1;

  const drawW = naturalDimensions.width * baseScale * scale;
  const drawH = naturalDimensions.height * baseScale * scale;

  const clampPos = (p: { x: number; y: number }) => ({
    x: clamp(p.x, -Math.max(0, (drawW - frameSize.w) / 2), Math.max(0, (drawW - frameSize.w) / 2)),
    y: clamp(p.y, -Math.max(0, (drawH - frameSize.h) / 2), Math.max(0, (drawH - frameSize.h) / 2)),
  });

  const pos = clampPos(position);

  useEffect(() => {
    if (!showCropModal) return;

    const el = frameRef.current;

    if (!el) return;

    const measure = () => setFrameSize({ w: el.clientWidth, h: el.clientHeight });

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);

    /* o React registra o scroll como passivo; aqui precisamos bloquear a rolagem da página */
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((current) => clamp(current - e.deltaY * 0.0015, 1, 4));
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, [showCropModal]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;

    if (!d) return;

    setPosition(clampPos({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const handleConfirmCrop = () => {
    const img = previewImageRef.current;

    if (!img || !frameSize.w || !naturalDimensions.width) return;

    let saved = false;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = COVER_W;
      canvas.height = COVER_H;

      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("canvas");

      /* o que aparece na moldura é exatamente o que vai para a capa */
      const r = COVER_W / frameSize.w;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        COVER_W / 2 + pos.x * r - (drawW * r) / 2,
        COVER_H / 2 + pos.y * r - (drawH * r) / 2,
        drawW * r,
        drawH * r
      );

      saved = saveCover(canvas.toDataURL("image/jpeg", 0.9), "cover");
    } catch {
      /* imagem de outro site bloqueou o recorte: guarda o endereço original */
      saved = saveCover(rawImageSrc, "cover");
    }

    if (saved) closeCrop();
  };

  const modals = (
    <>
      {/* MODAL: FOTO DE CAPA */}
      {showConfigModal && (
        <ModalShell
          theme={theme}
          title="Foto de capa"
          description="Personalize o banner da tela inicial."
          icon={<Pencil size={16} />}
          size="sm"
          onClose={closeConfig}
          footer={
            <button type="button" onClick={closeConfig} className={ui.btnGhost}>
              Fechar
            </button>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-xs font-semibold transition-all ${ui.option}`}
              >
                <Upload size={17} style={{ color: accentColor }} />
                <span>Enviar nova imagem</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              {showLinkField ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={linkValue}
                    onChange={(e) => setLinkValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLinkSubmit();
                    }}
                    placeholder="Cole o link da imagem"
                    className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-xs outline-none transition-colors ${ui.field}`}
                  />
                  <button type="button" onClick={handleLinkSubmit} className={ui.btnPrimarySm}>
                    Usar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLinkField(true)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left text-xs font-semibold transition-all ${ui.option}`}
                >
                  <LinkIcon size={17} style={{ color: accentColor }} />
                  <span>Adicionar por link</span>
                </button>
              )}
            </div>

            {coverError && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {coverError}
              </p>
            )}

            {savedCovers.length > 0 && (
              <div className="space-y-2">
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${ui.subtitle}`}>
                  Capas salvas
                </span>

                <CoverGrid
                  covers={savedCovers}
                  activeSig={activeCoverSig}
                  accent={accentColor}
                  dark={theme === "dark"}
                  onApply={(cover) => {
                    if (saveCover(cover.src, cover.fit)) closeConfig();
                  }}
                />
              </div>
            )}

            {coverImage && (
              <div className="space-y-2">
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${ui.subtitle}`}>
                  Modo de exibição
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["cover", "Preencher", <Crop key="c" size={14} />],
                      ["contain", "Completa", <Maximize2 key="m" size={14} />],
                    ] as const
                  ).map(([mode, label, icon]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => toggleFitMode(mode)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                        fitMode === mode ? "" : ui.option
                      }`}
                      style={
                        fitMode === mode
                          ? {
                              borderColor: accentColor,
                              backgroundColor: withAlpha(accentColor, 0.15),
                              color: accentColor,
                            }
                          : undefined
                      }
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => prepareEditor(coverImage)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${ui.option}`}
                >
                  <Move size={15} style={{ color: accentColor }} />
                  Ajustar enquadramento
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (saveCover("")) closeConfig();
                  }}
                  className={`${ui.btnDanger} w-full justify-start rounded-2xl p-3`}
                >
                  <Trash2 size={17} />
                  <span>Remover foto atual</span>
                </button>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* MODAL: ENQUADRAMENTO DA CAPA */}
      {showCropModal && (
        <ModalShell
          theme={theme}
          title="Ajustar enquadramento"
          description="Arraste para mover e use o scroll ou o controle para dar zoom. O que você vê é o que vai para a capa."
          icon={<Crop size={16} />}
          size="lg"
          onClose={closeCrop}
          footer={
            <>
              <button type="button" onClick={closeCrop} className={ui.btnGhost}>
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmCrop} className={ui.btnPrimary}>
                <Check size={15} />
                Salvar capa
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div
              ref={frameRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`relative aspect-16/5 w-full touch-none select-none overflow-hidden rounded-2xl border-2 border-dashed bg-zinc-950 ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              style={{ borderColor: withAlpha(accentColor, 0.6) }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={previewImageRef}
                src={rawImageSrc}
                alt="Pré-visualização da capa"
                crossOrigin="anonymous"
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{
                  width: drawW || undefined,
                  height: drawH || undefined,
                  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                }}
              />

              <span className="pointer-events-none absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-1 font-mono text-[10px] text-white">
                Zoom {Math.round(scale * 100)}% · {naturalDimensions.width}×{naturalDimensions.height}px
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScale((c) => clamp(c - 0.2, 1, 4))}
                aria-label="Diminuir zoom"
                className={ui.btnGhost}
              >
                −
              </button>

              <input
                type="range"
                min={1}
                max={4}
                step={0.05}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                aria-label="Zoom"
                className="h-1.5 flex-1 cursor-pointer"
                style={{ accentColor }}
              />

              <button
                type="button"
                onClick={() => setScale((c) => clamp(c + 0.2, 1, 4))}
                aria-label="Aumentar zoom"
                className={ui.btnGhost}
              >
                +
              </button>

              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                }}
                className={ui.btnGhost}
              >
                Centralizar
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );

  return {
    coverImage,
    fitMode,
    openConfig: () => setShowConfigModal(true),
    modals,
  };
}