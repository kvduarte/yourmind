"use client";

import React, { useState } from "react";
import { ListChecks } from "lucide-react";

import { Theme } from "@/types";
import { PlanFolder, PlanProject, usePlanning } from "@/lib/planning";
import { useSettings } from "@/lib/settings";
import { textScaleStyle } from "@/lib/ui";

import BackBar from "../shared/BackBar";
import { useConfirm } from "../modals/ConfirmDialog";
import FolderModal from "../modals/FolderModal";
import PlanningDetail from "./PlanningDetail";
import PlanningList from "./PlanningList";
import PlanningProjectModal from "./PlanningProjectModal";

interface PlanningProps {
  theme: Theme;
}

type FolderModalState = { mode: "create" } | { mode: "edit"; folder: PlanFolder } | null;

type ProjectModalState =
  | { mode: "create"; folderId: string | null }
  | { mode: "edit"; project: PlanProject }
  | null;

/**
 * Aba Planejamento: pastas > planejamentos > atividades.
 * Sem planejamento aberto mostra a lista (pastas e cartões);
 * com um aberto mostra o painel e as atividades dele.
 */
export default function Planning({ theme }: PlanningProps) {
  const store = usePlanning();
  const confirm = useConfirm();
  const settings = useSettings();

  /* Configurações > Tamanho: Planejamento. Vale para a lista (pastas e blocos) e para as janelas
     de criar pasta/planejamento; a parte de dentro do planejamento fica sempre no tamanho normal. */
  const listScale = textScaleStyle(settings.textScalePlanning ?? 100);

  const [openId, setOpenId] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState<FolderModalState>(null);
  const [projectModal, setProjectModal] = useState<ProjectModalState>(null);

  if (!store.loaded) return null;

  const openProject = store.projects.find((project) => project.id === openId);
  const openFolder = openProject
    ? store.folders.find((folder) => folder.id === openProject.folderId)
    : undefined;

  const handleDeleteProject = async (project: PlanProject) => {
    const ok = await confirm({
      title: "Excluir planejamento?",
      description: `"${project.name}" e todas as atividades dele serão excluídos. Essa ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
    });

    if (!ok) return;

    store.deleteProject(project.id);
    setProjectModal(null);
    setOpenId(null);
  };

  return (
    <>
      {openProject ? (
        <div className="flex h-full flex-col">
          <BackBar
            theme={theme}
            backLabel="Planejamentos"
            onBack={() => setOpenId(null)}
            title={openProject.name}
            badge={openFolder ? openFolder.name : "Sem pasta"}
            icon={<ListChecks />}
          />

          <div className="min-h-0 flex-1">
            <PlanningDetail
              key={openProject.id}
              theme={theme}
              store={store}
              project={openProject}
              onEditProject={() => setProjectModal({ mode: "edit", project: openProject })}
            />
          </div>
        </div>
      ) : (
        <div className="h-full" style={listScale}>
          <PlanningList
            theme={theme}
            store={store}
            onOpen={setOpenId}
            onCreateProject={(folderId) => setProjectModal({ mode: "create", folderId })}
            onEditProject={(project) => setProjectModal({ mode: "edit", project })}
            onCreateFolder={() => setFolderModal({ mode: "create" })}
            onEditFolder={(folder) => setFolderModal({ mode: "edit", folder })}
          />
        </div>
      )}

      {folderModal && (
        <div style={listScale}>
          <FolderModal
            theme={theme}
            mode={folderModal.mode}
            initialName={folderModal.mode === "edit" ? folderModal.folder.name : ""}
            initialColor={folderModal.mode === "edit" ? folderModal.folder.color : "blue"}
            description="Pastas organizam os planejamentos por assunto."
            onClose={() => setFolderModal(null)}
            onSave={(name, color) => {
              if (folderModal.mode === "edit") store.updateFolder(folderModal.folder.id, name, color);
              else store.addFolder(name, color);
            }}
          />
        </div>
      )}

      {projectModal && (
        <div style={listScale}>
          <PlanningProjectModal
            theme={theme}
            folders={store.folders}
            mode={projectModal.mode}
            initialName={projectModal.mode === "edit" ? projectModal.project.name : ""}
            initialFolderId={
              projectModal.mode === "edit" ? projectModal.project.folderId : projectModal.folderId
            }
            initialColorMode={projectModal.mode === "edit" ? projectModal.project.colorMode : undefined}
            initialFixedColor={projectModal.mode === "edit" ? projectModal.project.fixedColor : undefined}
            onClose={() => setProjectModal(null)}
            onSave={(name, folderId, options) => {
              if (projectModal.mode === "edit") {
                store.updateProject(projectModal.project.id, name, folderId, options);

                return;
              }

              /* planejamento novo já abre, pronto para montar */
              setOpenId(store.addProject(name, folderId, options));
            }}
            onDelete={
              projectModal.mode === "edit"
                ? () => void handleDeleteProject(projectModal.project)
                : undefined
            }
          />
        </div>
      )}
    </>
  );
}