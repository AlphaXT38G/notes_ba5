# Notes BA5

LaTeX notes for the BA5 IN semester at EPFL.

**Read online: https://alphaxt38g.github.io/notes_ba5/**

## Build

```bash
python build.py                 # compile everything -> dist/ + dist/index.html
python build.py compsec nummet  # only some subjects
python build.py --index-only    # regenerate dist/index.html without compiling
```

Open `dist/index.html` to browse all PDFs. It is generated, never edit it
(or `dist/`) by hand.

## Adding / editing a subject

Subjects, their display names and exam rules live in [`subjects.json`](subjects.json).
Put `course.tex` / `cheatsheet.tex` in `<id>/` and rebuild; the page updates itself.

Every standalone `.tex` in `<id>/` and its subfolders (e.g. `week/week01.tex`) is
compiled, and PDFs without a matching `.tex` (e.g. `cheatsheets/*.pdf`) are copied
as is. One exception: swent's weeks are chapters of `course.tex` (`weeks/week1a.tex`,
`week1b.tex`, ...); the build also turns each week into its own PDF from a generated
`_weekNN.tex` (git-ignored), so they show up like the other weekly notes. On the page, the course notes come first, then two collapsible sections:
weekly notes (files named `weekNN`, with a semester progress bar) and every other
PDF, grouped by folder. Dates come from the last commit touching each document,
and documents changed in the last 7 days get a "New" badge.

Optional keys per subject in `subjects.json`:

- `"weeks"`: length of the progress bar (default 14)
- `"color"`: accent colour of the subject card (default: taken from a palette)

The page also has a search field, a light/dark toggle and a flame mode 🔥.
A **Names / Previews** switch shows every document as a small thumbnail of its
first page instead (for course notes, the first page after the table of contents).
The thumbnails are made by `pdftoppm` and `pdftotext` (poppler); without them,
the build still works and the page shows names only.

From **21:30 to 01:00** the page turns into a jazz bar 🎷 (neon title, smoke,
floating notes) and plays background jazz from YouTube. Browsers only allow sound
after a click, so the music starts on the first click or key press, and the
turntable in the bottom left corner plays / pauses it. A bar menu in the bottom
right corner serves each subject's latest notes as a cocktail.

Jazz plays until 00:45, then the bar closes until 01:00 (darker light, the neon goes
out letter by letter and the bartender sends you to bed). At **01:00:00** a metal
song takes over for 1 min 51 s 🤘: chrome title, red light pulsing on the beat,
headbanging cards, lightning strikes, flying rock emojis and an equalizer, while a
guitar amp replaces the turntable and plays the song from 1:50 to its end. Then the
page is back to its day look. Add `?night=evening`, `?night=closing` or
`?night=metal` (or `1` / `0`) to the URL to force a phase (or the day) at any time.

It hides two easter eggs: a surprise banner that shows up on some visits, and
something that happens when you type the Konami code (↑↑↓↓←→←→BA).
