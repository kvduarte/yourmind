
"use client";

import Mindi from "../_components/AI/companion/characters/Mindi";

export default function TestMindiPage() {
  return (
    <main className="min-h-screen bg-[#17131F] text-white p-8">
      <h1 className="text-3xl font-bold text-center mb-3">
        Teste da Mindi 💜
      </h1>

      <p className="text-center text-gray-400 mb-10">
        Testando movimentos e expressões da nossa companheira.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">

        <div className="flex flex-col items-center">
          <Mindi animation="idle" size={170} />
          <p>Parada / Respirando</p>
        </div>

        <div className="flex flex-col items-center">
          <Mindi animation="walking" direction="right" size={170} />
          <p>Andando</p>
        </div>

        <div className="flex flex-col items-center">
          <Mindi animation="running" direction="left" size={170} />
          <p>Correndo</p>
        </div>

        <div className="flex flex-col items-center">
          <Mindi animation="sleeping" size={170} />
          <p>Dormindo</p>
        </div>

        <div className="flex flex-col items-center">
          <Mindi emotion="thinking" size={170} />
          <p>Pensando</p>
        </div>

        <div className="flex flex-col items-center">
          <Mindi emotion="happy" size={170} />
          <p>Feliz</p>
        </div>

        <div className="flex flex-col items-center">
          <Mindi emotion="talking" size={170} />
          <p>Conversando</p>
        </div>

      </div>
    </main>
  );
}
