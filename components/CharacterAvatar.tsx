import { auraColor } from "@/lib/character/archetype";
import type { BaseLook, CharacterState } from "@/lib/character/schema";

const PALETTE: Record<BaseLook, { body: string; belly: string; accent: string }> = {
  fox: { body: "#f97316", belly: "#ffedd5", accent: "#c2410c" },
  bear: { body: "#a16207", belly: "#fef3c7", accent: "#713f12" },
  bunny: { body: "#e7e5e4", belly: "#fafaf9", accent: "#f9a8d4" },
  owl: { body: "#7c3aed", belly: "#ede9fe", accent: "#4c1d95" },
};

function Ears({ look, c }: { look: BaseLook; c: (typeof PALETTE)[BaseLook] }) {
  switch (look) {
    case "fox":
      return (
        <g fill={c.body}>
          <path d="M58 92 L68 42 L96 80 Z" />
          <path d="M142 92 L132 42 L104 80 Z" />
          <path d="M66 82 L71 55 L86 76 Z" fill={c.belly} />
          <path d="M134 82 L129 55 L114 76 Z" fill={c.belly} />
        </g>
      );
    case "bear":
      return (
        <g>
          <circle cx="62" cy="78" r="17" fill={c.body} />
          <circle cx="138" cy="78" r="17" fill={c.body} />
          <circle cx="62" cy="78" r="8" fill={c.accent} />
          <circle cx="138" cy="78" r="8" fill={c.accent} />
        </g>
      );
    case "bunny":
      return (
        <g>
          <ellipse cx="80" cy="45" rx="12" ry="36" fill={c.body} transform="rotate(-10 80 45)" />
          <ellipse cx="120" cy="45" rx="12" ry="36" fill={c.body} transform="rotate(10 120 45)" />
          <ellipse cx="80" cy="47" rx="5" ry="26" fill={c.accent} transform="rotate(-10 80 47)" />
          <ellipse cx="120" cy="47" rx="5" ry="26" fill={c.accent} transform="rotate(10 120 47)" />
        </g>
      );
    case "owl":
      return (
        <g fill={c.accent}>
          <path d="M62 88 L60 60 L84 80 Z" />
          <path d="M138 88 L140 60 L116 80 Z" />
        </g>
      );
  }
}

/** Accessories drawn in front of the body. */
function Items({ items, crowned }: { items: CharacterState["items"]; crowned: boolean }) {
  const has = (id: string) => items.includes(id as never);
  return (
    <g>
      {has("scarf") && (
        <g>
          <path d="M62 140 Q100 158 138 140 L138 150 Q100 168 62 150 Z" fill="#ef4444" />
          <rect x="118" y="148" width="10" height="26" rx="3" fill="#dc2626" />
        </g>
      )}
      {has("star_pin") && (
        <path
          d="M100 150 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 z"
          fill="#facc15"
          stroke="#a16207"
          strokeWidth="1"
        />
      )}
      {has("boots") && (
        <g fill="#78350f">
          <rect x="70" y="168" width="22" height="14" rx="5" />
          <rect x="108" y="168" width="22" height="14" rx="5" />
        </g>
      )}
      {has("sprout") && (
        // Sits beside the crown instead of on top of it once the character has one.
        <g transform={crowned ? "translate(34 18) rotate(20 100 76)" : undefined}>
          <path d="M100 76 Q100 62 100 56" stroke="#15803d" strokeWidth="3" fill="none" />
          <ellipse cx="92" cy="56" rx="8" ry="4" fill="#22c55e" transform="rotate(-25 92 56)" />
          <ellipse cx="108" cy="54" rx="8" ry="4" fill="#4ade80" transform="rotate(25 108 54)" />
        </g>
      )}
      {has("lantern") && (
        <g>
          <line x1="160" y1="120" x2="160" y2="132" stroke="#57534e" strokeWidth="2" />
          <rect x="151" y="132" width="18" height="24" rx="4" fill="#fde68a" stroke="#57534e" strokeWidth="2" />
          <circle cx="160" cy="144" r="10" fill="#fef08a" opacity="0.5" />
        </g>
      )}
      {has("shield") && (
        <path d="M30 128 L50 122 L50 146 Q40 160 30 146 Z" fill="#64748b" stroke="#334155" strokeWidth="2" />
      )}
      {has("book") && <rect x="28" y="158" width="22" height="16" rx="2" fill="#2563eb" stroke="#1e3a8a" strokeWidth="2" />}
      {has("paintbrush") && (
        <g transform="rotate(30 165 165)">
          <rect x="162" y="150" width="5" height="28" rx="2" fill="#a16207" />
          <path d="M162 150 Q164.5 138 167 150 Z" fill="#ec4899" />
        </g>
      )}
      {has("compass") && (
        <g>
          <circle cx="45" cy="100" r="10" fill="#fef3c7" stroke="#a16207" strokeWidth="2" />
          <path d="M45 92 L48 100 L45 108 L42 100 Z" fill="#dc2626" />
        </g>
      )}
    </g>
  );
}

export function CharacterAvatar({
  baseLook,
  state,
  level,
  size = 220,
}: {
  baseLook: BaseLook;
  state: CharacterState;
  level: number;
  size?: number;
}) {
  const c = PALETTE[baseLook] ?? PALETTE.fox;
  const t = state.traits;
  const aura = auraColor(state.moods);

  // Courage makes the character stand a little taller.
  const scale = 0.92 + (t.courage / 100) * 0.12;
  const eyeR = t.curiosity > 60 ? 9 : 7;
  const sleepyEyes = t.calm > 70;
  const smile = 136 + Math.max(-6, Math.min(12, (t.joy - 35) / 4));
  const cloak = state.items.includes("cloak");

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Your character">
      <defs>
        <radialGradient id="aura" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor={aura} stopOpacity={0.15 + Math.min(level, 10) * 0.04} />
          <stop offset="100%" stopColor={aura} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="115" r="95" fill="url(#aura)" />

      {t.creativity > 55 && (
        <g opacity="0.8">
          <circle cx="30" cy="60" r="5" fill="#f472b6" />
          <path d="M170 50 l4 8 -8 0 z" fill="#60a5fa" />
          <rect x="160" y="90" width="8" height="8" fill="#a78bfa" transform="rotate(20 164 94)" />
        </g>
      )}

      <g transform={`translate(100 125) scale(${scale}) translate(-100 -125)`}>
        {cloak && <path d="M52 110 Q100 70 148 110 L160 180 L40 180 Z" fill="#1e3a8a" opacity="0.85" />}
        <Ears look={baseLook} c={c} />
        <ellipse cx="100" cy="128" rx="56" ry="52" fill={c.body} />
        <ellipse cx="100" cy="146" rx="34" ry="30" fill={c.belly} />

        {t.resilience > 60 && (
          <g stroke="#eab308" strokeWidth="2" fill="none" opacity="0.9">
            <path d="M58 120 l8 6 -4 8" />
            <path d="M142 118 l-8 7 5 8" />
          </g>
        )}
        {t.discipline > 60 && <rect x="56" y="92" width="88" height="7" rx="3" fill={c.accent} />}

        {sleepyEyes ? (
          <g stroke="#1c1917" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M74 114 Q81 120 88 114" />
            <path d="M112 114 Q119 120 126 114" />
          </g>
        ) : (
          <g>
            <circle cx="81" cy="114" r={eyeR} fill="#1c1917" />
            <circle cx="119" cy="114" r={eyeR} fill="#1c1917" />
            <circle cx="83" cy="111" r="2.5" fill="#fff" />
            <circle cx="121" cy="111" r="2.5" fill="#fff" />
          </g>
        )}
        {t.courage > 60 && (
          <g stroke="#1c1917" strokeWidth="3" strokeLinecap="round">
            <line x1="72" y1="100" x2="88" y2="104" />
            <line x1="128" y1="100" x2="112" y2="104" />
          </g>
        )}
        {t.warmth > 50 && (
          <g fill="#fb7185" opacity="0.45">
            <ellipse cx="70" cy="130" rx="8" ry="5" />
            <ellipse cx="130" cy="130" rx="8" ry="5" />
          </g>
        )}
        {baseLook === "owl" ? (
          <path d="M94 124 L106 124 L100 134 Z" fill="#f59e0b" />
        ) : (
          <ellipse cx="100" cy="125" rx="5" ry="3.5" fill="#1c1917" />
        )}
        <path d={`M88 134 Q100 ${smile} 112 134`} stroke="#1c1917" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        <Items items={state.items} crowned={level >= 5} />
        {level >= 5 && (
          <path d="M84 74 L88 62 L96 70 L100 58 L104 70 L112 62 L116 74 Z" fill="#facc15" stroke="#a16207" strokeWidth="1.5" />
        )}
      </g>
    </svg>
  );
}
