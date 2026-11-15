
"use client";

import { useState } from "react";
import Mindi from "./characters/Mindi";
import type { CompanionAnimation } from "./types/companion";

export default function TestMindi() {
  const [animation, setAnimation] =
    useState<CompanionAnimation>("idle");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8">
      <Mindi animation={animation} size={220} />

      <div className="flex flex-wrap gap-2 justify-center">
        {(
          ["idle", "walking", "running", "happy", "thinking", "sleeping"] as CompanionAnimation[]
        ).map((item) => (
          <button
            key={item}
            onClick={() => setAnimation(item)}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
