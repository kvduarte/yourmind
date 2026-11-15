
"use client";

import { useState } from "react";
import Mindi from "../_components/AI/companion/characters/Mindi";

export default function TestMindiPage() {
  const [animation, setAnimation] = useState<
    "idle" | "walking" | "running" | "sleeping"
  >("idle");

  const [emotion, setEmotion] = useState<string | undefined>();

  return (
    <main className="min-h-screen bg-[#17131F] text-white flex flex-col items-center justify-center p-8 gap-8">
      <h1 className="text-3xl font-bold">Teste da Mindi 💜</h1>

      <div className="w-64 h-64 flex items-center justify-center border border-white/20 rounded-2xl">
        <Mindi
          animation={animation}
          emotion={emotion}
          size={220}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {(["idle", "walking", "running", "sleeping"] as const).map((item) => (
          <button
            key={item}
            onClick={() => {
              setAnimation(item);
              setEmotion(undefined);
            }}
            className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-lg"
          >
            {item}
          </button>
        ))}

        {["thinking", "happy", "talking"].map((item) => (
          <button
            key={item}
            onClick={() => {
              setEmotion(item);
              setAnimation("idle");
            }}
            className="bg-pink-700 hover:bg-pink-600 px-4 py-2 rounded-lg"
          >
            {item}
          </button>
        ))}
      </div>

      <p className="text-gray-400">
        Animação atual: {animation} | Expressão: {emotion ?? "nenhuma"}
      </p>
    </main>
  );
}
