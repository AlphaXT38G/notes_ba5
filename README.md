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
and documents changed in the last 4 days get a "New" badge (the site is rebuilt
every day, so the badges expire even without a push).

Optional keys per subject in `subjects.json`:

- `"weeks"`: length of the progress bar (default 14)
- `"color"`: accent colour of the subject card (default: taken from a palette)

The page also has a search field, a light/dark toggle and a flame mode 🔥. It works
on phones too, including older Android browsers.
A **Names / Previews** switch shows every document as a small thumbnail of its
first page instead (for course notes, the first page after the table of contents).
The thumbnails are made by `pdftoppm` and `pdftotext` (poppler); without them,
the build still works and the page shows names only.

From **21:30 to 01:00** the page turns into a jazz bar 🎷 (neon title, smoke,
floating notes) and plays background jazz ("Just One More Drink", jazz noir). The
music of every screen is an mp3 served with the page (`site/audio/`). It starts by
itself; browsers only allow sound after a click, so until the page has had one it
plays muted and the sound comes on at the first click or key press. The turntable in
the bottom left corner plays / pauses it.

Jazz plays until 00:45, then the bar closes until 01:00 (darker light, the neon goes
out letter by letter, then the bartender, a Gigachad, comes over the whole screen, life-size
behind his bar, under a swinging lamp: he taps the desk bell for last call, tells you the bar is closing and
shows a chalkboard counting down to 01:00; "Good night" sends him away). At **01:00:00** a metal
song takes over for 1 min 51 s 🤘: chrome title, red light pulsing on the beat,
headbanging cards and an equalizer, plus effects drawn on a canvas: branching
lightning with sparks, physics-driven metal chains hanging in the margins, a curtain
of fire and chrome skulls / Flying V guitars / horns thrown across the page. A
guitar amp replaces the turntable and plays a cover of the Master of Puppets solo
three times in a row (it shows which play is on); the show ends with the third. Each change of style is animated (a warm fade into the
jazz bar, a slam into the metal show, a slow hush into the calm night, a soft fade
back to the day) in browsers that support view transitions.

After the show, from **01:01:51 to 05:30**, the night goes quiet 🌙: a calm blue
night with the moon as it really is tonight (its phase computed from the true new
moons), twinkling stars, a shooting star now and then, fireflies, mist drifting
over dark hills, and the sounds of a forest at night ("Mystical Forest"), a
little quieter than the other music. From 04:45 the dawn rises from the
horizon, the forest quietens and the first birds sing. A firefly jar in the bottom
left corner pauses / resumes the sounds. The epic finale and Christmas nights come
before it.

10 seconds before a metal show ends, a **"More epicness ?"** medallion rises, forged in
blue fire (a turning ring of runes, light rays, sparks). Click it and it counts down; in
the last seconds of the show the room goes dark, a huge rune circle and pillars of light
rise, the medallion implodes and bursts in a white flash and a shock wave right as the
song ends, with a whoosh and a boom. Instead of going back to the day, the page turns into
an epic fantasy finale ⚔️:
a blue and violet night with an aurora, realistic blue fire, embers, floating arcane
lights and a rune circle, while the amp (now blue) plays Two Steps From Hell in a loop. It lasts
until you click the small **"Back to normal"** button in the bottom right corner, which
brings back the usual look for the time of day (day, the calm night after the show,
or the jazz bar at night).

From **December 10 to January 3** Christmas replaces the day, the jazz bar and the
calm night: a
Christmas day from 06:00 to 18:00 and a Christmas night from 18:00 to 06:00. A
garland across the top (lit at night), falling snow,
big snowy mountains, a decorated tree with gifts, a snowman companion beside the
courses, a countdown to Christmas in the subtitle, and Christmas music on a
Christmas turntable: Jingle Bell Rock or a live Christmas radio from YouTube (the
other record waits in its sleeve behind the turntable: click it to swap them), or
paused. At night the moon rises, chalets light up on the mountains, the tree lights
play changing patterns and Santa's sleigh crosses the sky now and then. Look closely
at the ornaments of the tree, under it, and along the garland. The metal show at 01:00
and the easter eggs still happen.

Add `?screen=evening`, `?screen=closing`, `?screen=metal`, `?screen=epic`, `?screen=calm`,
`?screen=christmas` or `?screen=christmas-night` (or `1` / `0`) to the URL to force a
screen (or the day) at any time.

It hides six easter eggs: a surprise banner that shows up on some visits,
something that happens when you type the Konami code (↑↑↓↓←→←→BA), the metal
takeover at any time of day if you click the flame button 20 times within a minute,
Christmas at any time of the year if you type `yeti` (outside the Christmas
period, type it again on a Christmas screen to leave; in the jazz bar, it brings
Christmas back), and the jazz bar at any time
if you type `armstrong` (type it again in the bar to go back to the screen of the
moment: the day, the calm night, the bar at bar time, or Christmas in December), and the
calm night at any time if you type `peace` (type it again to leave).
