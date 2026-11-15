"use client";

import React, { useState } from "react";
import { History, Info, Sparkles, Trash2 } from "lucide-react";

import { FlowVersion, Theme } from "@/types";
import { FLOW_TEMPLATES, formatDateTime } from "@/lib/flow";
import { getUi } from "@/lib/ui";

import { useConfirm } from "../modals/ConfirmDialog";
import ModalShell from "../modals/ModalShell";

/* =========================================================
   MODELOS PRONTOS
========================================================= */

export function FlowTemplatesModal({
  theme,
  onPick,
  onClose,
}: {
  theme: Theme;
  onPick: (templateId: string) => void;
  onClose: () => void;
}) {
  const dark = theme === "dark";
  const ui = getUi(dark);

  return (
    <ModalShell
      theme={theme}
      title="Modelos prontos"
      description="Escolha um ponto de partida. Os blocos entram no centro da tela e você edita tudo depois."
      icon={<Sparkles size={16} />}
      size="lg"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={ui.btnGhost}>
          Fechar
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FLOW_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => {
              onPick(template.id);
              onClose();
            }}
            className={`rounded-2xl border p-4 text-left transition-all ${ui.divider} ${ui.hover}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm font-bold ${ui.title}`}>{template.name}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ui.soft} ${ui.subtitle}`}>
                {template.nodes} {template.nodes === 1 ? "bloco" : "blocos"}
              </span>
            </div>

            <p className={`mt-1.5 text-xs ${ui.text}`}>{template.description}</p>
            <p className={`mt-1 text-[11px] ${ui.subtitle}`}>{template.tip}</p>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

/* =========================================================
   VERSÕES
========================================================= */

export function FlowVersionsModal({
  theme,
  versions,
  onSave,
  onRestore,
  onDelete,
  onClose,
}: {
  theme: Theme;
  versions: FlowVersion[];
  onSave: (name: string) => void;
  onRestore: (version: FlowVersion) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const dark = theme === "dark";
  const ui = getUi(dark);
  const confirm = useConfirm();
  const [name, setName] = useState("");

  const save = () => {
    onSave(name.trim() || "Versão manual");
    setName("");
  };

  const restore = async (version: FlowVersion) => {
    const ok = await confirm({
      title: "Restaurar esta versão?",
      description:
        "O fluxograma volta ao que estava nessa data. O estado atual é guardado antes como uma nova versão, então você pode voltar atrás.",
      confirmLabel: "Restaurar",
      danger: false,
    });

    if (ok) {
      onRestore(version);
      onClose();
    }
  };

  return (
    <ModalShell
      theme={theme}
      title="Histórico de versões"
      description="Fotografias do fluxograma. Salve uma antes de mudanças grandes e volte quando quiser."
      icon={<History size={16} />}
      size="lg"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={ui.btnGhost}>
          Fechar
        </button>
      }
    >
      <div className="mb-5 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Nome da versão (ex.: Antes de reorganizar)"
          className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${ui.field}`}
        />
        <button type="button" onClick={save} className={ui.btnPrimaryMd}>
          Salvar versão agora
        </button>
      </div>

      {versions.length === 0 ? (
        <p className={`rounded-xl border border-dashed px-4 py-10 text-center text-xs ${ui.divider} ${ui.subtitle}`}>
          Nenhuma versão ainda. O sistema também salva uma sozinho a cada 5 minutos de edição, e antes de aplicar modelos ou restaurar.
        </p>
      ) : (
        <ul className="space-y-2">
          {versions.map((version) => (
            <li key={version.id} className={`flex items-center gap-3 rounded-xl border p-3 ${ui.divider}`}>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-xs font-bold ${ui.title}`}>
                  {version.name}
                  {version.auto && (
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ui.soft} ${ui.subtitle}`}>
                      automática
                    </span>
                  )}
                </p>
                <p className={`text-[11px] ${ui.subtitle}`}>
                  {formatDateTime(version.at)} · {version.nodes.length} blocos · {version.connections.length} conexões
                </p>
              </div>

              <button type="button" onClick={() => void restore(version)} className={ui.btnGhost}>
                Restaurar
              </button>

              <button
                type="button"
                onClick={() => onDelete(version.id)}
                aria-label="Excluir versão"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={`mt-4 text-[11px] leading-relaxed ${ui.subtitle}`}>
        As versões ficam guardadas no navegador. Com muitas imagens ou anexos, o espaço pode acabar: apague versões antigas se aparecer um aviso.
      </p>
    </ModalShell>
  );
}

/* =========================================================
   AJUDA
========================================================= */

const GUIDE: { title: string; items: string[] }[] = [
  {
    title: "Primeiros passos",
    items: [
      "Clique em + Tópico para criar um bloco. Escreva o título e a descrição direto nele.",
      "Passe o mouse no bloco e clique na seta (→) para ligar a outro bloco. Depois clique no bloco de destino.",
      "Dê dois cliques no bloco, ou use o lápis, para abrir a edição completa.",
      "Não sabe por onde começar? Abra Modelos e escolha um exemplo pronto.",
    ],
  },
  {
    title: "Status, prioridade e prazos",
    items: [
      "A pílula colorida no rodapé do bloco é o status. Clique nela para trocar rapidamente.",
      "Na edição completa você define prioridade, categoria, datas, checklist, comentários e anexos.",
      "Prazo vencido e ainda aberto aparece em vermelho.",
    ],
  },
  {
    title: "Caminhos SIM / NÃO",
    items: [
      "Crie um tópico com a pergunta, por exemplo “Pagamento aprovado?”.",
      "Ligue esse tópico aos blocos seguintes. Cada ligação é um caminho.",
      "Clique na linha e, no painel, escolha SIM ou NÃO. A legenda e a cor entram sozinhas.",
    ],
  },
  {
    title: "Conexões",
    items: [
      "Clique numa linha para abrir o painel: cor, espessura, tracejado, formato, setas, direção e legenda.",
      "Use Delete para apagar a linha selecionada.",
    ],
  },
  {
    title: "Navegar em fluxogramas grandes",
    items: [
      "Roda do mouse: zoom no ponto do cursor. Arraste o fundo: mover. Shift + roda: mover para o lado.",
      "Minimapa: clique ou arraste para ir a outra região. F ajusta tudo na tela.",
      "Busca (Ctrl + F): encontra blocos por texto ou status e leva você até eles.",
      "Selecionar vários: use a seta na barra (ou segure Shift) e arraste no fundo para desenhar uma caixa. Shift + clique soma ou tira blocos. Arraste um deles para mover todos juntos.",
      "Código: dê dois cliques no bloco de código para editar em tela cheia.",
      "Organizar: arruma os blocos em colunas seguindo as ligações.",
    ],
  },
  {
    title: "Segurança do seu trabalho",
    items: [
      "Tudo é salvo sozinho no navegador.",
      "Ctrl + Z desfaz e Ctrl + Y refaz, inclusive exclusões.",
      "Versões guardam fotografias do fluxograma e permitem restaurar.",
      "Exportar gera imagem PNG, arquivo JSON ou texto Markdown.",
    ],
  },
];

const SHORTCUTS: [string, string][] = [
  ["Ctrl + Z / Ctrl + Y", "Desfazer / refazer"],
  ["Ctrl + D", "Duplicar os blocos selecionados"],
  ["Ctrl + A", "Selecionar todos os blocos"],
  ["Delete", "Excluir bloco ou conexão selecionada"],
  ["Ctrl + F", "Buscar"],
  ["F", "Ajustar à tela"],
  ["+ / −  /  0", "Zoom / voltar a 100%"],
  ["Esc", "Cancelar ligação, fechar painéis"],
];

export function FlowHelpModal({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const dark = theme === "dark";
  const ui = getUi(dark);

  return (
    <ModalShell
      theme={theme}
      title="Como usar o fluxograma"
      description="Um guia rápido com tudo o que dá para fazer aqui."
      icon={<Info size={16} />}
      size="xl"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={ui.btnPrimaryMd}>
          Entendi
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {GUIDE.map((section) => (
          <section key={section.title}>
            <h3 className={`mb-2 text-xs font-extrabold uppercase tracking-wider ${ui.title}`}>{section.title}</h3>
            <ul className="space-y-1.5">
              {section.items.map((item) => (
                <li key={item} className={`flex gap-2 text-xs leading-relaxed ${ui.text}`}>
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <h3 className={`mb-2 mt-6 text-xs font-extrabold uppercase tracking-wider ${ui.title}`}>Atalhos</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SHORTCUTS.map(([keys, text]) => (
          <div key={keys} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${ui.divider}`}>
            <span className={ui.text}>{text}</span>
            <kbd className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${ui.soft} ${ui.title}`}>{keys}</kbd>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}