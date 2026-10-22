# 1v1.Arena – online third-person 1v1 shooter
Static site (Three.js + Firebase Auth + Realtime Database). Everyone starts as a guest ("Guest 1234"); they can sign up later to keep stats.

## One-time Firebase setup
1. Authentication → Sign-in method: enable **Anonymous** and **Email/Password**.
2. Realtime Database → create it, then paste `database.rules.json` into the Rules tab (or `firebase deploy --only database`).

3. **Publish the updated `database.rules.json`** (it adds `saves/` for account progress, the `halloween26v2/` leaderboard and `lobby2/` for 2v2 matchmaking). Without it, progress stays on the device, the leaderboard shows "unavailable" and 2v2 can't find matches.

## Saving & the data reset
- **Logged-in accounts** (email or Google) save their progress (coins, XP, skins, gun skins, passes, event) to `saves/<uid>` in the Realtime Database and load it on any device. Guests keep progress only on this device; signing up from a guest uploads that progress to the new account. Signing out clears the device so the next person starts fresh.
- **`DATA_VER` in `js/main.js`** is the reset switch. When a player's saved version differs, all *progress* (and their win/loss record) is wiped once; accounts, usernames and settings are kept, and anything earned afterwards is kept. Bump the number to reset everybody again.
- The Halloween leaderboard moved to `halloween26v2` so old candy totals don't carry over. You can delete the old `halloween26` node in the Firebase console.

## Modes, settings & controls
- **1v1 / 2v2:** click the mode box next to PLAY to switch. 2v2 = you + a teammate vs two opponents, first team to 3 rounds; a round ends when a whole team is down (no friendly fire; teammates get green tags and a health panel). Solo players are matched with random teammates through `lobby2/q`; if you are in a party of two, the party leader's PLAY queues you as a duo. Team 0 spawns on the west side, team 1 on the east.
- **Graphics quality 0-10** (Settings, default 10 = the original look): render scale, shadow size/refresh, scenery detail, particles. Saved on the device. Anti-aliasing (on from 6) applies after a reload.
- **Keybinds** (Settings → Controls): every action has a main and an alternative key/mouse button. Stored as `CFG.kb`, so they are part of the account cloud save (guests: this device). A data reset (`DATA_VER`) keeps them.
- **Custom crosshair** (Settings → Crosshair): ring / cross / dot / your own image, with size, opacity, thickness, colour, outline and "grow while moving". Saved in this browser only (`localStorage.xh`), never in Firebase.
- **Animations:** aim-down-sights stance, weapon kick, shotgun pump, reload, draw, sprint low-ready, muzzle flash and shell casings (other players' animations are synced through `a`, `rl` and shot events).

## Performance notes
The random freezes came from the per-gun `PointLight`s being added/removed when switching weapons or build mode (every change of the scene's light count recompiles every shader), and from per-shot geometry that was never freed. Muzzle flashes are now meshes, effect/build geometry is shared and cached, old maps/characters are disposed, and shaders are pre-compiled when a match starts.

## Hosting (pick one)
- **Firebase Hosting (easiest, no custom domain):** `npm i -g firebase-tools && firebase login && firebase deploy`. You get `v1-lol-1e584.web.app`, which is authorized for sign-in automatically.
- **GitHub Pages:** also add `YOURNAME.github.io` under Authentication → Settings → Authorized domains (Firebase blocks sign-in from unlisted domains; this can't be bypassed).
- **Local:** `npx serve .` (localhost is pre-authorized). Don't open index.html via file://.

## Forks / re-uploads
Others can reuse the game by putting their own Firebase config in `js/config.js` and doing the setup above.

## Security
Never commit the Admin SDK key or database secret; this game doesn't use them. The web config is public by design; the rules protect your data.

Controls: WASD, Shift sprint, Space jump, mouse aim/shoot, right-click aim, 1 shotgun / 2 AR / F pickaxe (or wheel), Z wall, X floor, C stairs, V roof, G edit, T or right-click (in build mode) material, R reload, Esc pause menu.

Progression: LOL Pass XP is earned per **round** (+60 per round won, +20 per round lost, see `PASSXP` in `js/events.js`); tiers can't be bought. Spooky Pass tiers are bought with candy. 100 candy = 100 coins in the Event > Exchange tab. Halloween Box = weapon skins only. Gun skins live in `js/gunskins.js` (append-only list) and are shown to your opponent too. Event data (pass, box, quest, goals, leaderboard rewards) is in `js/events.js`.

Match rules: every kill ends the round; both players respawn at their corners after a 3-2-1 countdown. First to 3 round wins takes the match and the winner screen is shown.

Weapons: Shotgun, Assault Rifle, Pickaxe (melee, destroys builds, harvests materials from crates). No recoil. Stats live in the `WEAPONS` table at the top of `js/game.js`.

Building (Fortnite style): press a piece key for a ghost preview, click (or hold) to place. Pieces snap to a 5u grid on the tile you stand on, build up over ~0.45s, and come in wood/brick/metal (separate counts, different HP). G edits your own wall/floor (click cells, G to confirm, right-click resets). Pieces are solid for players and bullets and are cleared every round. Build/edit events travel through the existing `shots` node, so no Firebase rule changes are needed.

## Credits
Skin model: "1v1.lol Drop Kick" (https://sketchfab.com/3d-models/1v1lol-drop-kick-15077cd6afc34fb3970e957a474b15ce) by youtube Argue (https://sketchfab.com/900331558), CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).

Maps (picked per match, same for both players): Grasslands, Crate Yard, Container Port, Neon Dome. Lobby: level/XP, coins, daily reward, locker + shop, click the character to make it kick.

## Mobile / touch
Phones and tablets are detected automatically (`js/touch.js`; force with `?touch=1`, disable with `?touch=0`). Play in landscape (a "rotate your phone" overlay shows in portrait during a match).
Left half of the screen = floating move stick (push to the rim to sprint), right half = drag to look, **FIRE** (hold; drag on it to aim while shooting), ◎ aim (tap to toggle), ⤒ jump, ↻ reload, 🧱 shows the build bar (tap a piece, tap the material counter to cycle, ✎ edit), ❚❚ pause. Tap the weapon cards at the top to switch weapons. Look speed uses the Mouse sensitivity slider. Default graphics quality is Low-ish (4) on touch devices. Keyboard rebinding is hidden on touch.

## Netcode, queue & bot (v3)
- **Hits are decided on the shooter's screen** (what you see is what you hit). Shot events carry `h:[{u,dm,hd}]` claims; the victim validates round/phase/max-damage and applies them. Previously the victim re-checked the shot against its own (newer) position, so many visible hits did nothing.
- **Smooth movement:** remote players are drawn ~100ms in the past by interpolating timestamped samples (`ts`), extrapolating up to 150ms when packets stall; position packets go out every 50ms.
- **Frozen/countdown damage:** round end, next-round and the 3-2-1 countdown are now scheduled on the shared server clock (death timestamps `dts`, match start time from the match id), so both players go live together. Shots landing in the last 600ms of someone's countdown still count.
- **Queue:** the invite is cleared before queueing (it used to be cleared after, which could erase a fresh match), cancelling removes the disconnect hook, transaction retries are bounded, and an opponent who never connects (16s) sends you back to search.
- **Practice bot:** if nobody else is online (after ~2s) or nobody joins within 12s, a bot match starts (also the "PLAY VS BOT NOW" button after 3s). It runs locally, adapts a little to the score, gives half XP/coins and no wins/losses, candy or pass XP.

## v4 changes (bot, animations, lag)
- **Bot queue:** the bot match no longer depends on Firebase at all. The "PLAY VS BOT NOW" button shows after 1s, the timer starts immediately (bot after 2s if nobody else is online, otherwise 8s), matchmaking errors/offline fall back to a bot instead of an alert, and leaving the queue happens in the background. Bots get a random two-word name + number (e.g. `SwiftFalcon4821`, see `botName()` in `js/main.js`).
- **Lag/freeze fixes:** shared audio noise buffer (was rebuilt on every shot/step), pooled spark/tracer/shell meshes (no per-shot material), allocation-free `rayBox` (3 camera rays per frame x every box), HUD writes only when values change, health bars move with `transform`, and **dynamic resolution** (render scale steps down when the GPU can't hold ~50fps, back up with headroom).
- **Smoother remote players:** render delay adapts to measured jitter (100-260ms), position smoothing is frame-rate independent, and the walk cycle uses a smoothed speed (no more leg stutter per packet).
- **Animation:** hit flinch (you and enemies), shell casings tumble, sparks shrink, landing camera dip, new pop/overshoot animations for FIGHT!/countdown/hit marker/cards.

## Party
The lobby "+" opens a party: create one, copy the invite link (or share the 5-letter code), and when your friend joins the leader presses PLAY for a private 1v1. **Re-paste `database.rules.json` into the Firebase Rules tab** (it includes a `parties` section). Invite links (`?party=CODE`) are one-shot and the code is removed from the URL after joining.

## Halloween event (Haunted Harvest, MM2 style) + passes + cosmetics
**Event window:** Oct 1 → Dec 1 2026 (edit `EVT` in `js/events.js`; test with `?event=1` / `?event=0` on the URL). Candy stops spawning when it ends, but the hub stays open **7 more days** so players can spend candy and claim rewards.
**In matches:** the lobby + arenas turn spooky (moon, stars, bats, wisps, jack-o'-lanterns, tombstones, dead trees, lightning + thunder, eerie music). 🍬 candy (5 each, golden 🎃 = 25) spawns every round at the same spots for both players — walk over it. Finishing a match gives +50 🍬 (+50 more for a win).
**Event hub (lobby → Event):**
- **Quests:** 3 random daily quests each day (3 stages each, e.g. Collect candies 300/700/1200). Completing one counts toward the permanent **Event Quest**: 15 / 30 / 45 → Hexed, Violet Jack, Ghostly.
- **Pass (30 tiers, no premium):** tiers are *bought* with candy — 600 each (±1/±10), tier 30 = mythic **Nightmare King** for 100,000 🍬 (silhouette until unlocked). Tap an unlocked card to equip its skin.
- **Box:** Halloween Box '26 (600 🍬 or a Box Key), odds 70/18/8/4/0.2% (mythic Spectral Knight). Duplicates refund candy.
- **Skins:** spend candy; one skin is 30% off each day (Daily Deal). **Treats:** free daily box with a streak bonus (up to +60%).
- **Ranks:** Global + Today candy leaderboards (top 50, auto-refresh), and a Rewards tab — after the event ends your final rank gives a skin (#1 Harvest Champion, Top 3 Midnight Pumpkin King, Top 10 Moonlit Witch, Top 25 Harvest Jack, Top 50 coins).
- **Goals:** 17 lifetime milestones (candy collected, golden pumpkins, wins, boxes, tier, skins owned…). **Collection:** every event item.
**LOL Pass (30 levels, no premium):** pass XP from matches (250/tier); coins, colours and accessory skins.
**Camera:** you can now look almost straight up and down (±86°).
**Performance:** Settings → "🎃 Spooky arena effects" cycles FULL / LITE / OFF (about 300 / 70 / 8 extra objects per arena); it applies from the next match.
**Skins:** a skin is one number (colour + cosmetic id × 2^24) so opponents see your outfit through the existing party/invite data. 24 outfits are built from Three.js shapes in `js/cosmetics.js`.
**Leaderboard needs the new rules:** re-paste `database.rules.json` into Firebase → Realtime Database → Rules (adds `halloween26/lb`, scores capped and can't go down).
Files: `js/cosmetics.js` (outfits/props), `js/events.js` (all data: items, pass, box, quests, goals, rank rewards, dates), `js/passes.js` (hub/pass/locker UI), Halloween arena + candy + lightning in `js/game.js`.
