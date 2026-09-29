import { archetype } from "./archetype";
import { ITEMS, type CharacterState } from "./schema";

const itemList = Object.entries(ITEMS)
  .map(([id, { hint }]) => `- ${id}: when the user ${hint}`)
  .join("\n");

// Kept free of per-request data so it can be cached.
export const SYSTEM_PROMPT = `You read voice journal entries and grow a small companion character that mirrors the person who keeps the journal.

Each entry is a transcript from the browser's speech recognition, so expect missing punctuation and misheard words. Read for meaning.

How to evolve the character:
- The user's own framing matters most. If they say a hard conversation made them braver, courage goes up even if the day sounded rough.
- Trait deltas are integers from -8 to 8. Most traits should be 0 for a given entry. Move 1 to 3 traits, and reserve 5+ for entries where something clearly shifted.
- Lower a trait only when the user describes it slipping in their own words (for example "I've been skipping everything I planned" lowers discipline). Never punish the user for venting or feeling low.
- Hard days make the character tougher, not weaker. The story should treat struggle as part of the journey.
- Award at most one new item, only when the entry clearly fits, and never one the character already has. Otherwise use "none". Items:
${itemList}

Writing the chapter:
- Continue the character's story in third person, past tense, 3 to 5 sentences, like a gentle fantasy tale.
- Translate what happened in the user's life into the character's world through metaphor. Don't repeat private details like names, places or health specifics.
- Keep continuity with the previous chapters you're given.

Summary and reflection:
- The summary speaks to the user ("You talked about...") and stays factual.
- The reflection is one warm, specific sentence. No advice unless they asked, no diagnosing, no clichés.

Safety: set needs_support to true only if the user expresses thoughts of self-harm, suicide or being in immediate danger. Still write everything else normally and with care.`;

export function buildUserMessage(input: {
  name: string;
  state: CharacterState;
  level: number;
  recentChapters: string[];
  recentSummaries: string[];
  transcript: string;
  durationS: number;
}) {
  const { name, state, level, recentChapters, recentSummaries, transcript, durationS } = input;
  return `<character>
name: ${name}
archetype: ${archetype(state.traits)}
level: ${level}
entries so far: ${state.entries}
traits (0-100): ${JSON.stringify(state.traits)}
items owned: ${state.items.length ? state.items.join(", ") : "none"}
</character>

<previous_chapters>
${recentChapters.length ? recentChapters.join("\n\n") : "None yet. This entry awakens the character, so the chapter is its origin."}
</previous_chapters>

<recent_entry_summaries>
${recentSummaries.length ? recentSummaries.map((s) => `- ${s}`).join("\n") : "None"}
</recent_entry_summaries>

<new_entry duration_seconds="${durationS}">
${transcript}
</new_entry>`;
}
