import { z } from "zod";

export const TRAITS = [
  "courage",
  "calm",
  "curiosity",
  "warmth",
  "discipline",
  "creativity",
  "resilience",
  "joy",
] as const;
export type Trait = (typeof TRAITS)[number];
export type Traits = Record<Trait, number>;

export const TRAIT_LABELS: Record<Trait, string> = {
  courage: "Courage",
  calm: "Calm",
  curiosity: "Curiosity",
  warmth: "Warmth",
  discipline: "Discipline",
  creativity: "Creativity",
  resilience: "Resilience",
  joy: "Joy",
};

/** Items the character can earn. `hint` tells Claude when one fits. */
export const ITEMS = {
  lantern: { label: "Lantern", hint: "found clarity or hope in a dark moment" },
  cloak: { label: "Cloak", hint: "protected their energy or set a boundary" },
  compass: { label: "Compass", hint: "made a decision or chose a new direction" },
  sprout: { label: "Sprout companion", hint: "started something new or is growing" },
  book: { label: "Book", hint: "learned something or reflected deeply" },
  scarf: { label: "Scarf", hint: "felt connected to or cared for someone" },
  shield: { label: "Shield", hint: "got through something hard" },
  star_pin: { label: "Star pin", hint: "celebrated a win, big or small" },
  paintbrush: { label: "Paintbrush", hint: "made or imagined something creative" },
  boots: { label: "Boots", hint: "moved their body, travelled or went outside" },
} as const;
export type ItemId = keyof typeof ITEMS;
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

export const BASE_LOOKS = ["fox", "bear", "bunny", "owl"] as const;
export type BaseLook = (typeof BASE_LOOKS)[number];

export type CharacterState = {
  traits: Traits;
  items: ItemId[];
  /** Mood of the last 7 entries, newest last, each -2..2 */
  moods: number[];
  entries: number;
  streak: number;
  lastEntryAt: string | null;
};

export function initialState(): CharacterState {
  return {
    traits: Object.fromEntries(TRAITS.map((t) => [t, 30])) as Traits,
    items: [],
    moods: [],
    entries: 0,
    streak: 0,
    lastEntryAt: null,
  };
}

/**
 * What Claude returns for each entry. Numeric bounds are enforced in apply.ts
 * rather than in the schema so an out-of-range number gets clamped instead of
 * failing the whole entry.
 */
export const AnalysisSchema = z.object({
  summary: z.string().describe("Two or three sentences, second person, what the entry was about"),
  mood: z.number().describe("Overall mood from -2 (very low) to 2 (very good)"),
  themes: z.array(z.string()).describe("Up to 5 short lowercase themes, e.g. work, family, sleep"),
  trait_deltas: z
    .object(Object.fromEntries(TRAITS.map((t) => [t, z.number()])) as Record<Trait, z.ZodNumber>)
    .describe("Change for each trait, integer from -8 to 8, mostly 0"),
  new_item: z
    .enum(["none", ...ITEM_IDS] as [string, ...string[]])
    .describe("An item the character earns from this entry, or none"),
  chapter: z
    .string()
    .describe("3 to 5 sentences continuing the character's story in third person, past tense"),
  reflection: z.string().describe("One warm sentence speaking directly to the user"),
  needs_support: z
    .boolean()
    .describe("True only if the user expresses thoughts of self-harm, suicide or being in danger"),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export type CharacterDiff = {
  traitChanges: Partial<Traits>;
  newItem: ItemId | null;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  archetypeBefore: string;
  archetypeAfter: string;
};
