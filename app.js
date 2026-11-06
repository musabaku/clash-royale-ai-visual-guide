"use strict";

// This is the requested convenience gate, not authentication or private hosting.
const STUDY_CODE = "2111";
const SESSION_KEY = "cr-visual-guide-open";
const POSITION_KEY = "cr-visual-guide-position";
const CHAPTERS = [
  { title: "Foundations & drawing", short: "Foundations", start: 1, end: 10 },
  { title: "Streaming & replay", short: "Graphics & replay", start: 11, end: 18 },
  { title: "How the AI learns", short: "AI learning", start: 19, end: 27 },
  { title: "The evidence-based coach", short: "Coaching", start: 28, end: 33 },
  { title: "Hardware to milestones", short: "Build the system", start: 34, end: 40 },
  { title: "Stronger decisions", short: "Stronger decisions", start: 41, end: 48 },
  { title: "Data & evidence", short: "Data & evidence", start: 49, end: 56 },
  { title: "From video to state", short: "Video to state", start: 57, end: 66 },
  { title: "Research & experiments", short: "Research & experiments", start: 67, end: 72 },
  { title: "Research to product", short: "Research to product", start: 73, end: 78 }
];
const $ = (id) => document.getElementById(id);
let slides = [];
let current = 0;
let detailed = true;
let started = false;
let imageVersion = 0;
let touchStart = null;

function sessionGet(key) { try { return sessionStorage.getItem(key); } catch (_) { return null; } }
function sessionSet(key, value) { try { sessionStorage.setItem(key, value); } catch (_) {} }
function chapterFor(id) { return CHAPTERS.find((chapter) => id >= chapter.start && id <= chapter.end) || CHAPTERS[0]; }
function padded(id) { return String(id).padStart(2, "0"); }
function hashId() { const match = window.location.hash.match(/^#slide-(\d+)$/); return match ? Number(match[1]) : null; }
function text(tag, className, value) { const node = document.createElement(tag); if (className) node.className = className; node.textContent = value; return node; }
function appendTopicTags(parent, slide) {
  (slide.tags || []).forEach((label) => {
    const badge = text("span", "topic-tag", "");
    const star = text("span", "topic-star", "★");
    star.setAttribute("aria-hidden", "true");
    badge.append(star, document.createTextNode(label));
    parent.append(badge);
  });
}

async function openGuide() {
  $("entry-screen").hidden = true;
  $("app").hidden = false;
  if (started) return;
  started = true;
  try {
    const response = await fetch("slides.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Unable to fetch lessons");
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error("Empty lesson list");
    slides = data.filter((item) => Number.isInteger(item.id) && typeof item.title === "string" && typeof item.image === "string").sort((a, b) => a.id - b.id);
    if (!slides.length) throw new Error("Invalid lesson list");
    $("load-error").hidden = true;
    $("total-number").textContent = slides.length;
    $("rail-count").textContent = slides.length + " lessons";
    document.querySelector(".guide-badge").textContent = slides.length + " illustrated lessons";
    document.querySelector(".progress-track").setAttribute("aria-valuemax", String(slides.length));
    buildChapters();
    buildOverview();
    const requested = hashId() || Number(sessionGet(POSITION_KEY)) || slides[0].id;
    const requestedIndex = slides.findIndex((slide) => slide.id === requested);
    showSlide(requestedIndex >= 0 ? requestedIndex : 0, { initial: true });
  } catch (error) {
    started = false;
    $("load-error").hidden = false;
    $("image-status").hidden = true;
  }
}

function buildChapters() {
  const fragment = document.createDocumentFragment();
  CHAPTERS.forEach((chapter, chapterIndex) => {
    const available = slides.filter((slide) => slide.id >= chapter.start && slide.id <= chapter.end);
    if (!available.length) return;
    const section = text("div", "chapter", "");
    section.dataset.chapter = String(chapterIndex);
    const heading = text("div", "chapter-header", "");
    heading.append(text("span", "chapter-index", padded(chapterIndex + 1)), text("span", "chapter-title", chapter.title));
    const list = text("ol", "lesson-list", "");
    available.forEach((slide) => {
      const li = document.createElement("li");
      const button = text("button", "rail-lesson", "");
      button.type = "button";
      button.dataset.slide = String(slide.id);
      const copy = text("span", "rail-lesson-copy", "");
      copy.append(text("span", "rail-title", slide.title));
      appendTopicTags(copy, slide);
      button.append(text("span", "rail-id", padded(slide.id)), copy);
      button.addEventListener("click", () => showSlide(slides.findIndex((item) => item.id === slide.id)));
      li.append(button); list.append(li);
    });
    section.append(heading, list); fragment.append(section);
  });
  $("chapter-nav").replaceChildren(fragment);
}

function buildOverview(query = "") {
  const terms = query.trim().toLowerCase();
  const filtered = slides.filter((slide) => [slide.title, slide.subtitle || "", chapterFor(slide.id).title, ...(slide.tags || [])].join(" ").toLowerCase().includes(terms));
  const fragment = document.createDocumentFragment();
  filtered.forEach((slide) => {
    const card = text("button", "overview-card", "");
    card.type = "button";
    card.dataset.slide = String(slide.id);
    card.setAttribute("aria-label", "Open lesson " + slide.id + ": " + slide.title + ((slide.tags || []).length ? ". " + slide.tags.join(", ") : ""));
    if (slides[current] && slides[current].id === slide.id) card.classList.add("current");
    const thumb = text("div", "thumb-wrap", "");
    const img = document.createElement("img");
    img.src = slide.image; img.alt = ""; img.loading = "lazy"; img.decoding = "async";
    thumb.append(img);
    const body = text("div", "card-content", "");
    body.append(text("span", "card-chapter", chapterFor(slide.id).short), text("span", "card-title", slide.title));
    appendTopicTags(body, slide);
    card.append(thumb, text("span", "card-number", padded(slide.id)), body);
    card.addEventListener("click", () => { $("overview").close(); showSlide(slides.findIndex((item) => item.id === slide.id)); });
    fragment.append(card);
  });
  if (!filtered.length) fragment.append(text("p", "empty-search", "No matching lessons. Try another topic."));
  $("overview-grid").replaceChildren(fragment);
  $("search-count").textContent = filtered.length + " of " + slides.length + " lessons";
}

function showSlide(index, options = {}) {
  if (!slides.length) return;
  current = Math.max(0, Math.min(index, slides.length - 1));
  const slide = slides[current];
  const chapter = chapterFor(slide.id);
  $("lesson-title").textContent = slide.title;
  $("lesson-subtitle").textContent = slide.subtitle || "";
  $("lesson-tags").replaceChildren();
  appendTopicTags($("lesson-tags"), slide);
  $("lesson-tags").hidden = !$("lesson-tags").childElementCount;
  $("chapter-label").textContent = "Chapter " + (CHAPTERS.indexOf(chapter) + 1) + " / " + chapter.short;
  $("current-number").textContent = padded(slide.id);
  $("source-caption").textContent = slide.sourceDocument
    ? slide.sourceDocument + ((slide.sourceSections || []).length ? " · " + slide.sourceSections.join(", ") : "") + ". Reported findings are not a fresh project audit; examples remain illustrative."
    : "Based on guide section" + ((slide.sourceSections || []).length === 1 ? " " : "s ") + (slide.sourceSections || []).join(", ") + ". Educational illustration; examples are not measured match findings.";
  $("original-link").href = slide.image;
  $("original-link").setAttribute("aria-label", "Open full-resolution infographic: " + slide.title);
  $("retry-image-link").href = slide.image;
  $("previous-button").disabled = current === 0;
  $("next-button").disabled = current === slides.length - 1;
  $("progress-fill").style.width = ((current + 1) / slides.length * 100) + "%";
  $("progress-label").textContent = "Lesson " + (current + 1) + " of " + slides.length;
  document.querySelector(".progress-track").setAttribute("aria-valuenow", String(current + 1));
  document.querySelectorAll(".rail-lesson").forEach((button) => {
    const active = Number(button.dataset.slide) === slide.id;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  document.querySelectorAll(".chapter").forEach((node) => node.classList.toggle("current", Number(node.dataset.chapter) === CHAPTERS.indexOf(chapter)));
  document.querySelectorAll(".overview-card").forEach((node) => node.classList.toggle("current", Number(node.dataset.slide) === slide.id));
  setDetailed(true);
  loadImage(slide);
  sessionSet(POSITION_KEY, String(slide.id));
  const hash = "#slide-" + padded(slide.id);
  if (window.location.hash !== hash) history.replaceState(null, "", hash);
  document.title = padded(slide.id) + " · " + slide.title + " — Clash Royale AI";
  $("announcement").textContent = "Lesson " + (current + 1) + " of " + slides.length + ". " + slide.title;
  if (!options.initial) $("lesson-title").focus({ preventScroll: true });
  if (!options.initial) window.scrollTo({ top: 0, behavior: "auto" });
  const next = slides[current + 1];
  if (next) { const preload = new Image(); preload.src = next.image; }
}

function loadImage(slide) {
  const version = ++imageVersion;
  const img = $("lesson-image");
  $("image-status").hidden = false;
  $("image-error").hidden = true;
  img.hidden = false;
  img.classList.add("loading");
  img.alt = "Lesson " + padded(slide.id) + ": " + slide.title + ". " + (slide.subtitle || "") + " Open at full size to read the infographic.";
  img.setAttribute("aria-label", "Lesson " + padded(slide.id) + ": " + slide.title + ". Activate to toggle detailed reading size.");
  img.onload = () => { if (version !== imageVersion) return; $("image-status").hidden = true; img.classList.remove("loading"); };
  img.onerror = () => { if (version !== imageVersion) return; $("image-status").hidden = true; img.hidden = true; $("image-error").hidden = false; };
  img.src = slide.image;
}

function setDetailed(value) {
  detailed = value;
  $("stage").classList.toggle("read-mode", value);
  $("fit-button").classList.toggle("active", !value);
  $("read-button").classList.toggle("active", value);
  $("fit-button").setAttribute("aria-pressed", String(!value));
  $("read-button").setAttribute("aria-pressed", String(value));
  $("lesson-image").setAttribute("aria-pressed", String(value));
  $("stage").scrollTo(0, 0);
}

function openOverview() { if (!slides.length) return; buildOverview($("lesson-search").value); $("overview").showModal(); $("lesson-search").focus(); }
async function toggleFullscreen() {
  const shell = document.querySelector(".reader-shell");
  try { if (document.fullscreenElement) await document.exitFullscreen(); else if (shell.requestFullscreen) await shell.requestFullscreen(); } catch (_) { $("announcement").textContent = "Full screen is unavailable in this browser. Use Read detail or open the full image."; }
}

$("entry-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if ($("study-code").value.trim() !== STUDY_CODE) { $("entry-error").textContent = "That code did not match. Please try again."; $("study-code").value = ""; $("study-code").focus(); return; }
  $("entry-error").textContent = "";
  sessionSet(SESSION_KEY, "yes");
  $("study-code").value = "";
  openGuide();
});
$("reload-button").addEventListener("click", openGuide);
$("overview-button").addEventListener("click", openOverview);
$("close-overview").addEventListener("click", () => $("overview").close());
$("lesson-search").addEventListener("input", (event) => buildOverview(event.target.value));
$("overview").addEventListener("click", (event) => { if (event.target === $("overview")) { const bounds = $("overview").getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) $("overview").close(); } });
$("previous-button").addEventListener("click", () => showSlide(current - 1));
$("next-button").addEventListener("click", () => showSlide(current + 1));
$("fit-button").addEventListener("click", () => setDetailed(false));
$("read-button").addEventListener("click", () => setDetailed(true));
$("lesson-image").addEventListener("click", () => setDetailed(!detailed));
$("lesson-image").addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setDetailed(!detailed); } });
$("fullscreen-button").addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => { const active = Boolean(document.fullscreenElement); $("fullscreen-button").setAttribute("aria-label", active ? "Exit full screen" : "Enter full screen"); document.querySelector(".fullscreen-label").textContent = active ? "Exit full screen" : "Full screen"; });
if (!document.documentElement.requestFullscreen) $("fullscreen-button").hidden = true;
document.querySelector(".brand").addEventListener("click", (event) => { event.preventDefault(); if (slides.length) showSlide(0); });
window.addEventListener("hashchange", () => { const id = hashId(); const index = slides.findIndex((slide) => slide.id === id); if (index >= 0 && index !== current) showSlide(index); });
document.addEventListener("keydown", (event) => {
  if ($("app").hidden || !slides.length || $("overview").open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
  const key = event.key.toLowerCase();
  if (key === "arrowright" || key === "pagedown") { event.preventDefault(); showSlide(current + 1); }
  else if (key === "arrowleft" || key === "pageup") { event.preventDefault(); showSlide(current - 1); }
  else if (key === "home") { event.preventDefault(); showSlide(0); }
  else if (key === "end") { event.preventDefault(); showSlide(slides.length - 1); }
  else if (key === "o") { event.preventDefault(); openOverview(); }
  else if (key === "z") { event.preventDefault(); setDetailed(!detailed); }
  else if (key === "f") { event.preventDefault(); toggleFullscreen(); }
});
$("stage").addEventListener("pointerdown", (event) => { if (event.pointerType === "touch" && !detailed) touchStart = { x: event.clientX, y: event.clientY }; });
$("stage").addEventListener("pointerup", (event) => { if (!touchStart || detailed) return; const dx = event.clientX - touchStart.x; const dy = event.clientY - touchStart.y; touchStart = null; if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.6) showSlide(current + (dx < 0 ? 1 : -1)); });
$("stage").addEventListener("pointercancel", () => { touchStart = null; });
if (sessionGet(SESSION_KEY) === "yes") openGuide();
