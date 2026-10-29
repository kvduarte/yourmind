import { Topic } from "@/types";

export function createAIContext(topic?: Topic): string {
  if (!topic) {
    return "Nenhum fluxograma foi selecionado.";
  }

  const textNodes = topic.nodes.filter(
    (node) => node.type !== "image"
  );

  const sections: string[] = [];

  sections.push(`PROJETO: ${topic.name}`);

  const mainNodes = textNodes.filter(
    (node) => node.type === "main"
  );

  const topicNodes = textNodes.filter(
    (node) => node.type === "topic"
  );

  const noteNodes = textNodes.filter(
    (node) => node.type === "note"
  );

  const codeNodes = textNodes.filter(
    (node) => node.type === "code"
  );

  if (mainNodes.length > 0) {
    sections.push(
      [
        "TEMA PRINCIPAL",
        ...mainNodes.map(formatNode),
      ].join("\n\n")
    );
  }

  if (topicNodes.length > 0) {
    sections.push(
      [
        "TÓPICOS",
        ...topicNodes.map(formatNode),
      ].join("\n\n")
    );
  }

  if (noteNodes.length > 0) {
    sections.push(
      [
        "ANOTAÇÕES",
        ...noteNodes.map(formatNode),
      ].join("\n\n")
    );
  }

  if (codeNodes.length > 0) {
    sections.push(
      [
        "CÓDIGOS",
        ...codeNodes.map(formatNode),
      ].join("\n\n")
    );
  }

  const connections =
    createConnectionsContext(topic);

  if (connections) {
    sections.push(
      [
        "RELAÇÕES ENTRE OS ELEMENTOS",
        connections,
      ].join("\n")
    );
  }

  if (sections.length === 1) {
    sections.push(
      "O projeto não possui conteúdo textual suficiente para análise."
    );
  }

  return sections.join("\n\n");
}

function formatNode(
  node: Topic["nodes"][number]
): string {
  const parts: string[] = [];

  const title =
    node.title?.trim();

  const description =
    node.description?.trim();

  if (title) {
    parts.push(
      `Título: ${title}`
    );
  }

  if (description) {
    parts.push(
      `Descrição: ${description}`
    );
  }

  if (
    node.type === "code" &&
    node.language?.trim()
  ) {
    parts.push(
      `Linguagem: ${node.language}`
    );
  }

  if (
    node.type === "code" &&
    node.code?.trim()
  ) {
    parts.push(
      `Código:\n${node.code}`
    );
  }

  if (parts.length === 0) {
    return "Sem conteúdo informado.";
  }

  return parts.join("\n");
}

function createConnectionsContext(
  topic: Topic
): string {
  if (!topic.connections?.length) {
    return "";
  }

  // Imagens não entram nas relações enviadas para a IA.
  const nodesById = new Map(
    topic.nodes
      .filter(
        (node) => node.type !== "image"
      )
      .map((node) => [
        node.id,
        node,
      ])
  );

  const connections =
    topic.connections
      .map((connection) => {
        const fromNode =
          nodesById.get(
            connection.from
          );

        const toNode =
          nodesById.get(
            connection.to
          );

        if (
          !fromNode ||
          !toNode
        ) {
          return null;
        }

        return `${getNodeName(
          fromNode
        )} → ${getNodeName(toNode)}`;
      })
      .filter(
        (
          connection
        ): connection is string =>
          connection !== null
      );

  return connections.join("\n");
}

function getNodeName(
  node: Topic["nodes"][number]
): string {
  const title =
    node.title?.trim();

  if (title) {
    return `"${title}"`;
  }

  const description =
    node.description?.trim();

  if (description) {
    return `"${description.slice(
      0,
      100
    )}"`;
  }

  switch (node.type) {
    case "main":
      return `"Tema principal"`;

    case "topic":
      return `"Tópico"`;

    case "note":
      return `"Anotação"`;

    case "code":
      return `"Código"`;

    default:
      return `"Elemento"`;
  }
}