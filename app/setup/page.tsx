import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { connection } from "next/server";
import { MODEL } from "@/lib/claude";

type Check = { label: string; ok: boolean; detail: string };

const ENV_VARS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "ANTHROPIC_API_KEY"] as const;

function withTimeout<T>(p: PromiseLike<T>, ms = 6000): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms)),
  ]);
}

async function checkSupabase(): Promise<Check[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return [{ label: "Database", ok: false, detail: "Skipped until the Supabase variables are set." }];
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const checks: Check[] = [];

  try {
    // RLS returns zero rows for an anonymous caller, but the query fails if the table is missing.
    const { error } = await withTimeout(supabase.from("entries").select("id").limit(0));
    checks.push(
      error
        ? {
            label: "Database tables",
            ok: false,
            detail: /find the table|does not exist/i.test(error.message)
              ? "Tables are missing. Run supabase/migrations/0001_init.sql in the Supabase SQL Editor."
              : `Supabase answered with an error: ${error.message}. Check the URL and anon key.`,
          }
        : { label: "Database tables", ok: true, detail: "Connected, tables exist." },
    );
  } catch (err) {
    checks.push({
      label: "Database tables",
      ok: false,
      detail: `Couldn't reach Supabase (${(err as Error).message}). Check NEXT_PUBLIC_SUPABASE_URL.`,
    });
    return checks;
  }

  try {
    const { error } = await withTimeout(supabase.storage.from("journal-audio").list("setup-check", { limit: 1 }));
    checks.push(
      error
        ? {
            label: "Audio storage",
            ok: false,
            detail: /not found/i.test(error.message)
              ? "The journal-audio bucket is missing. Run the migration SQL again."
              : `Storage error: ${error.message}`,
          }
        : { label: "Audio storage", ok: true, detail: "journal-audio bucket exists." },
    );
  } catch (err) {
    checks.push({ label: "Audio storage", ok: false, detail: `Couldn't reach storage (${(err as Error).message}).` });
  }
  return checks;
}

async function checkAnthropic(): Promise<Check> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { label: "Claude", ok: false, detail: "Skipped until ANTHROPIC_API_KEY is set." };
  }
  try {
    // Looks up the model without generating anything, so it costs nothing.
    await withTimeout(new Anthropic({ maxRetries: 0 }).models.retrieve(MODEL));
    return { label: "Claude", ok: true, detail: `API key works, using ${MODEL}.` };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { label: "Claude", ok: false, detail: "The API key was rejected. Create a new one in the Anthropic Console." };
    }
    if (err instanceof Anthropic.NotFoundError) {
      return { label: "Claude", ok: false, detail: `Model "${MODEL}" not found. Fix or remove CLAUDE_MODEL.` };
    }
    return { label: "Claude", ok: false, detail: `Couldn't reach the Anthropic API (${(err as Error).message}).` };
  }
}

export default async function SetupPage() {
  await connection(); // run the checks on every request, never at build time

  const envChecks: Check[] = ENV_VARS.map((name) => ({
    label: name,
    ok: Boolean(process.env[name]),
    detail: process.env[name] ? "Set." : "Missing. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.",
  }));
  const [supabaseChecks, claudeCheck] = await Promise.all([checkSupabase(), checkAnthropic()]);
  const checks = [...envChecks, ...supabaseChecks, claudeCheck];
  const allGood = checks.every((c) => c.ok);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-8">
      <div>
        <h1 className="font-serif text-3xl">Setup check</h1>
        <p className="mt-1 text-stone-500">
          {allGood ? "Everything is connected." : "A few things still need attention. See DEPLOY.md for the steps."}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {checks.map((c) => (
          <li key={c.label} className="card flex gap-3">
            <span aria-label={c.ok ? "ok" : "problem"} className={c.ok ? "text-green-600" : "text-red-600"}>
              {c.ok ? "✓" : "✗"}
            </span>
            <div className="min-w-0">
              <p className="font-medium break-words">{c.label}</p>
              <p className="text-sm text-stone-600 dark:text-stone-400">{c.detail}</p>
            </div>
          </li>
        ))}
        <li className="card flex gap-3">
          <span className="text-amber-600">!</span>
          <div>
            <p className="font-medium">Login redirect URL</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Can&apos;t be checked from here. In Supabase → Authentication → URL Configuration, set Site URL to this
              site and add <code>/auth/callback</code> on this domain to the redirect URLs.
            </p>
          </div>
        </li>
      </ul>
      {allGood && (
        <Link className="btn" href="/signup">
          Create your account
        </Link>
      )}
    </main>
  );
}
