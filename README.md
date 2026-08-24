# Mr. Anye — portfolio site

Production implementation of the Claude Design project
`cc9333cd-352d-4af5-9056-bca2a74e003e`, rebuilt as a static two-page site and
made responsive across mobile, tablet and laptop/desktop.

## Run it

```
python3 -m http.server 4173
```

Then open <http://localhost:4173>. No build step — plain HTML, CSS and JS.

## Files

```
index.html                   portfolio
case-studies.html            six case studies
css/site.css                 all styling for both pages, mobile-first
js/site.js                   all behaviour for both pages
Ubong-Anye-CV-2026.pdf       linked from both pages
img/opt/                     hero + experiment card images
img/cs/                      case-study images (18)
img/peek/                    640px work-row hover previews
portrait.jpg                 about-section portrait
design-source/*.dc.html      the original Claude Design files, for reference
vercel.json                  cache headers + clean URLs
_incomplete-downloads/       partial downloads and scratch (gitignored, local only)
```

## Deploying

Static — no build step. On Vercel: import the repo, framework preset **Other**,
leave build command and output directory empty. `vercel.json` sets long cache
lifetimes on images and the PDF, and no-cache on HTML/CSS/JS so updates land
immediately.

Both pages share one stylesheet and one script, so the second page a visitor
opens costs no extra CSS or JS.

## What changed from the design files

Both `.dc.html` files are Claude Design canvases: every element is inline-styled
and layout is driven by a `DCLogic` script that only runs inside the design
runtime. The rebuild keeps the design exactly — same copy, colour, type scale,
spacing and motion — but replaces the delivery mechanism:

- **Layout is CSS, not JavaScript.** Both originals set `gridTemplateColumns`
  from a `resize` handler at a single 900px breakpoint. That is now real media
  queries at 560 / 768 / 1024 / 1280, so layout is correct before first paint
  and survives with JS disabled.
- **Mobile navigation exists.** Both originals hid the nav below 820px and put
  nothing in its place — neither page was navigable on a phone. Both now have a
  hamburger and a full-screen drawer with focus handling, Escape to close and
  body scroll-lock.
- **Cursor effects are gated to fine pointers.** The originals set `cursor:none`
  globally and ran the custom cursor, magnetic buttons and hover peek-preview on
  every device, which on touch means an invisible cursor and sticky hover
  states. All of it now sits behind `(hover: hover) and (pointer: fine)`.
- **Hero adapts.** Below 1024px the portrait goes full-bleed with a scrim
  instead of a masked 74% right crop, and the three stat cards become a
  snap-scrolling rail instead of the fanned stack.
- **Case-study blocks stack.** The asked-for/actually-was pair and the two
  detail figures go one-up below 768px; the outcome figures reflow with
  `auto-fit`.
- **Header height is measured, not assumed.** `--head-h` is kept in sync with
  the real header via `ResizeObserver`, so anchor links clear the sticky bar at
  every breakpoint and after fonts load. (The real header is 72–82px against the
  token's 60.)
- **Accessibility.** Skip links, landmarks, `aria-expanded` / `aria-controls` on
  the menus, `aria-current` on the active nav item, `aria-labelledby` on each
  case study, labelled carousel controls with disabled end-states, keyboard
  paging, visible focus rings, and a real `prefers-reduced-motion` path. Print
  styles included.

## Fixed after first delivery

The header grew without bound on load. `.head__in` reserved its height with
`min-height:var(--head-h)` while the script wrote `--head-h` back from the
header's own measured height, with a `ResizeObserver` re-firing on each write —
so every frame added a few pixels and the bar pushed the page down indefinitely.
`--head-h` is now output-only: the header reserves space with a separate static
`--head-min` token, and only `scroll-padding-top` and the drawer's `inset` read
the measured value. Neither feeds back into the header's box, so the cycle is
structurally impossible. The write is additionally guarded to no-op unless the
rounded value changed.

Found and fixed in the same pass:

- **Drawer scroll lock did nothing.** It set `overflow:hidden` on `body`, but
  `<html>` is the scrolling element — the page scrolled freely behind the open
  menu. Now locks the real scroller, with `scrollbar-gutter:stable` so locking
  does not shift the layout.
- **Content behind the open drawer stayed in the tab order.** `main` and the
  footer are now `inert` while the menu is up (header stays live, since the
  drawer sits below it), and focus moves to the first drawer link on open.
- **The drawer's first link was not focusable on open**, because `visibility`
  was still mid-transition. Visibility now flips instantly on open and is held
  only for the fade-out on close.
- **`overflow-x:hidden` on `body` made it a scroll container** (`overflow-y`
  computed to `auto`), which is a known way to break `position:sticky`. Now uses
  `overflow-x:clip` where supported, which contains overflow without creating a
  scroll container.
- **Reduced motion did not zero transition *delays*** — only durations — which
  left the drawer invisible but still focusable for 300ms after closing.
- **Two hit areas were under 30px**: the hero scroll cue (13px) and the
  "Live · humalaundromat.com" link (21px).
- **The custom-cursor rAF loop never stopped** once started, and a magnetic
  button stayed offset if the pointer left the window while over it.

## Second round of fixes

- **Hero is now 95vh** (was `clamp(560px,86vh,880px)` — the 880px cap is what
  made it feel cropped on larger screens), with a 560px floor for short viewports.
- **Mobile hero**: copy is anchored to the bottom and the crop holds the face
  high in the frame, so the portrait reads clear above the headline instead of
  sitting behind it.
- **Tablet hero**: crop shifted to `50%` so the face sits right of the headline
  rather than under it.
- **Work-row hover preview** was bound to a global `pointermove`, so it only
  hid when a move landed outside a row. Scrolling fires no `pointermove`, which
  left it pinned on screen and travelling into the next section. It is now bound
  to each row's own enter/leave, plus an explicit hide on scroll.
- The same rewrite had briefly hooked `visibilitychange` and window `blur`;
  embedded browser panes report `visibilityState: 'hidden'` and fire those
  repeatedly, which killed the preview the instant it appeared. Both removed.

## Verified

- **Header height holds steady** — sampled every 100ms for 1.5s on both pages
  at every breakpoint; zero drift in any layout-critical box.
- No horizontal overflow and no clipped text at 320, 375, 390, 414, 768, 1024,
  1280, 1440 and 1920px — both pages.
- No duplicate ids, no dangling `aria-labelledby`/`aria-controls`, no dead
  in-page anchors, no missing `alt`, no skipped heading levels, exactly one
  `<h1>` per page, no tap target under 30px, console clean.
- Anchor scrolling clears the sticky header at every breakpoint on both pages.
- All six work rows on the portfolio resolve to real sections in
  `case-studies.html`; all back-links resolve to `index.html`.
- Every case study renders its full block sequence in order with no overlap;
  hero figures hold 16:9 exactly; all 18 case-study images load.
- Drawer, carousel, marquee loop, scroll-spy and pointer gating all tested.

## Asset notes

The design API truncates any file transfer above ~192 KB, which affected two
assets:

- **`img/cs/huma-hero.jpg`** could not be retrieved intact from any source in
  the project. The recoverable top 60% of the file was salvaged and cropped to a
  clean 16:9 frame (1600×900) centred on the billboard. It reads correctly and
  shows no corruption, but it is a **tighter crop than the original** — if you
  have the full-resolution original, drop it in at that path to replace it.
- **`img/cs/ancient-flavours-b.jpg`** was rebuilt from
  `uploads/Ancient Flavours_3@2x-100.jpg`, which is the same "logo suite and
  secondary marks" artwork at matching dimensions.

Everything else came through byte-complete. `_incomplete-downloads/` holds the
partial files and intermediate sources — kept rather than deleted, per the
STRAMM working contract.
