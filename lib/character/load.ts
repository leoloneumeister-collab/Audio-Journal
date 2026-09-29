import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import type { BaseLook, CharacterState } from "./schema";

export type Character = {
  id: string;
  name: string;
  base_look: BaseLook;
  state: CharacterState;
  level: number;
  xp: number;
};

/** Loads the signed-in user's character, sending them to onboarding if there is none. */
export async function requireCharacter() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("characters").select("*").maybeSingle();
  if (!data) redirect("/onboarding");
  return { supabase, user, character: data as Character };
}
