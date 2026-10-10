# Notes BA5

LaTeX notes for the BA5 IN semester at EPFL.

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
