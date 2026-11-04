"""The notes engine: LaTeX notes to PDFs, and the index page that lists them.

    cli.py       the command line (notes-engine)
    config.py    the notes repository (subjects.json, site.json) and the engine's own paths
    log.py       coloured console output
    latex.py     compiling the LaTeX of each subject into dist/
    previews.py  first-page thumbnails of the PDFs (poppler)
    search.py    the text of the PDFs, for the page's search field
    page.py      dist/index.html, assembled from the PDFs in dist/ and the files of site/

See AGENTS.md at the root of the engine for the overall picture.
"""
