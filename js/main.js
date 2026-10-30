/* ==========================================================================
   main.js – home page
   Everything on index.html is rendered from data/site.json and
   data/projects.json. To change content, edit the JSON, not this file.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [site, projects] = await Promise.all([loadSite(), loadProjects()]);
    renderHero(site);
    renderProjects(projects.filter((p) => p.featured));
    renderOther(projects.filter((p) => !p.featured));
    renderExperience(site.experience || []);
    renderSkills(site.skills || []);
    renderAbout(site);
    renderContact(site);
  } catch (err) {
    console.error(err);
    document.getElementById("project-grid").append(
      h("p", { class: "section-sub" }, "Content could not be loaded. If you opened this file directly, start a local server (see README)."));
  }
  initReveal();
});

/* ---------- Hero ---------- */
function renderHero(site) {
  document.getElementById("hero-name").textContent = site.name;
  document.getElementById("hero-role").textContent = site.role;
  document.getElementById("hero-tagline").textContent = site.tagline;
  if (site.location) document.getElementById("hero-location").textContent = site.location;

  const actions = document.getElementById("hero-actions");
  if (isLink(site.cv)) {
    actions.append(h("a", { class: "btn", href: site.cv, download: "" }, icon("download"), "Download CV"));
  }
  actions.append(h("div", { class: "hero-social" }, socialLinks(site.links)));

  const list = document.getElementById("now-list");
  (site.now || []).forEach((item) => { const t = txt(item); if (t) list.append(h("li", {}, h("span", {}, t))); });
}

/* ---------- Featured projects + filters ---------- */
function renderProjects(projects) {
  const grid = document.getElementById("project-grid");
  const cards = projects.map((p, i) => projectCard(p, i));
  grid.append(...cards);

  // filter buttons: "All" + every category used by the featured projects
  const cats = [...new Set(projects.flatMap((p) => p.categories || []))];
  const filters = document.getElementById("filters");
  ["All", ...cats].forEach((cat) => {
    filters.append(h("button", {
      class: "filter", type: "button", "aria-pressed": cat === "All" ? "true" : "false",
      onclick: (e) => {
        filters.querySelectorAll(".filter").forEach((b) => b.setAttribute("aria-pressed", "false"));
        e.currentTarget.setAttribute("aria-pressed", "true");
        applyFilter(grid, cat);
      },
    }, cat));
  });
}

/* FLIP animation: remember positions, change layout, animate from old to new */
function applyFilter(grid, cat) {
  const cards = [...grid.children];
  const before = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
  cards.forEach((c) => {
    const show = cat === "All" || (c.dataset.categories || "").split("|").includes(cat);
    c.classList.toggle("is-hidden", !show);
  });
  if (REDUCED_MOTION) return;
  cards.filter((c) => !c.classList.contains("is-hidden")).forEach((c) => {
    const old = before.get(c);
    const now = c.getBoundingClientRect();
    if (!old || old.width === 0) {
      c.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], { duration: 350, easing: "cubic-bezier(.2,.7,.2,1)" });
      return;
    }
    const dx = old.left - now.left, dy = old.top - now.top;
    const sx = old.width / now.width, sy = old.height / now.height;
    c.animate([
      { transformOrigin: "top left", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transformOrigin: "top left", transform: "none" },
    ], { duration: 450, easing: "cubic-bezier(.2,.7,.2,1)" });
  });
}

function statusBadge(p) {
  if (p.status === "coming-soon") return h("span", { class: "badge soon" }, `Coming ${p.statusNote || "soon"}`);
  if (p.status === "in-development") return h("span", { class: "badge" }, "In development");
  return null;
}

function projectCard(p, i) {
  const media = h("div", { class: "card-media" },
    img(p.media && p.media.cover, { title: p.title, eager: i === 0 }));

  // optional hover video – only loaded on first hover
  let video = null;
  if (p.media && isLink(p.media.loop) && !REDUCED_MOTION) {
    video = h("video", { muted: true, loop: true, playsinline: true, preload: "none", "aria-hidden": "true" });
    video.dataset.src = p.media.loop;
    media.append(video);
  }

  const card = h("article", {
    class: `card reveal${p.status === "coming-soon" ? " is-soon" : ""}`,
    "data-categories": (p.categories || []).join("|"),
  },
    media,
    h("div", { class: "card-body" },
      h("h3", { class: "card-title" }, txt(p.title), statusBadge(p)),
      h("p", { class: "card-tagline" }, txt(p.tagline)),
      h("div", { class: "card-foot" },
        h("div", { class: "chips" }, (p.tech || []).filter(hasContent).map((t) => h("span", { class: "chip" }, txt(t)))),
        h("span", { class: "card-arrow" }, icon("arrow")))),
    h("a", { class: "card-link", href: `project.html?id=${encodeURIComponent(p.id)}`, "aria-label": `${p.title} – view project` }));

  // cursor glow: update CSS variables with the mouse position
  if (!REDUCED_MOTION) {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }
  if (video) {
    card.addEventListener("pointerenter", () => {
      if (!video.src) video.src = video.dataset.src;
      video.play().then(() => card.classList.add("playing")).catch(() => {});
    });
    card.addEventListener("pointerleave", () => { video.pause(); card.classList.remove("playing"); });
  }
  return card;
}

/* ---------- Other work ---------- */
function renderOther(projects) {
  const section = document.getElementById("other");
  if (!projects.length) { section.hidden = true; return; }
  const grid = document.getElementById("other-grid");
  projects.forEach((p) => {
    const images = [p.media && p.media.cover, ...((p.media && p.media.gallery) || [])].filter((m) => m && m.src);
    grid.append(h("article", { class: "mini-card reveal" },
      h("button", {
        class: "mini-media", type: "button", "aria-label": `Show screenshots of ${p.title}`,
        onclick: () => Lightbox.open(images, 0),
      }, img(p.media && p.media.cover, { title: p.title })),
      h("div", { class: "mini-body" },
        h("h3", {}, txt(p.title)),
        h("p", {}, txt(p.tagline)),
        h("div", { class: "mini-actions" },
          h("div", { class: "chips" }, (p.tech || []).filter(hasContent).map((t) => h("span", { class: "chip" }, txt(t)))),
          p.links && isLink(p.links.play)
            ? h("a", { class: "text-link", href: p.links.play, target: "_blank", rel: "noopener" }, "Play", icon("external"))
            : null))));
  });
}

/* ---------- Experience ---------- */
function renderExperience(items) {
  const tl = document.getElementById("timeline");
  items.forEach((x) => {
    tl.append(h("div", { class: "tl-item reveal" },
      h("div", { class: "tl-period mono" }, txt(x.period)),
      h("div", {},
        h("h3", {}, txt(x.title)),
        h("div", { class: "tl-org" }, txt(x.org)),
        hasContent(x.text) ? h("p", { class: "tl-text" }, txt(x.text)) : null)));
  });
}

/* ---------- Skills ---------- */
function renderSkills(groups) {
  const grid = document.getElementById("skills-grid");
  groups.forEach((g) => {
    grid.append(h("div", { class: "skill-group reveal" },
      h("h3", {}, g.group, h("span", { class: "mono" }, String(g.items.length).padStart(2, "0"))),
      h("div", { class: "chips" }, g.items.map((s) => h("span", { class: "chip" }, s)))));
  });
}

/* ---------- About ---------- */
function renderAbout(site) {
  const text = document.getElementById("about-text");
  (site.about || []).forEach((p) => { const t = txt(p); if (t) text.append(h("p", {}, t)); });

  const meta = document.getElementById("about-meta");
  const row = (label, value) => h("div", { class: "meta-row" }, h("span", { class: "mono" }, label), h("span", {}, value));
  if (site.location) meta.append(row("Based in", site.location));
  if (site.languages && site.languages.length) meta.append(row("Languages", site.languages.join(" · ")));
  meta.append(row("Background", "IT systems integration → game development"));
}

/* ---------- Contact + footer links ---------- */
function renderContact(site) {
  const box = document.getElementById("contact-actions");
  const mail = emailButton(site.email);
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
      else if (link) link.classList.remove("active"); // e.g. back in the hero: nothing highlighted
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((a) => { const s = document.querySelector(a.getAttribute("href")); if (s) io.observe(s); });
});
