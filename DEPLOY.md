# Put Echo online

About 15 minutes. You need a GitHub account (you have one), plus free Supabase and Vercel accounts, and an Anthropic account with a few dollars of credit.

## 1. Supabase (database, login, audio storage)

1. Go to [supabase.com](https://supabase.com), sign in with GitHub, click **New project**. Pick a region close to you and save the database password somewhere.
2. When it's ready, open **SQL Editor** → **New query**, paste the whole of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and click **Run**. You should see "Success. No rows returned".
3. Open **Project Settings → API** (called "Data API" or "API Keys" in newer dashboards) and copy:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Anthropic (Claude, which grows the companion)

1. Go to [console.anthropic.com](https://console.anthropic.com), add a few dollars under **Billing**.
2. **API Keys** → **Create key**. Copy it, this is `ANTHROPIC_API_KEY`.

Cost: each entry is one Claude call, roughly 2 to 4 cents with the default model. To roughly halve that, also add `CLAUDE_MODEL=claude-sonnet-5-5`.

## 3. Vercel (hosting)

1. Go to [vercel.com](https://vercel.com), sign in with GitHub.
2. **Add New → Project**, find **Audio-Journal**, click **Import**. If it's not listed, click "Adjust GitHub App permissions" and give Vercel access to the repo.
3. Leave the framework as Next.js. Open **Environment Variables** and add the three values from above.
4. Click **Deploy**. When it's done, copy your URL, for example `https://audio-journal-abc.vercel.app`.

Vercel deploys the `main` branch. Every push to `main` redeploys automatically.

## 4. Connect login emails to your site

Back in Supabase: **Authentication → URL Configuration**

- **Site URL**: your Vercel URL
- **Redirect URLs**: add `https://<your-vercel-url>/auth/callback`

Without this, confirmation and magic-link emails send people to `localhost`.

## 5. Check it

Open `https://<your-vercel-url>/setup`. Every row should be green. Each red row says what to fix.

Changed an environment variable in Vercel? Redeploy (Deployments → ⋯ → Redeploy). The Supabase values are baked in at build time.

## 6. On your phone

1. Open your Vercel URL, create an account, click the link in the confirmation email.
2. Pick your companion and record your first entry.
3. Add it to the home screen: iPhone Safari → Share → **Add to Home Screen**. Android Chrome → ⋮ → **Add to Home screen**.

## Things that will trip you up

- **Few emails per hour.** Supabase's built-in email sender is rate limited and meant for testing. To invite friends, add custom SMTP (for example [Resend](https://resend.com), free tier) under **Authentication → Emails → SMTP settings**. While it's just you, you can turn off **Confirm email** under **Authentication → Sign In / Providers → Email**.
- **Mic permission.** The first recording asks for microphone access. If you tapped "Don't allow", fix it in the browser's site settings.
- **iPhone transcription.** Safari sometimes records audio but produces no live text. The review screen then asks you to type a few lines. That's a known browser limit, see the README.
