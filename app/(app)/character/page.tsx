import Link from "next/link";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { requireCharacter } from "@/lib/character/load";
import { archetype, rankedTraits } from "@/lib/character/archetype";
import { xpForLevel } from "@/lib/character/apply";
import { ITEMS, TRAIT_LABELS } from "@/lib/character/schema";

export default async function CharacterPage() {
  const { supabase, character } = await requireCharacter();
  const { state, level, xp, name } = character;
  const { data: events } = await supabase
    .from("character_events")
    .select("entry_id, chapter, created_at")
    .order("created_at", { ascending: true });

  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const progress = Math.round(((xp - floor) / (ceil - floor)) * 100);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center text-center">
        <CharacterAvatar baseLook={character.base_look} state={state} level={level} size={240} />
        <h1 className="font-serif text-3xl">{name}</h1>
        <p className="text-stone-500">
          {state.entries === 0 ? "Still asleep. Record an entry to wake it up." : `the ${archetype(state.traits)}`}
        </p>
        <div className="mt-4 w-full">
          <div className="flex justify-between text-xs text-stone-500">
            <span>Level {level}</span>
            <span>
              {xp - floor} / {ceil - floor} XP
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {state.entries} {state.entries === 1 ? "entry" : "entries"} · {state.streak} day streak
          </p>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-sm font-medium tracking-wide text-stone-500 uppercase">Traits</h2>
        <ul className="flex flex-col gap-2">
          {rankedTraits(state.traits).map((t) => (
            <li key={t} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0">{TRAIT_LABELS[t]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${state.traits[t]}%` }} />
              </div>
              <span className="w-8 text-right text-stone-500 tabular-nums">{state.traits[t]}</span>
            </li>
          ))}
        </ul>
      </section>

      {state.items.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-sm font-medium tracking-wide text-stone-500 uppercase">Found along the way</h2>
          <ul className="flex flex-wrap gap-2">
            {state.items.map((i) => (
              <li key={i} className="rounded-full bg-amber-100 px-3 py-1 text-sm dark:bg-amber-900/30">
                {ITEMS[i].label}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium tracking-wide text-stone-500 uppercase">The story so far</h2>
        {events?.length ? (
          <ol className="flex flex-col gap-4 border-l-2 border-amber-300 pl-4">
            {events.map((e, i) => (
              <li key={e.entry_id}>
                <Link href={`/journal/${e.entry_id}`} className="text-xs text-stone-500">
                  Chapter {i + 1} · {new Date(e.created_at).toLocaleDateString()}
                </Link>
                <p className="mt-1 font-serif leading-relaxed">{e.chapter}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-stone-500">No chapters yet.</p>
        )}
      </section>
    </div>
  );
}
