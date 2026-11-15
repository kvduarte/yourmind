
"use client";

import React from "react";

export type MindiHairStyle = "none" | "tuft" | "fringe" | "curly";
export type MindiAccessory = "none" | "glasses" | "headphones" | "bow";

export interface MindiAppearance {
  bodyColor: string;
  hairColor: string;
  hairStyle: MindiHairStyle;
  outfitColor: string;
  accessory: MindiAccessory;
}

export const DEFAULT_MINDI_APPEARANCE: MindiAppearance = {
  bodyColor: "#B8A4E8",
  hairColor: "#493A5C",
  hairStyle: "tuft",
  outfitColor: "#F2B6A0",
  accessory: "none",
};

interface MindiAvatarProps {
  appearance?: MindiAppearance;
  size?: number;
  className?: string;
  expression?: "happy" | "thinking" | "sleepy" | "neutral";
}

export default function MindiAvatar({
  appearance = DEFAULT_MINDI_APPEARANCE,
  size = 180,
  className = "",
  expression = "happy",
}: MindiAvatarProps) {
  const { bodyColor, hairColor, hairStyle, outfitColor, accessory } = appearance;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 240"
      role="img"
      aria-label="Avatar 2D da Mindi"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mindi-body-shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".3" />
          <stop offset="100%" stopColor="#000000" stopOpacity=".12" />
        </linearGradient>

        <filter id="mindi-shadow" x="-30%" y="-30%" width="160%" height="170%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <ellipse
        cx="110"
        cy="220"
        rx="57"
        ry="9"
        fill="#000"
        opacity=".12"
        filter="url(#mindi-shadow)"
      />

      {/* Corpo blob */}
      <path
        d="M49 139 C38 116 48 87 69 77 C83 45 126 39 151 62 C181 66 190 101 176 126 C184 154 164 190 137 195 C110 211 72 193 61 174 C49 166 43 153 49 139Z"
        fill={bodyColor}
      />

      <path
        d="M49 139 C38 116 48 87 69 77 C83 45 126 39 151 62 C181 66 190 101 176 126 C184 154 164 190 137 195 C110 211 72 193 61 174 C49 166 43 153 49 139Z"
        fill="url(#mindi-body-shade)"
      />

      {/* Roupa */}
      <path
        d="M61 151 C78 165 143 168 166 147 C164 177 145 194 116 198 C88 197 69 181 61 151Z"
        fill={outfitColor}
      />

      <path
        d="M91 164 C101 171 121 171 132 164"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity=".55"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Cabelo */}
      {hairStyle === "tuft" && (
        <path
          d="M74 78 C69 57 87 44 101 55 C108 35 132 40 135 59 C153 48 169 64 157 82 C137 73 98 75 74 78Z"
          fill={hairColor}
        />
      )}

      {hairStyle === "fringe" && (
        <path
          d="M66 91 C57 56 82 43 104 51 C128 36 158 52 160 80 C146 72 137 91 122 83 C108 76 101 94 88 86 C78 80 74 94 66 91Z"
          fill={hairColor}
        />
      )}

      {hairStyle === "curly" && (
        <g fill={hairColor}>
          <circle cx="76" cy="76" r="17" />
          <circle cx="96" cy="58" r="18" />
          <circle cx="119" cy="55" r="19" />
          <circle cx="143" cy="66" r="18" />
          <circle cx="158" cy="85" r="14" />
        </g>
      )}

      {/* Olhos */}
      <ellipse
        cx="88"
        cy="119"
        rx="5.5"
        ry={expression === "sleepy" ? 2 : 6}
        fill="#30283A"
      />

      <ellipse
        cx="137"
        cy="119"
        rx="5.5"
        ry={expression === "sleepy" ? 2 : 6}
        fill="#30283A"
      />

      {/* Bochechas */}
      <ellipse cx="76" cy="135" rx="9" ry="5" fill="#F28F9B" opacity=".48" />
      <ellipse cx="149" cy="135" rx="9" ry="5" fill="#F28F9B" opacity=".48" />

      {/* Expressões */}
      {expression === "happy" && (
        <path
          d="M101 135 Q112 147 124 135"
          fill="none"
          stroke="#65445A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}

      {expression === "thinking" && (
        <path
          d="M104 139 Q114 133 123 139"
          fill="none"
          stroke="#65445A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}

      {expression === "sleepy" && (
        <path
          d="M102 137 Q112 141 122 137"
          fill="none"
          stroke="#65445A"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {expression === "neutral" && (
        <path
          d="M104 139 L122 139"
          fill="none"
          stroke="#65445A"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Óculos */}
      {accessory === "glasses" && (
        <g fill="none" stroke="#493A5C" strokeWidth="3.5">
          <rect x="73" y="107" width="30" height="23" rx="9" />
          <rect x="123" y="107" width="30" height="23" rx="9" />
          <path d="M103 117 Q113 111 123 117 M73 116 L65 113 M153 116 L161 113" />
        </g>
      )}

      {/* Fones */}
      {accessory === "headphones" && (
        <g fill="none" stroke="#493A5C" strokeWidth="8" strokeLinecap="round">
          <path d="M66 113 V99 C66 45 154 45 154 99 V113" />

          <rect
            x="59"
            y="108"
            width="15"
            height="29"
            rx="7"
            fill="#F2B6A0"
            stroke="none"
          />

          <rect
            x="146"
            y="108"
            width="15"
            height="29"
            rx="7"
            fill="#F2B6A0"
            stroke="none"
          />
        </g>
      )}

      {/* Laço */}
      {accessory === "bow" && (
        <g fill="#F28FA8" stroke="#B85D79" strokeWidth="1.5">
          <path d="M145 65 Q164 49 166 69 Q165 84 146 78Z" />
          <path d="M145 65 Q126 49 124 69 Q125 84 145 78Z" />
          <circle cx="145" cy="72" r="5" fill="#B85D79" />
        </g>
      )}
    </svg>
  );
}
