"""Compile the LaTeX of a subject and copy its PDFs to dist/<subject>/."""

import re
import shutil
import subprocess
from pathlib import Path

from .config import DIST, ROOT
from .log import BOLD, RESET, err, info, ok

# ── Weekly notes written as chapters ─────────────────────────────────────────
# Most subjects have one standalone document per week (week/01.tex). swent is the
# exception: its weeks are chapters \input by course.tex (weeks/week1a.tex, week1b.tex, ...),
# several parts per week. Each week is then also built as its own PDF from a small generated
# document (<subject>/_weekNN.tex, git-ignored, published as week/NN.pdf) with the course preamble and that week's parts.
WEEK_PART = re.compile(r"week_?(\d+)[a-z]?", re.I)  # week1a, week1b, week3, ...

def course_weeks(subject_dir):
    """Weekly chapters of course.tex: {week number: [inputs, in course order]} ({} if none)."""
    course = subject_dir / "course.tex"
    if not course.exists():
        return {}
    weeks = {}
    for inp in re.findall(r"\\input\{([^}]+)\}", course.read_text(encoding="utf-8", errors="replace")):
        m = WEEK_PART.fullmatch(Path(inp).name)
        if m:
            weeks.setdefault(int(m[1]), []).append(inp)
    return weeks

def week_documents(subject_dir):
    """Write one _weekNN.tex per week of course_weeks() and return their paths.

    Same preamble as course.tex, then that week's chapters. The chapter counter starts where
    it is in the full course, so "Week2 : Part A" stays chapter 3 like in course.pdf.
    """
    parts = course_weeks(subject_dir)
    if not parts:
        return []
    preamble = (subject_dir / "course.tex").read_text(encoding="utf-8").split("\\begin{document}")[0]
    docs, before = [], 0
    for n, inputs in sorted(parts.items()):
        doc = subject_dir / f"_week{n:02d}.tex"
        text = (preamble + "\\begin{document}\n\\raggedbottom\n"
                + f"\\setcounter{{chapter}}{{{before}}}\n"
                + "".join(f"\\input{{{i}}}\n" for i in inputs) + "\\end{document}\n")
        if not doc.exists() or doc.read_text(encoding="utf-8") != text:  # keep latexmk's cache valid
            doc.write_text(text, encoding="utf-8")
        docs.append(doc)
        before += len(inputs)
    return docs

# ── Compiling a subject ──────────────────────────────────────────────────────
def build_subject(subject, results):
    """Compile every document of a subject into dist/<subject>/, recording each in results.

    results maps "subject/file" to "ok" or "error".
    """
    subject_dir = ROOT / subject
    if not subject_dir.is_dir():
        print(f"\n{BOLD}{subject}{RESET}: folder not found, skipping.")
        return

    # Standalone documents only (files pulled in with \input have no \documentclass),
    # plus the generated per-week documents (_weekNN.tex, see week_documents)
    week_docs = week_documents(subject_dir)
    tex_files = sorted(
        t for t in subject_dir.rglob("*.tex")
        if not t.name.startswith("_") and "\\documentclass" in t.read_text(encoding="utf-8", errors="replace")
    ) + week_docs
    # PDFs that are not produced by a .tex here (e.g. downloaded sheets)
    extra_pdfs = sorted(p for p in subject_dir.rglob("*.pdf") if p.with_suffix(".tex") not in tex_files)
    if not tex_files and not extra_pdfs:
        print(f"\n{BOLD}{subject}{RESET}: no documents found, skipping.")
        return

    print(f"\n{BOLD}{subject}{RESET}")

    out_dir = DIST / subject
    out_dir.mkdir(parents=True, exist_ok=True)

    # Copy them as is, keeping their subfolder (cheatsheets/x.pdf -> dist/<subject>/cheatsheets/x.pdf)
    for pdf in extra_pdfs:
        rel = pdf.relative_to(subject_dir)
        (out_dir / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(pdf, out_dir / rel)
        ok(f"{rel.as_posix()}  →  dist/{subject}/{rel.as_posix()}")

    for tex in tex_files:
        rel = tex.relative_to(subject_dir)
        label = f"{subject}/{rel.as_posix()}"
        info(f"Compiling {rel.as_posix()} …")

        cmd = [
            "latexmk",
            "-pdf",
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-cd",          # change to file's directory
            str(tex),
        ]

        proc = subprocess.run(cmd, capture_output=True, text=True)

        pdf = tex.with_suffix(".pdf")
        if proc.returncode == 0 and pdf.exists():
            # Mirror the source layout: week/01.tex -> dist/<subject>/week/01.pdf;
            # generated weeks go to the same place: _week01.tex -> dist/<subject>/week/01.pdf
            dest = out_dir / ("week/" + tex.stem[len("_week"):] + ".pdf" if tex in week_docs else rel.with_suffix(".pdf"))
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(pdf, dest)
            ok(f"{rel.as_posix()}  →  dist/{subject}/{dest.relative_to(out_dir).as_posix()}")
            results[label] = "ok"
        else:
            err(f"{rel.as_posix()} failed (exit {proc.returncode})")
            # Print the first error (and some context) for quick diagnosis
            log = tex.with_suffix(".log")
            if log.exists():
                lines = log.read_text(errors="replace").splitlines()
                start = next((i for i, l in enumerate(lines) if l.startswith("!")), max(len(lines) - 20, 0))
                for line in lines[start:start + 12]:
                    print(f"       {line}")
            results[label] = "error"
