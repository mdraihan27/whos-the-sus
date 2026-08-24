# Who's the Sus?

A real-time social deduction party game. Next.js 16 (App Router) + Firebase.

Everyone gets a secret word. The imposters get a *different* one, and nobody is
told who they are. Drop a clue, argue, then vote on who's faking it.

## How a game works

1. Any member of a group starts a game and picks who's playing — only players
   who are **active right now** can be dealt in.
2. They choose how many imposters, and whether imposters are told they're
   imposters.
3. Everyone is dealt a word. Crew share one word; imposters share a different
   one. Imposters never learn who the other imposters are.
4. Each round, every player sends **one clue**, whenever they like. Clues appear
   in the game chat instantly.
5. Once everyone has sent one, the group votes: **another round**, or **go to
   verdict**. Verdict needs a strict majority; otherwise another round starts.
   Votes stay hidden until everyone has voted.
6. At verdict, everyone accuses one player. Then the reveal.

### Scoring

| Who | Scores a point when |
| --- | --- |
| A non-imposter | They accused an actual imposter. |
| An imposter | Nobody accused them at all. |

Imposters vote too — otherwise the non-voters would give themselves away — but
they never score from voting. Points carry across as many games as you want; the
point table is open at any time from the group sidebar and inside the game, and
the final table shows when the host finishes the set.

## Setup

1. **Create a Firebase project** at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method → Google**: enable it. Add your dev origin
   under **Settings → Authorized domains** (`localhost` is there by default).
3. **Build → Firestore Database**: create a database.
4. Copy the env template and fill it in:

   ```bash
   cp .env.local.example .env.local
   ```

   - The `NEXT_PUBLIC_*` values come from **Project settings → Your apps → Web app**.
   - `FIREBASE_SERVICE_ACCOUNT_KEY` comes from **Project settings → Service
     accounts → Generate new private key**. Paste the whole JSON on one line in
     single quotes. **This is a secret — never commit it.**

5. Deploy the security rules in [`firestore.rules`](firestore.rules) — paste
   them into **Firestore → Rules**, or run
   `firebase deploy --only firestore:rules`.
6. Start the app:

   ```bash
   npm run dev
   ```

Until the env vars are set, the app shows a setup notice instead of the game.

## Why there's a server

Firestore security rules control access **per document**, so anything a
player's browser can read, that player can read in devtools. If the browser
picked the imposters and the words, the game would be trivially cheatable.

So every game mutation goes through a Next.js route handler using the Firebase
Admin SDK:

- The imposter list and both words live in `matches/{id}/secret/deal`, which
  **no client can read**.
- Each player's word lives in `matches/{id}/roles/{uid}`, readable **only by
  that uid**.
- Votes live in collections **no client can read at all**. The server tallies
  them and publishes only the result, so nobody sees how others voted first.
- When "tell imposters" is off, the server writes `isImposter: false` for
  everyone, so there is nothing to infer even from your own document.

Clients write exactly two things directly: group chat messages (as themselves)
and their own presence heartbeat. Everything else is server-only.

## Data model

```
users/{uid}                          name, email, avatar, timestamps

groups/{groupId}                     name, ownerId, inviteCode, memberIds[]
  members/{uid}                      denormalised name + avatar, lastSeen
  messages/{id}                      group chat
  sessions/{id}                      a "set": playerIds, imposterCount,
                                     revealImposters, scores{}, status
  matches/{id}                       one game: phase, round, who has submitted
    clues/{round}_{uid}              public clues
    roles/{uid}                      PRIVATE: your word          (owner-read)
    secret/deal                      PRIVATE: imposters + words  (no client)
    roundVotes/{round}_{uid}         PRIVATE                     (no client)
    verdictVotes/{uid}               PRIVATE                     (no client)
```

Presence is a heartbeat: members write `lastSeen` every 20s and count as active
for 60s. There is no Realtime Database dependency.

## Layout

```
app/
  page.tsx                  groups home
  g/[groupId]/page.tsx      group room (chat, crew, game)
  join/[code]/page.tsx      invite link landing
  api/groups/route.ts       create / join / remove  (Admin SDK)
  api/game/route.ts         auth + dispatch          (Admin SDK)
components/
  auth-provider.tsx         auth + profile state
  app-gate.tsx              sign-in / name / error gating
  group-room.tsx            group orchestrator
  group-chat.tsx            real-time chat
  member-panel.tsx          crew list, invite code, remove
  player-avatar.tsx         inline SVG crewmate
  game/game-setup.tsx       player picker, imposter count, reveal toggle
  game/game-room.tsx        clue / round-vote / verdict / results
  game/scoreboard.tsx       point table
lib/
  firebase.ts               client SDK init
  firebase-admin.ts         Admin SDK init + token verification
  game-engine.ts            all game rules and transactions
  game-types.ts             shared types, scoring, majority rule
  avatar.ts                 avatar palettes
data/
  words.json                5000 unrelated English nouns
```

The game rules live in `lib/game-engine.ts`, separate from the route handler, so
they can be driven directly in tests.
