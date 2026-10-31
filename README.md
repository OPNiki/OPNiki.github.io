# Niklas Lang – Portfolio

Static portfolio site: plain HTML, CSS and JavaScript. No framework, no build step.
All content lives in two JSON files – you normally never need to touch HTML.

## Folder structure

```
index.html        Home page (hero, projects, other work, experience, skills, about, contact)
project.html      One template for all project pages → project.html?id=<project-id>
privacy.html      Privacy information
css/style.css     All styles. Colours and sizes are CSS variables at the top (:root)
js/shared.js      Helpers used everywhere: SHOW_TODOS switch, data loading, theme, lightbox
js/main.js        Renders the home page
js/project.js     Renders a project page
data/site.json    Name, tagline, links, email, about text, experience, skills
data/projects.json  All projects
assets/<id>/      Images per project (WebP, max. 1920 px wide)
assets/fonts/     Self-hosted fonts (Inter, Space Grotesk, JetBrains Mono – SIL OFL)
```

## Run locally

The pages load JSON with `fetch()`, which browsers block for files opened directly (`file://`).
Start a tiny local server in this folder:

```
python -m http.server 8000
```

Then open http://localhost:8000

## TODO placeholders

Every text that starts with `TODO` is shown with a yellow **TODO** pill so you can spot missing content.
Before going live, open `js/shared.js` and set:

```js
const SHOW_TODOS = false;
```

Then every TODO text, TODO link and section without real content disappears automatically.

## Add a project

1. Create `assets/<project-id>/` and put WebP images in it.
2. Add an entry to `data/projects.json` (copy an existing one). Important fields:
   - `id` – used in the URL, lowercase with dashes
   - `featured` – `true` = big card + own page, `false` = small card under "Other work"
   - `order` – sort order
   - `status` – `released`, `in-development` or `coming-soon` (+ `statusNote`)
   - `categories` – drive the filter buttons
   - `media.cover` / `media.gallery` – image objects: `{ "src", "alt", "pixel" }`
     (`pixel: true` keeps pixel art crisp; optional `position` like `"center 30%"` for the card crop)
   - `media.loop` – optional short MP4/WebM that plays when hovering the card
   - `media.video.youtubeId` – optional, shown on the project page (loads only after a click)
   - `breakdown` – optional steps with text and images
   - `stats` – optional, `modrinthSlug` fetches live download numbers
   - `flow` – optional numbered process: `{ "title", "steps": [{ "title", "text" }] }`
   - `devlog` – optional development steps: `[{ "when", "title", "text" }]`
   - `snippets` – optional code: `[{ "title", "file", "lang", "url", "note", "code" }]`
   - `links.extra` – optional extra buttons: `[{ "label", "url", "icon" }]` (icon: code, external, video, download, play)
   - `facts.result` – optional, e.g. a grade
3. Empty strings or missing fields are simply not rendered.

## Change colours

At the top of `css/style.css`: `--accent` for dark mode and again under `:root[data-theme="light"]`.

## Email

The address is stored in two halves in `data/site.json` (`email.user` and `email.domain`) and only
assembled when someone clicks the button – simple spam bots never see the full address.

## Deploy on GitHub Pages (free)

1. Create a public repository called **`OPNiki.github.io`** on GitHub.
2. Upload the contents of this folder (so `index.html` is in the repository root).
3. Repository → Settings → Pages → Source: "Deploy from a branch", Branch: `main`, folder `/ (root)`.
4. After a minute the site is live at **https://opniki.github.io**

Updating = changing files and committing; GitHub Pages redeploys automatically.
A custom domain can be added later under Settings → Pages → Custom domain.
