"""Command line of the engine: compile the subjects of a notes repository, then write its index page.

    notes-engine [--root DIR] [subject ...]     compile (all subjects by default), then the page
    notes-engine [--root DIR] --index-only      only dist/index.html, from the PDFs already in dist/

DIR is the notes repository (the current directory by default): it holds subjects.json, the
subject folders and, optionally, site.json (see config.py). On Windows, set PYTHONIOENCODING=utf-8
so the console can print the symbols.
"""

import argparse
import sys

from . import config


def main(argv=None):
    ap = argparse.ArgumentParser(prog="notes-engine", description="Build the PDFs and the index page of a notes repository.")
    ap.add_argument("subjects", nargs="*", help="subjects to compile (default: all of subjects.json)")
    ap.add_argument("--root", default=None, help="the notes repository (default: current directory)")
    ap.add_argument("--index-only", action="store_true", help="only regenerate dist/index.html, compile nothing")
    args = ap.parse_args(argv)

    config.load(args.root)  # before the modules below read the project
    from .latex import build_subject
    from .log import GREEN, RED, RESET
    from .page import build_index

    unknown = [s for s in args.subjects if s not in config.P.all_subjects]
    if unknown:
        ap.error(f"unknown subject(s): {', '.join(unknown)} (subjects.json has: {', '.join(config.P.all_subjects)})")
    subjects = [] if args.index_only else args.subjects or config.P.all_subjects

    results = {}  # subject/file -> "ok" | "error"
    for subject in subjects:
        build_subject(subject, results)

    build_index()

    print(f"\n{'─'*50}")
    ok_count = sum(1 for v in results.values() if v == "ok")
    err_count = sum(1 for v in results.values() if v == "error")
    print(f"  {GREEN}{ok_count} succeeded{RESET}  |  {RED}{err_count} failed{RESET}")
    return 1 if err_count else 0


if __name__ == "__main__":
    sys.exit(main())
