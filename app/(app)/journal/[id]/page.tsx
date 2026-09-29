import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { duration, moodEmoji } from "@/lib/format";
import { DiffSummary } from "@/components/DiffSummary";
import { RetryButton } from "@/components/RetryButton";
import { SupportCard } from "@/components/SupportCard";
import type { CharacterDiff } from "@/lib/character/schema";

export default async function EntryPage({ params }: PageProps<"/journal/[id]">) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const [{ data: entry }, { data: event }, { data: character }] = await Promise.all([
    supabase.from("entries").select("*").eq("id", id).maybeSingle(),
    supabase.from("character_events").select("diff, chapter").eq("entry_id", id).maybeSingle(),
    supabase.from("characters").select("name").maybeSingle(),
  ]);
  if (!entry) notFound();

  let audioUrl: string | null = null;
  if (entry.audio_path) {
    const { data } = await supabase.storage.from("journal-audio").createSignedUrl(entry.audio_path, 60 * 60);
    audioUrl = data?.signedUrl ?? null;
  }

  const created = new Date(entry.created_at);
  return (
    <article className="flex flex-col gap-5">
      <Link href="/journal" className="text-sm text-stone-500">
        ← Journal
      </Link>
      <header>
        <p className="text-sm text-stone-500">
          {created.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" · "}
          {created.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          {entry.duration_s > 0 && ` · ${duration(entry.duration_s)}`}
        </p>
        <h1 className="mt-1 flex items-center gap-2 font-serif text-2xl">
          <span>{moodEmoji(entry.mood)}</span>
          {entry.themes?.length ? entry.themes.join(" · ") : "Entry"}
        </h1>
      </header>

      {entry.needs_support && <SupportCard />}
      {audioUrl && <audio controls preload="metadata" src={audioUrl} className="w-full" />}
      {entry.summary && <p className="card text-stone-700 dark:text-stone-300">{entry.summary}</p>}
      {(entry.status === "failed" || entry.status === "recorded") && <RetryButton entryId={entry.id} />}

      <section>
        <h2 className="mb-2 text-sm font-medium tracking-wide text-stone-500 uppercase">What you said</h2>
        <p className="font-serif leading-relaxed whitespace-pre-wrap">{entry.transcript}</p>
      </section>

      {event && (
        <section className="card flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase">
            How {character?.name ?? "your companion"} changed
          </h2>
          <p className="font-serif italic">{event.chapter}</p>
          <DiffSummary diff={event.diff as CharacterDiff} name={character?.name ?? "Your companion"} />
        </section>
      )}
    </article>
  );
}
