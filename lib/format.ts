export const MOOD_EMOJI: Record<number, string> = { [-2]: "😞", [-1]: "😕", 0: "😐", 1: "🙂", 2: "😄" };

export function moodEmoji(mood: number | null) {
  return mood === null ? "·" : (MOOD_EMOJI[mood] ?? "·");
}

export function duration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
