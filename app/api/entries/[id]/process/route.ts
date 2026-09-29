import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { analyzeEntry, AnalysisRefusedError } from "@/lib/claude";
import { applyAnalysis } from "@/lib/character/apply";
import { buildUserMessage } from "@/lib/character/prompt";
import type { Analysis, CharacterState } from "@/lib/character/schema";

// Thinking plus a long transcript can take a while.
export const maxDuration = 120;

export async function POST(_req: Request, ctx: RouteContext<"/api/entries/[id]/process">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // RLS limits every query below to the signed-in user's rows.
  const { data: entry } = await supabase.from("entries").select("*").eq("id", id).single();
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  if (entry.status === "done") return NextResponse.json({ ok: true, alreadyDone: true });
  if (!entry.transcript?.trim()) {
    return NextResponse.json({ error: "This entry has no text yet" }, { status: 400 });
  }

  const { data: character } = await supabase.from("characters").select("*").single();
  if (!character) return NextResponse.json({ error: "Create your character first" }, { status: 409 });

  // Claim the entry atomically so a double tap can't process it twice.
  const { data: claimed } = await supabase
    .from("entries")
    .update({ status: "processing" })
    .eq("id", id)
    .in("status", ["recorded", "failed"])
    .select("id");
  if (!claimed?.length) return NextResponse.json({ error: "Already processing" }, { status: 409 });

  try {
    const [{ data: events }, { data: recent }] = await Promise.all([
      supabase.from("character_events").select("chapter").order("created_at", { ascending: false }).limit(3),
      supabase
        .from("entries")
        .select("summary")
        .eq("status", "done")
        .neq("id", id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const analysis = await analyzeEntry(
      buildUserMessage({
        name: character.name,
        state: character.state as CharacterState,
        level: character.level,
        recentChapters: (events ?? []).map((e) => e.chapter).reverse(),
        recentSummaries: (recent ?? []).map((e) => e.summary).filter(Boolean).reverse(),
        transcript: entry.transcript,
        durationS: entry.duration_s,
      }),
    );

    const diff = await saveCharacter(supabase, character, analysis, entry.duration_s);

    await supabase.from("character_events").insert({
      user_id: user.id,
      entry_id: id,
      diff,
      chapter: analysis.chapter,
    });
    await supabase
      .from("entries")
      .update({
        status: "done",
        summary: analysis.summary,
        mood: Math.max(-2, Math.min(2, Math.round(analysis.mood))),
        themes: analysis.themes.map((t) => t.toLowerCase().trim()).filter(Boolean).slice(0, 5),
        needs_support: analysis.needs_support,
      })
      .eq("id", id);

    return NextResponse.json({ ok: true, reflection: analysis.reflection, needsSupport: analysis.needs_support });
  } catch (err) {
    console.error("process entry failed", err);
    await supabase.from("entries").update({ status: "failed" }).eq("id", id);
    const message =
      err instanceof AnalysisRefusedError
        ? "We couldn't analyse this entry. It's saved, and you can still listen to and read it."
        : "Something went wrong while updating your character. You can retry from the entry page.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

type Supabase = Awaited<ReturnType<typeof getUser>>["supabase"];
type CharacterRow = { id: string; state: unknown; xp: number; updated_at: string };

/**
 * Writes the updated character with an optimistic lock on updated_at, so two
 * entries processed at the same time don't overwrite each other's changes.
 */
async function saveCharacter(supabase: Supabase, row: CharacterRow, analysis: Analysis, durationS: number) {
  let current = row;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = applyAnalysis({
      state: current.state as CharacterState,
      xp: current.xp,
      analysis,
      durationS,
      now: new Date(),
    });
    const { data } = await supabase
      .from("characters")
      .update({ state: result.state, xp: result.xp, level: result.level, updated_at: new Date().toISOString() })
      .eq("id", current.id)
      .eq("updated_at", current.updated_at)
      .select("id");
    if (data?.length) return result.diff;

    const { data: fresh } = await supabase.from("characters").select("*").eq("id", current.id).single();
    if (!fresh) break;
    current = fresh;
  }
  throw new Error("Could not save character after retries");
}
