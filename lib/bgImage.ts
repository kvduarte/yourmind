"use client";

import { useEffect, useState } from "react";

/**
 * Guarda a imagem de fundo ORIGINAL (sem redimensionar e sem recomprimir)
 * no IndexedDB, que aceita arquivos grandes (o localStorage só aguenta ~5MB).
 * No settings fica salvo apenas um marcador: "idb:<timestamp>".
 */

export const BG_IDB_PREFIX = "idb:";

const DB_NAME = "yourmind_images";
const STORE = "images";
const KEY = "background";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBgImage(file: Blob): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadBgImage(): Promise<Blob | null> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
    request.onsuccess = () => {
      db.close();
      resolve((request.result as Blob) ?? null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function deleteBgImage(): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Converte o valor salvo no settings em algo que o CSS entende.
 * - "idb:..."        -> carrega o arquivo do IndexedDB (blob:)
 * - link / data:...  -> usa direto (compatível com o que já estava salvo)
 */
export function useBgImage(value?: string): string | undefined {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!value) {
      setSrc(undefined);
      return;
    }

    if (!value.startsWith(BG_IDB_PREFIX)) {
      setSrc(value);
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;

    loadBgImage()
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(undefined));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [value]);

  return src;
}