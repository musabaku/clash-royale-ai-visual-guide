# Clash Royale AI — a visual field guide

This is a dependency-free static slideshow. It uses `index.html`, `style.css`, `app.js`, `slides.json`, and the original numbered infographics in `assets/`.

The 78 lessons are arranged in ten chapters. Lessons 1–40 explain the beginner's guide; lessons 41–78 explain the supplied advanced assessment, covering stronger decisions, data and evidence, video-to-state reconstruction, experiments, and the path from research to product. Reported findings in that assessment are not a fresh project audit.

The requested entry code is **2111**. It is a client-side convenience gate. It does not make GitHub Pages files private or encrypted. Entry and reading position are remembered only for the current browser session when session storage is available.

The lesson list is an array in `slides.json`, with each item shaped as:

```json
{"id":1,"title":"Lesson title","subtitle":"One-sentence introduction","sourceSections":[1],"image":"assets/01.png"}
```

All paths are relative so this works at a GitHub Pages project URL. Serve the directory over HTTP(S); opening `index.html` directly as a local file may block loading `slides.json`.

Features: chapter navigation; searchable thumbnail overview; previous/next; direct slide links; detailed reading size; full-screen where supported; full-resolution image links; touch swipes; keyboard controls; accessible entry and navigation; reduced-motion support; print styling.

“Read detail” is the default on initial load and every lesson change. “Fit slide” remains available to see an entire poster at once.

Keyboard controls: Left/Right or Page Up/Page Down navigate, Home/End jump, O opens overview, Z toggles detail, F toggles full-screen, Escape closes the overview.

These are educational concept illustrations. They do not establish native gameplay, measured AI strength, or fresh verification of project status. Hypothetical examples and source-reported status retain their qualifications in the infographic collection.
