import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { duration, moodEmoji } from "@/lib/format";
import { redirect } from "next/navigation";

type Row = {
  id: string;
  created_at: string;
  transcript: string;
  summary: string | null;
  mood: number | null;
  duration_s: number;
  status: string;
};

export default async function JournalPage() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("entries")
    .select("id, created_at, transcript, summary, mood, duration_s, status")
    .order("created_at", { ascending: false })
    .limit(200);
  const entries = (data ?? []) as Row[];

  if (!entries.length) {
    return (
      <div className="pt-16 text-center">
        <h1 className="font-serif text-3xl">Your journal</h1>
        <p className="mt-2 text-stone-500">Nothing here yet.</p>
        <Link className="btn mt-6" href="/record">
          Record your first entry
        </Link>
      </div>
    );
  }

  const groups = new Map<string, Row[]>();
  for (const e of entries) {
    const key = new Date(e.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl">Your journal</h1>
      {[...groups].map(([month, rows]) => (
        <section key={month}>
          <h2 className="mb-2 text-sm font-medium tracking-wide text-stone-500 uppercase">{month}</h2>
          <ul className="flex flex-col gap-2">
            {rows.map((e) => (
              <li key={e.id}>
                <Link href={`/journal/${e.id}`} className="card flex gap-3">
                  <span className="text-2xl">{moodEmoji(e.mood)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>
                        {new Date(e.created_at).toLocaleDateString(undefined, {
                          weekday: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span>{e.duration_s > 0 ? duration(e.duration_s) : "written"}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 font-serif">{e.summary ?? e.transcript}</p>
                    {e.status === "failed" && <p className="mt-1 text-xs text-red-600">Not processed yet</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
