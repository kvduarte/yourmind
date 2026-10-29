"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { Theme } from "@/types";
import { STATUS, useAccent, withAlpha } from "@/lib/theme";
import { getUi } from "@/lib/ui";

interface ModalShellProps {
  theme: Theme;
  title: string;
  description?: string;
  /** ícone pequeno ao lado do título (usa a cor de destaque) */
  icon?: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  /** cor do ícone: destaque (padrão) ou vermelho para avisos de exclusão */
  tone?: "accent" | "danger";
  /** botões do rodapé (alinhados à direita) */
  footer?: React.ReactNode;
  /** se informado, o modal vira um <form> e o Enter envia */
  onSubmit?: (e: React.FormEvent) => void;
  children: React.ReactNode;
}

/** modais abertos, do mais antigo ao mais recente */
const modalStack: object[] = [];

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

/**
 * Moldura única de todos os modais do app (mesmo visual da tela Início):
 * cabeçalho com título, corpo rolável, rodapé com ações. Esc e clique fora fecham.
 */
export default function ModalShell({
  theme,
  title,
  description,
  icon,
  onClose,
  size = "md",
  tone = "accent",
  footer,
  onSubmit,
  children,
}: ModalShellProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);
  const accent = useAccent();
  const iconColor = tone === "danger" ? STATUS.danger : accent;

  /* Esc fecha só o modal de cima (ex.: a confirmação aberta sobre as Configurações) */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const token = {};

    modalStack.push(token);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || modalStack[modalStack.length - 1] !== token) return;

      e.stopPropagation();
      onCloseRef.current();
    };

    window.addEventListener("keydown", onKey, true);

    return () => {
      window.removeEventListener("keydown", onKey, true);

      const index = modalStack.indexOf(token);

      if (index >= 0) modalStack.splice(index, 1);
    };
  }, []);

  const Wrapper = onSubmit ? "form" : "div";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Wrapper
        {...(onSubmit ? { onSubmit } : {})}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92vh] w-full ${SIZES[size]} flex-col overflow-hidden rounded-2xl border shadow-2xl ${ui.modalCard}`}
      >
        <div className={`flex items-start justify-between gap-3 border-b px-6 py-4 ${ui.divider}`}>
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: withAlpha(iconColor, 0.14), color: iconColor }}
              >
                {icon}
              </span>
            )}

            <div className="min-w-0">
              <h2 className={`truncate text-base font-bold ${ui.title}`}>{title}</h2>

              {description && (
                <p className={`mt-0.5 text-xs ${ui.subtitle}`}>{description}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className={ui.iconBtn}
          >
            <X size={18} />
          </button>
        </div>

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && (
          <div className={`flex items-center justify-end gap-2 border-t px-6 py-4 ${ui.divider}`}>
            {footer}
          </div>
        )}
      </Wrapper>
    </div>
  );
}