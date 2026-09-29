import { Recorder } from "@/components/Recorder";
import { requireCharacter } from "@/lib/character/load";

export default async function RecordPage() {
  const { user, character } = await requireCharacter();
  return <Recorder userId={user.id} characterName={character.name} />;
}
