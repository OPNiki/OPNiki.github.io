/* ==========================================================================
   project.js – detail page (project.html?id=<project-id>)
   One template for every project. Sections without content are skipped.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("project-root");
  const id = new URLSearchParams(location.search).get("id");
  try {
    const projects = await loadProjects();
    const featured = projects.filter((p) => p.featured);
    const p = projects.find((x) => x.id === id);
    if (!p) return renderNotFound(root);
    document.title = `${p.title} | Niklas Lang`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && !isTodo(p.tagline)) desc.setAttribute("content", p.tagline);
    await renderProject(root, p, featured);
  } catch (err) {
    console.error(err);
    root.append(h("div", { class: "not-found" }, h("h1", {}, "Could not load project"),
      h("p", { class: "section-sub" }, "If you opened this file directly, start a local server (see README).")));
  }
  initReveal();
});

function renderNotFound(root) {
  document.title = "Project not found | Niklas Lang";
  root.append(h("div", { class: "not-found" },
    h("span", { class: "mono", style: "color:var(--accent)" }, "404"),
    h("h1", { style: "font-size:var(--fs-2xl)" }, "Project not found"),
    h("p", { class: "section-sub" }, "This project doesn't exist (anymore)."),
    h("a", { class: "btn btn-primary", href: "index.html#projects" }, "Back to all projects")));
}

async function renderProject(root, p, featured) {
  const media = p.media || {};

  /* --- Title area --- */
  root.append(h("header", { class: "project-hero" },
    h("a", { class: "back-link", href: "index.html#projects" }, icon("arrow"), "All projects"),
    h("div", { class: "project-title-row reveal" }, h("h1", {}, txt(p.title)), projectBadge(p)),
    h("p", { class: "project-tagline reveal" }, txt(p.tagline)),
    h("div", { class: "chips project-chips reveal" }, (p.tech || []).filter(hasContent).map((t) => h("span", { class: "chip" }, txt(t))))));

  /* --- Hero media: YouTube (click to load) > loop video > cover > placeholder --- */
  root.append(h("div", { class: "reveal" }, await heroMedia(p, media)));

  /* --- Main column + sticky aside --- */
  const main = h("div", { class: "project-main" });
  const aside = h("aside", { class: "project-aside" });
  root.append(h("div", { class: "project-layout" }, main, aside));

  // aside: facts, stats, links
  aside.append(...[factsBox(p.facts), statsBox(p.stats), linksBox(p)].filter(Boolean));

  if (p.status === "coming-soon") {
    main.append(h("div", { class: "wip-note reveal" }, h("span", { class: "badge soon" }, "WIP"),
      "This is a work in progress. More details and media will follow as the project develops."));
  }

  main.append(...[
    block("Overview", "01", hasContent(p.overview) ? h("p", { class: "prose" }, txt(p.overview)) : null),
    block("What I built", "02", builtList(p.built)),
    flowBlock(p.flow),
    block("Challenge & solution", "03", hasContent(p.challenge) ? h("p", { class: "prose callout" }, txt(p.challenge)) : null),
    snippetsBlock(p.snippets),
    devlogBlock(p.devlog),
    breakdownBlock(p.breakdown),
    await galleryBlock(media.gallery, p.title),
    block("What I'd do differently", "", hasContent(p.differently) ? h("p", { class: "prose" }, txt(p.differently)) : null),
  ].filter(Boolean));

  // number the visible sections 01, 02, … (skipped sections leave no gaps)
  let n = 0;
  main.querySelectorAll(".block > h2 .mono").forEach((el) => { el.textContent = String(++n).padStart(2, "0"); });

  /* --- Next project (wraps around) --- */
  const i = featured.findIndex((x) => x.id === p.id);
  const next = featured[(i + 1) % featured.length];
  if (next && next.id !== p.id) {
    root.append(h("a", { class: "next-project reveal", href: `project.html?id=${encodeURIComponent(next.id)}` },
      h("div", {}, h("span", { class: "mono" }, "Next project"), h("strong", {}, txt(next.title))),
      h("span", { class: "card-arrow" }, icon("arrow"))));
  }
  root.append(h("div", { style: "height:var(--space-9)" }));
}

function projectBadge(p) {
  if (p.status === "coming-soon") return h("span", { class: "badge soon" }, p.statusNote || "Coming soon");
  if (p.status === "in-development") return h("span", { class: "badge" }, p.statusNote || "In development");
  return null;
}

/* A section with heading; returns null when it has no content */
function block(title, num, content) {
  if (!content) return null;
  return h("section", { class: "block reveal" }, h("h2", {}, h("span", { class: "mono" }, num), title), content);
}

function builtList(items) {
  const list = (items || []).filter(hasContent);
  if (!list.length) return null;
  return h("ul", { class: "built-list" }, list.map((b) => h("li", {}, h("span", {}, txt(b)))));
}

/* ---------- Hero media ---------- */
async function heroMedia(p, media) {
  const cover = media.cover && media.cover.src ? media.cover : null;
  const ytId = media.video && media.video.youtubeId;

  if (isLink(ytId)) {
    // GDPR: nothing is loaded from YouTube until the visitor clicks
    const frame = h("div", { class: "media-frame" });
    const posterMedia = isLink(media.loop) && !REDUCED_MOTION
      ? h("video", { src: media.loop, autoplay: true, muted: true, loop: true, playsinline: true, poster: cover ? cover.src : null, "aria-hidden": "true" })
      : img(cover, { title: p.title, eager: true });
    const poster = h("button", { class: "yt-poster", type: "button", "aria-label": `Play video: ${p.title}` },
      posterMedia,
      h("span", { class: "yt-play" }, icon("play"), "Play video"),
      h("span", { class: "yt-note" }, "Loads YouTube (youtube-nocookie.com)"));
    poster.addEventListener("click", () => {
      frame.replaceChildren(h("iframe", {
        src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?autoplay=1&rel=0`,
        title: `${p.title} video`, allow: "autoplay; encrypted-media; picture-in-picture; fullscreen", allowfullscreen: true,
      }));
    });
    frame.append(poster);
    return frame;
  }

  if (isLink(media.loop) && !REDUCED_MOTION) {
    return h("div", { class: "media-frame" }, h("video", {
      src: media.loop, autoplay: true, muted: true, loop: true, playsinline: true,
      poster: cover ? cover.src : null, "aria-label": `${p.title} gameplay`,
    }));
  }

  if (!cover) return h("div", { class: "media-frame" }, placeholder(p.title, p.status === "coming-soon" ? `Coming ${p.statusNote || "soon"}` : "Screenshots coming soon"));

  // portrait screenshots (mobile games) get a blurred backdrop instead of being cropped
  const frame = h("div", { class: "media-frame" });
  if (await isPortrait(cover.src)) {
    frame.classList.add("portrait");
    frame.append(h("img", { class: "blur-bg", src: cover.src, alt: "", "aria-hidden": "true" }));
    const main = img(cover, { title: p.title, eager: true });
    main.style.objectPosition = "center";
    frame.append(main);
  } else {
    frame.append(img(cover, { title: p.title, eager: true }));
  }
  frame.style.cursor = "zoom-in";
  frame.addEventListener("click", () => Lightbox.open([cover], 0));
  return frame;
}

/* ---------- Aside boxes ---------- */
function factsBox(facts) {
  if (!facts) return null;
  const labels = [["role", "Role"], ["team", "Team"], ["duration", "Duration"], ["engine", "Engine"], ["tools", "Tools"], ["year", "Year"], ["context", "Context"], ["result", "Result"]];
  const rows = labels.filter(([k]) => hasContent(facts[k]))
    .map(([k, label]) => h("div", { class: "fact" }, h("dt", {}, label), h("dd", {}, txt(facts[k]))));
  if (!rows.length) return null;
  return h("div", { class: "facts reveal" }, h("h2", {}, "Quick facts"), h("dl", {}, rows));
}

function statsBox(stats) {
  if (!stats || !stats.length) return null;
  const wrap = h("div", { class: "stats reveal" });
  stats.forEach((s) => {
    const num = h("div", { class: "stat-num" }, isTodo(s.fallback) ? "…" : s.fallback);
    const live = h("div", { class: "stat-live offline" }, "saved value");
    wrap.append(h("div", { class: "stat" }, num, h("div", { class: "stat-label" }, s.label), live));

    const fallback = parseInt(String(s.fallback).replace(/\D/g, ""), 10);
    if (isLink(s.modrinthSlug)) {
      // live number from the public Modrinth API, fallback on any error
      fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(s.modrinthSlug)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d) => { countUp(num, d.downloads); live.textContent = "live from Modrinth"; live.classList.remove("offline"); })
        .catch(() => { if (!isNaN(fallback)) countUp(num, fallback); });
    } else if (!isNaN(fallback)) countUp(num, fallback);
  });
  return h("div", { style: "display:grid;gap:var(--space-3)" }, h("h2", { class: "aside-title" }, "Downloads"), wrap);
}

function linksBox(p) {
  const l = p.links || {};
  const isMods = p.id === "fabric-mods";
  const btns = [
    isLink(l.play) && h("a", { class: "btn btn-primary", href: l.play, target: "_blank", rel: "noopener" }, h("span", {}, "Play on itch.io"), icon("play")),
    isLink(l.download) && h("a", { class: "btn btn-primary", href: l.download, target: "_blank", rel: "noopener" }, h("span", {}, isMods ? "Challenge Timer on Modrinth" : "Download"), icon("download")),
    isLink(l.download2) && h("a", { class: "btn btn-primary", href: l.download2, target: "_blank", rel: "noopener" }, h("span", {}, isMods ? "All Items on Modrinth" : "Download"), icon("download")),
    isLink(l.code) && h("a", { class: "btn", href: l.code, target: "_blank", rel: "noopener" }, h("span", {}, "Source code"), icon("code")),
    isLink(l.video) && h("a", { class: "btn", href: l.video, target: "_blank", rel: "noopener" }, h("span", {}, "Watch on YouTube"), icon("video")),
    // any number of extra links: [{ label, url, icon }]
    ...(l.extra || []).filter((x) => isLink(x.url)).map((x) =>
      h("a", { class: "btn", href: x.url, target: "_blank", rel: "noopener" }, h("span", {}, x.label), icon(x.icon || "external"))),
  ].filter(Boolean);
  if (!btns.length) return null;
  return h("div", { class: "reveal", style: "display:grid;gap:var(--space-3)" }, h("h2", { class: "aside-title" }, "Links"), h("div", { class: "link-buttons" }, btns));
}

/* ---------- Breakdown & gallery ---------- */
function breakdownBlock(steps) {
  const list = (steps || []).filter((s) => s && (hasContent(s.text) || (s.images && s.images.length)));
  if (!list.length) return null;
  const all = list.flatMap((s) => s.images || []);
  let offset = 0;
  const body = h("div", { class: "breakdown" }, list.map((s, i) => {
    const start = offset; offset += (s.images || []).length;
    return h("div", { class: "breakdown-step" },
      h("h3", {}, h("span", { class: "mono" }, String(i + 1).padStart(2, "0")), s.title),
      hasContent(s.text) ? h("p", { class: "prose" }, txt(s.text)) : null,
      s.images && s.images.length ? thumbGrid(s.images, all, start) : null);
  }));
  return block("Breakdown", "04", body);
}

async function galleryBlock(gallery, title) {
  const items = (gallery || []).filter((m) => m && m.src);
  if (items.length < 2) return null; // a single image is already the hero
  const portraits = await Promise.all(items.map((m) => isPortrait(m.src)));
  const grid = thumbGrid(items, items, 0);
  if (portraits.every(Boolean)) grid.classList.add("portraits");
  return block("Gallery", "05", grid);
}

function thumbGrid(images, all, offset) {
  return h("div", { class: "gallery" }, images.map((m, i) =>
    h("button", { class: "gallery-item", type: "button", "aria-label": `Enlarge: ${m.alt || "image"}`, onclick: () => Lightbox.open(all, offset + i) },
      img(m, {}))));
}

/* ---------- Flow: numbered steps of one process (a real sequence) ---------- */
function flowBlock(flow) {
  if (!flow || !flow.steps || !flow.steps.length) return null;
  const list = h("ol", { class: "flow" }, flow.steps.map((st) =>
    h("li", { class: "flow-step" }, h("strong", {}, st.title), h("span", {}, txt(st.text)))));
  return block(flow.title || "How it works", "", list);
}

/* ---------- Development steps ---------- */
function devlogBlock(items) {
  const list = (items || []).filter((x) => hasContent(x.text));
  if (!list.length) return null;
  return block("How it came together", "", h("div", { class: "devlog" }, list.map((x) =>
    h("div", { class: "devlog-item" },
      h("span", { class: "devlog-when mono" }, x.when || ""),
      h("div", {}, h("h3", {}, x.title), h("p", {}, txt(x.text)))))));
}

/* ---------- Code snippets ---------- */
function snippetsBlock(snippets) {
  const list = (snippets || []).filter((x) => hasContent(x.code));
  if (!list.length) return null;
  return block(list.length > 1 ? "Code" : list[0].title, "", h("div", { style: "display:grid;gap:var(--space-5)" }, list.map((x) =>
    h("figure", { class: "snippet" },
      hasContent(x.note) ? h("p", { class: "prose" }, txt(x.note)) : null,
      h("div", { class: "code-frame" },
        h("div", { class: "code-head" },
          h("span", { class: "mono" }, x.file || x.lang || "code"),
          isLink(x.url) ? h("a", { class: "text-link", href: x.url, target: "_blank", rel: "noopener" }, "View on GitHub", icon("external")) : null),
        h("pre", { tabindex: "0" }, h("code", {}, x.code)))))));
}
