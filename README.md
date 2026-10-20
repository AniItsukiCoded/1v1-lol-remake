# 1v1.ARENA – online third-person 1v1 shooter
Static site (Three.js + Firebase Auth + Realtime Database). Everyone starts as a guest ("Guest 1234"); they can sign up later to keep stats.

## One-time Firebase setup
1. Authentication → Sign-in method: enable **Anonymous** and **Email/Password**.
2. Realtime Database → create it, then paste `database.rules.json` into the Rules tab (or `firebase deploy --only database`).

3. **Publish the updated `database.rules.json`** (it adds `saves/` for account progress and the new `halloween26v2/` leaderboard). Without it, progress simply stays on the device and the leaderboard shows "unavailable".

## Saving & the data reset
- **Logged-in accounts** (email or Google) save their progress (coins, XP, skins, gun skins, passes, event) to `saves/<uid>` in the Realtime Database and load it on any device. Guests keep progress only on this device; signing up from a guest uploads that progress to the new account. Signing out clears the device so the next person starts fresh.
- **`DATA_VER` in `js/main.js`** is the reset switch. When a player's saved version differs, all *progress* (and their win/loss record) is wiped once; accounts, usernames and settings are kept, and anything earned afterwards is kept. Bump the number to reset everybody again.
- The Halloween leaderboard moved to `halloween26v2` so old candy totals don't carry over. You can delete the old `halloween26` node in the Firebase console.

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

## Party
The lobby "+" opens a party: create one, copy the invite link (or share the 5-letter code), and when your friend joins the leader presses PLAY for a private 1v1. **Re-paste `database.rules.json` into the Firebase Rules tab** (it now includes a `parties` section).

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
