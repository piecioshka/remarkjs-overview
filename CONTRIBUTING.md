# Contributing 🤝

## Setup 🛠️

```bash
nvm use
npm install
npx playwright install chromium
```

## Scripts 📜

| Command                | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `npm start`            | serves the repo, demo at `/demo/` (port 4400) |
| `npm test`             | Playwright tests against the demo             |
| `npm run lint`         | ESLint                                        |
| `npm run format`       | Prettier, writes changes                      |
| `npm run format:check` | Prettier, check only (also in CI)             |

## Layout 🗂️

| Path                        | What it is                                                       |
| --------------------------- | ---------------------------------------------------------------- |
| `remark-overview.js`        | the plugin, the only file users need                             |
| `demo/`                     | demo deck used by the tests and published on GitHub Pages        |
| `demo/vendor/remark.min.js` | remark.js 0.14.1, vendored so the demo works without a CDN       |
| `tests/`                    | Playwright tests                                                 |
| `scripts/serve.mjs`         | tiny static server for `npm start` and the Playwright web server |
| `assets/screenshot.png`     | README image, captured from the demo                             |

## How it works 🔧

- remark renders every slide as `.remark-slide-container` inside `.remark-slides-area` and shows only one at a time. The overview adds the `remark-overview-mode` class to `<html>`, turns the slides area into a CSS grid and shows every container.
- remark keeps the slide scale and position in the `style` attribute of `.remark-slide-scaler`, so the overview overrides `transform`, `top` and `left` with `!important`.
- The grid size goes to CSS custom properties in a constructable stylesheet (`document.adoptedStyleSheets`), never to `style` attributes. `bestGrid()` tries every column count and keeps the one with the widest thumbnail that still fits.
- Keyboard, wheel and touch listeners run in the capture phase on `document`. That's before remark's listeners on `window`, so while the overview is open remark doesn't move the slideshow behind it.
- The help row is inserted into the first table of `.remark-help-content`, right before "Toggle this help".

## Releasing 🏷️

1. Bump the version in `package.json`, in the header of `remark-overview.js` and in the URLs in `README.md`.
2. Commit, then tag: `git tag v<version> && git push --follow-tags`.
3. `gh release create v<version> --generate-notes`.

jsDelivr serves the file from the tag, so the URLs in the README work as soon as the tag is pushed.

> [!IMPORTANT]
> The package is `private` and is not published to npm. Users install it by copying the file or from jsDelivr.
