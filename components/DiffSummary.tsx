import { ITEMS, TRAIT_LABELS, type CharacterDiff, type Trait } from "@/lib/character/schema";

export function DiffSummary({ diff, name }: { diff: CharacterDiff; name: string }) {
  const changes = Object.entries(diff.traitChanges) as [Trait, number][];
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {changes.map(([t, d]) => (
        <li key={t}>
          {d > 0 ? "▲" : "▼"} {TRAIT_LABELS[t]} {d > 0 ? `+${d}` : d}
        </li>
      ))}
      {diff.newItem && <li>🎁 {name} found a {ITEMS[diff.newItem].label.toLowerCase()}</li>}
      {diff.levelAfter > diff.levelBefore && <li>⭐ Reached level {diff.levelAfter}</li>}
      {diff.archetypeAfter !== diff.archetypeBefore && <li>✨ Became the {diff.archetypeAfter}</li>}
      <li className="text-stone-500">+{diff.xpGained} XP</li>
    </ul>
  );
}
