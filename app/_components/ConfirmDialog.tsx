"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";

import { Theme } from "@/types";
import { getUi } from "@/lib/ui";

import ModalShell from "./ModalShell";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true (padrão): botão vermelho, para ações que apagam algo */
  danger?: boolean;
  /** só um botão "Entendi" (aviso) */
  hideCancel?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

/* Fora do provedor, cai no confirm do navegador para nada quebrar */
const ConfirmContext = createContext<ConfirmFn>(async (options) =>
  typeof window === "undefined" ? false : window.confirm(options.description ?? options.title)
);

/**
 * Janela de confirmação do app (no lugar do window.confirm do navegador).
 * Uso:  const confirm = useConfirm();
 *       if (!(await confirm({ title: "Excluir pasta?", description: "..." }))) return;
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    return new Promise<boolean>((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setOptions(next);
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  /* o tema do app vive na classe do <html> (ver page.tsx) */
  const theme: Theme =
    typeof document !== "undefined" && document.documentElement.classList.contains("light")
      ? "light"
      : "dark";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {options && <ConfirmModal theme={theme} options={options} onResult={close} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

function ConfirmModal({
  theme,
  options,
  onResult,
}: {
  theme: Theme;
  options: ConfirmOptions;
  onResult: (value: boolean) => void;
}) {
  const ui = getUi(theme === "dark");
  const danger = options.danger !== false && !options.hideCancel;

  return (
    <ModalShell
      theme={theme}
      title={options.title}
      description={options.description}
      icon={danger ? <AlertTriangle size={16} /> : <Info size={16} />}
      tone={danger ? "danger" : "accent"}
      size="sm"
      onClose={() => onResult(false)}
      onSubmit={(e) => {
        e.preventDefault();
        onResult(true);
      }}
      footer={
        <>
          {!options.hideCancel && (
            <button
              type="button"
              autoFocus
              onClick={() => onResult(false)}
              className={ui.btnGhost}
            >
              {options.cancelLabel ?? "Cancelar"}
            </button>
          )}

          <button
            type="submit"
            autoFocus={options.hideCancel}
            className={danger ? ui.btnDangerSolid : ui.btnPrimaryMd}
          >
            {options.confirmLabel ?? (options.hideCancel ? "Entendi" : danger ? "Excluir" : "Confirmar")}
          </button>
        </>
      }
    >
      {/* o texto fica no cabeçalho; o corpo só dá respiro */}
      <span className="sr-only">{options.description ?? options.title}</span>
    </ModalShell>
  );
}