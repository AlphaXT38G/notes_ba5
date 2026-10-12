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
as is. On the page, the course notes come first and every other PDF of the subject
is listed in a collapsible section, grouped by folder. Dates come from the last
commit touching each document, and documents changed in the last 7 days get a
"New" badge.
