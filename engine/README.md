# notes-engine

The engine behind a notes site: it compiles the LaTeX subjects of a **notes repository** to PDF
and writes `dist/index.html`, a single-page index of all the PDFs, with first-page previews, a
search into the documents' text, "New" badges, a dark mode, and a lot of personality (screens that
follow the clock, Christmas, Halloween, easter eggs...).

It knows nothing about any particular notes: everything specific lives in the notes repository.

## A notes repository

```
subjects.json     [{"id": "algo", "name": "Algorithms", "exam": ""}, ...]
site.json         optional: title, subtitle, short, repo, kinds, ... (defaults: notes_engine/config.py)
algo/course.tex   \usepackage{course}  (the engine's style, no path needed)
```

```bash
pip install git+https://github.com/<owner>/notes-engine@v0.1.0
notes-engine                    # compile every subject, then dist/index.html
notes-engine algo               # one subject
notes-engine --index-only       # only the page
notes-engine --root ../notes    # build another directory
```

Needs `latexmk`; `pdftoppm` / `pdftotext` (poppler) and `node` are optional (previews, search, a
syntax check of the page). A ready-made GitHub Pages workflow is in `.github/workflows/pages.yml`
(reusable: `uses: <owner>/notes-engine/.github/workflows/pages.yml@v0.1.0`).

## Contributing

Read [`AGENTS.md`](AGENTS.md): the layout, the screens engine, how to add a screen, the rules for
code that must also run on older phones.
