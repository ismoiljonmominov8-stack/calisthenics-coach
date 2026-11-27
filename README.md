# Calisthenics Coach

Online coaching app for calisthenics students: a **student app** (`index.html`) and a **coach panel** (`coach.html`).
Hosted free on GitHub Pages; data lives in Supabase (free tier).

- Students: https://ismoiljonmominov8-stack.github.io/calisthenics-coach/
- Coach: https://ismoiljonmominov8-stack.github.io/calisthenics-coach/coach.html

## One-time setup

1. **Database** — Supabase → *SQL Editor* → *New query* → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
2. **Turn off email confirmation** — Supabase → *Authentication* → *Sign In / Providers* → *Email* → switch **Confirm email** OFF → Save.
   (Students log in with phone + password; no emails are ever sent.)
3. **GitHub Pages** — this repo → *Settings* → *Pages* → *Branch: main*, folder */ (root)* → Save. Wait 1–2 minutes.
4. **Make yourself the coach** — open the student link, sign up with your own phone number, then in the SQL Editor run
   (your number, digits only):
   ```sql
   update public.profiles set role = 'coach', status = 'active' where phone = '998XXXXXXXXX';
   ```
   Now log in on `coach.html`.
5. **Before inviting students** — in *Levels & exercises* create your levels (order 1, 2, 3…) and the first level's exercises.

## How it works

- **Sign-up** → student is *pending* → coach sees it under *New students* (bell), calls them, picks a starting level, approves.
- **Approval = 30 days**, counted by the **server clock** (changing the phone date does nothing). At expiry the app locks
  and the student sends a renewal request; the coach approves it under *New students → Renewal requests*.
- **Daily tasks** are per level (optionally only on chosen weekdays). Students mark each task done with the reps they did and an optional note (pain, difficulty) — those notes show in the student's card in *All students*.
- **Additional exercises** go to everyone, one level, or one student, for a day / week / month.
- **Tests**: set date and exercises; students see upcoming tests. After the test, enter each student's numbers, tick who passed, and press *Promote* to move them to the next level (by level order).
- **Settings → Subscriptions**: cancel access now, or reset 30 days, for selected students.
- Uploaded GIFs are converted to small videos in Chrome/Edge before upload to stay inside the free storage/traffic limits. Max file size 8 MB.
- Languages: Uzbek, Russian. Light / dark theme.

## Files

| File | What it is |
|---|---|
| `index.html`, `js/student.js` | Student app |
| `coach.html`, `js/coach.js` | Coach panel |
| `technique/push-up.html`, `technique/pull-up.html`, `technique/planche.html`, `technique/front-lever.html`, `technique/muscle-up.html`, `technique/dips.html`, `technique/squats.html`, `technique/abs.html` | Interactive technique atlases (anatomical model, working muscles), opened from the student app's *Texnika* tile |
| `js/anatomy.js` | Anatomical figure renderer (body outline + muscles, side and back view); inlined in the technique pages and used by the Texnika cards |
| `js/technique-anim.js`, `js/technique-frames.js` | Looping skeleton animations on the Texnika cards; poses baked from the same models the technique pages use |
| `js/common.js` | Shared helpers, translations (UZ/RU), media upload |
| `js/config.js` | Supabase URL + publishable key, login settings |
| `css/style.css` | Styles (light/dark) |
| `supabase/schema.sql` | Database tables, security rules, server functions |

## Notes

- The key in `js/config.js` is the **publishable** key — safe in a public repo. Never put the `service_role` / secret key here.
- Free Supabase projects pause after about a week with no activity; daily use prevents this. If paused, open the Supabase dashboard and click *Restore*.
- Forgotten password: coach opens the student in *All students* → *Reset password*.
