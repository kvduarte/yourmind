import type { Node, Topic } from "@/types";
import {
  checklistStats,
  connectionGeometry,
  connectionLook,
  dashFor,
  formatDateTime,
  formatDay,
  getCategory,
  getPriority,
  getStatus,
  nodeLabel,
  nodeRect,
} from "@/lib/flow";

/* =========================================================
   DOWNLOAD
========================================================= */

export function slugify(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "fluxograma"
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =========================================================
   JSON
========================================================= */

export function exportJson(topic: Topic): Blob {
  const payload = {
    app: "yourmind",
    type: "flowchart",
    version: 1,
    exportedAt: new Date().toISOString(),
    name: topic.name,
    nodes: topic.nodes,
    connections: topic.connections,
  };

  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

/* =========================================================
   MARKDOWN
========================================================= */

const TYPE_LABEL: Record<Node["type"], string> = {
  main: "Tema principal",
  topic: "Tópico",
  note: "Anotação",
  image: "Imagem",
  code: "Código",
  folder: "Pasta",
};

export function exportMarkdown(topic: Topic): Blob {
  const byId = new Map(topic.nodes.map((n) => [n.id, n]));
  const lines: string[] = [];

  lines.push(`# ${topic.name}`, "");
  lines.push(`_Exportado em ${formatDateTime(new Date().toISOString())} · ${topic.nodes.length} blocos · ${topic.connections.length} conexões_`, "");
  lines.push("## Blocos", "");

  topic.nodes.forEach((node, index) => {
    lines.push(`### ${index + 1}. ${nodeLabel(node)}`, "");
    lines.push(`- Tipo: ${TYPE_LABEL[node.type]}`);

    if (node.type !== "image" && node.type !== "code" && node.type !== "note") {
      lines.push(`- Status: ${getStatus(node.status).label}`);
    }

    const priority = getPriority(node.priority);
    const category = getCategory(node.category);

    if (priority) lines.push(`- Prioridade: ${priority.label}`);
    if (category) lines.push(`- Categoria: ${category.label}`);
    if (node.startDate) lines.push(`- Início: ${formatDay(node.startDate)}`);
    if (node.dueDate) lines.push(`- Prazo: ${formatDay(node.dueDate)}`);

    const text = node.type === "image" ? node.imageDescription : node.description;

    if (text?.trim()) lines.push("", text.trim());

    if (node.type === "code" && node.code?.trim()) {
      lines.push("", "```" + (node.language && node.language !== "Auto" ? node.language.toLowerCase() : ""), node.code, "```");
    }

    if (node.checklist?.length) {
      lines.push("", "**Checklist**");
      node.checklist.forEach((item) => lines.push(`- [${item.completed ? "x" : " "}] ${item.text}`));
    }

    if (node.comments?.length) {
      lines.push("", "**Comentários**");
      node.comments.forEach((c) => lines.push(`- ${formatDateTime(c.at)}: ${c.text}`));
    }

    if (node.attachments?.length) {
      lines.push("", "**Anexos**");
      node.attachments.forEach((a) => lines.push(`- ${a.name}${a.kind === "link" ? ` (${a.url})` : ""}`));
    }

    lines.push("");
  });

  if (topic.connections.length) {
    lines.push("## Conexões", "");

    topic.connections.forEach((c) => {
      const from = byId.get(c.from);
      const to = byId.get(c.to);

      if (!from || !to) return;

      const look = connectionLook(c);
      const tag = look.label ? ` [${look.label}]` : "";

      lines.push(`- ${nodeLabel(from)} → ${nodeLabel(to)}${tag}`);
    });
  }

  return new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
}

/* =========================================================
   PNG (desenhado direto no canvas, sempre em fundo claro)
========================================================= */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const out: string[] = [];

  for (const paragraph of text.split("\n")) {
    let line = "";

    for (const raw of paragraph.split(/\s+/)) {
      let word = raw;

      /* palavra maior que a largura do bloco: quebra no meio */
      while (ctx.measureText(word).width > maxWidth && word.length > 1) {
        let cut = word.length;

        while (cut > 1 && ctx.measureText(word.slice(0, cut)).width > maxWidth) cut--;

        if (line) {
          out.push(line);
          line = "";
        }

        out.push(word.slice(0, cut));
        word = word.slice(cut);

        if (out.length >= maxLines) return out.slice(0, maxLines);
      }

      const test = line ? `${line} ${word}` : word;

      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }

      if (out.length >= maxLines) return out.slice(0, maxLines);
    }

    if (line) out.push(line);

    if (out.length >= maxLines) return out.slice(0, maxLines);
  }

  return out.slice(0, maxLines);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();

    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function arrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.5);
  ctx.lineTo(-size, size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export async function exportPng(topic: Topic): Promise<Blob> {
  const nodes = topic.nodes;

  if (nodes.length === 0) throw new Error("O fluxograma está vazio.");

  const rects = nodes.map(nodeRect);
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));
  const pad = 70;
  const width = maxX - minX + pad * 2;
  const height = maxY - minY + pad * 2 + 20;
  const scale = Math.min(2, 8000 / width, 8000 / height);

  const canvas = document.createElement("canvas");

  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);

  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Não foi possível criar a imagem.");

  const images = new Map<string, HTMLImageElement | null>();

  await Promise.all(
    nodes
      .filter((n) => n.type === "image" && n.imageUrl)
      .map(async (n) => images.set(n.id, await loadImage(n.imageUrl as string)))
  );

  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.translate(pad - minX, pad - minY + 20);

  ctx.fillStyle = "#71717a";
  ctx.font = "600 14px Arial, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(topic.name, minX, minY - 28);

  const byId = new Map(nodes.map((n) => [n.id, n]));

  /* conexões */
  for (const c of topic.connections) {
    const a = byId.get(c.from);
    const b = byId.get(c.to);

    if (!a || !b) continue;

    const look = connectionLook(c);
    const g = connectionGeometry(nodeRect(a), nodeRect(b), look.shape);
    const dash = dashFor(look.style, look.width);

    ctx.save();
    ctx.strokeStyle = look.color;
    ctx.lineWidth = look.width;
    ctx.setLineDash(dash ? dash.split(" ").map(Number) : []);
    ctx.stroke(new Path2D(g.d));
    ctx.restore();

    const size = 6 + look.width * 2;

    if (look.arrow === "end" || look.arrow === "both") arrowHead(ctx, g.x2, g.y2, g.angle, size, look.color);
    if (look.arrow === "start" || look.arrow === "both") arrowHead(ctx, g.x1, g.y1, g.angle + Math.PI, size, look.color);

    if (look.label) {
      ctx.font = "700 12px Arial, sans-serif";

      const w = ctx.measureText(look.label).width + 18;

      ctx.fillStyle = "#ffffff";
      roundRect(ctx, g.mx - w / 2, g.my - 11, w, 22, 11);
      ctx.fill();
      ctx.strokeStyle = look.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = look.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(look.label, g.mx, g.my + 1);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
  }

  /* blocos */
  for (const node of nodes) {
    const { x, y, w, h } = nodeRect(node);

    if (node.type === "image") {
      const img = images.get(node.id);

      if (img) {
        const ratio = Math.min(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * ratio;
        const dh = img.naturalHeight * ratio;

        ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      } else {
        ctx.fillStyle = "#f4f4f5";
        roundRect(ctx, x, y, w, h, 14);
        ctx.fill();
        ctx.fillStyle = "#a1a1aa";
        ctx.font = "13px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Imagem", x + w / 2, y + h / 2);
        ctx.textAlign = "left";
      }

      continue;
    }

    const color = node.color ?? "#6366f1";

    if (node.type === "code") {
      ctx.fillStyle = "#18181b";
      roundRect(ctx, x, y, w, h, 14);
      ctx.fill();
      ctx.fillStyle = "#e4e4e7";
      ctx.font = "600 13px Arial, sans-serif";
      ctx.fillText(node.title || "código", x + 14, y + 24);
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "11px Consolas, monospace";

      (node.code ?? "")
        .split("\n")
        .slice(0, Math.max(1, Math.floor((h - 50) / 15)))
        .forEach((line, i) => ctx.fillText(line.slice(0, Math.floor((w - 28) / 6.6)), x + 14, y + 46 + i * 15));

      continue;
    }

    const status = getStatus(node.status);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = node.type === "main" ? 2 : 1.2;
    ctx.strokeStyle = node.status === "problem" ? "#ef4444" : node.type === "main" ? color : "#e4e4e7";
    roundRect(ctx, x, y, w, h, 16);
    ctx.stroke();

    if (node.type === "topic") {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 22, y + 30, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    /* nada do texto passa da borda do bloco */
    ctx.save();
    roundRect(ctx, x, y, w, h, 16);
    ctx.clip();

    ctx.textAlign = "center";
    ctx.fillStyle = "#18181b";
    ctx.font = `700 ${node.type === "main" ? 17 : 15}px Arial, sans-serif`;

    const titleLines = wrap(ctx, nodeLabel(node), w - 32, 2);

    titleLines.forEach((line, i) => ctx.fillText(line, x + w / 2, y + 34 + i * 20));

    const hasFooter = node.type !== "note";
    const descTop = y + 34 + titleLines.length * 20 + 6;
    const descLines = Math.max(0, Math.floor((y + h - (hasFooter ? 40 : 16) - descTop) / 16));

    if (descLines > 0 && node.description) {
      ctx.fillStyle = "#52525b";
      ctx.font = "12px Arial, sans-serif";
      wrap(ctx, node.description, w - 32, descLines).forEach((line, i) =>
        ctx.fillText(line, x + w / 2, descTop + 12 + i * 16)
      );
    }

    ctx.textAlign = "left";

    if (hasFooter) {
      let cx = x + 14;
      const cy = y + h - 16;

      const chip = (text: string, chipColor: string) => {
        ctx.font = "700 10px Arial, sans-serif";

        const cw = ctx.measureText(text).width + 14;

        if (cx + cw > x + w - 8) return;

        ctx.fillStyle = chipColor + "26";
        roundRect(ctx, cx, cy - 10, cw, 20, 10);
        ctx.fill();
        ctx.fillStyle = chipColor;
        ctx.fillText(text, cx + 7, cy + 3.5);
        cx += cw + 6;
      };

      chip(status.label, status.color);

      const priority = getPriority(node.priority);
      const stats = checklistStats(node);

      if (priority) chip(priority.label, priority.color);
      if (node.dueDate) chip(`Prazo ${formatDay(node.dueDate)}`, "#71717a");
      if (stats.total) chip(`${stats.done}/${stats.total}`, "#14b8a6");
    }

    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar a imagem."))),
      "image/png"
    );
  });
}