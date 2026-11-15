"use client";

import { useEffect, useState } from "react";

import {
  mindiAnimations,
  mindiEmotions,
  type MindiAnimation,
  type MindiDirection,
} from "../animations/mindiAnimations";

interface MindiProps {
  animation?: MindiAnimation;
  direction?: MindiDirection;
  emotion?: string;
  size?: number;
}

export default function Mindi({
  animation = "idle",
  direction = "front",
  emotion,
  size = 150,
}: MindiProps) {
  const [frame, setFrame] = useState(0);

  let animationKey: keyof typeof mindiAnimations = "idle";

  if (animation === "walking") {
    animationKey =
      direction === "left" ? "walkingLeft" : "walkingRight";
  }

  if (animation === "running") {
    animationKey =
      direction === "left" ? "runningLeft" : "runningRight";
  }

  if (animation === "sleeping") {
    animationKey = "sleeping";
  }

  const currentAnimation = mindiAnimations[animationKey];
  const emotionImage = emotion ? mindiEmotions[emotion] : undefined;

  useEffect(() => {
    const selectedAnimation = mindiAnimations[animationKey];

    let currentFrame = 0;
    let timeoutId: number;

    setFrame(0);

    const advanceFrame = () => {
      const duration =
        "durations" in selectedAnimation
          ? selectedAnimation.durations[currentFrame]
          : selectedAnimation.speed;

      timeoutId = window.setTimeout(() => {
        currentFrame =
          (currentFrame + 1) % selectedAnimation.frames.length;

        setFrame(currentFrame);
        advanceFrame();
      }, duration);
    };

    advanceFrame();

    return () => window.clearTimeout(timeoutId);
  }, [animationKey]);

  const image = emotionImage ?? currentAnimation.frames[frame];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <img
        src={image}
        alt="Mindi"
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
    </div>
  );
}