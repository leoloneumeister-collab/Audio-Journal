"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CharacterAvatar } from "./CharacterAvatar";
import { BASE_LOOKS, initialState, type BaseLook } from "@/lib/character/schema";
import { createClient } from "@/lib/supabase/client";

const LOOK_LABELS: Record<BaseLook, string> = { fox: "Fox", bear: "Bear", bunny: "Bunny", owl: "Owl" };

export function Onboarding({ userId }: { userId: string }) {
  const router = useRouter();
  const [look, setLook] = useState<BaseLook>("fox");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state = initialState();

  async function create() {
    setBusy(true);
    const { error } = await createClient()
      .from("characters")
      .insert({ user_id: userId, name: name.trim(), base_look: look, state });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.replace("/record");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div>
        <h1 className="font-serif text-3xl">Meet your companion</h1>
        <p className="mt-2 text-stone-500">
          It starts as a blank little spirit. Every time you talk about your life, it grows in its own way.
        </p>
      </div>
      <CharacterAvatar baseLook={look} state={state} level={1} />
      <div className="grid w-full grid-cols-4 gap-2">
        {BASE_LOOKS.map((l) => (
          <button
            key={l}
            onClick={() => setLook(l)}
            className={`rounded-xl py-2 text-sm ring-1 ${look === l ? "bg-amber-100 ring-amber-500 dark:bg-amber-900/30" : "ring-stone-300 dark:ring-stone-700"}`}
          >
            {LOOK_LABELS[l]}
          </button>
        ))}
      </div>
      <input
        className="input text-center"
        placeholder="Give it a name"
        maxLength={24}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button className="btn w-full" disabled={busy || !name.trim()} onClick={create}>
        Start the journey
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
