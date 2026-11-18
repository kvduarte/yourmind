"use client";

import React from "react";
import { Trash2 } from "lucide-react";

import { SavedCover } from "@/lib/savedAppearance";
import { withAlpha } from "@/lib/theme";

interface CoverGridProps {
  covers: SavedCover[];
  /** assinatura da capa aplicada agora (para marcar "Em uso") */
  activeSig: string | null;
  accent: string;
  dark: boolean;
  onApply: (cover: SavedCover) => void;
  /** sem esta função o botão de apagar não aparece */
  onDelete?: (cover: SavedCover) => void;
  /** chamada ao passar o mouse numa capa (null ao sair): usada na pré-visualização */
  onPreview?: (cover: SavedCover | null) => void;
  disabled?: boolean;
}

/** Grade de capas salvas da tela inicial (faixa 16:5). */
export default function CoverGrid({
  covers,
  activeSig,
  accent,
  dark,
  onApply,
  onDelete,
  onPreview,
  disabled,
}: CoverGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {covers.map((cover) => {
        const selected = activeSig !== null && cover.sig === activeSig;

        return (
          <div
            key={cover.id}
            onMouseEnter={() => onPreview?.(cover)}
            onMouseLeave={() => onPreview?.(null)}
            className="group relative aspect-16/5 overflow-hidden rounded-lg border"
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
              disabled={disabled}
              onClick={() => onApply(cover)}
              title="Usar como capa da tela inicial"
              className="block h-full w-full cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.thumb}
                alt="Capa salva"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                draggable={false}
              />
            </button>

            {selected && (
              <span className="pointer-events-none absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Em uso
              </span>
            )}

            {onDelete && (
              <div className="absolute right-1 top-1 flex opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => onDelete(cover)}
                  title="Remover das capas salvas"
                  className="rounded-md bg-black/55 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/75 cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}