/* ==========================================================================
   shared.js – used by every page
   - SHOW_TODOS switch
   - data loading
   - tiny DOM helper `h()`
   - text / image helpers that understand TODO values and placeholders
   - theme toggle, mobile menu, header shadow, footer year
   - lightbox, scroll reveal, count-up
   ========================================================================== */

/* Set to false before you go live: every "TODO…" text, link and empty
   section then disappears instead of being shown as a yellow TODO pill. */
const SHOW_TODOS = true;

/* true if the visitor asked the OS for less motion */
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Data ---------- */
async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
}
const loadSite = () => loadJSON("data/site.json");
const loadProjects = async () => (await loadJSON("data/projects.json")).projects.slice().sort((a, b) => a.order - b.order);

/* ---------- TODO handling ---------- */
const isTodo = (v) => typeof v === "string" && v.trim().startsWith("TODO");
const isEmpty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
/* "has content" = not empty, and not TODO while TODOs are hidden */
const hasContent = (v) => !isEmpty(v) && (SHOW_TODOS || !isTodo(v));
/* a real URL we may link to */
const isLink = (v) => typeof v === "string" && v !== "" && !isTodo(v);

/* ---------- DOM helper ----------
   h("a", { class: "btn", href: "#" }, "Text", childNode)
   - attributes starting with "on" become event listeners
   - null / false children are skipped, so conditional rendering is easy */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/* Text that may be a TODO. Returns a node or null (= render nothing). */
function txt(value) {
  if (isEmpty(value)) return null;
  if (!isTodo(value)) return document.createTextNode(value);
  if (!SHOW_TODOS) return null;
  const rest = value.replace(/^TODO[_:\s-]*/, "") || "content missing";
  return h("span", { class: "todo" }, h("span", { class: "todo-pill" }, "TODO"), rest);
}

/* ---------- Images & placeholders ----------
   media objects look like { src, alt, pixel, position } – see projects.json */
function placeholder(title, note = "Screenshots coming soon") {
  return h("div", { class: "placeholder", role: "img", "aria-label": `${title} – ${note}` },
    h("div", {}, h("span", {}, title), h("small", {}, note)));
}

function img(media, { title = "", eager = false, className = "" } = {}) {
  if (!media || isEmpty(media.src)) return placeholder(title);
  const el = h("img", {
    src: media.src,
    alt: media.alt || title,
    loading: eager ? "eager" : "lazy",
    decoding: "async",
    class: [media.pixel ? "pixel" : "", className].join(" ").trim() || null,
  });
  if (media.position) el.style.objectPosition = media.position;
  // never show a broken image icon – swap in the placeholder instead
  el.addEventListener("error", () => el.replaceWith(placeholder(title)), { once: true });
  return el;
}

/* Is an image portrait? Resolves once the browser knows its size. */
function isPortrait(src) {
  return new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i.naturalHeight > i.naturalWidth);
    i.onerror = () => resolve(false);
    i.src = src;
  });
}

/* ---------- Icons (inline SVG, inherit currentColor) ---------- */
const ICONS = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.24-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
  itch: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.13 1.34C2.08 1.97.02 4.33 0 4.95v1.03c0 1.3 1.22 2.45 2.33 2.45 1.33 0 2.44-1.1 2.44-2.41 0 1.31 1.07 2.41 2.4 2.41 1.33 0 2.36-1.1 2.36-2.41 0 1.31 1.14 2.41 2.47 2.41h.02c1.33 0 2.47-1.1 2.47-2.41 0 1.31 1.03 2.41 2.36 2.41 1.33 0 2.4-1.1 2.4-2.41 0 1.31 1.11 2.41 2.44 2.41C22.78 8.43 24 7.28 24 5.98V4.95c-.02-.62-2.08-2.98-3.13-3.61C17.6 1.22 15.34 1.2 12 1.2c-3.34 0-7.9.05-8.87.14zm6.33 6.43a2.8 2.8 0 0 1-4.79-.02 2.8 2.8 0 0 1-2.38 1.33c-.37 0-.75-.1-1.07-.21-.11 1.16-.16 2.27-.17 3.06v1.05c0 2.1-.21 6.81.92 7.97 1.76.41 5 .6 8.03.6 3.03 0 6.27-.19 8.03-.6 1.13-1.16.92-5.88.92-7.97v-1.05c-.01-.79-.06-1.9-.17-3.06-.32.11-.7.21-1.07.21a2.8 2.8 0 0 1-2.38-1.33 2.8 2.8 0 0 1-4.79.02A2.81 2.81 0 0 1 12 9.1a2.8 2.8 0 0 1-2.54-1.33zM7.84 11.1c.98 0 1.86 0 2.95 1.19.86-.09 1.76-.13 2.66-.13.9 0 1.8.04 2.66.13 1.1-1.19 1.97-1.19 2.95-1.19.46 0 2.32 0 3.61 3.64l1.39 5c1.03 3.71-.33 3.8-2.02 3.8-2.51-.09-3.9-1.92-3.9-3.75-1.39.23-3.01.34-4.63.34-1.62 0-3.24-.11-4.63-.34 0 1.83-1.39 3.66-3.9 3.75-1.69 0-3.05-.09-2.02-3.8l1.39-5C5.52 11.1 7.38 11.1 7.84 11.1zM12 13.97s-2.85 2.62-3.36 3.55l1.86-.08v1.63c0 .07.75.05 1.5.01.75.04 1.5.06 1.5-.01v-1.63l1.86.08C14.85 16.59 12 13.97 12 13.97z"/></svg>',
  modrinth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 6.5 15.2M7 12a5 5 0 0 1 9.6-2"/></svg>',
};
const icon = (name) => h("span", { "aria-hidden": "true", html: ICONS[name] || "", style: "display:contents" });

/* Social icon buttons for the links in site.json (empty / TODO ones are skipped) */
function socialLinks(links, className = "icon-btn") {
  const map = [["itch", "itch.io"], ["github", "GitHub"], ["linkedin", "LinkedIn"], ["modrinth", "Modrinth"]];
  return map.filter(([k]) => isLink(links[k])).map(([k, label]) =>
    h("a", { class: className, href: links[k], target: "_blank", rel: "noopener", "aria-label": label, title: label }, icon(k)));
}

/* ---------- Email protection ----------
   The address only exists in two halves in site.json and is put together
   when someone clicks – simple scrapers never see a complete address. */
function emailButton(email, label = "Write me an email", className = "btn btn-primary") {
  if (!email || isTodo(email.user) || isTodo(email.domain)) {
    if (!SHOW_TODOS) return null;
    return h("span", { class: "btn", "aria-disabled": "true" }, icon("mail"), txt("TODO email address (site.json → email)"));
  }
  return h("button", {
    class: className, type: "button",
    onclick: () => { window.location.href = "mailto:" + email.user + "@" + email.domain; },
  }, icon("mail"), label);
}

/* ---------- Theme ---------- */
function getStoredTheme() { try { return localStorage.getItem("theme"); } catch { return null; } }
function storeTheme(t) { try { localStorage.setItem("theme", t); } catch { /* storage blocked – ignore */ } }
function applyTheme(t) { document.documentElement.setAttribute("data-theme", t); }
function initTheme() {
  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next); storeTheme(next);
  });
}

/* ---------- Header: mobile menu, border on scroll, footer year ---------- */
function initChrome() {
  initTheme();
  const header = document.querySelector(".site-header");
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  const menuBtn = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); } });
  }
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
}

/* ---------- Scroll reveal ---------- */
function initReveal(root = document) {
  const items = root.querySelectorAll(".reveal:not(.visible)");
  if (REDUCED_MOTION || !("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("visible")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  items.forEach((el) => io.observe(el));
}

/* ---------- Count-up animation for numbers ---------- */
function countUp(el, target, duration = 1200) {
  if (REDUCED_MOTION) { el.textContent = target.toLocaleString("en-US"); return; }
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString("en-US");
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Lightbox ----------
   openLightbox([{src, alt, pixel}, ...], startIndex) */
const Lightbox = (() => {
  let items = [], index = 0, root, imgEl, captionEl, counterEl, lastFocus, touchX = null;

  function build() {
    imgEl = h("img", { alt: "" });
    captionEl = h("p", { class: "lb-caption" });
    counterEl = h("span", { class: "mono" });
    root = h("div", { class: "lightbox", role: "dialog", "aria-modal": "true", "aria-label": "Image viewer" },
      h("div", { class: "lb-top" }, counterEl,
        h("button", { class: "lb-btn lb-close", type: "button", "aria-label": "Close", onclick: close }, icon("close"))),
      h("div", { class: "lb-stage", onclick: (e) => { if (e.target === e.currentTarget) close(); } },
        h("button", { class: "lb-btn lb-prev", type: "button", "aria-label": "Previous image", onclick: () => show(index - 1) }, icon("arrow")),
        imgEl,
        h("button", { class: "lb-btn lb-next", type: "button", "aria-label": "Next image", onclick: () => show(index + 1) }, icon("arrow"))),
      captionEl);
    root.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    root.addEventListener("touchend", (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      touchX = null;
    });
    document.addEventListener("keydown", (e) => {
      if (!root.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(index + 1);
      if (e.key === "ArrowLeft") show(index - 1);
    });
    document.body.append(root);
  }
  function show(i) {
    index = (i + items.length) % items.length;
    const m = items[index];
    imgEl.src = m.src; imgEl.alt = m.alt || "";
    imgEl.className = m.pixel ? "pixel" : "";
    captionEl.textContent = m.alt || "";
    counterEl.textContent = `${index + 1} / ${items.length}`;
    root.querySelectorAll(".lb-prev, .lb-next").forEach((b) => (b.style.visibility = items.length > 1 ? "visible" : "hidden"));
  }
  function open(list, start = 0) {
    items = list.filter((m) => m && m.src);
    if (!items.length) return;
    if (!root) build();
    lastFocus = document.activeElement;
    show(start);
    root.classList.add("open");
    document.body.style.overflow = "hidden";
    root.querySelector(".lb-close").focus();
  }
  function close() {
    root.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  return { open };
})();

/* Run on every page */
document.addEventListener("DOMContentLoaded", initChrome);
