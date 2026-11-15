"use client";

import React, { useMemo, useState } from "react";
import { Layers } from "lucide-react";

import { Theme } from "@/types";
import { OutlineNode } from "@/lib/planning";
import { parseOutline, countOutline } from "@/lib/planningImport";
import { getUi } from "@/lib/ui";

import ModalShell from "../modals/ModalShell";
import { ColorSwatches } from "./PlanningParts";

interface PlanningTopicModalProps {
  theme: Theme;
  /** quando informado, cria um subtópico dentro dele */
  parentTitle?: string;
  onClose: () => void;
  onCreate: (name: string, color: string, children: OutlineNode[]) => void;
}

const LABEL = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider";

export default function PlanningTopicModal({
  theme,
  parentTitle,
  onClose,
  onCreate,
}: PlanningTopicModalProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);
  const sub = Boolean(parentTitle);

  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [subtopics, setSubtopics] = useState("");

  const nodes = useMemo(() => parseOutline(subtopics), [subtopics]);
  const count = countOutline(nodes);

  const fieldBase = `w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-colors ${ui.field}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    onCreate(name.trim(), color, nodes);
    onClose();
  };

  return (
    <ModalShell
      theme={theme}
      title={sub ? "Novo subtópico" : "Novo tópico"}
      description={
        sub
          ? `Dentro de "${parentTitle}".`
          : "Tópicos organizam o planejamento. Dentro deles ficam os subtópicos e as tarefas."
      }
      icon={<Layers size={16} />}
      size="md"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" onClick={onClose} className={ui.btnGhost}>
            Cancelar
          </button>

          <button type="submit" disabled={!name.trim()} className={ui.btnPrimaryMd}>
            {sub ? "Criar subtópico" : "Criar tópico"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className={`${LABEL} ${ui.subtitle}`}>Nome</label>

          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={sub ? "Ex: Blocos" : "Ex: Fluxogramas"}
            className={fieldBase}
          />
        </div>

        <div>
          <label className={`${LABEL} ${ui.subtitle}`}>Cor</label>

          <ColorSwatches value={color} onChange={setColor} dark={dark} size={22} />

          <p className={`mt-2 text-[11px] ${ui.subtitle}`}>
            &quot;Auto&quot; segue a cor escolhida para este planejamento
            {sub ? " (ou a cor do tópico onde ele está)" : ""}.
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={`${LABEL} ${ui.subtitle} mb-0`}>
              Subtópicos <span className="font-medium normal-case opacity-60">(opcional)</span>
            </label>

            {count.items > 0 && (
              <span className={`text-[11px] font-semibold ${ui.subtitle}`}>
                {count.items} {count.items === 1 ? "item" : "itens"}
              </span>
            )}
          </div>

          <textarea
            value={subtopics}
            onChange={(e) => setSubtopics(e.target.value)}
            rows={6}
            placeholder={"Um por linha:\nBlocos\n  Status\n  Prioridade\nConexões"}
            className={`${fieldBase} resize-none font-mono leading-relaxed`}
          />

          <p className={`mt-2 text-[11px] leading-relaxed ${ui.subtitle}`}>
            Cada linha vira um subtópico. Para criar um nível dentro de outro, comece a linha com espaços.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}