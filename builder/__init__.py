"""Build tooling behind build.py.

    config.py    paths, subjects.json and the constants of the index page
    log.py       coloured console output
    latex.py     compiling the LaTeX of each subject into dist/
    previews.py  first-page thumbnails of the PDFs (poppler)
    page.py      dist/index.html, assembled from the PDFs in dist/ and the files of site/

See AGENTS.md at the root of the repository for the overall picture.
"""
