/* ==========================================================================
   main.js – home page
   Everything on index.html is rendered from data/site.json and
   data/projects.json. To change content, edit the JSON, not this file.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [site, projects] = await Promise.all([loadSite(), loadProjects()]);
    const featured = projects.filter((p) => p.featured);
    renderHero(site, featured);
    renderParts(featured);
    renderOther(projects.filter((p) => !p.featured));
    renderExperience(site.experience || []);
    renderSkills(site.skills || []);
    renderAbout(site);
    renderContact(site);
  } catch (err) {
    console.error(err);
    document.getElementById("parts").append(
      h("p", { class: "section-sub" }, "Content could not be loaded. If you opened this file directly, start a local server (see README)."));
  }
  initReveal();
});

/* ---------- Hero: intro, title block, project index with preview ---------- */
function renderHero(site, featured) {
  document.getElementById("hero-tagline").textContent = site.intro || site.tagline;

  const block = document.getElementById("hero-block");
  const cell = (k, v, wide) => h("div", { class: wide ? "wide" : null }, h("dt", {}, k), h("dd", {}, v));
  block.append(
    cell("Name", site.name), cell("Based in", site.location || ""),
    cell("Role", site.role, true),
    cell("Right now", h("ul", { class: "now-list" }, (site.now || []).map((n) => h("li", {}, txt(n)))), true));

  const actions = document.getElementById("hero-actions");
  if (isLink(site.cv)) actions.append(h("a", { class: "btn", href: site.cv, download: "" }, icon("download"), "CV"));
  actions.append(h("div", { class: "hero-social" }, socialLinks(site.links)));

  // index rows; the active row gets the caret and drives the preview figure
  const preview = document.getElementById("hero-preview");
  const previewImg = h("img", { alt: "", decoding: "async" });
  const caption = h("figcaption", { class: "fig-caption" });
  preview.append(h("div", { class: "preview-stage" }, previewImg), caption);
  // non-16:9 covers (square board, portrait phone game) are shown whole
  previewImg.addEventListener("load", () =>
    preview.classList.toggle("fit", Math.abs(previewImg.naturalWidth / previewImg.naturalHeight - 16 / 9) > 0.15));

  const rows = featured.map((p, i) => {
    const a = h("a", { href: `project.html?id=${encodeURIComponent(p.id)}` },
      h("span", { class: "idx-caret", "aria-hidden": "true" }, ">"),
      h("span", { class: "idx-title" }, txt(p.title)),
      h("span", { class: "idx-meta" }, p.status === "coming-soon" ? "In progress" : (p.tech || []).slice(0, 2).join(" · ")));
    const show = () => {
      rows.forEach((r) => r.classList.toggle("is-active", r === li));
      const c = p.media && p.media.cover;
      if (!c || !c.src) return;
      previewImg.src = c.src;
      previewImg.className = c.pixel ? "pixel" : "";
      caption.replaceChildren(h("span", {}, `Fig. ${i + 1} · ${p.title}`), h("span", {}, (p.tech || []).join(" · ")));
    };
    a.addEventListener("pointerenter", show);
    a.addEventListener("focus", show);
    const li = h("li", {}, a);
    li.show = show;
    return li;
  });
  document.getElementById("hero-index").append(...rows);
  if (rows[0]) rows[0].show();
}

/* ---------- Parts list: one row per featured project ---------- */
function renderParts(projects) {
  const list = document.getElementById("parts");
  list.append(...projects.map((p, i) => partRow(p, i)));

  const cats = [...new Set(projects.flatMap((p) => p.categories || []))];
  const filters = document.getElementById("filters");
  ["All", ...cats].forEach((cat) => {
    filters.append(h("button", {
      class: "filter", type: "button", "aria-pressed": cat === "All" ? "true" : "false",
      onclick: (e) => {
        filters.querySelectorAll(".filter").forEach((b) => b.setAttribute("aria-pressed", "false"));
        e.currentTarget.setAttribute("aria-pressed", "true");
        list.querySelectorAll(".part").forEach((row) =>
          row.classList.toggle("is-hidden", cat !== "All" && !(row.dataset.categories || "").split("|").includes(cat)));
      },
    }, cat));
  });
}

function partRow(p, i) {
  const f = p.facts || {};
  const href = `project.html?id=${encodeURIComponent(p.id)}`;
  const media = h("div", { class: "part-media" }, img(p.media && p.media.cover, { title: p.title, eager: i === 0 }));
  // covers that are not 16:9 (square board, portrait phone game) are shown whole instead of cropped
  const cover = media.querySelector("img");
  if (cover) {
    const fit = () => cover.naturalWidth && media.classList.toggle("fit", Math.abs(cover.naturalWidth / cover.naturalHeight - 16 / 9) > 0.15);
    cover.complete ? fit() : cover.addEventListener("load", fit, { once: true });
  }

  // optional hover video – only loaded on first hover
  let video = null;
  if (p.media && isLink(p.media.loop) && !REDUCED_MOTION) {
    video = h("video", { muted: true, loop: true, playsinline: true, preload: "none", "aria-hidden": "true" });
    video.dataset.src = p.media.loop;
    media.append(video);
  }

  const cell = (k, v) => hasContent(v) ? h("div", {}, h("dt", {}, k), h("dd", {}, txt(v))) : null;
  const specs = [cell("Role", f.role && shortRole(f.role)), cell("Team", f.team && shortTeam(f.team)),
    cell("Engine", f.engine), cell("Duration", f.duration)].filter(Boolean);
  if (specs.length % 2) specs[specs.length - 1].classList.add("wide");

  const row = h("article", { class: "part reveal", "data-categories": (p.categories || []).join("|") },
    media,
    h("div", { class: "part-body" },
      h("h3", { class: "part-title" }, h("a", { href }, txt(p.title))),
      statusTag(p) ? h("div", {}, statusTag(p)) : null,
      h("p", { class: "part-tagline" }, txt(p.tagline)),
      partnerLogo(p.partners),
      specs.length ? h("dl", { class: "tblock" }, specs) : null,
      h("p", { class: "tech" }, (p.tech || []).filter(hasContent).join(" · ")),
      h("span", { class: "part-open" }, "Open project", icon("arrow"))));

  if (video) {
    row.addEventListener("pointerenter", () => {
      if (!video.src) video.src = video.dataset.src;
      video.play().then(() => row.classList.add("playing")).catch(() => {});
    });
    row.addEventListener("pointerleave", () => { video.pause(); row.classList.remove("playing"); });
  }
  return row;
}

/* The full role/team texts live on the project page; the list shows the first clause */
const shortRole = (s) => s.split(/[.;]/)[0];
const shortTeam = (s) => s.split(":")[0];

/* ---------- Other work ---------- */
function renderOther(projects) {
  const section = document.getElementById("other");
  if (!projects.length) { section.hidden = true; return; }
  const list = document.getElementById("other-list");
  projects.forEach((p) => {
    const images = [p.media && p.media.cover, ...((p.media && p.media.gallery) || [])].filter((m) => m && m.src);
    list.append(h("article", { class: "other-row reveal" },
      h("button", { type: "button", "aria-label": `Show screenshots of ${p.title}`, onclick: () => Lightbox.open(images, 0) },
        img(p.media && p.media.cover, { title: p.title })),
      h("div", {},
        h("h3", {}, txt(p.title)),
        h("p", {}, txt(p.tagline)),
        h("p", { class: "tech" }, (p.tech || []).filter(hasContent).join(" · "))),
      p.links && isLink(p.links.play)
        ? h("a", { class: "btn", href: p.links.play, target: "_blank", rel: "noopener" }, "Play", icon("external"))
        : null));
  });
}

/* ---------- Experience ---------- */
function renderExperience(items) {
  const body = document.getElementById("timeline");
  items.forEach((x) => body.append(h("tr", {},
    h("td", { class: "period" }, txt(x.period)),
    h("td", {}, h("strong", {}, txt(x.title)), h("span", { class: "org" }, txt(x.org))),
    h("td", {}, hasContent(x.text) ? h("span", { class: "note" }, txt(x.text)) : null))));
}

/* ---------- Skills ---------- */
function renderSkills(groups) {
  const body = document.getElementById("skills-body");
  groups.forEach((g) => body.append(h("tr", {},
    h("td", { class: "group" }, g.group),
    h("td", {}, g.items.join(" · ")))));
}

/* ---------- About ---------- */
function renderAbout(site) {
  const text = document.getElementById("about-text");
  (site.about || []).forEach((p) => { const t = txt(p); if (t) text.append(h("p", {}, t)); });

  const meta = document.getElementById("about-meta");
  const cell = (k, v) => h("div", { class: "wide" }, h("dt", {}, k), h("dd", {}, v));
  if (site.location) meta.append(cell("Based in", site.location));
  if (site.languages && site.languages.length) meta.append(cell("Languages", site.languages.join(" · ")));
  meta.append(cell("Background", "IT systems integration → game development"));
}

/* ---------- Contact + footer links ---------- */
function renderContact(site) {
  const box = document.getElementById("contact-actions");
  const mail = emailButton(site.email, "Write me an email");
  if (mail) box.append(mail);
  if (isLink(site.links.linkedin)) box.append(h("a", { class: "btn", href: site.links.linkedin, target: "_blank", rel: "noopener" }, icon("linkedin"), "LinkedIn"));
  if (isLink(site.links.github)) box.append(h("a", { class: "btn", href: site.links.github, target: "_blank", rel: "noopener" }, icon("github"), "GitHub"));
  if (isLink(site.links.itch)) box.append(h("a", { class: "btn", href: site.links.itch, target: "_blank", rel: "noopener" }, icon("itch"), "itch.io"));

  const footer = document.getElementById("footer-links");
  [["itch", "itch.io"], ["github", "GitHub"], ["linkedin", "LinkedIn"]].forEach(([k, label]) => {
    if (isLink(site.links[k])) footer.prepend(h("a", { href: site.links[k], target: "_blank", rel: "noopener" }, label));
  });
}

/* ---------- Highlight the nav item of the section in view ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const links = [...document.querySelectorAll(".nav a")];
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const link = links.find((a) => a.getAttribute("href") === `#${e.target.id}`);
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a === link));
      else if (link) link.classList.remove("active");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((a) => { const s = document.querySelector(a.getAttribute("href")); if (s) io.observe(s); });
});
