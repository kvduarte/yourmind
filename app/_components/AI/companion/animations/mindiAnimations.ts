export type MindiAnimation =
  | "idle"
  | "walking"
  | "running"
  | "sleeping"
  | "happy"
  | "thinking";

export type MindiDirection = "left" | "right" | "front";

export const mindiAnimations = {
  idle: {
    frames: [
    "/companions/mindi/frente/parada-3.png",
    "/companions/mindi/frente/piscando.png",
    "/companions/mindi/frente/parada-3.png",
  ],
  durations: [900, 90, 900],
  },

  walkingLeft: {
    frames: [
      "/companions/mindi/andando/esquerda-1.png",
      "/companions/mindi/andando/esquerda-2.png",
      "/companions/mindi/andando/esquerda-3.png",
    ],
    speed: 220,
  },

  walkingRight: {
    frames: [
      "/companions/mindi/andando/direita-1.png",
      "/companions/mindi/andando/direita-2.png",
      "/companions/mindi/andando/direita-3.png",
    ],
    speed: 220,
  },

  runningLeft: {
    frames: [
      "/companions/mindi/correndo/esquerda-1.png",
      "/companions/mindi/correndo/esquerda-2.png",
    ],
    speed: 130,
  },

  runningRight: {
    frames: [
      "/companions/mindi/correndo/direita-1.png",
      "/companions/mindi/correndo/direita-2.png",
    ],
    speed: 130,
  },

  sleeping: {
    frames: [
      "/companions/mindi/dormindo/dormindo-1.png",
    ],
    speed: 800,
  },
} as const;

export const mindiEmotions: Record<string, string> = {
  happy: "/companions/mindi/emocoes/feliz.png",
  thinking: "/companions/mindi/emocoes/pensando.png",
  love: "/companions/mindi/emocoes/amando.png",
  angry: "/companions/mindi/emocoes/brava.png",
  sad: "/companions/mindi/emocoes/chorando.png",
  shy: "/companions/mindi/emocoes/timida.png",
  surprised: "/companions/mindi/emocoes/surpresa.png",
  confused: "/companions/mindi/emocoes/confusa.png",
  celebrating: "/companions/mindi/emocoes/comemorando.png",
  talking: "/companions/mindi/emocoes/falando.png",
  hearts: "/companions/mindi/emocoes/coracoes.png",
  curious: "/companions/mindi/emocoes/duvida.png",
  embarrassed: "/companions/mindi/emocoes/envergonhada.png",
};