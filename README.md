# Nawras أيّهما؟

First stage: landing and full leaderboard, built with Vite, vanilla JavaScript, HTML and CSS. Node **24** and npm are required.

```powershell
npm ci
npm run dev
```

Open the URL Vite prints, at `/nawras-this-or-that/`. Production and verification:

```powershell
npm test
npm run build
npm run preview
npx playwright install chromium
npm run test:browser
```

On Windows PowerShell with script execution disabled, use `npm.cmd` and `npx.cmd` in place of `npm` and `npx`.

## Stage boundary

`src/data/questions.json` is `[]`. Start is visibly disabled. No demo scores or questions ship. `src/core/round.js` implements the future round state and timing independently from presentation. `src/screens/game.js` and `src/screens/results.js` provide the next-stage adapters. Playable integration is deliberately gated in `src/main.js` until the next stage.

The selected set must contain exactly ten questions with unique IDs. Each question requires `reviewed: true`, `id`, `prompt`, `language` (`ar` or `en`), two `answers` with distinct `id` and `text`, `correctAnswerId`, and a short `explanation`. Everyone uses the same selected set; the engine shuffles question order and answer positions per round. Arabic containers use RTL; wrap English technical terms and units in `bdi dir="ltr"` when constructing mixed text safely.

The adapter must call `showQuestion()` after a question becomes visible, then `answer(answerId)` on selection and `next()` after feedback. Call `hideQuestion()` when hiding the question or tab, and `showQuestion()` when it becomes visible again. Time is accumulated only from visible unanswered questions; explanations and transitions are excluded. Wrong answers continue with zero points, correct answers add ten. `saveCompleted(store.saveCompletedResult)` saves only after the tenth feedback is advanced, guards duplicate calls, and allows retry after storage failure. Play Again reuses the player object; Next Player creates a new identity after name entry.

## Leaderboard

Only this game's `nawras-this-or-that:leaderboard:v1` key is read or cleared. Records store `playerId`, `resultId`, trimmed `name`, `score`, and integer `answerTimeMs`. `createPlayer(name)` creates a UUID independent of the display name. Call `createLeaderboardStore(storage).saveCompletedResult(result)` for completed results only. It retains each player's best score, then shortest time, and never merges different players with matching names. Exact score/time ties receive competition ranks. Display and ranking both use milliseconds (`1.234 s`). Invalid data is ignored or reported safely. Browser storage failures return an error for the future results UI to show.

`renderLeaderboard` accepts `currentPlayerId` for highlighting and scrolling to the current player's best result. Modal dialog provides browser-native focus containment and Escape, starts focus on Cancel, and freezes scrolling and particles. F toggles fullscreen outside typing controls; Escape retains native behavior.

## Assets and references

All original files are preserved. Landing uses `public/assets/branding/nawras-name.png`; favicon uses `nawras-small.png`; ambient particles use `pixel-particles.png`. URLs include Vite's Pages base. The supplied `design-reference/Screenshot 2026-10-11 022436.png` is a Slasher reference. No Wordle or Memory reference images or custom font files were supplied. Typography uses local system fonts; those missing references prevent claiming an exact three-game match.

## GitHub connection

Initial inspection: Git installed, no existing repository or remote; GitHub CLI unavailable, so authentication and a personal account could not be verified. No remote connection or publication has been made. Install GitHub CLI on Windows with `winget install --id GitHub.cli --exact`, reopen the terminal, then run these commands from this folder:

```powershell
gh auth login --hostname github.com --web --git-protocol https
gh auth status
gh api user --jq .login
```

Use the returned personal account in place of `YOUR_ACCOUNT` below. Inspect the target name before creating or connecting:

```powershell
gh repo view YOUR_ACCOUNT/nawras-this-or-that --json nameWithOwner,url,description,isEmpty,defaultBranchRef
```

If it exists, inspect its files/history and ask before connecting unrelated content. Stop on authentication/network failures. If GitHub confirms the repository does not exist, create it and push the local verified commit:

```powershell
gh repo create YOUR_ACCOUNT/nawras-this-or-that --public --source . --remote origin
git push -u origin main
git remote -v
gh repo view --json url
```

Never force push or overwrite remote history. If local Git initialization or commit was not possible, run `git init -b main`, `git add .`, and `git commit -m "Set up Nawras first-stage screens"` first. Commit `package-lock.json`; ignored files include build output, dependencies, environment files and credentials.

## Verified first setup

Node 24.13.1; `npm ci`, eight unit tests, production build and three Chromium browser tests passed. The dev server returned HTTP 200. Browser checks cover trimmed name entry, disabled Start, navigation and empty state, safe text rendering, refresh persistence, tied rank-five highlighting, sticky headings, confirmation focus/Tab/Escape/Cancel/Clear, unchanged panel bounds and scroll position, clearing only this game's key, Pages base assets, mobile width, reduced motion and the fullscreen typing guard. Desktop, mobile and popup screenshots were visually reviewed. Synthetic browser records exist only in isolated test contexts and are not shipped as saved scores. Remote CI and Pages deployment have not run because GitHub is not connected.

## GitHub Pages

Base is `/nawras-this-or-that/`, matching the requested repository name. Screens swap in the same document, so no server routing is needed. CI runs `npm ci`, unit tests, production build, and browser checks on pushes and pull requests.

In the repository, enable **Settings → Pages → Source → GitHub Actions**. When you intentionally want a preview published, open **Actions → Deploy GitHub Pages (manual) → Run workflow → main**. This workflow uses official `configure-pages@v5`, `upload-pages-artifact@v4` and `deploy-pages@v4`, with Pages and OIDC permissions. See [GitHub's official workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Deployment is only `workflow_dispatch`; connecting/pushing does not publish the unfinished game. Add automatic main deployment after game completion.
