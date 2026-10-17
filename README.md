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
