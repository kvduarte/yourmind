"use client";

import React, { useRef } from "react";

import { Node } from "@/types";
import { getStatus, nodeRect } from "@/lib/flow";

interface FlowMinimapProps {
  nodes: Node[];
  view: { x: number; y: number; zoom: number };
  size: { w: number; h: number };
  dark: boolean;
  accent: string;
  /** leva o centro da tela para o ponto (coordenadas do fluxograma) */
  onJump: (worldX: number, worldY: number) => void;
}

const W = 200;
const H = 130;

/** Visão geral do fluxograma: clique ou arraste para ir até outro ponto. */
export default function FlowMinimap({ nodes, view, size, dark, accent, onJump }: FlowMinimapProps) {
  const ref = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const boxes = nodes.map((n) => ({ node: n, rect: nodeRect(n) }));

  const vx = -view.x / view.zoom;
  const vy = -view.y / view.zoom;
  const vw = size.w / view.zoom;
  const vh = size.h / view.zoom;

  const pad = 60;
  const minX = Math.min(vx, ...boxes.map((b) => b.rect.x)) - pad;
  const minY = Math.min(vy, ...boxes.map((b) => b.rect.y)) - pad;
  const maxX = Math.max(vx + vw, ...boxes.map((b) => b.rect.x + b.rect.w)) + pad;
  const maxY = Math.max(vy + vh, ...boxes.map((b) => b.rect.y + b.rect.h)) + pad;

  const scale = Math.min(W / (maxX - minX), H / (maxY - minY));
  const ox = (W - (maxX - minX) * scale) / 2;
  const oy = (H - (maxY - minY) * scale) / 2;

  const jump = (e: React.PointerEvent) => {
    const el = ref.current;

    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;

    onJump((px - ox) / scale + minX, (py - oy) / scale + minY);
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className={`absolute bottom-4 right-4 z-30 overflow-hidden rounded-xl border shadow-xl backdrop-blur-md ${
        dark ? "border-white/10 bg-zinc-950/85" : "border-zinc-200 bg-white/90"
      }`}
    >
      <svg
        ref={ref}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block cursor-pointer touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragging.current = true;
          jump(e);
        }}
        onPointerMove={(e) => dragging.current && jump(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        {boxes.map(({ node, rect }) => (
          <rect
            key={node.id}
            x={(rect.x - minX) * scale + ox}
            y={(rect.y - minY) * scale + oy}
            width={Math.max(3, rect.w * scale)}
            height={Math.max(3, rect.h * scale)}
            rx={2}
            fill={node.color ?? getStatus(node.status).color}
            opacity={0.8}
          />
        ))}

        <rect
          x={(vx - minX) * scale + ox}
          y={(vy - minY) * scale + oy}
          width={vw * scale}
          height={vh * scale}
          fill={accent}
          fillOpacity={0.12}
          stroke={accent}
          strokeWidth={1.5}
          rx={2}
        />
      </svg>

      <div className={`border-t px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${dark ? "border-white/10 text-zinc-500" : "border-zinc-200 text-zinc-400"}`}>
        Minimapa · clique para ir
      </div>
    </div>
  );
}