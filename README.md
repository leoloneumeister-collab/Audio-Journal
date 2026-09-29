# Echo, an audio journal with a companion that grows

Record a voice note on your phone, read and replay old entries, and watch a little character evolve based on how you talk about yourself and your life.

## How it works

1. **Record** on the phone. Audio goes to a private Supabase Storage bucket, and the browser's speech recognition writes a live transcript you can fix before saving.
2. **Process.** `POST /api/entries/[id]/process` sends the transcript, the character's current state and the last few chapters to Claude. Claude returns a summary, mood, themes, trait changes, an optional item and a new story chapter (validated with zod).
3. **Evolve.** `lib/character/apply.ts` applies the result with hard rules: at most ±8 per trait per entry, traits stay in 0 to 100, hard days never lower resilience. XP, levels, streaks and the archetype title ("Bold Sage") come from there too.
4. **See it.** The companion page shows the SVG avatar (traits and items change how it looks), trait bars, level, items and the full story so far. Each entry shows its audio, transcript, summary and what changed.

Everything is private per user through Postgres Row Level Security, including the audio files.

## Setup

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`).
2. In Supabase Auth → URL configuration, add `http://localhost:3000/auth/callback` and your production URL's `/auth/callback` as redirect URLs.
3. `cp .env.example .env.local` and fill in the Supabase URL, anon key and an Anthropic API key.
4. `npm install && npm run dev`

Deploy to Vercel with the same env vars. The mic only works over HTTPS (or localhost).

## Scripts

- `npm run dev` / `npm run build`
- `npm test` for the character engine unit tests
- `npm run lint`, `npm run typecheck`

## Known limits of browser transcription

- Firefox has no speech recognition, so users type or paste text.
- iOS Safari sometimes won't run speech recognition and recording at the same time. The audio still records, and the review screen asks for text.
- If recognition fails there's no transcript to recover later. The `Transcriber` interface in `lib/transcribe/types.ts` exists so a server-side option (for example Whisper on the uploaded file) can replace it.
- If the server dies mid-processing, an entry can stay stuck in `processing`. Reset its status to `failed` in Supabase to retry.

## Testing on a real phone

- [ ] Sign up, confirm email, pick a companion
- [ ] Record 30s on Android Chrome, check the live transcript, pause and resume, save
- [ ] Same on iOS Safari, confirm audio plays back on the entry page
- [ ] "Type instead" works without a mic
- [ ] Companion page shows a new chapter and trait changes
- [ ] Add to home screen, app opens on the record screen

## Ideas for later

Reminders and streak notifications, search and mood charts, weekly recaps written by Claude, data export, account deletion, server-side transcription fallback.
