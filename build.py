#!/usr/bin/env python3
"""Build this repository: compile every subject to PDF, then write dist/index.html.

A thin entry point: the work is done by the notes engine (engine/notes_engine), which reads
subjects.json and site.json from this directory. Usage:

    python build.py                  # everything
    python build.py compsec nummet   # some subjects
    python build.py --index-only     # only dist/index.html, from the PDFs already in dist/

On Windows, run it with PYTHONIOENCODING=utf-8 so the console can print the symbols.
"""

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "engine"))  # the engine, until it is installed as a package

from notes_engine.cli import main  # noqa: E402

sys.exit(main(["--root", str(HERE), *sys.argv[1:]]))
