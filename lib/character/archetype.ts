import { TRAITS, type Trait, type Traits } from "./schema";

const NOUN: Record<Trait, string> = {
  courage: "Adventurer",
  calm: "Sage",
  curiosity: "Explorer",
  warmth: "Guardian",
  discipline: "Builder",
  creativity: "Dreamer",
  resilience: "Phoenix",
  joy: "Bard",
};

const ADJECTIVE: Record<Trait, string> = {
  courage: "Bold",
  calm: "Still",
  curiosity: "Curious",
  warmth: "Kind",
  discipline: "Steady",
  creativity: "Inventive",
  resilience: "Unbroken",
  joy: "Bright",
};

/** Traits sorted high to low. Ties keep TRAITS order so the result is stable. */
export function rankedTraits(traits: Traits): Trait[] {
  return [...TRAITS].sort((a, b) => traits[b] - traits[a]);
}

/** e.g. "Bold Sage": noun from the strongest trait, adjective from the second. */
export function archetype(traits: Traits): string {
  const [first, second] = rankedTraits(traits);
  if (traits[first] === traits[second] && traits[first] === traits[TRAITS[TRAITS.length - 1]]) {
    return "Wanderer"; // all traits equal, nothing stands out yet
  }
  return `${ADJECTIVE[second]} ${NOUN[first]}`;
}

/** Aura color from the recent mood average (-2..2). */
export function auraColor(moods: number[]): string {
  if (moods.length === 0) return "#94a3b8";
  const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
  if (avg <= -1) return "#6366f1";
  if (avg < -0.25) return "#60a5fa";
  if (avg <= 0.25) return "#5eead4";
  if (avg < 1) return "#fbbf24";
  return "#f59e0b";
}
