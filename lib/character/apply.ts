import { archetype } from "./archetype";
import {
  ITEM_IDS,
  TRAITS,
  type Analysis,
  type CharacterDiff,
  type CharacterState,
  type ItemId,
  type Traits,
} from "./schema";

export const MAX_DELTA = 8;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Total XP needed to reach a level. Level 1 = 0, 2 = 100, 3 = 300, 4 = 600 ... */
export function xpForLevel(level: number) {
  return 50 * level * (level - 1);
}

export function levelForXp(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function xpForEntry(durationS: number, streak: number) {
  return 20 + Math.min(Math.floor(durationS / 6), 20) + Math.min(streak * 2, 10);
}

function dayDiff(a: Date, b: Date) {
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((day(b) - day(a)) / 86_400_000);
}

export function nextStreak(lastEntryAt: string | null, now: Date, streak: number) {
  if (!lastEntryAt) return 1;
  const diff = dayDiff(new Date(lastEntryAt), now);
  if (diff === 0) return Math.max(streak, 1);
  if (diff === 1) return streak + 1;
  return 1;
}

export function normalizeMood(mood: number) {
  return clamp(Math.round(mood), -2, 2);
}

/**
 * Applies one analysed entry to the character. Pure so it can be unit tested.
 * Rules: deltas are clamped to ±MAX_DELTA, traits stay in 0..100, and a hard
 * day never lowers resilience, it raises it by at least 1.
 */
export function applyAnalysis(input: {
  state: CharacterState;
  xp: number;
  analysis: Analysis;
  durationS: number;
  now: Date;
}): { state: CharacterState; xp: number; level: number; diff: CharacterDiff } {
  const { state, analysis, durationS, now } = input;
  const mood = normalizeMood(analysis.mood);

  const traits = { ...state.traits } as Traits;
  const traitChanges: Partial<Traits> = {};
  for (const t of TRAITS) {
    let delta = clamp(Math.round(analysis.trait_deltas[t] ?? 0), -MAX_DELTA, MAX_DELTA);
    if (t === "resilience" && mood < 0) delta = Math.max(delta, 1);
    const next = clamp(traits[t] + delta, 0, 100);
    if (next !== traits[t]) traitChanges[t] = next - traits[t];
    traits[t] = next;
  }

  const candidate = analysis.new_item as ItemId | "none";
  const newItem =
    candidate !== "none" && ITEM_IDS.includes(candidate) && !state.items.includes(candidate)
      ? candidate
      : null;

  const streak = nextStreak(state.lastEntryAt, now, state.streak);
  const xpGained = xpForEntry(durationS, streak);
  const xp = input.xp + xpGained;
  const levelBefore = levelForXp(input.xp);
  const levelAfter = levelForXp(xp);

  const nextState: CharacterState = {
    traits,
    items: newItem ? [...state.items, newItem] : state.items,
    moods: [...state.moods, mood].slice(-7),
    entries: state.entries + 1,
    streak,
    lastEntryAt: now.toISOString(),
  };

  return {
    state: nextState,
    xp,
    level: levelAfter,
    diff: {
      traitChanges,
      newItem,
      xpGained,
      levelBefore,
      levelAfter,
      archetypeBefore: archetype(state.traits),
      archetypeAfter: archetype(traits),
    },
  };
}
