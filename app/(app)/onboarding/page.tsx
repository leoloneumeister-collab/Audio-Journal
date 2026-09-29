import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { Onboarding } from "@/components/Onboarding";

export default async function OnboardingPage() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("characters").select("id").maybeSingle();
  if (data) redirect("/character");
  return <Onboarding userId={user.id} />;
}
