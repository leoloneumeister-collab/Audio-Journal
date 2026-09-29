import { describe, expect, it } from "vitest";
import { applyAnalysis, levelForXp, nextStreak, xpForLevel, MAX_DELTA } from "./apply";
import { archetype } from "./archetype";
import { AnalysisSchema, initialState, TRAITS, type Analysis } from "./schema";

const zeroDeltas = Object.fromEntries(TRAITS.map((t) => [t, 0])) as Analysis["trait_deltas"];

function analysis(over: Partial<Analysis> = {}): Analysis {
  return {
    summary: "You talked about a long day.",
    mood: 0,
    themes: ["work"],
    trait_deltas: zeroDeltas,
    new_item: "none",
    chapter: "The fox walked on.",
    reflection: "That took effort.",
    needs_support: false,
    ...over,
  };
}

const now = new Date("2026-09-29T12:00:00Z");

describe("applyAnalysis", () => {
  it("clamps deltas to ±MAX_DELTA", () => {
    const r = applyAnalysis({
      state: initialState(),
      xp: 0,
      analysis: analysis({ trait_deltas: { ...zeroDeltas, courage: 50, calm: -50 } }),
      durationS: 60,
      now,
    });
    expect(r.state.traits.courage).toBe(30 + MAX_DELTA);
    expect(r.state.traits.calm).toBe(30 - MAX_DELTA);
    expect(r.diff.traitChanges).toMatchObject({ courage: MAX_DELTA, calm: -MAX_DELTA });
  });

  it("keeps traits within 0..100", () => {
    const state = initialState();
    state.traits.joy = 98;
    state.traits.calm = 2;
    const r = applyAnalysis({
      state,
      xp: 0,
      analysis: analysis({ trait_deltas: { ...zeroDeltas, joy: 8, calm: -8 } }),
      durationS: 0,
      now,
    });
    expect(r.state.traits.joy).toBe(100);
    expect(r.state.traits.calm).toBe(0);
  });

  it("never lowers resilience on a hard day", () => {
    const r = applyAnalysis({
      state: initialState(),
      xp: 0,
      analysis: analysis({ mood: -2, trait_deltas: { ...zeroDeltas, resilience: -5 } }),
      durationS: 0,
      now,
    });
    expect(r.state.traits.resilience).toBe(31);
  });

  it("adds a new item once and ignores unknown or duplicate items", () => {
    const first = applyAnalysis({ state: initialState(), xp: 0, analysis: analysis({ new_item: "lantern" }), durationS: 0, now });
    expect(first.diff.newItem).toBe("lantern");
    const again = applyAnalysis({ state: first.state, xp: first.xp, analysis: analysis({ new_item: "lantern" }), durationS: 0, now });
    expect(again.diff.newItem).toBeNull();
    expect(again.state.items).toEqual(["lantern"]);
    const bogus = applyAnalysis({ state: initialState(), xp: 0, analysis: analysis({ new_item: "dragon" }), durationS: 0, now });
    expect(bogus.diff.newItem).toBeNull();
  });

  it("keeps the last 7 moods and rounds them into -2..2", () => {
    let state = initialState();
    let xp = 0;
    for (let i = 0; i < 9; i++) {
      const r = applyAnalysis({ state, xp, analysis: analysis({ mood: 5 }), durationS: 0, now });
      state = r.state;
      xp = r.xp;
    }
    expect(state.moods).toHaveLength(7);
    expect(state.moods.every((m) => m === 2)).toBe(true);
    expect(state.entries).toBe(9);
  });

  it("levels up and reports it in the diff", () => {
    const r = applyAnalysis({ state: initialState(), xp: 90, analysis: analysis(), durationS: 120, now });
    expect(r.diff.levelBefore).toBe(1);
    expect(r.diff.levelAfter).toBe(2);
    expect(r.level).toBe(2);
  });
});

describe("levels", () => {
  it("maps xp to levels", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(300)).toBe(3);
  });
});

describe("streaks", () => {
  it("counts consecutive days", () => {
    expect(nextStreak(null, now, 0)).toBe(1);
    expect(nextStreak("2026-09-28T22:00:00Z", now, 3)).toBe(4);
    expect(nextStreak("2026-09-29T01:00:00Z", now, 3)).toBe(3);
    expect(nextStreak("2026-09-20T12:00:00Z", now, 3)).toBe(1);
  });
});

describe("archetype", () => {
  it("names the character from its top two traits", () => {
    const traits = initialState().traits;
    expect(archetype(traits)).toBe("Wanderer");
    expect(archetype({ ...traits, calm: 70, courage: 60 })).toBe("Bold Sage");
  });
});

describe("AnalysisSchema", () => {
  it("parses a typical model output", () => {
    const parsed = AnalysisSchema.parse({
      summary: "You talked about finally finishing the project.",
      mood: 1,
      themes: ["work", "pride"],
      trait_deltas: { ...zeroDeltas, discipline: 4, joy: 2 },
      new_item: "star_pin",
      chapter: "Mira reached the top of the hill.",
      reflection: "You kept going when it was dull, and it paid off.",
      needs_support: false,
    });
    expect(parsed.new_item).toBe("star_pin");
  });

  it("rejects output missing a trait", () => {
    const partial: Partial<Analysis["trait_deltas"]> = { ...zeroDeltas };
    delete partial.joy;
    expect(() => AnalysisSchema.parse({ ...analysis(), trait_deltas: partial })).toThrow();
  });
});
