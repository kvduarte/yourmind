import { PlanItem, PlanPriority, PlanStatus, newItem } from "@/lib/planning";

/* =========================================================
   ESTRUTURA INICIAL DO PLANEJAMENTO
   Montada a partir do documento de especificação do YourMind.
   O que já existe no app aparece como "Concluído" ou "Em andamento".
========================================================= */

interface SeedNode {
  title: string;
  status?: PlanStatus;
  priority?: PlanPriority;
  children?: SeedNode[];
}

const n = (
  title: string,
  children?: SeedNode[],
  status?: PlanStatus,
  priority?: PlanPriority
): SeedNode => ({ title, children, status, priority });

const done = (title: string): SeedNode => n(title, undefined, "done");

const SEED: SeedNode[] = [
  n("1. Estrutura atual", [
    done("Tela inicial com calendário, lembretes e resumo"),
    done("Menu lateral com seções"),
    done("Fluxogramas normais e de programação"),
    done("Editor de código com cores e detecção de linguagem"),
    done("Tarefas e lembretes"),
    done("Notas com pastas"),
    done("Processos em quadro por etapas"),
    done("Configurações e aparência (tema, cores, imagem de fundo)"),
    n("Chat de IA dentro do fluxograma", undefined, "doing"),
    n("Aba Planejamento", undefined, "doing"),
  ]),

  n("2. Fluxogramas", [
    n("Blocos", [
      n("Status do bloco (não iniciado, em andamento, pendente, concluído, com problema, cancelado)"),
      n("Prioridade e categoria"),
      n("Data de início e prazo"),
      n("Comentários dentro do bloco"),
      n("Checklist interno"),
      n("Arquivos anexados"),
      n("Histórico de alterações do bloco"),
      n("Duplicar bloco"),
    ]),
    n("Conexões", [
      n("Cor e espessura da linha"),
      n("Linha contínua, tracejada ou pontilhada"),
      n("Setas e direção"),
      n("Legenda na conexão"),
    ]),
    n("Caminhos condicionais (SIM / NÃO)"),
    n("Recursos do editor", [
      n("Minimapa"),
      n("Desfazer e refazer"),
      n("Histórico de versões e restauração"),
      n("Duplicar fluxogramas"),
      n("Modelos prontos"),
      n("Busca dentro do fluxograma"),
      n("Exportar fluxograma"),
    ]),
    n("Relacionar blocos com tarefas, registros, documentos e IA"),
  ]),

  n("3. Notas e organização", [
    done("Editor básico de notas"),
    done("Pastas de notas"),
    n("Tags"),
    n("Pesquisa nas notas"),
    n("Relacionamento entre notas e outros itens"),
    n("Anexos nas notas"),
  ]),

  n("4. Gestão de clientes", [
    done("Processos com etapas e histórico dos cards"),
    n("Cadastro de clientes"),
    n("Atendimentos"),
    n("Relacionar cliente, produto e atendimento"),
  ]),

  n("5. Central de Informações", [
    n("Tipos de registros e categorias personalizadas"),
    n("Modelos com campos personalizados", [
      n("Tipos de campo (texto, número, data, seleção, arquivo, imagem, lista...)"),
      n("Adicionar, remover e reorganizar campos"),
    ]),
    n("Histórico cronológico de cada registro"),
    n("Arquivos e documentos anexados"),
    n("Relacionamento entre registros"),
    n("Busca global e filtros"),
  ]),

  n("6. Organização pessoal", [
    n("Caixa de entrada (Inbox)"),
    n("Mapas mentais"),
    n("Metas e objetivos"),
    n("Diário e reflexões"),
    n("Biblioteca de conhecimento"),
    n("Hábitos e rotinas"),
    n("Busca global"),
  ]),

  n("7. Inteligência artificial", [
    n("Identidade própria da IA (nome, visual, personalidade)"),
    n("Página exclusiva da IA"),
    n("Painel lateral contextual"),
    n("Botão flutuante de acesso rápido"),
    n("Histórico de conversas salvo"),
    n("Envio e análise de arquivos"),
    n("Ferramentas internas que executam ações", [
      n("Criar e atualizar fluxograma"),
      n("Criar tarefa, nota e evento"),
      n("Buscar, criar e atualizar registros"),
      n("Atualizar processos"),
    ]),
    n("Confirmação antes de ações importantes e opção de desfazer"),
    n("Contexto e memória (dados do YourMind, preferências, permissões)"),
    n("Trocar o Ollama local por um provedor que funcione online", undefined, "todo", "high"),
  ]),

  n("8. Companion", [
    n("Personagem flutuante"),
    n("Editor de aparência"),
    n("Sistema de camadas (corpo, rosto, olhos, cabelo, roupas, acessórios)"),
    n("Expressões e animações"),
    n("Personalidade e tom de conversa"),
    n("Itens e evolução"),
  ]),

  n("9. Monitoramento", [
    n("Monitoramento de eventos internos"),
    n("Sugestões proativas"),
    n("Configurações de monitoramento"),
    n("Integrações externas (GitHub, VS Code)"),
  ]),

  n("10. Segurança e infraestrutura", [
    n("Login de cada pessoa (Supabase Auth)", undefined, "todo", "high"),
    n("Banco de dados e migração do que está no navegador", undefined, "todo", "high"),
    n("Armazenamento de arquivos"),
    n("Permissões e segurança dos dados (RLS)", undefined, "todo", "high"),
    n("Validação de uploads e das ações da IA"),
    n("Testes, desempenho e responsividade"),
  ]),
];

/** Cria os itens da estrutura inicial dentro de um projeto de planejamento. */
export function buildSeedItems(projectId: string): PlanItem[] {
  const out: PlanItem[] = [];

  const walk = (nodes: SeedNode[], parentId: string | null) => {
    nodes.forEach((node, index) => {
      const item = newItem(
        projectId,
        parentId,
        index,
        node.title,
        "Cadastrada a partir da estrutura inicial do YourMind."
      );

      item.status = node.status ?? "todo";
      item.priority = node.priority ?? "medium";

      if (item.status === "done") item.completedAt = item.createdAt;

      out.push(item);

      if (node.children) walk(node.children, item.id);
    });
  };

  walk(SEED, null);

  return out;
}