<img src="assets/icon.svg" width="64" height="64" alt="">

# Shooting zombies

Created in [T3 Code](https://t3.codes).

## Run locally

With Node.js 22.12 or newer, run `npm ci` and `npm run dev`. Open the local URL printed by Wrangler to play the game.

## Deploy to Cloudflare Workers

The game uses Workers Static Assets. Wrangler serves the existing HTML, JavaScript, CSS, and game art directly. The Worker name is `deadwater-bridge-run` in [wrangler.jsonc](wrangler.jsonc).

For a deployment from your computer, install dependencies with `npm ci`, then run these commands.

```sh
npx wrangler login
npm run check:deploy
npm run deploy
```

The check performs a local dry run. The deploy command publishes the game and prints the Worker URL.

For Git deployments, connect the repository in **Cloudflare Workers & Pages** and choose **Workers**. Use the following [Workers Builds settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

| Setting | Value |
| --- | --- |
| Worker name | `deadwater-bridge-run` |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |

The build packages the HTML, its scripts, the stylesheet, the app manifest, and the contents of `assets/` into `dist/`. It generates a service worker with a new offline cache revision whenever those files change. Wrangler runs this build automatically for local development and CLI deployments. Include the game files, deployment configuration, and npm lockfile when pushing the repository to your production branch.

## Install on a phone

Open the deployed HTTPS game URL on the phone.

- **Android Chrome** — Tap **Install Deadwater** when it appears below the controls, or choose **Install app** or **Add to Home screen** in Chrome’s menu.
- **iPhone Safari** — Open **Share**, choose **Add to Home Screen**, enable **Open as Web App** if shown, and tap **Add**.

Open the app online and wait for **Ready for offline play** below the controls. All 37 levels are then available offline on that device. After an update downloads, close every open game window and reopen Deadwater to use the new version.

## Sound credits

Large zombie and boss deaths draw from eight recorded performances at their original pitch. AntumDeluge recorded four undead moans for Stendhal. Exewin contributed takes 1, 3, 6, and 9 from their death sounds pack. Both collections are CC0. [Undead Moans](https://opengameart.org/content/undead-moans) · [Death sounds](https://opengameart.org/content/death-sounds-0) · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
