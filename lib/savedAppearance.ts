"use client";

import { useCallback, useEffect, useState } from "react";

import type { ColorStyle } from "@/lib/settings";
import type { Theme } from "@/types";

/**
 * Biblioteca de aparência do YourMind:
 *  - Galeria de fotos: várias imagens de fundo guardadas no IndexedDB
 *  - Modelos: combinações salvas de tema + cores + foto + ajustes
 *
 * É independente do `@/lib/bgImage` (que guarda só a foto ATUAL).
 * Para aplicar uma foto da galeria, o componente copia ela para o `bgImage`.
 */

export const MAX_GALLERY_PHOTOS = 30;
export const MAX_LOOKS = 30;

const CHANGED_EVENT = "app-appearance-library-changed";
const emitChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED_EVENT));
};

/* ═════════════════════════ Galeria de fotos (IndexedDB) ═════════════════════════ */

const DB_NAME = "yourmind_gallery";
const DB_VERSION = 2;
type StoreName = "photos" | "covers";
const ACTIVE_KEY = "app_bg_gallery_id";

export interface GalleryPhoto {
  id: string;
  name: string;
  createdAt: number;
  /** assinatura para não guardar a mesma foto duas vezes */
  sig: string;
  blob: Blob;
  thumb: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponível"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of ["photos", "covers"] as StoreName[]) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const req = op(t.objectStore(storeName));
    t.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
    t.onabort = () => {
      db.close();
      reject(t.error);
    };
  });
}

/** Reduz a imagem (lado maior = maxSide). Devolve o original se não compensar. */
async function downscale(
  source: Blob,
  maxSide: number,
  quality: number,
  keepOriginalIfSmaller: boolean
): Promise<Blob> {
  // GIF animado e SVG perdem a animação/vetor ao redesenhar
  if (keepOriginalIfSmaller && /image\/(gif|svg)/.test(source.type)) return source;

  try {
    const bmp = await createImageBitmap(source);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return source;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();

    const out = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/webp", quality)
    );
    if (!out) return source;
    return keepOriginalIfSmaller && out.size >= source.size ? source : out;
  } catch {
    return source;
  }
}

export async function listGalleryPhotos(): Promise<GalleryPhoto[]> {
  const all = await run<GalleryPhoto[]>("photos", "readonly", (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getGalleryPhoto(id: string): Promise<GalleryPhoto | null> {
  const found = await run<GalleryPhoto | undefined>("photos", "readonly", (s) => s.get(id));
  return found ?? null;
}

/** Guarda uma foto na galeria. Se a mesma foto já estiver lá, devolve a existente. */
export async function addGalleryPhoto(
  source: Blob,
  name: string,
  sig: string
): Promise<GalleryPhoto> {
  const existing = await listGalleryPhotos();

  const duplicate = existing.find((p) => p.sig === sig);
  if (duplicate) return duplicate;

  if (existing.length >= MAX_GALLERY_PHOTOS) {
    throw new Error("LIMIT");
  }

  const [blob, thumb] = await Promise.all([
    downscale(source, 2200, 0.9, true),
    downscale(source, 360, 0.8, false),
  ]);

  const photo: GalleryPhoto = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.slice(0, 60) || "Foto",
    createdAt: Date.now(),
    sig,
    blob,
    thumb,
  };

  await run("photos", "readwrite", (s) => s.put(photo));
  emitChanged();
  return photo;
}

export async function deleteGalleryPhoto(id: string): Promise<void> {
  await run("photos", "readwrite", (s) => s.delete(id));
  if (getActiveGalleryId() === id) setActiveGalleryId(null);
  emitChanged();
}

/** Qual foto da galeria está aplicada como fundo agora (se souber). */
export function getActiveGalleryId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveGalleryId(id: string | null) {
  try {
    if (id) window.localStorage.setItem(ACTIVE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignora */
  }
  emitChanged();
}

export function useGalleryPhotos() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPhotos(await listGalleryPhotos());
    } catch {
      setPhotos([]);
    }
    setActiveId(getActiveGalleryId());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CHANGED_EVENT, refresh);
  }, [refresh]);

  return { photos, activeId, ready, refresh };
}

/* ═════════════════════════ Capas da tela inicial ═════════════════════════ */

export type CoverFit = "cover" | "contain";

/** Mesmas chaves que o HomeCover.tsx já usa para a capa atual */
const COVER_SRC_KEY = "home_cover_src";
const COVER_FIT_KEY = "home_cover_fit";
export const COVER_CHANGED_EVENT = "home-cover-changed";
export const MAX_COVERS = 30;

export interface SavedCover {
  id: string;
  createdAt: number;
  /** assinatura para não guardar a mesma capa duas vezes */
  sig: string;
  /** imagem final (data URL da capa já enquadrada, ou o link original) */
  src: string;
  /** miniatura leve para a grade */
  thumb: string;
  fit: CoverFit;
}

/** Assinatura curta de uma capa (links valem por si; data URLs viram um hash). */
export function coverSig(src: string): string {
  if (!src.startsWith("data:")) return src;
  let h = 5381;
  for (let i = 0; i < src.length; i++) {
    h = ((h << 5) + h + src.charCodeAt(i)) | 0;
  }
  return `data:${src.length}:${h}`;
}

function makeCoverThumb(src: string): Promise<string> {
  if (!src.startsWith("data:")) return Promise.resolve(src);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = 480;
        const h = Math.max(
          1,
          Math.round((w * img.naturalHeight) / Math.max(1, img.naturalWidth))
        );
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export async function listCovers(): Promise<SavedCover[]> {
  const all = await run<SavedCover[]>("covers", "readonly", (st) => st.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getCover(id: string): Promise<SavedCover | null> {
  const found = await run<SavedCover | undefined>("covers", "readonly", (st) =>
    st.get(id)
  );
  return found ?? null;
}

/** Guarda uma capa na biblioteca. Se já existir igual, devolve a existente. */
export async function addCover(src: string, fit: CoverFit): Promise<SavedCover> {
  const sig = coverSig(src);
  const existing = await listCovers();

  const duplicate = existing.find((c) => c.sig === sig);
  if (duplicate) return duplicate;

  if (existing.length >= MAX_COVERS) throw new Error("LIMIT");

  const cover: SavedCover = {
    id: `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    sig,
    src,
    thumb: await makeCoverThumb(src),
    fit,
  };

  await run("covers", "readwrite", (st) => st.put(cover));
  emitChanged();
  return cover;
}

export async function deleteCover(id: string): Promise<void> {
  await run("covers", "readwrite", (st) => st.delete(id));
  emitChanged();
}

/** Capa que está aplicada agora na tela inicial (null = sem capa). */
export function readCurrentCover(): { src: string; fit: CoverFit } | null {
  try {
    const src = window.localStorage.getItem(COVER_SRC_KEY);
    if (!src) return null;
    const fit = window.localStorage.getItem(COVER_FIT_KEY);
    return { src, fit: fit === "contain" ? "contain" : "cover" };
  } catch {
    return null;
  }
}

export function notifyCoverChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COVER_CHANGED_EVENT));
  emitChanged();
}

/** Define a capa atual (src vazio = remove). Devolve false se o navegador recusar. */
export function writeCurrentCover(src: string, fit: CoverFit): boolean {
  try {
    if (src) window.localStorage.setItem(COVER_SRC_KEY, src);
    else window.localStorage.removeItem(COVER_SRC_KEY);
    window.localStorage.setItem(COVER_FIT_KEY, fit);
  } catch {
    return false;
  }
  notifyCoverChanged();
  return true;
}

export function useCovers() {
  const [covers, setCovers] = useState<SavedCover[]>([]);
  const [activeSig, setActiveSig] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setCovers(await listCovers());
    } catch {
      setCovers([]);
    }
    const current = readCurrentCover();
    setActiveSig(current ? coverSig(current.src) : null);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CHANGED_EVENT, refresh);
  }, [refresh]);

  return { covers, activeSig, ready };
}

/* ═════════════════════════ Modelos de aparência (localStorage) ═════════════════════════ */

const LOOKS_KEY = "app_looks";

export type LookImage =
  | { kind: "gallery"; id: string }
  | { kind: "url"; url: string }
  | null;

export interface SavedLook {
  id: string;
  name: string;
  createdAt: number;
  theme: Theme;
  accentColor: string;
  colorStyle: ColorStyle;
  colorPreset: string;
  animatedBackground: boolean;
  bgImageOpacity: number;
  bgImageSaturation: number;
  bgImageVeil?: number;
  image: LookImage;
  /**
   * Capa da tela inicial: { id } = capa da biblioteca; null = sem capa;
   * undefined = modelo antigo que não guarda a capa (não mexe na atual).
   */
  cover?: { id: string } | null;
}

function readLooks(): SavedLook[] {
  try {
    const raw = window.localStorage.getItem(LOOKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is SavedLook =>
        l && typeof l.id === "string" && typeof l.name === "string"
    );
  } catch {
    return [];
  }
}

function writeLooks(looks: SavedLook[]) {
  try {
    window.localStorage.setItem(LOOKS_KEY, JSON.stringify(looks));
  } catch {
    /* ignora */
  }
  emitChanged();
}

export function useLooks() {
  const [looks, setLooks] = useState<SavedLook[]>([]);

  useEffect(() => {
    const load = () => setLooks(readLooks());
    load();
    window.addEventListener(CHANGED_EVENT, load);
    return () => window.removeEventListener(CHANGED_EVENT, load);
  }, []);

  const addLook = (look: SavedLook) => writeLooks([look, ...readLooks()]);
  const replaceLook = (id: string, data: Partial<SavedLook>) =>
    writeLooks(readLooks().map((l) => (l.id === id ? { ...l, ...data } : l)));
  const removeLook = (id: string) =>
    writeLooks(readLooks().filter((l) => l.id !== id));

  return { looks, addLook, replaceLook, removeLook };
}

export const newLookId = () =>
  `look-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;