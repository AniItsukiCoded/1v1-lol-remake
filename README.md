# 1v1.ARENA – online third-person 1v1 shooter
Static site (Three.js + Firebase Auth + Realtime Database). Everyone starts as a guest ("Guest 1234"); they can sign up later to keep stats.

## One-time Firebase setup
1. Authentication → Sign-in method: enable **Anonymous** and **Email/Password**.
2. Realtime Database → create it, then paste `database.rules.json` into the Rules tab (or `firebase deploy --only database`).

## Hosting (pick one)
- **Firebase Hosting (easiest, no custom domain):** `npm i -g firebase-tools && firebase login && firebase deploy`. You get `v1-lol-1e584.web.app`, which is authorized for sign-in automatically.
- **GitHub Pages:** also add `YOURNAME.github.io` under Authentication → Settings → Authorized domains (Firebase blocks sign-in from unlisted domains; this can't be bypassed).
- **Local:** `npx serve .` (localhost is pre-authorized). Don't open index.html via file://.

## Forks / re-uploads
Others can reuse the game by putting their own Firebase config in `js/config.js` and doing the setup above.

## Security
Never commit the Admin SDK key or database secret; this game doesn't use them. The web config is public by design; the rules protect your data.

Controls: WASD, Shift sprint, Space jump, mouse aim/shoot, R reload, M music. First to 10 kills.

## Credits
Skin model: "1v1.lol Drop Kick" (https://sketchfab.com/3d-models/1v1lol-drop-kick-15077cd6afc34fb3970e957a474b15ce) by youtube Argue (https://sketchfab.com/900331558), CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).

Maps (picked per match, same for both players): Grasslands, Crate Yard, Container Port, Neon Dome. Lobby: level/XP, coins, daily reward, locker + shop, click the character to make it kick.

## Party
The lobby "+" opens a party: create one, copy the invite link (or share the 5-letter code), and when your friend joins the leader presses PLAY for a private 1v1. **Re-paste `database.rules.json` into the Firebase Rules tab** (it now includes a `parties` section).
