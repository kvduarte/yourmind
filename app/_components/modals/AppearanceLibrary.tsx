"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, RefreshCw, Save, Trash2 } from "lucide-react";

import { Theme } from "@/types";
import { AppSettings } from "@/lib/settings";
import { BG_IDB_PREFIX, saveBgImage } from "@/lib/bgImage";
import {
  CURATED_PALETTES,
  buildAccentGradient,
  withAlpha,
} from "@/lib/theme";
import {
  GalleryPhoto,
  MAX_COVERS,
  MAX_GALLERY_PHOTOS,
  MAX_LOOKS,
  SavedCover,
  SavedLook,
  addCover,
  addGalleryPhoto,
  deleteCover,
  deleteGalleryPhoto,
  getCover,
  getGalleryPhoto,
  newLookId,
  readCurrentCover,
  setActiveGalleryId,
  useCovers,
  useGalleryPhotos,
  useLooks,
  writeCurrentCover,
} from "@/lib/savedAppearance";
import CoverGrid from "./CoverGrid";
import { useConfirm } from "./ConfirmDialog";

type UiClasses = Record<
  "card" | "title" | "text" | "muted" | "divider" | "hover" | "soft",
  string
>;

interface AppearanceLibraryProps {
  dark: boolean;
  ui: UiClasses;
  accent: string;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  hasBgImage: boolean;
  bgIsUpload: boolean;
  /** endereço atual da imagem de fundo (para guardar a foto que já está aplicada) */
  bgPreviewSrc: string | null | undefined;
}

const HOVER_BTN =
  "rounded-md bg-black/55 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/75 cursor-pointer";

function lookBackground(look: SavedLook): string {
  if (look.colorStyle === "preset") {
    const palette = CURATED_PALETTES.find((p) => p.id === look.colorPreset);
    if (palette) return palette.gradient;
  }
  const base = look.accentColor || (look.theme === "dark" ? "#f4f4f5" : "#18181b");
  return look.colorStyle === "gradient" ? buildAccentGradient(base) : base;
}

export default function AppearanceLibrary({
  dark,
  ui,
  accent,
  theme,
  setTheme,
  settings,
  setSettings,
  hasBgImage,
  bgIsUpload,
  bgPreviewSrc,
}: AppearanceLibraryProps) {
  const confirm = useConfirm();
  const { photos, activeId, ready } = useGalleryPhotos();
  const { looks, addLook, replaceLook, removeLook } = useLooks();
  const { covers, activeSig, ready: coversReady } = useCovers();

  const [lookName, setLookName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  /* miniaturas: URLs temporárias liberadas ao trocar/fechar */
  const thumbUrls = useMemo(
    () =>
      Object.fromEntries(
        photos.map((p) => [p.id, URL.createObjectURL(p.thumb)])
      ) as Record<string, string>,
    [photos]
  );
  useEffect(
    () => () => Object.values(thumbUrls).forEach((u) => URL.revokeObjectURL(u)),
    [thumbUrls]
  );

  const activeInGallery = Boolean(
    bgIsUpload && activeId && photos.some((p) => p.id === activeId)
  );
  const canSaveCurrent = hasBgImage && bgIsUpload && !activeInGallery && ready;

  const say = (ok: boolean, text: string) => setNotice({ ok, text });

  /* ───────────── fotos ───────────── */

  /** Copia a foto da galeria para o fundo atual e devolve o novo valor de bgImageUrl */
  const putPhotoInBackground = async (photo: GalleryPhoto) => {
    await saveBgImage(
      new File([photo.blob], photo.name, {
        type: photo.blob.type || "image/jpeg",
      })
    );
    setActiveGalleryId(photo.id);
    return `${BG_IDB_PREFIX}${Date.now()}`;
  };

  const applyPhoto = async (photo: GalleryPhoto) => {
    setBusy(true);
    try {
      const url = await putPhotoInBackground(photo);
      setSettings((cur) => ({ ...cur, bgImageUrl: url }));
      say(true, "Foto aplicada como fundo.");
    } catch {
      say(false, "Não foi possível aplicar essa foto.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    let added = 0;
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        await addGalleryPhoto(
          file,
          file.name,
          `${file.size}:${file.lastModified}:${file.name}`
        );
        added++;
      }
      say(
        added > 0,
        added > 0
          ? `${added} foto(s) guardada(s) na galeria.`
          : "Escolha arquivos de imagem (PNG, JPG, WEBP...)."
      );
    } catch (err) {
      say(
        false,
        err instanceof Error && err.message === "LIMIT"
          ? `A galeria guarda até ${MAX_GALLERY_PHOTOS} fotos. Apague alguma para adicionar outra.`
          : "Não foi possível guardar a foto neste navegador."
      );
    } finally {
      setBusy(false);
    }
  };

  /** Guarda na galeria a foto que já está aplicada como fundo */
  const saveCurrentPhoto = async (): Promise<GalleryPhoto | null> => {
    if (!bgPreviewSrc) return null;
    const res = await fetch(bgPreviewSrc);
    const blob = await res.blob();
    const photo = await addGalleryPhoto(
      blob,
      "Foto de fundo atual",
      `current:${blob.size}:${blob.type}`
    );
    setActiveGalleryId(photo.id);
    return photo;
  };

  const handleSaveCurrent = async () => {
    setBusy(true);
    try {
      await saveCurrentPhoto();
      say(true, "A foto atual foi guardada na galeria.");
    } catch {
      say(false, "Não foi possível guardar a foto atual.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePhoto = async (photo: GalleryPhoto) => {
    const ok = await confirm({
      title: "Remover foto da galeria?",
      description:
        "A foto sai da galeria e dos modelos que a usam. O fundo aplicado agora não muda.",
      confirmLabel: "Remover",
    });
    if (!ok) return;
    try {
      await deleteGalleryPhoto(photo.id);
    } catch {
      say(false, "Não foi possível remover a foto.");
    }
  };

  /* ───────────── capas da tela inicial ───────────── */

  const applyCover = (cover: SavedCover) => {
    if (writeCurrentCover(cover.src, cover.fit)) {
      say(true, "Capa aplicada na tela inicial.");
    } else {
      say(false, "Essa capa é pesada demais para o armazenamento do navegador.");
    }
  };

  const handleDeleteCover = async (cover: SavedCover) => {
    const ok = await confirm({
      title: "Remover capa salva?",
      description:
        "A capa sai da lista e dos modelos que a usam. A capa aplicada agora não muda.",
      confirmLabel: "Remover",
    });
    if (!ok) return;
    try {
      await deleteCover(cover.id);
    } catch {
      say(false, "Não foi possível remover a capa.");
    }
  };

  /* ───────────── modelos ───────────── */

  const snapshot = async (): Promise<
    Omit<SavedLook, "id" | "name" | "createdAt">
  > => {
    let image: SavedLook["image"] = null;
    let imageProblem = false;

    if (hasBgImage && settings.bgImageUrl) {
      if (bgIsUpload) {
        if (activeInGallery && activeId) {
          image = { kind: "gallery", id: activeId };
        } else {
          try {
            const saved = await saveCurrentPhoto();
            if (saved) image = { kind: "gallery", id: saved.id };
            else imageProblem = true;
          } catch {
            imageProblem = true;
          }
        }
      } else {
        image = { kind: "url", url: settings.bgImageUrl };
      }
    }

    if (imageProblem) {
      say(false, "O modelo foi salvo sem a foto (não consegui guardá-la).");
    }

    /* capa da tela inicial: null = sem capa; undefined = não consegui guardar */
    let cover: SavedLook["cover"] = null;
    const currentCover = readCurrentCover();
    if (currentCover) {
      try {
        const savedCover = await addCover(currentCover.src, currentCover.fit);
        cover = { id: savedCover.id };
      } catch {
        cover = undefined;
        say(false, "O modelo foi salvo sem a capa (não consegui guardá-la).");
      }
    }

    return {
      theme,
      accentColor: accent,
      colorStyle: settings.colorStyle || "solid",
      colorPreset: settings.colorPreset || "matcha-espresso",
      animatedBackground: settings.animatedBackground,
      bgImageOpacity: settings.bgImageOpacity ?? 30,
      bgImageSaturation: settings.bgImageSaturation ?? 100,
      bgImageVeil: settings.bgImageVeil,
      image,
      cover,
    };
  };

  const handleSaveLook = async () => {
    if (looks.length >= MAX_LOOKS) {
      say(false, `Você pode guardar até ${MAX_LOOKS} modelos. Apague algum antes.`);
      return;
    }
    setBusy(true);
    try {
      const data = await snapshot();
      addLook({
        id: newLookId(),
        name: lookName.trim().slice(0, 30) || `Modelo ${looks.length + 1}`,
        createdAt: Date.now(),
        ...data,
      });
      setLookName("");
      setNotice((n) => (n && !n.ok ? n : { ok: true, text: "Modelo salvo." }));
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateLook = async (look: SavedLook) => {
    const ok = await confirm({
      title: `Atualizar "${look.name}"?`,
      description: "O modelo passa a guardar a aparência que está aplicada agora.",
      confirmLabel: "Atualizar",
    });
    if (!ok) return;
    setBusy(true);
    try {
      replaceLook(look.id, await snapshot());
      setNotice((n) => (n && !n.ok ? n : { ok: true, text: "Modelo atualizado." }));
    } finally {
      setBusy(false);
    }
  };

  const handleApplyLook = async (look: SavedLook) => {
    setBusy(true);
    try {
      const problems: string[] = [];

      /** null = manter o fundo atual */
      let bgUrl: string | null = "";

      if (look.image?.kind === "url") {
        bgUrl = look.image.url;
        setActiveGalleryId(null);
      } else if (look.image?.kind === "gallery") {
        const photo = await getGalleryPhoto(look.image.id);
        if (photo) {
          bgUrl = await putPhotoInBackground(photo);
        } else {
          bgUrl = null;
          problems.push("a foto de fundo não está mais na galeria");
        }
      } else {
        setActiveGalleryId(null);
      }

      /* capa: undefined = modelo antigo, não mexe na capa atual */
      if (look.cover === null) {
        writeCurrentCover("", "cover");
      } else if (look.cover) {
        const cover = await getCover(look.cover.id);
        if (!cover) {
          problems.push("a capa não está mais salva");
        } else if (!writeCurrentCover(cover.src, cover.fit)) {
          problems.push("a capa não coube no armazenamento do navegador");
        }
      }

      setTheme(look.theme);
      setSettings((cur) => ({
        ...cur,
        accentColor: look.accentColor,
        colorStyle: look.colorStyle,
        colorPreset: look.colorPreset,
        animatedBackground: look.animatedBackground,
        bgImageOpacity: look.bgImageOpacity,
        bgImageSaturation: look.bgImageSaturation,
        bgImageVeil: look.bgImageVeil,
        bgImageUrl: bgUrl === null ? cur.bgImageUrl : bgUrl,
      }));

      say(
        problems.length === 0,
        problems.length === 0
          ? `"${look.name}" aplicado.`
          : `"${look.name}" aplicado, mas ${problems.join(" e ")}.`
      );
    } catch {
      say(false, "Não foi possível aplicar esse modelo.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLook = async (look: SavedLook) => {
    const ok = await confirm({
      title: `Apagar "${look.name}"?`,
      description: "Só o modelo é apagado; a foto continua na galeria.",
      confirmLabel: "Apagar",
    });
    if (ok) removeLook(look.id);
  };

  /* ───────────── interface ───────────── */

  return (
    <>
      {/* ---------- Minhas fotos ---------- */}
      <div className={`border-b py-4 ${ui.divider}`}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={`text-sm font-medium ${ui.title}`}>Minhas Fotos</p>
            <p className={`mt-1 text-xs leading-relaxed ${ui.muted}`}>
              Fotos guardadas neste navegador para reaproveitar como fundo.{" "}
              {photos.length}/{MAX_GALLERY_PHOTOS}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canSaveCurrent && (
              <button
                type="button"
                disabled={busy}
                onClick={handleSaveCurrent}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium disabled:opacity-50 cursor-pointer ${ui.divider} ${ui.text} ${ui.hover}`}
              >
                <Save size={14} /> Guardar foto atual
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium disabled:opacity-50 cursor-pointer ${ui.divider} ${ui.text} ${ui.hover}`}
            >
              <ImagePlus size={14} /> Adicionar
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAddFiles}
            />
          </div>
        </div>

        {photos.length === 0 ? (
          <div
            className={`rounded-xl border border-dashed px-4 py-6 text-center text-xs ${ui.divider} ${ui.muted}`}
          >
            {ready
              ? "Nenhuma foto guardada ainda. As fotos que você enviar pela Galeria passam a aparecer aqui."
              : "Carregando..."}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((photo) => {
              const selected = activeInGallery && photo.id === activeId;
              return (
                <div
                  key={photo.id}
                  className="group relative aspect-video overflow-hidden rounded-lg border"
                  style={{
                    borderColor: selected
                      ? accent
                      : dark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
                    boxShadow: selected
                      ? `0 0 0 1px ${accent}, 0 6px 16px -8px ${withAlpha(accent, 0.6)}`
                      : undefined,
                  }}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => applyPhoto(photo)}
                    title={`Usar "${photo.name}" como fundo`}
                    className="block h-full w-full cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbUrls[photo.id]}
                      alt={photo.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      draggable={false}
                    />
                  </button>

                  {selected && (
                    <span className="pointer-events-none absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Em uso
                    </span>
                  )}

                  <div className="absolute right-1 top-1 flex opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo)}
                      title="Remover da galeria"
                      className={HOVER_BTN}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------- Capas da tela inicial ---------- */}
      <div className={`border-b py-4 ${ui.divider}`}>
        <div className="mb-3">
          <p className={`text-sm font-medium ${ui.title}`}>
            Capas da Tela Inicial
          </p>
          <p className={`mt-1 text-xs leading-relaxed ${ui.muted}`}>
            Toda capa que você define na tela inicial fica guardada aqui para
            reutilizar. {covers.length}/{MAX_COVERS}
          </p>
        </div>

        {covers.length === 0 ? (
          <div
            className={`rounded-xl border border-dashed px-4 py-6 text-center text-xs ${ui.divider} ${ui.muted}`}
          >
            {coversReady
              ? "Nenhuma capa guardada ainda. Defina uma pelo lápis do banner da tela inicial."
              : "Carregando..."}
          </div>
        ) : (
          <CoverGrid
            covers={covers}
            activeSig={activeSig}
            accent={accent}
            dark={dark}
            disabled={busy}
            onApply={applyCover}
            onDelete={handleDeleteCover}
          />
        )}
      </div>

      {/* ---------- Meus modelos ---------- */}
      <div className={`border-b py-4 ${ui.divider}`}>
        <div className="mb-3">
          <p className={`text-sm font-medium ${ui.title}`}>Meus Modelos</p>
          <p className={`mt-1 text-xs leading-relaxed ${ui.muted}`}>
            Salve a aparência atual (tema, cores, paleta, foto de fundo, capa e ajustes) e volte
            a ela com um clique. {looks.length}/{MAX_LOOKS}
          </p>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={lookName}
            maxLength={30}
            onChange={(e) => setLookName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveLook();
            }}
            placeholder="Nome do modelo, ex.: Noite roxa"
            className={`min-w-0 flex-1 rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors ${
              dark
                ? "border-white/10 bg-white/3 text-zinc-100 placeholder:text-zinc-500 focus:border-white/25"
                : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400"
            }`}
          />
          <button
            type="button"
            disabled={busy}
            onClick={handleSaveLook}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium disabled:opacity-50 cursor-pointer ${ui.divider} ${ui.text} ${ui.hover}`}
          >
            <Save size={14} /> Salvar aparência atual
          </button>
        </div>

        {looks.length === 0 ? (
          <div
            className={`rounded-xl border border-dashed px-4 py-6 text-center text-xs ${ui.divider} ${ui.muted}`}
          >
            Nenhum modelo salvo ainda.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {looks.map((look) => (
              <div
                key={look.id}
                className={`group relative overflow-hidden rounded-xl border transition-transform hover:-translate-y-0.5 ${ui.divider}`}
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleApplyLook(look)}
                  title={`Aplicar "${look.name}"`}
                  className="block w-full text-left cursor-pointer"
                >
                  <div
                    className="h-12 w-full"
                    style={{ background: lookBackground(look) }}
                  />
                  <div className="px-2.5 py-2">
                    <p className={`truncate text-xs font-medium ${ui.title}`}>
                      {look.name}
                    </p>
                    <p className={`mt-0.5 truncate text-[10px] ${ui.muted}`}>
                      {[
                        look.theme === "dark" ? "Escuro" : "Claro",
                        look.image ? "fundo" : null,
                        look.cover ? "capa" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </button>

                <div className="absolute right-1 top-1 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleUpdateLook(look)}
                    title="Atualizar com a aparência atual"
                    className={HOVER_BTN}
                  >
                    <RefreshCw size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLook(look)}
                    title="Apagar modelo"
                    className={HOVER_BTN}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {notice && (
          <p
            className={`mt-3 text-[11px] ${
              notice.ok ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {notice.text}
          </p>
        )}
      </div>
    </>
  );
}