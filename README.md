# Notes BA5

LaTeX notes for the BA5 IN semester at EPFL.

**Read online: https://alphaxt38g.github.io/notes_ba5/**

## Build

```bash
python build.py                 # compile everything -> dist/ + dist/index.html
python build.py compsec nummet  # only some subjects
python build.py --index-only    # regenerate dist/index.html without compiling
python -m http.server 8765 --directory dist   # preview at http://localhost:8765/
```

`dist/` is generated, never edit it by hand. The build itself lives in `builder/`, and
the index page (HTML, CSS, JS) in `site/`.

**Contributing** (humans and AI agents alike): read [`AGENTS.md`](AGENTS.md) first. It
explains how the build and the page are organised, how to add a new screen to the page,
and the conventions to follow.

## Adding / editing a subject

Subjects, their display names and exam rules live in [`subjects.json`](subjects.json).
Put `course.tex` / `cheatsheet.tex` in `<id>/` and rebuild; the page updates itself.

Every standalone `.tex` in `<id>/` and its subfolders (e.g. `week/week01.tex`) is
compiled, and PDFs without a matching `.tex` (e.g. `cheatsheets/*.pdf`) are copied
as is. One exception: swent's weeks are chapters of `course.tex` (`weeks/week1a.tex`,
`week1b.tex`, ...); the build also turns each week into its own PDF from a generated
`_weekNN.tex` (git-ignored), so they show up like the other weekly notes.

On the page, the course notes come first, then two collapsible sections: weekly notes (files named `weekNN`, with a semester progress bar) and every other
PDF, grouped by folder. Dates come from the last commit touching each document,
and documents changed in the last 4 days get a "New" badge.

Optional keys per subject in `subjects.json`:

- `"weeks"`: length of the progress bar (default 14)
- `"color"`: accent colour of the subject card (default: taken from a palette)

The page also has a search field, a light/dark toggle and a flame mode 🔥.
A **Names / Previews** switch shows every document as a small thumbnail of its
first page instead (for course notes, the first page after the table of contents).
The thumbnails are made by `pdftoppm` and `pdftotext` (poppler); without them,
the build still works and the page shows names only.

From **21:30 to 01:00** the page turns into a jazz bar 🎷 (neon title, smoke,
floating notes) and plays background jazz from YouTube. The music (jazz, then the
metal song) starts by itself; browsers only allow sound after a click, so until the
page has had one it plays muted and the sound comes on at the first click or key
press. The turntable in the bottom left corner plays / pauses it.

Jazz plays until 00:45, then the bar closes until 01:00 (darker light, the neon goes
out letter by letter and the bartender sends you to bed). At **01:00:00** a metal
song takes over for 1 min 51 s 🤘: chrome title, red light pulsing on the beat,
headbanging cards and an equalizer, plus effects drawn on a canvas: branching
lightning with sparks, physics-driven metal chains hanging in the margins, a curtain
of fire and chrome skulls / Flying V guitars / horns thrown across the page. A
guitar amp replaces the turntable and plays the song from 1:50 to its end. Then the
page is back to its day look. Each change of style is animated (a warm fade into the
jazz bar, a slam into the metal show, a soft fade back to the day) in browsers that
support view transitions.

10 seconds before a metal show ends, a **"More epicness ?"** button shows up. Click
it and, instead of going back to the day, the page turns into an epic fantasy finale ⚔️:
a blue and violet night with an aurora, realistic blue fire, embers, floating arcane
lights and a rune circle, while the amp (now blue) plays epic music in a loop. It lasts
until you click the small **"Back to normal"** button in the bottom right corner, which
brings back the usual look for the time of day (day, or the jazz bar at night).

Add `?night=evening`, `?night=closing`, `?night=metal` or `?night=epic` (or `1` / `0`)
to the URL to force a screen (or the day) at any time.

It hides three easter eggs: a surprise banner that shows up on some visits,
something that happens when you type the Konami code (↑↑↓↓←→←→BA), and the metal
takeover at any time of day if you click the flame button 20 times within a minute.
