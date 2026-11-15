"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";

import { Theme } from "@/types";
import { getUi } from "@/lib/ui";
import { withAlpha } from "@/lib/theme";
import Mindi from "./characters/Mindi";

interface CompanionProps {
  theme: Theme;
  /** Mesma cor de destaque usada na Home (settings.accentColor). */
  accentColor?: string;
}

export default function Companion({ theme, accentColor }: CompanionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const dark = theme === "dark";
  const ui = getUi(dark);

  // Mesmo padrão da Home: preto/branco por padrão, ou a cor escolhida nas configurações
  const accent = accentColor || (dark ? "#f4f4f5" : "#18181b");

  // Mesma superfície dos painéis do site
  const surface = dark
    ? "border-white/10 bg-zinc-950 text-zinc-100"
    : "border-zinc-200 bg-white text-zinc-900";

  // Círculo atrás da Mindi: no preto ela tem roupa e cabelo escuros e some,
  // então ela ganha um "palco" claro + brilho suave na cor de destaque
  const stage = dark
    ? "border-white/10 bg-zinc-900"
    : "border-zinc-200 bg-zinc-50";

  // No tema escuro, um contorno fininho claro separa a roupa preta do fundo.
  // Para deixá-la toda em preto e branco, acrescente grayscale(1) no começo.
  const characterFilter = dark
    ? "drop-shadow(0 0 1px rgba(255,255,255,0.5)) drop-shadow(0 4px 8px rgba(0,0,0,0.6))"
    : "drop-shadow(0 4px 8px rgba(0,0,0,0.18))";

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {isOpen && (
        <div
          className={`w-72 overflow-hidden rounded-[2rem] border shadow-2xl ${surface}`}
        >
          <div className="flex items-center justify-between px-5 pt-5">
            <div className="flex items-center gap-2.5">
              <div
                className="rounded-xl p-2.5"
                style={{ background: withAlpha(accent, 0.16), color: accent }}
              >
                <Sparkles size={15} />
              </div>
              <div>
                <p className={`text-sm font-extrabold ${ui.title}`}>Mindi</p>
                <p className="text-xs text-zinc-400">Sua companheira</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              aria-label="Fechar Mindi"
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border transition-colors ${
                dark
                  ? "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
                  : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-3 p-5 text-center">
            <div
              className={`flex h-28 w-28 items-center justify-center rounded-full border ${stage}`}
              style={{
                backgroundImage: `radial-gradient(circle at 50% 60%, ${withAlpha(
                  accent,
                  0.18
                )}, transparent 70%)`,
              }}
            >
              <div style={{ filter: characterFilter }}>
                <Mindi animation="idle" size={96} />
              </div>
            </div>

            <div className="space-y-1">
              <p className={`text-sm font-extrabold ${ui.title}`}>
                Oi, eu sou a Mindi!
              </p>
              <p className="text-xs leading-relaxed text-zinc-400">
                Vou te ajudar a organizar suas ideias e a deixar o dia mais
                leve.
              </p>
            </div>

            <span
              className="rounded-full px-3.5 py-1.5 text-[11px] font-bold"
              style={{ background: withAlpha(accent, 0.16), color: accent }}
            >
              Em breve: conversar com a Mindi
            </span>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? "Fechar Mindi" : "Conversar com Mindi"}
        className={`group relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border shadow-xl transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 ${stage}`}
        style={{
          backgroundImage: `radial-gradient(circle at 50% 60%, ${withAlpha(
            accent,
            0.18
          )}, transparent 70%)`,
          // @ts-expect-error variável CSS usada pelo anel de foco
          "--tw-ring-color": accent,
        }}
      >
        {!isOpen && (
          <span
            className={`pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-bold opacity-0 shadow-md transition-opacity group-hover:opacity-100 ${surface}`}
          >
            Oi! Posso ajudar?
          </span>
        )}

        <div className="mindi-float" style={{ filter: characterFilter }}>
          <Mindi animation="idle" size={88} />
        </div>
      </button>

      <style jsx>{`
        .mindi-float {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mindi-float {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}