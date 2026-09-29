"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name }, emailRedirectTo: redirectTo() },
      });
      if (error) setMessage(error.message);
      else if (!data.session) setMessage("Check your email to confirm your account.");
      else router.replace("/onboarding");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else {
        router.replace("/record");
        router.refresh();
      }
    }
    setBusy(false);
  }

  async function magicLink() {
    if (!email) return setMessage("Enter your email first.");
    setBusy(true);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    setMessage(error ? error.message : "We sent you a sign-in link.");
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="font-serif text-4xl">Echo</h1>
        <p className="mt-2 text-stone-500">
          {mode === "signup" ? "Start a journal that talks back in stories." : "Welcome back."}
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input
          className="input"
          type="email"
          autoComplete="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="Password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn" disabled={busy}>
          {mode === "signup" ? "Create account" : "Log in"}
        </button>
        {mode === "login" && (
          <button type="button" className="btn-ghost" onClick={magicLink} disabled={busy}>
            Email me a magic link
          </button>
        )}
      </form>
      {message && <p className="text-sm text-stone-600 dark:text-stone-300">{message}</p>}
      <p className="text-sm text-stone-500">
        {mode === "signup" ? (
          <>Already have an account? <Link className="underline" href="/login">Log in</Link></>
        ) : (
          <>New here? <Link className="underline" href="/signup">Create an account</Link></>
        )}
      </p>
    </main>
  );
}
