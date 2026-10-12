#!/usr/bin/env python3
"""
Compile all LaTeX files in subject folders, copy PDFs to dist/ and
generate dist/index.html (an overview of every built PDF).
Subjects (name, exam rules) are declared in subjects.json.

Every standalone .tex of a subject is compiled, subfolders included (e.g. week/week01.tex),
and PDFs without a .tex next to them (e.g. cheatsheets/*.pdf) are copied as is.
On Windows, run it with PYTHONIOENCODING=utf-8 so the console can print the ✔ / → symbols.
Usage:

# Tout compiler
python build.py

# Un seul sujet
python build.py algo

# Plusieurs sujets
python build.py algo iml

# Regenerer seulement dist/index.html (sans compiler)
python build.py --index-only

"""

import html
import json
import re
import subprocess
import shutil
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
DIST = ROOT / "dist"
CONFIG = json.loads((ROOT / "subjects.json").read_text(encoding="utf-8"))

ALL_SUBJECTS = [s["id"] for s in CONFIG]

args = sys.argv[1:]
index_only = "--index-only" in args
subjects = [a for a in args if not a.startswith("--")] or ALL_SUBJECTS
if index_only:
    subjects = []

# ── ANSI colours ────────────────────────────────────────────────────────────
GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg):  print(f"  {GREEN}✔{RESET}  {msg}")
def err(msg): print(f"  {RED}✘{RESET}  {msg}")
def info(msg):print(f"  {YELLOW}→{RESET}  {msg}")

# ── Weekly notes written as chapters ─────────────────────────────────────────
# Most subjects have one standalone document per week (week/week01.tex). swent is the
# exception: its weeks are chapters \input by course.tex (weeks/week1a.tex, week1b.tex, ...),
# several parts per week. Each week is then also built as its own PDF from a small generated
# document (<subject>/_weekNN.tex, git-ignored) with the course preamble and that week's parts.
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

# ── Main ─────────────────────────────────────────────────────────────────────
results = {}   # subject/file -> "ok" | "error" | "skipped"

for subject in subjects:
    subject_dir = ROOT / subject
    if not subject_dir.is_dir():
        print(f"\n{BOLD}{subject}{RESET}: folder not found, skipping.")
        continue

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
        continue

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
            # Mirror the source layout: week/week01.tex -> dist/<subject>/week/week01.pdf;
            # generated weeks go to the same place: _week01.tex -> dist/<subject>/week/week01.pdf
            dest = out_dir / ("week/" + tex.stem[1:] + ".pdf" if tex in week_docs else rel.with_suffix(".pdf"))
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


# ── Index page ───────────────────────────────────────────────────────────────
# dist/index.html is one self-contained page (inline CSS + JS, no external files).
# Each subject is a card: course notes first, then two collapsible sections,
# "weekly notes" (weekNN files, with a progress bar) and "more documents".
# The page also has a search field, a light/dark toggle, a flame mode and two
# easter eggs (a random surprise banner and a Konami code animation).

KINDS = {"course.pdf": "Course notes", "cheatsheet.pdf": "Cheat sheet"}
ORDER = list(KINDS)  # course first, then cheatsheet, then anything else
NEW_DAYS = 7         # documents changed more recently get a "New" badge
SEMESTER_WEEKS = 14  # length of the progress bar, override with "weeks" in subjects.json
PREVIEW_PX = 240     # longest side of the first-page previews, in pixels (shown smaller, for sharpness)
PDFTOPPM = shutil.which("pdftoppm")    # makes the previews; optional
PDFTOTEXT = shutil.which("pdftotext")  # finds where the content of course notes starts; optional
# One accent per subject (in subjects.json order), override with "color" in subjects.json
PALETTE = ["#3b6fd8", "#d9622b", "#2f9e6b", "#b4459a", "#c99a1c", "#7a55d1", "#1f9bb0", "#d04452"]
WEEK = re.compile(r"week_?(\d+)(.*)", re.I)  # weekly notes: week01.pdf, week_3.pdf, ...

CSS = """
/* Colour tokens: light by default, dark when the system is dark (unless forced light) or when forced dark */
:root{--bg:#f5f6f8;--fg:#15171a;--card:#fff;--line:#e2e5ea;--acc:#2457c5;--acc-bg:#eaf0fd;--mut:#6b7280;--new:#1d7a46;--new-bg:#dcf3e5}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#121417;--fg:#e9eaec;--card:#1b1e23;--line:#2c3037;--acc:#8ab0ff;--acc-bg:#232b3d;--mut:#8b93a1;--new:#7ee0a5;--new-bg:#1d3a2a}}
:root[data-theme=dark]{--bg:#121417;--fg:#e9eaec;--card:#1b1e23;--line:#2c3037;--acc:#8ab0ff;--acc-bg:#232b3d;--mut:#8b93a1;--new:#7ee0a5;--new-bg:#1d3a2a}
*{box-sizing:border-box}
body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--fg);margin:0}
.wrap{max-width:960px;margin:0 auto;padding:2.5rem 1rem 3rem}
/* Header, with the flame and theme buttons in its top right corner */
header{margin-bottom:1.75rem;position:relative}
.tools{position:absolute;top:0;right:0;display:flex;gap:.4rem}
.tools button{width:2.3rem;height:2.3rem;display:grid;place-items:center;font-size:1.05rem;line-height:1;color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:.6rem;cursor:pointer}
.tools button:hover,.tools button:focus-visible{border-color:var(--acc)}
h1{font-size:1.9rem;margin:0;letter-spacing:-.02em}
.sub{color:var(--mut);margin:.25rem 0 0}
/* Cards in two independent columns (odd cards left, even cards right), so opening a section only
   makes its own column longer instead of leaving a gap next to it. On narrow screens the columns
   dissolve (display:contents) and the cards stack in their original order (inline `order`). */
.grid{display:flex;flex-direction:column;gap:2rem}
.col{display:contents}
@media(min-width:912px){.grid{display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;align-items:start}.col{display:flex;flex-direction:column;gap:2rem;min-width:0}}
/* Subject cards: --c is the subject accent colour, set inline on each <section> */
section{border-left:4px solid var(--c);padding-left:1rem}
.code{font:600 .7rem ui-monospace,monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--c)}
h2{font-size:1.1rem;line-height:1.3;margin:.1rem 0 .15rem}
.exam{margin:0 0 .4rem;font-size:.85rem;color:var(--mut)}
.links{list-style:none;margin:.5rem 0 0;padding:0;border-top:1px solid var(--line)}
.links a{display:flex;justify-content:space-between;gap:1rem;padding:.55rem .75rem;border-bottom:1px solid var(--line);color:var(--acc);text-decoration:none;font-weight:600}
.links a:hover,.links a:focus-visible{background:var(--acc-bg)}
.links small{color:var(--mut);font-size:.78rem;font-weight:400;align-self:center;white-space:nowrap}
/* Collapsible sections: custom chevron that turns down when open */
details summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:.4rem;padding:.55rem .75rem;border-bottom:1px solid var(--line);color:var(--mut);font-size:.9rem;font-weight:600}
details summary::-webkit-details-marker{display:none}
details summary::before{content:"";width:.45rem;height:.45rem;border:solid currentColor;border-width:0 2px 2px 0;transform:rotate(-45deg);transition:transform .15s}
details[open] summary::before{transform:rotate(45deg)}
details summary:hover,details summary:focus-visible{color:var(--fg)}
details .links{margin:0;border-top:0;padding-left:1rem}
/* "New" badge, weekly progress bar and folder headings inside a collapsible section */
.new{display:inline-block;margin-left:.5rem;padding:.05rem .45rem;border-radius:999px;background:var(--new-bg);color:var(--new);font-size:.68rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;vertical-align:.1em}
.progress{margin-left:auto;display:flex;align-items:center;gap:.5rem;font-size:.75rem;font-weight:600;color:var(--mut);white-space:nowrap}
.bar{width:6rem;height:.4rem;border-radius:999px;background:var(--line);overflow:hidden}
.bar span{display:block;height:100%;border-radius:inherit;background:var(--c)}
.group{font:600 .7rem ui-monospace,monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);padding:.6rem .75rem .1rem;border-bottom:1px solid var(--line)}
/* Search field and its no-result message */
.searchrow{display:flex;gap:.5rem;margin-top:1.25rem}
#search{flex:1;min-width:0;padding:.65rem .9rem;font:inherit;color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:.6rem;outline:none}
#search:focus{border-color:var(--acc);box-shadow:0 0 0 3px var(--acc-bg)}
/* Names / Previews switch, next to the search field */
.view{display:flex;padding:.2rem;background:var(--card);border:1px solid var(--line);border-radius:.6rem}
.view button{padding:0 .75rem;font:600 .82rem system-ui,sans-serif;color:var(--mut);background:none;border:0;border-radius:.4rem;cursor:pointer}
.view button[aria-pressed=true]{color:var(--fg);background:var(--acc-bg)}
/* Previews view (html[data-view=previews]): every list becomes a grid of small first-page thumbnails.
   Collapsible sections and folder headings take a full row; size and date move to the tooltip. */
.thumb{display:none}
[data-view=previews] .links{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:.5rem;padding:.5rem .75rem}
[data-view=previews] .links > .fold,[data-view=previews] .group{grid-column:1/-1}
[data-view=previews] .links a{flex-direction:column;justify-content:flex-start;align-items:center;gap:.3rem;padding:.35rem;border:0;border-radius:.5rem;font-size:.75rem;line-height:1.25;text-align:center}
[data-view=previews] .links a small{display:none}
[data-view=previews] .thumb{display:block;width:100%;aspect-ratio:170/240;object-fit:cover;object-position:top;background:#fff;border:1px solid var(--line);border-radius:3px;box-shadow:0 2px 6px rgba(0,0,0,.12)}
[data-view=previews] .thumb.none{display:grid;place-items:center;color:var(--mut);font:700 .7rem ui-monospace,monospace;background:var(--acc-bg)}
[data-view=previews] .links a .new{margin:.15rem 0 0;font-size:.6rem}
[data-view=previews] .links a span{display:flex;flex-direction:column;align-items:center}
#empty{color:var(--mut)}
footer{margin-top:2rem;color:var(--mut);font-size:.8rem}
/* Flame mode (body.fire): fire gradients, glowing card borders, flame emojis rising from the bottom */
body.fire{background:radial-gradient(120% 60% at 50% 115%,rgba(255,90,0,.35),transparent 70%) fixed,var(--bg)}
body.fire h1{background:linear-gradient(90deg,#ffcf3f,#ff6a00,#e8132b);-webkit-background-clip:text;background-clip:text;color:transparent}
body.fire h2::after{content:" 🔥"}
body.fire section{border-left-color:#ff6a00;animation:flicker 1.6s ease-in-out infinite alternate}
body.fire .bar span{background:linear-gradient(90deg,#ffcf3f,#ff6a00,#e8132b)}
body.fire #fire{border-color:#ff6a00;box-shadow:0 0 12px rgba(255,106,0,.6)}
@keyframes flicker{from{box-shadow:-6px 0 14px -8px rgba(255,106,0,.8)}to{box-shadow:-8px 0 26px -6px rgba(255,170,0,.9)}}
.flames{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:50}
.flames span{position:absolute;bottom:-3rem;animation:rise linear forwards;filter:drop-shadow(0 0 6px rgba(255,120,0,.7))}
@keyframes rise{to{transform:translate(var(--dx),-115vh) scale(.3) rotate(var(--r));opacity:0}}
/* Surprise banner (random, see JS) */
#surprise{position:fixed;left:50%;bottom:1.25rem;z-index:60;display:flex;align-items:center;gap:.6rem;padding:.7rem 1.1rem;transform:translateX(-50%);border-radius:.8rem;background:linear-gradient(90deg,#e8132b,#ff6a00);color:#fff;font-weight:800;letter-spacing:.06em;text-decoration:none;box-shadow:0 8px 28px rgba(232,19,43,.45);animation:pulse 1.2s ease-in-out infinite;white-space:nowrap}
#surprise small{font-weight:600;letter-spacing:0;opacity:.85}
@keyframes pulse{50%{transform:translateX(-50%) scale(1.05);box-shadow:0 10px 36px rgba(255,106,0,.6)}}
/* Konami easter egg. During the rift the page sits above a starry void (z-index 1) and below the crack and hole (z-index 3) */
body.rift{overflow:hidden}
body.rift .wrap{position:relative;z-index:2}
#void{position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0;background:radial-gradient(1.5px 1.5px at 8% 14%,#fff,transparent),radial-gradient(1.5px 1.5px at 23% 72%,#fff,transparent),radial-gradient(1.5px 1.5px at 37% 22%,#fff,transparent),radial-gradient(1.5px 1.5px at 52% 88%,#fff,transparent),radial-gradient(1.5px 1.5px at 66% 9%,#fff,transparent),radial-gradient(1.5px 1.5px at 78% 64%,#fff,transparent),radial-gradient(1.5px 1.5px at 91% 31%,#fff,transparent),radial-gradient(1.5px 1.5px at 15% 46%,#fff,transparent),radial-gradient(1.5px 1.5px at 44% 57%,#fff,transparent),radial-gradient(1.5px 1.5px at 84% 85%,#fff,transparent),radial-gradient(1.5px 1.5px at 59% 38%,#fff,transparent),radial-gradient(1.5px 1.5px at 29% 93%,#fff,transparent),radial-gradient(1.5px 1.5px at 71% 19%,#fff,transparent),radial-gradient(1.5px 1.5px at 96% 74%,#fff,transparent),radial-gradient(1.5px 1.5px at 5% 83%,#fff,transparent),radial-gradient(1.5px 1.5px at 48% 6%,#fff,transparent),radial-gradient(circle at 50% 50%,rgba(70,35,10,.45),rgba(2,2,6,.97) 60%)}
/* Crack of light that tears the screen open before the black hole appears */
#crack{position:fixed;left:50%;top:50%;z-index:3;width:3px;height:0;transform:translate(-50%,-50%);border-radius:2px;pointer-events:none;background:linear-gradient(#fff,#ffe2a8,#fff);box-shadow:0 0 12px 4px #ffc265,0 0 40px 14px #ff8a2a}
/* Gargantua-like black hole (Interstellar), stacked in this order:
   ::before  warm haze around everything
   .lens     back of the accretion disk, bent by gravity into arcs above and below the shadow
   .shadow   the black disk, with a thin bright photon ring at its edge
   .disk     front of the accretion disk, seen almost edge-on, passing in front of the shadow;
             ::before = moving streaks (rotation), ::after = brighter left side (Doppler beaming) */
#hole{--d:min(56vmin,320px);position:fixed;left:50%;top:50%;z-index:3;width:var(--d);height:var(--d);margin:calc(var(--d) / -2) 0 0 calc(var(--d) / -2);pointer-events:none;transform:scale(0)}
#hole i{position:absolute;display:block;border-radius:50%}
#hole::before{content:"";position:absolute;inset:-45%;border-radius:50%;background:radial-gradient(circle,rgba(255,170,80,.35),rgba(255,120,40,.12) 40%,transparent 65%)}
#hole .lens{inset:-8%;background:radial-gradient(circle,transparent 0 41%,#fff8e6 43%,#ffd27a 46%,#ff9a3c 51%,rgba(255,110,20,.35) 58%,transparent 67%);filter:blur(1.5px);-webkit-mask:linear-gradient(#000 0 32%,rgba(0,0,0,.3) 46% 54%,#000 68%);mask:linear-gradient(#000 0 32%,rgba(0,0,0,.3) 46% 54%,#000 68%)}
#hole .shadow{inset:21%;background:#000;box-shadow:0 0 0 1.5px #fff3d0,0 0 10px 3px rgba(255,205,130,.9),0 0 30px 8px rgba(255,140,50,.45)}
#hole .disk{left:-80%;width:260%;top:44.5%;height:11%;overflow:hidden;background:radial-gradient(ellipse at 50% 50%,#fff 0,#fff3d0 10%,#ffc265 28%,#ff8a2a 46%,rgba(255,90,10,.35) 62%,transparent 72%);filter:blur(.8px)}
#hole .disk::before{content:"";position:absolute;inset:0 -50%;background:repeating-linear-gradient(90deg,transparent 0 9px,rgba(255,255,255,.1) 12px,transparent 17px,transparent 26px,rgba(255,240,200,.14) 30px,transparent 37px);animation:swirl 1.4s linear infinite}
#hole .disk::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.35),transparent 45%,rgba(60,20,0,.35))}
@keyframes swirl{to{transform:translateX(-37px)}}
/* White flash when the hole collapses, and the confetti canvas drawn on top of everything */
#flash{position:fixed;inset:0;z-index:65;background:#fff;opacity:0;pointer-events:none}
.confetti{position:fixed;inset:0;z-index:70;width:100%;height:100%;pointer-events:none}
/* Party theme after the rift (15 s): pastel rainbow background, rainbow title, colour-cycling borders */
body.party{--fg:#1b1530;--mut:#4a4360;--line:rgba(40,20,80,.15);--acc:#5b2bd6;--acc-bg:rgba(255,255,255,.5);--card:rgba(255,255,255,.7);background:linear-gradient(120deg,#ffd1dc,#fff1b8,#c9f7e1,#cfe6ff,#e6d5ff,#ffd1dc) fixed;background-size:400% 400%;animation:party-bg 8s linear infinite}
body.party h1{background:linear-gradient(90deg,#ff3d7f,#ffb300,#2ec27e,#2f80ed,#9b51e0,#ff3d7f);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:party-text 2s linear infinite}
body.party section{animation:party-border 1.2s linear infinite}
body.party .bar span{background:linear-gradient(90deg,#ff3d7f,#ffb300,#2ec27e,#2f80ed,#9b51e0)}
body.party h2::after{content:" 🎉"}
@keyframes party-bg{to{background-position:400% 0}}
@keyframes party-text{to{background-position:200% 0}}
@keyframes party-border{0%,100%{border-left-color:#ff3d7f}20%{border-left-color:#ffb300}40%{border-left-color:#2ec27e}60%{border-left-color:#2f80ed}80%{border-left-color:#9b51e0}}
/* Jazz bar night theme (body.night, from 21:30 to 1:00): dim warm light from above, amber and
   burgundy tones, a flickering neon sign for the title, cards glowing like candle-lit tables */
body.night{--bg:#120a09;--fg:#f3e3c3;--card:rgba(48,26,18,.85);--line:rgba(255,190,120,.16);--acc:#f5b041;--acc-bg:rgba(245,176,65,.13);--mut:#b89a7a;--new:#ffcf70;--new-bg:rgba(255,207,112,.15);background:radial-gradient(70% 45% at 50% -8%,rgba(255,176,90,.28),transparent 70%) fixed,radial-gradient(45% 35% at 90% 105%,rgba(150,25,55,.3),transparent 70%) fixed,radial-gradient(40% 30% at 5% 100%,rgba(120,40,20,.25),transparent 70%) fixed,var(--bg)}
body.night h1{color:#ffe1b0;font-family:"Brush Script MT","Segoe Script",cursive;font-weight:400;font-size:2.6rem;letter-spacing:.01em;text-shadow:0 0 4px #fff2d6,0 0 12px #ff9d4d,0 0 26px #ff5e8a,0 0 48px #ff2d6f;animation:neon 6s infinite}
body.night h1::after{content:" 🎷"}
body.night .sub{color:#e9c89a;font-style:italic}
body.night #fire,body.metal #fire,body.epic #fire{display:none}  /* no flame mode during the night shows, see applyNight in JS */
/* Epic finale (body.epic): a fantasy night in deep blue and violet, an aurora glowing behind
   everything (::before), the title in carved capitals lit by blue fire, cards edged with arcane light */
body.epic{--bg:#05040f;--fg:#e9e6ff;--card:rgba(14,12,40,.85);--line:rgba(140,120,255,.22);--acc:#8fb4ff;--acc-bg:rgba(110,140,255,.14);--mut:#a6a2cc;--new:#9ff3ff;--new-bg:rgba(120,230,255,.14);background:var(--bg)}
body.epic::before{content:"";position:fixed;inset:-20%;z-index:0;pointer-events:none;background:radial-gradient(45% 35% at 30% 10%,rgba(90,60,255,.35),transparent 70%),radial-gradient(40% 30% at 75% 15%,rgba(40,150,255,.3),transparent 70%),radial-gradient(60% 40% at 50% 110%,rgba(60,90,255,.45),transparent 70%);animation:aurora 14s ease-in-out infinite alternate}
body.epic .wrap{position:relative;z-index:1}
body.epic h1{font:700 2.8rem "Cinzel","Trajan Pro","Palatino Linotype",Georgia,serif;text-transform:uppercase;letter-spacing:.14em;background:linear-gradient(90deg,#9fd8ff,#ffffff 30%,#b9a4ff 55%,#7fd0ff 80%,#ffffff);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 10px rgba(110,150,255,.9)) drop-shadow(0 0 30px rgba(140,80,255,.6));animation:shimmer 6s linear infinite}
body.epic h1::after{content:" ⚔️";-webkit-text-fill-color:initial;filter:none}
body.epic .sub{color:#b9c8ff;font:italic 1.05rem "Palatino Linotype",Georgia,serif;letter-spacing:.06em}
body.epic section{animation:arcane 4s ease-in-out infinite alternate}
@keyframes aurora{from{transform:translateX(-4%) rotate(-2deg)}to{transform:translateX(4%) rotate(2deg)}}
@keyframes shimmer{to{background-position:200% 0}}
@keyframes arcane{from{box-shadow:-8px 0 24px -12px rgba(90,140,255,.8)}to{box-shadow:-10px 0 34px -10px rgba(170,90,255,.9)}}
/* "More epicness ?" button, rising in the middle of the metal show 10 s before it ends */
#more{position:fixed;left:50%;top:50%;z-index:60;padding:1rem 2rem;transform:translate(-50%,-50%);color:#fff;font:700 1.4rem "Palatino Linotype",Georgia,serif;letter-spacing:.05em;background:radial-gradient(circle at 50% 30%,#6c7bff,#3b1f9e 70%);border:2px solid #b9c8ff;border-radius:999px;box-shadow:0 0 30px rgba(110,140,255,.9),0 0 80px rgba(150,80,255,.6),inset 0 0 18px rgba(255,255,255,.35);cursor:pointer;animation:more-in .6s cubic-bezier(.34,1.56,.64,1) both,more-glow 1.2s ease-in-out .6s infinite alternate}
#more:hover{filter:brightness(1.2)}
#more.queued{cursor:default;animation:none;background:radial-gradient(circle at 50% 30%,#3e4bbf,#1e0f5e 70%)}
/* "Back to normal", small and discreet in the bottom right corner of the epic finale */
#leave{position:fixed;right:1rem;bottom:1rem;z-index:45;padding:.35rem .7rem;color:#c9d4ff;font:600 .75rem system-ui,sans-serif;background:rgba(12,10,40,.75);border:1px solid rgba(140,160,255,.45);border-radius:999px;cursor:pointer}
#leave:hover,#leave:focus-visible{color:#fff;border-color:#b9c8ff;box-shadow:0 0 12px rgba(120,150,255,.6)}
@keyframes more-in{from{opacity:0;transform:translate(-50%,20%) scale(.6)}}
@keyframes more-glow{to{box-shadow:0 0 45px rgba(140,170,255,1),0 0 120px rgba(170,90,255,.8),inset 0 0 22px rgba(255,255,255,.5)}}
/* Metal takeover (body.metal, 1:00:00 - 1:01:51): pitch black stage, blood red light pulsing on
   the beat behind everything (::before), chrome title skewed like a band logo */
body.metal{--bg:#050404;--fg:#f4f1f1;--card:rgba(24,6,6,.88);--line:rgba(255,50,30,.25);--acc:#ff3b1f;--acc-bg:rgba(255,59,31,.14);--mut:#b9a9a9;--new:#ffd23f;--new-bg:rgba(255,210,63,.16);background:var(--bg)}
body.metal::before{content:"";position:fixed;inset:-10%;z-index:0;pointer-events:none;background:radial-gradient(50% 40% at 50% 100%,rgba(255,30,0,.45),transparent 70%),radial-gradient(35% 30% at 0% 0%,rgba(160,0,0,.4),transparent 70%),radial-gradient(35% 30% at 100% 0%,rgba(160,0,0,.4),transparent 70%);animation:beat .5s ease-out infinite}
body.metal .wrap{position:relative;z-index:1}
body.metal h1{font:900 3rem Impact,"Arial Black",sans-serif;text-transform:uppercase;letter-spacing:.06em;background:linear-gradient(180deg,#fff 0%,#cfcfcf 35%,#5a5a5a 50%,#e8e8e8 65%,#8a8a8a 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 2px #000) drop-shadow(0 0 14px rgba(255,40,0,.8));transform:skew(-10deg);transform-origin:left}
body.metal h1::after{content:" 🤘";-webkit-text-fill-color:initial}
body.metal .sub{color:#ff4a2a;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
body.metal section{box-shadow:-10px 0 24px -12px rgba(255,40,0,.8)}
@keyframes beat{0%{opacity:1;transform:scale(1.04)}100%{opacity:.55;transform:scale(1)}}
/* Metal stage animations: cards headbanging on the beat (the right column half a beat later),
   the title vibrating like a riff, a white flash when lightning strikes (#strobe; the bolts
   themselves are drawn on the #metalfx canvas by JS), and an equalizer along the bottom (#eq) */
body.metal section{transform-origin:0 100%;animation:headbang .46s ease-in-out infinite alternate}
body.metal .col:nth-child(2) section{animation-delay:-.23s}
body.metal h1{animation:riff .12s steps(2) infinite}
#metalfx{position:fixed;inset:0;z-index:2;width:100%;height:100%;pointer-events:none}
#strobe{position:fixed;inset:0;z-index:3;pointer-events:none;background:#fff;opacity:0}
#eq{position:fixed;left:0;right:0;bottom:0;z-index:2;height:4.5rem;display:flex;align-items:flex-end;gap:3px;padding:0 3px;pointer-events:none;opacity:.6}
#eq i{flex:1;height:100%;transform-origin:bottom;background:linear-gradient(to top,#ff1e00,#ff7a00 55%,#ffe14d);border-radius:2px 2px 0 0;animation:eq var(--d) ease-in-out infinite alternate}
/* Guitar amp (replaces the turntable during the metal takeover): black tolex cabinet with a gold
   logo, a row of knobs and two speakers behind the grille that pump while the song plays */
#amp{position:fixed;left:1.1rem;bottom:1.1rem;z-index:40;display:flex;align-items:center;gap:.6rem;padding:0;color:#f4f1f1;font:700 .78rem system-ui,sans-serif;background:none;border:0;cursor:pointer}
#amp .cab{position:relative;width:5.4rem;height:4.4rem;padding:.25rem;border-radius:.35rem;background:repeating-linear-gradient(45deg,#151515 0 2px,#1d1d1d 2px 4px);box-shadow:0 6px 20px rgba(0,0,0,.8),0 0 0 2px #2b2b2b,0 0 18px rgba(255,40,0,.35)}
#amp .panel{display:flex;align-items:center;justify-content:space-between;height:.9rem;padding:0 .25rem;background:linear-gradient(#3a3a3a,#1a1a1a);border-radius:.15rem}
#amp .logo{font:italic 900 .55rem Georgia,serif;color:#e8c46a;letter-spacing:.04em}
#amp .knobs{display:flex;gap:.15rem}
#amp .knobs i{width:.32rem;height:.32rem;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,#888 60%,#333)}
#amp .grille{display:flex;justify-content:space-around;align-items:center;height:3rem;margin-top:.2rem;border-radius:.15rem;background:radial-gradient(circle,#2a2a2a 1px,transparent 1.5px) 0 0/4px 4px,#0c0c0c}
#amp .cone{width:2.1rem;height:2.1rem;border-radius:50%;background:radial-gradient(circle,#555 0 12%,#111 16%,#262626 40%,#0e0e0e 42%,#222 70%,#000 72%)}
#amp.playing .cone{animation:pump .23s ease-out infinite alternate}
#amp .label{padding:.3rem .6rem;border-radius:.3rem;background:rgba(30,4,4,.9);border:1px solid rgba(255,60,30,.5);text-transform:uppercase;letter-spacing:.04em}
#riff,#epicriff{position:fixed;left:0;bottom:0;width:200px;height:113px;opacity:0;pointer-events:none;z-index:-1;border:0}
/* The amp during the epic finale: same cabinet, lit by arcane blue light */
#amp.epic .cab{box-shadow:0 6px 20px rgba(0,0,0,.8),0 0 0 2px #2b2b55,0 0 26px rgba(110,140,255,.8),0 0 60px rgba(150,80,255,.45)}
#amp.epic .logo{color:#9fd8ff;text-shadow:0 0 6px #6fa8ff}
#amp.epic .cone{background:radial-gradient(circle,#9fd8ff 0 10%,#11112a 14%,#24245a 40%,#0b0b20 42%,#1d1d46 70%,#000 72%)}
#amp.epic .label{background:rgba(12,10,40,.9);border-color:rgba(140,160,255,.6)}
@keyframes pump{from{transform:scale(1)}to{transform:scale(1.12)}}
@keyframes headbang{from{transform:rotate(-.7deg) translateY(0)}to{transform:rotate(.7deg) translateY(4px)}}
@keyframes riff{0%{transform:skew(-10deg) translate(0,0)}50%{transform:skew(-10deg) translate(2px,-1px)}}
@keyframes eq{from{transform:scaleY(var(--lo))}to{transform:scaleY(var(--hi))}}
body.night section{box-shadow:-8px 0 22px -12px rgba(255,170,80,.6)}
body.night .links a:hover{background:rgba(245,176,65,.08)}
/* Bar air (night only): slow drifting smoke clouds and music notes floating up, behind the page */
.air{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
body.night:not(.rift) .wrap{position:relative;z-index:1}
.air .smoke{position:absolute;width:70vmax;height:40vmax;border-radius:50%;background:radial-gradient(closest-side,rgba(230,200,170,.07),transparent);filter:blur(30px);animation:drift linear infinite}
.air .note{position:absolute;bottom:-2rem;color:#f5b041;text-shadow:0 0 8px rgba(245,176,65,.6);animation:float linear forwards}
@keyframes drift{0%{transform:translate(-30vw,0) scale(1)}50%{transform:translate(20vw,-8vh) scale(1.25)}100%{transform:translate(70vw,4vh) scale(1)}}
@keyframes float{0%{transform:translate(0,0) rotate(0);opacity:0}15%{opacity:var(--o)}50%{transform:translate(var(--sway),-55vh) rotate(var(--r))}100%{transform:translate(0,-110vh) rotate(0);opacity:0}}
/* Night music: a vinyl record in the bottom left corner, spinning while the jazz plays.
   The YouTube player itself is kept invisible behind it. */
#vinyl{position:fixed;left:1.1rem;bottom:1.1rem;z-index:40;display:flex;align-items:center;gap:.6rem;padding:0;color:#f3e3c3;font:600 .78rem system-ui,sans-serif;background:none;border:0;cursor:pointer}
/* Turntable: wooden plinth, record on the left, tonearm hanging from a pivot in the top right.
   At rest the arm sits beside the record; when playing it swings onto the outer grooves. */
#vinyl .deck{position:relative;width:4.8rem;height:3.8rem;border-radius:.45rem;background:linear-gradient(135deg,#7a4a26,#4a2a14 60%,#3a200f);box-shadow:0 6px 18px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,220,170,.25)}
#vinyl .disc{position:absolute;left:.3rem;top:.3rem;width:3.2rem;height:3.2rem;border-radius:50%;background:radial-gradient(circle,#f5b041 0 17%,#2a1208 18% 20%,#111 21%,#1c1c1c 30%,#0d0d0d 31%,#1c1c1c 42%,#0d0d0d 43%,#1c1c1c 56%,#0d0d0d 57%,#151515 70%);box-shadow:0 0 0 2px #1a1a1a,0 2px 6px rgba(0,0,0,.7)}
#vinyl.playing .disc{animation:spin 1.8s linear infinite}
#vinyl .arm{position:absolute;right:.42rem;top:.35rem;width:3px;height:2.4rem;margin-left:-1.5px;border-radius:2px;background:linear-gradient(#e8e2d6,#a9a296);transform-origin:50% 0;transform:rotate(-4deg);transition:transform .9s cubic-bezier(.4,0,.2,1)}
#vinyl .arm::before{content:"";position:absolute;left:50%;top:-.3rem;width:.6rem;height:.6rem;margin-left:-.3rem;border-radius:50%;background:radial-gradient(circle,#ddd 0 30%,#777 35%,#333)}
#vinyl .arm::after{content:"";position:absolute;left:50%;bottom:-.2rem;width:.45rem;height:.3rem;margin-left:-.3rem;border-radius:1px;background:#cfc8bb;transform:rotate(18deg)}
#vinyl.playing .arm{transform:rotate(25deg)}
#vinyl .label{padding:.3rem .6rem;border-radius:999px;background:rgba(48,26,18,.85);border:1px solid rgba(245,176,65,.3)}
#jazz{position:fixed;left:0;bottom:0;width:200px;height:113px;opacity:0;pointer-events:none;z-index:-1;border:0}
@keyframes spin{to{transform:rotate(360deg)}}
/* Closing time: darker, colder light and a blue-violet neon */
body.night[data-phase=closing]{--bg:#08080f;--card:rgba(22,22,40,.85);--line:rgba(150,160,255,.14);--mut:#9a97b8;background:radial-gradient(60% 40% at 50% -8%,rgba(110,130,255,.2),transparent 70%) fixed,radial-gradient(45% 35% at 90% 105%,rgba(130,40,160,.3),transparent 70%) fixed,radial-gradient(40% 30% at 5% 100%,rgba(40,60,140,.25),transparent 70%) fixed,var(--bg)}
body.night[data-phase=closing] h1{color:#e6e0ff;text-shadow:0 0 4px #f1edff,0 0 12px #8fa2ff,0 0 26px #b45cff,0 0 48px #7a3cff}
body.night[data-phase=closing] section{box-shadow:-8px 0 22px -12px rgba(140,150,255,.55)}
/* Closing time (0:45 - 1:00): the sign goes out letter by letter (each .l waits --i x 0.7 s, the
   sax last), then the bartender comes up from the bottom of the screen to send you to bed */
body.night[data-phase=closing] h1{animation:none}
body.night[data-phase=closing] h1 .l{animation:neon-off .7s forwards;animation-delay:calc(1s + var(--i) * .7s)}
body.night[data-phase=closing] h1::after{display:inline-block;animation:neon-off .7s forwards;animation-delay:calc(1s + var(--n) * .7s)}
#barman{position:fixed;left:50%;bottom:1.2rem;z-index:45;display:flex;align-items:center;gap:.7rem;padding:.6rem 1rem .6rem .7rem;transform:translateX(-50%);color:#f3e3c3;background:rgba(22,18,30,.95);border:1px solid rgba(245,176,65,.4);border-radius:1rem;box-shadow:0 10px 30px rgba(0,0,0,.6);cursor:pointer;opacity:0;animation:barman-in .8s cubic-bezier(.34,1.56,.64,1) forwards}
#barman .who{font-size:2.2rem;line-height:1}
#barman .say{font:italic 600 1rem Georgia,serif}
#barman .say small{display:block;font:400 .7rem system-ui,sans-serif;color:#9a97b8;font-style:normal}
@keyframes neon-off{0%{opacity:1}20%{opacity:.2}30%{opacity:1}50%{opacity:.15}62%{opacity:.85}100%{opacity:.2;color:#3a3550;text-shadow:none}}
@keyframes barman-in{from{opacity:0;transform:translate(-50%,140%)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes neon{0%,18%,22%,25%,53%,57%,100%{opacity:1}20%,24%,55%{opacity:.55;text-shadow:0 0 2px #fff2d6,0 0 6px #ff9d4d}}
/* Style changes (View Transitions, see applyNight in JS): ::view-transition-old is a snapshot of
   the page before, ::view-transition-new the page after, html[data-vt] says where we are going */
[data-vt=night]::view-transition-old(root){animation:vt-dim-out 1.6s ease-in both}
[data-vt=night]::view-transition-new(root){animation:vt-dim-in 1.6s ease-out both}
[data-vt=metal]::view-transition-old(root){animation:vt-slam-out .55s cubic-bezier(.55,0,1,.45) both}
[data-vt=metal]::view-transition-new(root){animation:vt-slam-in .75s cubic-bezier(.2,.9,.3,1.2) both}
[data-vt=day]::view-transition-old(root){animation:vt-fade-out 1.1s ease both}
[data-vt=day]::view-transition-new(root){animation:vt-dawn-in 1.1s ease both}
@keyframes vt-dim-out{to{opacity:0;filter:brightness(.4) sepia(.6)}}
@keyframes vt-dim-in{from{opacity:0;filter:brightness(.3) blur(3px)}}
@keyframes vt-slam-out{to{opacity:0;transform:scale(1.25);filter:brightness(2) saturate(3) hue-rotate(-30deg) blur(4px)}}
@keyframes vt-slam-in{0%{opacity:0;transform:scale(.85);filter:brightness(4)}60%{opacity:1;filter:brightness(1.6)}100%{transform:none;filter:none}}
[data-vt=epic]::view-transition-old(root){animation:vt-to-light 1.3s ease-in both}
[data-vt=epic]::view-transition-new(root){animation:vt-from-light 1.6s ease-out both}
@keyframes vt-to-light{to{opacity:0;filter:brightness(3) saturate(0) blur(6px)}}
@keyframes vt-from-light{from{opacity:0;filter:brightness(3) hue-rotate(60deg) blur(8px);transform:scale(1.04)}}
@keyframes vt-fade-out{to{opacity:0}}
@keyframes vt-dawn-in{from{opacity:0;filter:brightness(1.6)}}
/* Reduced motion: no rising flames and no looping animations */
@media(prefers-reduced-motion:reduce){.flames,.air{display:none}body.fire section,#surprise,#hole .disk::before,body.party,body.party h1,body.party section,body.night h1,body.night[data-phase] h1,body.metal::before,body.metal section,body.metal h1,#eq i,body.epic::before,body.epic h1,body.epic section{animation:none}}
"""

# Runs in <head> so the saved theme applies before the first paint (no light/dark flicker).
# localStorage can throw (private mode, blocked storage), hence the try/catch everywhere.
THEME_JS = """
try { const t = localStorage.getItem("theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
try { const v = localStorage.getItem("view"); if (v) document.documentElement.dataset.view = v; } catch (e) {}
"""

# Runs at the end of <body>, once every element exists
JS = """
// Theme toggle: flip between light and dark, starting from what is shown now.
// With no saved choice, the page follows the system (prefers-color-scheme); the button
// then sets data-theme on <html>, which overrides it (see the colour tokens in CSS).
const root = document.documentElement, themeBtn = document.getElementById("theme");
const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
const paintBtn = () => { themeBtn.textContent = isDark() ? "☀" : "☾"; themeBtn.title = isDark() ? "Light mode" : "Dark mode"; };
themeBtn.addEventListener("click", () => {
  root.dataset.theme = isDark() ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  paintBtn();
});
paintBtn();

// Flame mode: fire styling (body.fire in CSS) plus flames rising from the bottom of the screen.
// The flames live in a fixed, click-through layer so they never get in the way.
const fireBtn = document.getElementById("fire"), layer = document.createElement("div");
layer.className = "flames";
document.body.append(layer);
let timer = null;  // interval spawning new flames while the mode is on
// While the page is in the background the browser pauses CSS animations, so the floating emojis
// (flames, music notes) never reach their end and are never removed, while the intervals keep
// adding more: they piled up at the bottom of the screen and made the page lag on return.
// So nothing is added while the page is hidden, and never more than `max` at once in a layer.
const crowded = (box, max) => document.hidden || box.childElementCount >= max;
// One flame emoji at x% of the width, size in rem, rising for dur seconds with a random drift
// and tilt (--dx, --r, used by the "rise" keyframes); it removes itself when the animation ends
const flame = (x, size, dur) => {
  if (crowded(layer, 70)) return;
  const f = document.createElement("span");
  f.textContent = "🔥";
  f.style.cssText = `left:${x}%;font-size:${size}rem;animation-duration:${dur}s;--dx:${(Math.random() - .5) * 120}px;--r:${(Math.random() - .5) * 60}deg`;
  f.addEventListener("animationend", () => f.remove());
  layer.append(f);
};
// Turn the mode on (a burst of 25 flames, then a new one every 140 ms) or off, and remember it
const setFire = on => {
  document.body.classList.toggle("fire", on);
  fireBtn.setAttribute("aria-pressed", on);
  clearInterval(timer);
  if (on) {
    for (let i = 0; i < 25; i++) flame(Math.random() * 100, 1 + Math.random() * 2, 2 + Math.random() * 3);
    timer = setInterval(() => flame(Math.random() * 100, .8 + Math.random() * 1.8, 3 + Math.random() * 4), 140);
  } else layer.replaceChildren();  // drop the flames still rising, right away
  try { localStorage.setItem("fire", on ? "1" : ""); } catch (e) {}
};
// 20 clicks on the flame button within a minute start the metal takeover (easter egg, see
// metalEggAt in the night code below); the clicks counted are the ones of the last 60 s
const fireClicks = [];
fireBtn.addEventListener("click", () => {
  setFire(!document.body.classList.contains("fire"));
  const now = Date.now();
  fireClicks.push(now);
  while (fireClicks[0] < now - 60000) fireClicks.shift();
  if (fireClicks.length === 10) preloadRiff();  // halfway: get the song ready (see the metal music)
  if (fireClicks.length >= 20) {
    fireClicks.length = 0;
    metalEggAt = now;
    applyNight();
  }
});
try { if (localStorage.getItem("fire")) setFire(true); } catch (e) {}

// Surprise banner: on about 1 visit in 5, an "important new content" banner links to a Rickroll.
// It opens in a new tab and disappears once clicked.
if (Math.random() < 0.2) {
  const banner = document.createElement("a");
  banner.id = "surprise";
  banner.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  banner.target = "_blank";
  banner.rel = "noopener";
  banner.innerHTML = "⚠ IMPORTANT NEW CONTENT <small>click to open</small>";
  banner.addEventListener("click", () => banner.remove());
  document.body.append(banner);
}

// Konami code easter egg (up up down down left right left right B A): a dimensional rift opens,
// a black hole swallows the page, then everything comes back in confetti colours
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let konamiPos = 0,     // how many keys of the sequence have been typed so far
    riftBusy = false;  // true while the animation (and the party after it) runs, to ignore repeats
document.addEventListener("keydown", e => {
  if (e.target.matches("input")) return;  // typing in the search field never triggers it
  // Advance on the expected key; on a wrong key restart, unless it is itself a first "up"
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  konamiPos = k === KONAMI[konamiPos] ? konamiPos + 1 : (k === KONAMI[0] ? 1 : 0);
  if (konamiPos === KONAMI.length) { konamiPos = 0; rift(); }
});

const wait = ms => new Promise(r => setTimeout(r, ms));  // pause inside an async function
// Create an element, give it an id (styled in CSS) and add it at the end of <body>
const make = (tag, id) => { const el = document.createElement(tag); if (id) el.id = id; document.body.append(el); return el; };

// Confetti on a full-screen canvas: an explosion from (ox, oy) plus a rain from the top.
// Each piece is a small rectangle with gravity, air drag, a little sideways wobble and a flip
// (scaleY by cos) so it looks like paper; the canvas is removed after 7 s or once all have fallen.
function confetti(ox, oy) {
  const c = make("canvas"), ctx = c.getContext("2d"), dpr = devicePixelRatio || 1;
  const W = innerWidth, H = innerHeight;
  c.className = "confetti";
  c.width = W * dpr; c.height = H * dpr; ctx.scale(dpr, dpr);
  const colors = ["#ff3d7f", "#ffb300", "#2ec27e", "#2f80ed", "#9b51e0", "#00e5ff", "#ffe066"];
  const parts = [];
  const add = (x, y, vx, vy) => parts.push({ x, y, vx, vy, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4,
    r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: colors[Math.floor(Math.random() * colors.length)] });
  for (let i = 0; i < 260; i++) {           // explosion out of the black hole
    const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 14;
    add(ox, oy, Math.cos(a) * s, Math.sin(a) * s - 5);
  }
  for (let i = 0; i < 180; i++) add(Math.random() * W, -Math.random() * H, (Math.random() - .5) * 2, 1 + Math.random() * 3);  // rain
  const end = performance.now() + 7000;
  (function frame(now) {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vx *= .985; p.vy = p.vy * .985 + .22;
      p.x += p.vx + Math.sin(p.r) * .6; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(p.r * 2));
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    if (now < end && parts.some(p => p.y < H + 20)) requestAnimationFrame(frame); else c.remove();
  })(performance.now());
}

// The whole Konami animation, about 5 s, then 15 s of party theme. Every movement uses the
// Web Animations API (el.animate), so nothing in the page layout is changed for real:
// cancelling the animations is enough to put every element back where it was.
async function rift() {
  if (riftBusy) return;
  riftBusy = true;
  const hx = innerWidth / 2, hy = innerHeight / 2;  // centre of the screen = centre of the hole
  // Final state: party colours (body.party in CSS) and confetti for 15 s, then back to normal
  const party = () => {
    document.body.classList.add("party");
    confetti(hx, hy);
    setTimeout(() => { document.body.classList.remove("party"); riftBusy = false; }, 15000);
  };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return party();  // skip the black hole

  // The pieces that get swallowed one by one: header parts, card titles and every visible line
  // of the cards (hidden ones, e.g. inside closed sections, have no size and are left out)
  const pieces = [...document.querySelectorAll(
    "header h1, header .sub, #search, .view, .tools button, main section .code, main section h2, main section > .links > li, footer"
  )].filter(el => el.getBoundingClientRect().width > 0);
  const wrap = document.querySelector(".wrap");
  document.body.classList.add("rift");
  const space = make("div", "void"), crack = make("div", "crack"), hole = make("div", "hole"), flash = make("div", "flash");
  hole.innerHTML = '<i class="lens"></i><i class="shadow"></i><i class="disk"></i>';

  // 1. The rift tears open: darkness falls, a crack of light splits the screen, the page trembles
  space.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, fill: "forwards" });
  crack.animate([
    { height: "0", width: "3px" }, { height: "35vh", width: "2px", offset: .5 },
    { height: "70vh", width: "5px", offset: .8 }, { height: "70vh", width: "40px", opacity: 0 }
  ], { duration: 1100, easing: "ease-in", fill: "forwards" });
  wrap.animate(Array.from({ length: 24 }, (_, i) => {
    const a = i / 24 * 6;
    return { transform: `translate(${(Math.random() - .5) * a}px, ${(Math.random() - .5) * a}px)` };
  }), { duration: 3000 });
  await wait(800);

  // 2. The black hole opens
  hole.animate([{ transform: "scale(0)" }, { transform: "scale(1.12)", offset: .7 }, { transform: "scale(1)" }],
    { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
  await wait(400);

  // 3. Every piece of the page spirals into it, closest first.
  //    (dx, dy) goes from the piece to the hole; halfway, the piece is pushed sideways along
  //    (-dy, dx) to curve its path into a spiral, while it spins, shrinks to nothing and blurs.
  const flights = pieces.map(el => {
    const b = el.getBoundingClientRect();
    const dx = hx - (b.left + b.width / 2), dy = hy - (b.top + b.height / 2);
    const dist = Math.hypot(dx, dy), spin = (Math.random() < .5 ? -1 : 1) * (360 + Math.random() * 540);
    const anim = el.animate([
      { transform: "none", opacity: 1, filter: "blur(0)" },
      { transform: `translate(${dx * .35 - dy * .3}px, ${dy * .35 + dx * .3}px) rotate(${spin * .3}deg) scale(.85)`, offset: .45 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0)`, opacity: 0, filter: "blur(6px)" }
    ], { duration: 900 + Math.random() * 500, delay: Math.min(dist, 900) * 1.1, easing: "cubic-bezier(.55,0,1,.45)", fill: "forwards" });
    return { el, anim, dx, dy, spin };
  });
  await Promise.all(flights.map(f => f.anim.finished));

  // 4. The hole collapses in a flash of light
  hole.animate([{ transform: "scale(1)" }, { transform: "scale(1.4)", offset: .3 }, { transform: "scale(0)" }],
    { duration: 500, easing: "ease-in", fill: "forwards" });
  await wait(350);
  flash.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 700 });
  await wait(250);
  [space, crack, hole].forEach(el => el.remove());
  setTimeout(() => flash.remove(), 700);
  document.body.classList.remove("rift");

  // 5. Everything comes back out, bouncing into place, in confetti colours:
  //    drop the "swallowed" state, then play each piece from the hole back to its own spot
  //    (the cubic-bezier above 1 gives the overshoot bounce)
  party();
  flights.forEach(({ el, anim, dx, dy, spin }) => {
    anim.cancel();
    el.animate([
      { transform: `translate(${dx}px, ${dy}px) rotate(${-spin / 2}deg) scale(0)`, opacity: 0 },
      { transform: "none", opacity: 1 }
    ], { duration: 700, delay: Math.random() * 400, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "backwards" });
  });
}

// Night: from 21:30 the page turns into a jazz bar (body.night in CSS), then plays one metal song.
// The night goes through phases (body[data-phase] in CSS):
//   evening  21:30    - 0:45     jazz bar, warm light
//   closing   0:45    - 1:00     the bar closes, the subtitle changes (see below)
//   metal     1:00:00 - 1:01:51  hard rock / metal takeover for one song (body.metal, see below)
//   epic      after a metal takeover, only if "More epicness ?" was clicked (body.epic, see below)
// After that the page is back to its usual day look.
// Checked every second (the metal phase is short and must start right on time).
// ?night=0 / 1 / evening / closing / metal in the URL forces a phase (handy to try it any time).
const sub = document.querySelector(".sub"), daySub = sub.textContent;
const NIGHT_SUBS = {  // null = keep the usual subtitle
  evening: null,
  closing: "Last call was a while ago.",
  metal: "1:00 AM. Time to headbang. 🤘",
  epic: "Behold… more epicness.",
};
const NIGHT = new Set(["evening", "closing"]);  // the jazz bar phases (body.night)
const METAL_SECONDS = 111;  // the song plays from 1:50 to its end, 1 min 51 s later
const forced = new URLSearchParams(location.search).get("night");
// Easter egg: spamming the flame button (see below) starts the metal takeover at any time of
// day, for one song; metalEggAt is when it started (0 = not running)
let metalEggAt = 0;
// Epic finale: 10 s before a metal takeover ends, a "More epicness ?" button shows up (see the
// epic code below). Clicked, it queues the epic phase (body.epic), which takes over right when
// the metal ends and lasts until the "Back to normal" button is clicked (epicAt = when it started,
// 0 = not running). ?night=epic forces it, until that button is clicked (epicLeft).
let epicQueued = false, epicAt = 0, epicLeft = false;
const clockSeconds = () => { const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); };
const metalLeft = () => {  // seconds before the current metal takeover ends (Infinity when forced)
  if (metalEggAt) return METAL_SECONDS - (Date.now() - metalEggAt) / 1000;
  if (forced === "metal") return Infinity;
  return 3600 + METAL_SECONDS - clockSeconds();
};
const phaseNow = () => {
  if ((forced === "epic" && !epicLeft) || epicAt) return "epic";
  const phase = basePhase();
  if (epicQueued && phase !== "metal") {  // the metal just ended: the epic finale takes over
    epicQueued = false;
    if (document.body.dataset.phase === "metal") { epicAt = Date.now(); return "epic"; }
  }
  return phase;
};
const basePhase = () => {
  if (metalEggAt && Date.now() - metalEggAt < METAL_SECONDS * 1000) return "metal";
  metalEggAt = 0;
  if (forced === "0") return null;
  if (forced in NIGHT_SUBS && forced !== "epic") return forced;  // a left epic falls back to the clock
  const d = new Date(), t = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  if (t >= 21 * 3600 + 30 * 60 || t < 45 * 60) return "evening";
  if (t < 3600) return "closing";
  if (t < 3600 + METAL_SECONDS) return "metal";
  return forced === "1" ? "evening" : null;  // ?night=1 during the day: start of the night
};
// Changing style is animated with the View Transitions API: the browser snapshots the page before
// and after the change and animates between the two (CSS ::view-transition-*, picked by
// html[data-vt]): a slow warm fade into the jazz bar, a hard slam into the metal show, a soft fade
// back to the day. Not on the first load, not with reduced motion, and browsers without the API
// just switch instantly.
let nightShown = false;
const applyNight = () => {
  const phase = phaseNow();
  if (phase === (document.body.dataset.phase || null)) { nightShown = true; return; }
  const night = NIGHT.has(phase), metal = phase === "metal", epic = phase === "epic";
  const swap = () => {
    if (phase) document.body.dataset.phase = phase; else delete document.body.dataset.phase;
    sub.textContent = (metalEggAt && phase === "metal" ? "You lit too many fires. Time to headbang. 🤘"
      : phase && NIGHT_SUBS[phase]) || daySub;
    // Flames on top of the jazz bar or the metal show are too many moving elements (the page
    // lags): both turn the flame mode off, and hide its button while they last (CSS)
    if ((night || metal || epic) && document.body.classList.contains("fire")) setFire(false);
    if (night !== document.body.classList.contains("night")) {
      document.body.classList.toggle("night", night);
      document.dispatchEvent(new CustomEvent("night", { detail: night }));  // for the night extras below
    }
    if (metal !== document.body.classList.contains("metal")) {
      document.body.classList.toggle("metal", metal);
      document.dispatchEvent(new CustomEvent("metal", { detail: metal }));  // for the metal extras below
    }
    if (epic !== document.body.classList.contains("epic")) {
      document.body.classList.toggle("epic", epic);
      document.dispatchEvent(new CustomEvent("epic", { detail: epic }));  // for the epic extras below
    }
    document.dispatchEvent(new CustomEvent("phase", { detail: phase }));
  };
  const animate = nightShown && document.startViewTransition && !document.hidden
    && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  nightShown = true;
  styleSwitch?.skipTransition();  // a previous change still animating ends at once
  if (!animate) { delete root.dataset.vt; return swap(); }
  root.dataset.vt = metal ? "metal" : epic ? "epic" : night ? "night" : "day";
  const t = styleSwitch = document.startViewTransition(swap);
  const done = () => { if (styleSwitch === t) { styleSwitch = null; delete root.dataset.vt; } };
  t.ready.catch(() => {});  // skipped by the browser (e.g. tab hidden meanwhile): the change still applies
  t.finished.then(done, done);
  setTimeout(done, 2500);  // never leave data-vt behind
};
let styleSwitch = null;  // the view transition in progress, if any
// Closing time: wrap each letter of the title in a span (.l, with its index --i) so the CSS can
// turn them off one by one, then bring the bartender in once the sign is dark. Any other phase
// puts the title back as plain text and sends the bartender away. A click on him dismisses him.
const title = document.querySelector("h1"), titleText = title.textContent;
let barman = null, barmanTimer = null;
document.addEventListener("phase", e => {
  clearTimeout(barmanTimer);
  barman?.remove();
  barman = null;
  if (e.detail !== "closing") { title.textContent = titleText; return; }
  title.innerHTML = [...titleText].map((c, i) => `<span class="l" style="--i:${i}">${c === " " ? "&nbsp;" : c}</span>`).join("");
  title.style.setProperty("--n", titleText.length);
  barmanTimer = setTimeout(() => {
    barman = document.createElement("div");
    barman.id = "barman";
    barman.title = "Click to close";
    barman.innerHTML = '<span class="who">🧑‍🍳</span><span class="say">On ferme. Va dormir.<small>The bar reopens at 21:30</small></span>';
    barman.addEventListener("click", () => barman.remove());
    document.body.append(barman);
  }, (1 + (titleText.length + 1) * .7 + .5) * 1000);
});

applyNight();
setInterval(() => { applyNight(); preloadSoon(); epicTick(); }, 1000);  // see the metal music and the epic finale below

// Bar air: 3 smoke clouds drifting across the room and a music note rising every ~0.9 s,
// with a random sway and tilt (--sway, --r); everything is removed when the night ends
const air = document.createElement("div");
air.className = "air";
let noteTimer = null;
const note = () => {
  if (crowded(air, 3 + 25)) return;  // 3 smoke clouds + at most 25 notes (see crowded)
  const n = document.createElement("span");
  n.className = "note";
  n.textContent = "♪♫♩♬"[Math.floor(Math.random() * 4)];
  n.style.cssText = `left:${Math.random() * 100}%;font-size:${1 + Math.random() * 1.4}rem;--o:${.25 + Math.random() * .45};` +
    `--sway:${(Math.random() - .5) * 160}px;--r:${(Math.random() - .5) * 50}deg;animation-duration:${9 + Math.random() * 7}s`;
  n.addEventListener("animationend", () => n.remove());
  air.append(n);
};
const setAir = on => {
  clearInterval(noteTimer);
  air.replaceChildren();
  air.remove();
  if (!on) return;
  for (let i = 0; i < 3; i++) {
    const s = document.createElement("span");
    s.className = "smoke";
    s.style.cssText = `top:${10 + i * 28}%;left:${-20 + i * 15}%;animation-duration:${50 + i * 17}s;animation-delay:${-i * 13}s`;
    air.append(s);
  }
  document.body.prepend(air);
  for (let i = 0; i < 6; i++) setTimeout(note, i * 300);
  noteTimer = setInterval(note, 900);
};
setAir(document.body.classList.contains("night"));
document.addEventListener("night", e => setAir(e.detail));

// Night music: jazz from YouTube, looped. It starts by itself when the night begins. Browsers
// only allow sound after a user gesture, so if the page has not had one yet it autoplays muted
// and the sound comes on at the first click or key press anywhere. The vinyl button then plays /
// pauses it (through the YouTube iframe API messages). Pausing is remembered: no autoplay on the
// next visits until it is played again.
const JAZZ = "7gtIh5dF9Xk";
let jazz = null, playing = false, jazzMuted = false, jazzSoundAt = 0;
const vinyl = document.createElement("button");
vinyl.id = "vinyl";
vinyl.type = "button";
vinyl.innerHTML = '<span class="deck"><span class="disc"></span><span class="arm"></span></span><span class="label"></span>';
const jazzOff = () => { try { return localStorage.getItem("jazz") === "off"; } catch (e) { return false; } };
const paintVinyl = () => {
  vinyl.classList.toggle("playing", playing);
  vinyl.querySelector(".label").textContent = !playing ? "♪ Click to play some jazz"
    : jazzMuted ? "🔇 Click anywhere for sound" : "♪ Jazz on — click to pause";
  vinyl.title = !playing ? "Play the music" : jazzMuted ? "Turn the sound on" : "Pause the music";
};
const command = func => jazz && jazz.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
const play = (muted = false) => {
  if (!jazz) {  // first time: create the player, it autoplays (muted when there was no gesture yet)
    jazz = document.createElement("iframe");
    jazz.id = "jazz";
    jazz.title = "Background jazz";
    jazz.allow = "autoplay; encrypted-media";
    jazz.src = `https://www.youtube.com/embed/${JAZZ}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${JAZZ}&controls=0&enablejsapi=1`;
    document.body.append(jazz);
    jazzMuted = muted;
  } else command("playVideo");
  playing = true;
  try { localStorage.removeItem("jazz"); } catch (e) {}
  paintVinyl();
};
const pause = () => {
  command("pauseVideo");
  playing = false;
  try { localStorage.setItem("jazz", "off"); } catch (e) {}
  paintVinyl();
};
const jazzSound = () => {  // unmute a jazz that autoplayed muted
  if (!jazz || !jazzMuted) return;
  command("unMute");
  jazzMuted = false;
  jazzSoundAt = performance.now();
  paintVinyl();
};
vinyl.addEventListener("click", e => {
  e.stopPropagation();
  if (performance.now() - jazzSoundAt < 600) return;  // this same click just turned the sound on
  if (jazzMuted) jazzSound();
  else playing ? pause() : play();
});
const setMusic = on => {
  document.removeEventListener("pointerdown", jazzSound);
  document.removeEventListener("keydown", jazzSound);
  if (!on) { if (playing) command("pauseVideo"); playing = false; vinyl.remove(); return; }
  document.body.append(vinyl);
  if (!jazz && !jazzOff()) {
    const canSound = navigator.userActivation ? navigator.userActivation.hasBeenActive : false;
    play(!canSound);
    if (!canSound) {
      document.addEventListener("pointerdown", jazzSound, { once: true });
      document.addEventListener("keydown", jazzSound, { once: true });
    }
  }
  paintVinyl();
};
setMusic(document.body.classList.contains("night"));
document.addEventListener("night", e => setMusic(e.detail));

// Metal stage: a white strobe, the equalizer and the effects canvas below, all created when the
// metal phase starts and removed when it ends. A bolt strikes every 1.2 - 3.5 s at a random spot,
// with a flash and a short shake of the page.
const strobe = document.createElement("div"), eq = document.createElement("div");
strobe.id = "strobe";
eq.id = "eq";
eq.innerHTML = Array.from({ length: 48 }, () =>
  `<i style="--d:${(.18 + Math.random() * .3).toFixed(2)}s;--lo:${(.08 + Math.random() * .2).toFixed(2)};--hi:${(.45 + Math.random() * .55).toFixed(2)}"></i>`
).join("");
// Metal effects canvas: one full-screen, click-through canvas and one animation loop for the
// lightning and the other drawn effects below (chains, fire, sparks, flying silhouettes). One
// canvas is much lighter than dozens of animated elements. The loop only runs during the metal
// phase, the browser pauses it in background tabs, and each step is capped at 50 ms, so nothing
// piles up while the page is hidden. Each effect registers {mode, update(dt), draw(ctx), reset(),
// optional resize()};
// only the effects of the current mode ("metal" or "epic", fxMode) run.
const fx = document.createElement("canvas"), ctx = fx.getContext("2d");
fx.id = "metalfx";
let fxW = 0, fxH = 0, fxRaf = null, fxLast = 0, fxMode = null;
const fxLayers = [], strikeHooks = [];  // strikeHooks: called with (x, y) where a bolt hits
// Drawn at 1 canvas pixel per CSS pixel even on high-density screens: the effects are soft glows,
// and a 2x canvas means 4x the pixels to fill and composite on every frame (and while scrolling)
const fxResize = () => {
  fxW = innerWidth; fxH = innerHeight;
  fx.width = fxW; fx.height = fxH;
  fxLayers.forEach(layer => layer.resize?.());
};
const fxFrame = now => {
  const dt = Math.min(.05, (now - fxLast) / 1000);
  fxLast = now;
  ctx.clearRect(0, 0, fxW, fxH);
  for (const layer of fxLayers) if (layer.mode === fxMode) { layer.update(dt); layer.draw(ctx); }
  fxRaf = requestAnimationFrame(fxFrame);
};
const fxStart = () => {
  fxResize();
  document.body.append(fx);
  addEventListener("resize", fxResize);
  fxLast = performance.now();
  fxRaf = requestAnimationFrame(fxFrame);
};
const fxStop = () => {
  cancelAnimationFrame(fxRaf);
  removeEventListener("resize", fxResize);
  fx.remove();
  fxLayers.forEach(layer => layer.reset());
};

// Lightning: each bolt is generated at random. A jagged path runs from above the top of the
// screen down to a random point, the segments kicked sideways at random, and side branches fork
// off it (up to two levels, thinner each time). It is drawn three times on top of each other
// (wide violet halo, glow, white core) and flickers a few times during its 0.5 s life.
const bolts = [];
const FLICKER = [1, .2, 1, .45, .9, .6, 0];  // brightness over the life of a bolt
const boltPath = (x1, y1, x2, y2, spread, depth, out, width) => {
  const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(5, Math.round(len / 18));
  const pts = [[x1, y1]], ang = Math.atan2(y2 - y1, x2 - x1);
  for (let i = 1; i <= n; i++) {
    const t = i / n, last = i === n;
    const x = x1 + (x2 - x1) * t + (last ? 0 : (Math.random() - .5) * spread);
    const y = y1 + (y2 - y1) * t + (last ? 0 : (Math.random() - .5) * spread * .3);
    pts.push([x, y]);
    if (depth < 2 && !last && Math.random() < .16) {  // fork a branch off this point
      const bl = (1 - t) * len * (.3 + Math.random() * .4), ba = ang + (Math.random() < .5 ? -1 : 1) * (.35 + Math.random() * .6);
      boltPath(x, y, x + Math.cos(ba) * bl, y + Math.sin(ba) * bl, spread * .6, depth + 1, out, width * .5);
    }
  }
  out.push({ pts, width });
};
fxLayers.push({
  mode: "metal",
  update(dt) {
    for (const b of bolts) b.age += dt;
    while (bolts.length && bolts[0].age > bolts[0].life) bolts.shift();
  },
  draw(c) {
    c.save();
    c.globalCompositeOperation = "lighter";
    c.lineCap = c.lineJoin = "round";
    for (const b of bolts) {
      const a = FLICKER[Math.min(FLICKER.length - 1, Math.floor(b.age / b.life * FLICKER.length))];
      for (const [mul, color, blur] of [[4, `rgba(150,100,255,${.35 * a})`, 30], [2, `rgba(205,180,255,${.7 * a})`, 12], [1, `rgba(255,255,255,${a})`, 0]]) {
        c.strokeStyle = color; c.shadowColor = "#a77bff"; c.shadowBlur = blur;
        for (const p of b.paths) {
          c.lineWidth = p.width * mul;
          c.beginPath();
          p.pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
          c.stroke();
        }
      }
    }
    c.restore();
  },
  reset() { bolts.length = 0; },
});

// Chains: heavy metal chains hanging from the top corners, simulated with Verlet integration:
// each joint remembers its previous position (its speed is the difference), gravity pulls it
// down, then every link is pushed back to its fixed length a few times per frame, the top joint
// staying nailed above the screen. They sway by themselves, get whipped by each lightning strike
// and kicked on each beat, and swing away from the mouse. Links alternate face-on (a ring) and
// edge-on (a thick bar), drawn with a dark outline, a steel gradient and a highlight.
const LINK = 13;  // distance between two joints, px
const chains = [];
let mouseX = -1e4, mouseY = -1e4, beatClock = 0;
addEventListener("pointermove", e => { mouseX = e.clientX; mouseY = e.clientY; });
const makeChains = () => {
  chains.length = 0;
  chains.w = fxW;
  // Hang them in the empty margins beside the content (960 px wide): two per side when there is
  // room, otherwise one against each edge of the screen
  const margin = (fxW - 960) / 2;
  const spots = margin >= 120 ? [margin * .3, margin * .75, fxW - margin * .75, fxW - margin * .3] : [10, fxW - 10];
  for (const x of spots) {
    const n = Math.round(fxH * (.28 + Math.random() * .3) / LINK);
    chains.push(Array.from({ length: n + 1 }, (_, i) => ({ x, y: (i - 1) * LINK, px: x, py: (i - 1) * LINK })));
  }
};
const kick = power => chains.forEach(ch => ch.forEach(p => { p.px -= (Math.random() - .5) * power; }));  // moving px gives speed
strikeHooks.push(() => kick(16));
const steelCache = {};  // gradients are expressed in the link's own coordinates, so they can be reused
const steel = (c, w) => steelCache[w] ||= steelGradient(c, w);
const steelGradient = (c, w) => {  // vertical steel gradient across a link of thickness w
  const g = c.createLinearGradient(0, -w, 0, w);
  g.addColorStop(0, "#f4f4f4"); g.addColorStop(.35, "#9a9a9a"); g.addColorStop(.55, "#3c3c3c"); g.addColorStop(.8, "#c8c8c8"); g.addColorStop(1, "#5a5a5a");
  return g;
};
const drawLink = (c, a, b, face) => {
  c.save();
  c.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
  c.rotate(Math.atan2(b.y - a.y, b.x - a.x));
  const len = LINK * .78;
  if (face) {  // a ring seen from the front
    c.lineWidth = 5.5; c.strokeStyle = "#0b0b0b";
    c.beginPath(); c.ellipse(0, 0, len, 5.5, 0, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 3.2; c.strokeStyle = steel(c, 6);
    c.stroke();
    c.lineWidth = 1; c.strokeStyle = "rgba(255,255,255,.55)";
    c.beginPath(); c.ellipse(0, -.8, len - 1, 4.2, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  } else {  // a ring seen from the side: a thick rounded bar
    c.lineCap = "round";
    c.lineWidth = 6.5; c.strokeStyle = "#0b0b0b";
    c.beginPath(); c.moveTo(-len, 0); c.lineTo(len, 0); c.stroke();
    c.lineWidth = 4.2; c.strokeStyle = steel(c, 2.5);
    c.stroke();
  }
  c.restore();
};
fxLayers.push({
  mode: "metal",
  update(dt) {
    if (chains.w !== fxW) makeChains();  // first frame, or the window was resized
    beatClock += dt;
    if (beatClock > .46) { beatClock -= .46; kick(3.5); }
    const g = 900 * dt * dt;
    for (const ch of chains) {
      for (let i = 1; i < ch.length; i++) {
        const p = ch[i], vx = (p.x - p.px) * .99, vy = (p.y - p.py) * .99;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + g;
        const dx = p.x - mouseX, dy = p.y - mouseY, d = Math.hypot(dx, dy);
        if (d < 90 && d > 0) p.x += dx / d * (90 - d) * .06;  // pushed away by the mouse
      }
      for (let k = 0; k < 6; k++) for (let i = 1; i < ch.length; i++) {
        const a = ch[i - 1], b = ch[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - LINK) / d;
        if (i === 1) { b.x -= dx * f; b.y -= dy * f; }  // the top joint never moves
        else { a.x += dx * f / 2; a.y += dy * f / 2; b.x -= dx * f / 2; b.y -= dy * f / 2; }
      }
    }
  },
  draw(c) {
    for (const ch of chains) for (let i = 1; i < ch.length; i++) drawLink(c, ch[i - 1], ch[i], i % 2);
  },
  reset() { chains.length = 0; chains.w = 0; },
});

// Fire and sparks. A curtain of flames rises from the bottom of the screen: each particle goes
// from white-yellow to orange, red and dark smoke as it ages, rising with a slight wobble while it
// shrinks. To keep a few hundred of them cheap, each colour is pre-drawn once as a soft blob that
// is then only copied (drawImage). Each lightning strike throws a shower of sparks from where it
// hits: bright streaks falling under gravity.
const blob = (r, g, b, a) => {
  const s = document.createElement("canvas"), sc = s.getContext("2d");
  s.width = s.height = 64;
  const grad = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${r},${g},${b},${a})`); grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  sc.fillStyle = grad; sc.fillRect(0, 0, 64, 64);
  return s;
};
const FIRE = [blob(255, 245, 190, .9), blob(255, 190, 40, .8), blob(255, 90, 10, .7), blob(190, 20, 0, .5), blob(40, 20, 20, .35)];
const flames = [], sparks = [];
strikeHooks.push((x, y) => {
  for (let i = 0; i < 45 && sparks.length < 220; i++) {
    const a = -Math.PI / 2 + (Math.random() - .5) * 2.4, s = 150 + Math.random() * 380;
    sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0, life: .5 + Math.random() * .6 });
  }
});
fxLayers.push({
  mode: "metal",
  update(dt) {
    for (let n = Math.min(40, dt * fxW * .35); n > 0 && flames.length < 450; n--) {
      flames.push({ x: Math.random() * fxW, y: fxH + 12, vx: (Math.random() - .5) * 20, vy: -(80 + Math.random() * 120),
        r: 16 + Math.random() * 20, age: 0, life: .7 + Math.random() * .7, seed: Math.random() * 6 });
    }
    for (const f of flames) {
      f.age += dt;
      f.x += (f.vx + Math.sin(f.age * 6 + f.seed) * 25) * dt;
      f.y += f.vy * dt;
      f.r *= 1 - dt * .5;
    }
    for (const s of sparks) {
      s.age += dt;
      s.px = s.x; s.py = s.y;
      s.vy += 900 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
    }
    for (const list of [flames, sparks]) {
      let k = 0;
      for (const p of list) if (p.age < p.life) list[k++] = p;
      list.length = k;
    }
  },
  draw(c) {
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const f of flames) {
      const t = f.age / f.life;
      c.globalAlpha = 1 - t * .6;
      c.drawImage(FIRE[Math.min(4, Math.floor(t * 5))], f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
    c.globalAlpha = 1;
    c.lineCap = "round";
    for (const s of sparks) {
      const t = s.age / s.life;
      c.strokeStyle = `rgba(255,${Math.round(230 - t * 150)},${Math.round(120 - t * 120)},${1 - t})`;
      c.lineWidth = 2.2 * (1 - t) + .5;
      c.beginPath(); c.moveTo(s.px, s.py); c.lineTo(s.x + (s.x - s.px), s.y + (s.y - s.py)); c.stroke();
    }
    c.restore();
  },
  reset() { flames.length = sparks.length = 0; },
});

// Flying silhouettes: a skull, a Flying V guitar and a "horns" hand, drawn as vector shapes in a
// 100 x 100 box and filled with chrome, outlined in black with
// a red glow. They are thrown from the bottom corners in an arc, with real gravity and a spin.
const SKULL = new Path2D("M50 6C28 6 12 22 12 44c0 13 6 22 14 28v14c0 4 3 7 7 7h4v-8h6v8h14v-8h6v8h4c4 0 7-3 7-7V72c8-6 14-15 14-28C88 22 72 6 50 6Z" +
  "M33 40c6 0 11 5 11 11s-5 10-11 10-11-4-11-10 5-11 11-11ZM67 40c6 0 11 5 11 11s-5 10-11 10-11-4-11-10 5-11 11-11ZM50 60l6 12H44Z");
const FLYING_V = new Path2D("M44 2h12l-2 12h-2v30l28 46-15 10-15-26-15 26-15-10 28-46V14h-2Z");
const HORNS = new Path2D();
HORNS.roundRect(28, 48, 46, 46, 10);  // fist
HORNS.roundRect(28, 6, 13, 52, 6);    // index finger, up
HORNS.roundRect(61, 16, 12, 42, 6);   // little finger, up
HORNS.roundRect(36, 58, 30, 11, 5);   // thumb folded over the other fingers
// [shape, fill rule]: even-odd cuts the skull's eyes and nose, non-zero merges the hand's parts
const SHAPES = [[SKULL, "evenodd"], [FLYING_V, "nonzero"], [HORNS, "nonzero"]];
const thrown = [];
let chrome = null;
let throwClock = 0;
fxLayers.push({
  mode: "metal",
  update(dt) {
    throwClock += dt;
    if (throwClock > .35) {
      throwClock = 0;
      if (thrown.length < 18) {
        const left = Math.random() < .5, dir = left ? 1 : -1;
        const [shape, rule] = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        thrown.push({ shape, rule, size: 34 + Math.random() * 30,
          x: left ? Math.random() * fxW * .12 : fxW - Math.random() * fxW * .12, y: fxH + 40,
          vx: dir * fxW * (.18 + Math.random() * .3), vy: -fxH * (1 + Math.random() * .45),
          a: 0, va: dir * (3 + Math.random() * 5) });
      }
    }
    for (const t of thrown) {
      t.vy += fxH * 1.1 * dt;  // gravity, scaled to the screen so the arc always fits
      t.x += t.vx * dt; t.y += t.vy * dt; t.a += t.va * dt;
    }
    let k = 0;
    for (const t of thrown) if (t.y < fxH + 80) thrown[k++] = t;
    thrown.length = k;
  },
  draw(c) {
    for (const t of thrown) {
      c.save();
      c.translate(t.x, t.y);
      c.rotate(t.a);
      c.scale(t.size / 100, t.size / 100);
      c.translate(-50, -50);
      if (!chrome) {  // made once: it lives in the shape's own 100 x 100 box
        chrome = c.createLinearGradient(0, 0, 0, 100);
        chrome.addColorStop(0, "#ffffff"); chrome.addColorStop(.4, "#9c9c9c"); chrome.addColorStop(.52, "#2e2e2e"); chrome.addColorStop(.7, "#dcdcdc"); chrome.addColorStop(1, "#6a6a6a");
      }
      c.shadowColor = "rgba(255,40,0,.9)"; c.shadowBlur = 18;
      c.fillStyle = chrome;
      c.fill(t.shape, t.rule);
      c.shadowBlur = 0;
      c.lineWidth = 4; c.strokeStyle = "#0a0a0a";
      c.stroke(t.shape);
      c.restore();
    }
  },
  reset() { thrown.length = 0; throwClock = 0; },
});

// ── Epic finale effects (mode "epic") ──
// Blue fire: thousands of tiny additive particles born in clusters ("tongues") that drift along
// the bottom, plus two tall braziers in the bottom corners. Each particle is stretched upward,
// wobbles with a turbulence made of sines of time and height, and cools from a white-cyan core
// to blue, violet and indigo smoke as it rises. Blobs are pre-drawn once, then only copied.
const BLUE_FIRE = [blob(200, 240, 255, .7), blob(110, 200, 255, .8), blob(60, 110, 255, .75), blob(140, 70, 255, .6), blob(50, 25, 110, .35)];
const blueFlames = [], embers = [], motes = [];
let tongues = [], fireTime = 0;
const makeTongues = () => {
  tongues = Array.from({ length: Math.max(8, Math.round(fxW / 70)) }, () => ({ x: Math.random() * fxW, v: (Math.random() - .5) * 30, power: .6 + Math.random() * .6 }));
  tongues.w = fxW;
};
fxLayers.push({
  mode: "epic",
  update(dt) {
    if (tongues.w !== fxW) makeTongues();
    fireTime += dt;
    const spawn = (x, y, size, rise) => blueFlames.push({ x, y, size, rise, age: 0, life: .6 + Math.random() * .6, seed: Math.random() * 9 });
    for (const t of tongues) {
      t.x += t.v * dt;
      if (t.x < 0 || t.x > fxW) t.v *= -1;
      for (let n = dt * 50 * t.power; n > 0 && blueFlames.length < 760; n--) {
        spawn(t.x + (Math.random() - .5) * 50, fxH + 10, 7 + Math.random() * 11 * t.power, 150 + Math.random() * 220 * t.power);
      }
    }
    for (const bx of [fxW * .04, fxW * .96]) {  // the two braziers
      for (let n = dt * 85; n > 0 && blueFlames.length < 760; n--) {
        spawn(bx + (Math.random() - .5) * 46, fxH + 10, 10 + Math.random() * 16, 260 + Math.random() * 320);
      }
    }
    for (const f of blueFlames) {
      f.age += dt;
      const h = fxH - f.y;
      f.x += (Math.sin(fireTime * 3 + f.seed + h * .02) * 30 + Math.sin(fireTime * 7.3 + f.seed * 2) * 12) * dt;
      f.y -= f.rise * dt;
      f.size *= 1 - dt * .45;
    }
    let k = 0;
    for (const f of blueFlames) if (f.age < f.life) blueFlames[k++] = f;
    blueFlames.length = k;
  },
  draw(c) {
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const f of blueFlames) {
      const t = f.age / f.life, w = f.size, h = f.size * 2.6;  // stretched upward like a tongue of fire
      c.globalAlpha = (1 - t) * .9;
      c.drawImage(BLUE_FIRE[Math.min(4, Math.floor(t * 5))], f.x - w, f.y - h, w * 2, h * 2);
    }
    c.restore();
  },
  reset() { blueFlames.length = 0; tongues = []; fireTime = 0; },
});
// Embers and arcane motes: bright cyan sparks shooting up and twinkling, and soft blue / violet
// orbs of light floating slowly across the room
fxLayers.push({
  mode: "epic",
  update(dt) {
    for (let n = dt * 40; n > 0 && embers.length < 120; n--) {
      embers.push({ x: Math.random() * fxW, y: fxH, vx: (Math.random() - .5) * 40, vy: -(120 + Math.random() * 260), age: 0, life: 1.5 + Math.random() * 2, tw: Math.random() * 9 });
    }
    while (motes.length < 26) {
      motes.push({ x: Math.random() * fxW, y: Math.random() * fxH, r: 3 + Math.random() * 6, vx: (Math.random() - .5) * 18, vy: -(6 + Math.random() * 16), hue: Math.random() < .5 ? 205 : 270, ph: Math.random() * 9 });
    }
    for (const e of embers) { e.age += dt; e.x += e.vx * dt + Math.sin(e.age * 4 + e.tw) * 20 * dt; e.y += e.vy * dt; e.vy *= 1 - dt * .3; }
    for (const m of motes) { m.x += m.vx * dt; m.y += m.vy * dt; m.ph += dt; if (m.y < -20) { m.y = fxH + 20; m.x = Math.random() * fxW; } }
    let k = 0;
    for (const e of embers) if (e.age < e.life) embers[k++] = e;
    embers.length = k;
  },
  draw(c) {
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const e of embers) {
      const a = (1 - e.age / e.life) * (.55 + .45 * Math.sin(e.age * 18 + e.tw));  // twinkle
      c.fillStyle = `rgba(190,240,255,${Math.max(0, a)})`;
      c.fillRect(e.x - 1.2, e.y - 1.2, 2.4, 2.4);
    }
    for (const m of motes) {
      const a = .35 + .25 * Math.sin(m.ph * 2);
      c.globalAlpha = a;
      c.drawImage(m.hue === 205 ? BLUE_FIRE[1] : BLUE_FIRE[3], m.x - m.r * 3, m.y - m.r * 3, m.r * 6, m.r * 6);
    }
    c.restore();
  },
  reset() { embers.length = motes.length = 0; },
});
// Arcane circle: a huge magic circle turning slowly behind the page, very faint: three rings, a
// ring of runes (glyphs made of random strokes, generated once) and an eight-pointed star of two
// squares. Its glow (shadowBlur) is costly, so the circle is drawn once per screen size on its own
// small canvas, and each frame only copies it, turned a little further.
const RUNES = Array.from({ length: 24 }, () => Array.from({ length: 3 }, () => [Math.random() * 10 - 5, Math.random() * 14 - 7, Math.random() * 10 - 5, Math.random() * 14 - 7]));
let circleTurn = 0, circleArt = null;
const drawCircleArt = () => {
  const R = Math.min(fxW, fxH) * .42, size = Math.ceil(R * 2 + 40);
  circleArt = document.createElement("canvas");
  circleArt.width = circleArt.height = size;
  const c = circleArt.getContext("2d");
  c.translate(size / 2, size / 2);
  c.strokeStyle = "rgba(140,170,255,.13)";
  c.shadowColor = "rgba(120,140,255,.6)"; c.shadowBlur = 12;
  c.lineWidth = 2;
  for (const r of [R, R * .86, R * .55]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
  for (let s = 0; s < 2; s++) {  // two squares turned 45 degrees: an eight-pointed star
    c.save(); c.rotate(s * Math.PI / 4);
    c.strokeRect(-R * .6, -R * .6, R * 1.2, R * 1.2);
    c.restore();
  }
  c.lineWidth = 1.6;
  RUNES.forEach((rune, i) => {  // the ring of runes between the two outer circles
    c.save();
    c.rotate(i / RUNES.length * Math.PI * 2);
    c.translate(0, -R * .93);
    c.beginPath();
    for (const [x1, y1, x2, y2] of rune) { c.moveTo(x1, y1); c.lineTo(x2, y2); }
    c.stroke();
    c.restore();
  });
};
fxLayers.push({
  mode: "epic",
  update(dt) { circleTurn += dt * .08; },
  draw(c) {
    if (!circleArt) drawCircleArt();
    c.save();
    c.globalCompositeOperation = "lighter";
    c.translate(fxW / 2, fxH / 2);
    c.rotate(circleTurn);
    c.drawImage(circleArt, -circleArt.width / 2, -circleArt.height / 2);
    c.restore();
  },
  resize() { circleArt = null; },
  reset() {},
});

let boltTimer = null;
const strike = () => {
  boltTimer = setTimeout(strike, 1200 + Math.random() * 2300);
  if (document.hidden || bolts.length >= 3) return;
  const x = fxW * (.08 + Math.random() * .84), ex = x + (Math.random() - .5) * fxW * .25, ey = fxH * (.55 + Math.random() * .4);
  const paths = [];
  boltPath(x, -20, ex, ey, 70, 0, paths, 2.6);
  bolts.push({ paths, age: 0, life: .5 });
  strikeHooks.forEach(hook => hook(ex, ey));
  strobe.animate([{ opacity: 0 }, { opacity: .35 }, { opacity: 0 }], { duration: 180 });
  document.querySelector(".wrap").animate(
    [{ transform: "none" }, { transform: "translate(-6px,3px)" }, { transform: "translate(5px,-4px)" }, { transform: "none" }],
    { duration: 220 });
};
// Start / stop the stage for the current show: the metal one (strobe, equalizer, lightning and
// the "metal" canvas effects) or the epic one (the "epic" canvas effects, see below)
const setStage = () => {
  const mode = document.body.classList.contains("metal") ? "metal" : document.body.classList.contains("epic") ? "epic" : null;
  clearTimeout(boltTimer);
  [strobe, eq].forEach(el => el.remove());
  fxStop();
  fxMode = mode;
  if (!mode) return;
  if (mode === "metal") document.body.append(strobe, eq);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  fxStart();
  if (mode === "metal") strike();
};
setStage();
document.addEventListener("metal", setStage);
document.addEventListener("epic", setStage);

// Metal music: one song from YouTube, from 1:50 to its end (METAL_SECONDS later), in sync with the
// takeover: opened late, it starts further into the song so both end together. It starts by
// itself when the phase begins. Browsers only allow sound after a user gesture, so if the page
// has not had one yet the song autoplays muted and the sound comes on at the first click or key
// press anywhere (the song keeps its place in time). The amp plays / pauses it; the end of the
// phase stops it.
const METAL = "IAvgph1RjCc", METAL_START = 110;
let riff = null, rocking = false, riffMuted = false, soundAt = 0;
const amp = document.createElement("button");
amp.id = "amp";
amp.type = "button";
amp.innerHTML = '<span class="cab"><span class="panel"><span class="logo">BA5</span><span class="knobs">' +
  "<i></i>".repeat(5) + '</span></span><span class="grille"><span class="cone"></span><span class="cone"></span></span></span><span class="label"></span>';
const paintAmp = () => {
  if (amp.classList.contains("epic")) {  // the epic finale plays its own song on the same amp
    amp.classList.toggle("playing", epicPlaying);
    amp.querySelector(".label").textContent = !epicPlaying ? "✨ Click for epicness"
      : epicMuted ? "🔇 Click anywhere for sound" : "✨ Epic — click to pause";
    amp.title = !epicPlaying ? "Play the music" : epicMuted ? "Turn the sound on" : "Pause the music";
    return;
  }
  amp.classList.toggle("playing", rocking);
  amp.querySelector(".label").textContent = !rocking ? "🎸 Click to crank it up"
    : riffMuted ? "🔇 Click anywhere for sound" : "🎸 Rocking — click to mute";
  amp.title = !rocking ? "Play the music" : riffMuted ? "Turn the sound on" : "Pause the music";
};
const riffCommand = (func, args = []) => riff && riff.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
const makeRiff = (autoplay, muted, start) => {
  riff = document.createElement("iframe");
  riff.id = "riff";
  riff.title = "Metal song";
  riff.allow = "autoplay; encrypted-media";
  riff.src = `https://www.youtube.com/embed/${METAL}?autoplay=${autoplay}&mute=${muted ? 1 : 0}` +
    `&start=${start}&end=${METAL_START + METAL_SECONDS}&controls=0&enablejsapi=1`;
  document.body.append(riff);
  riffMuted = muted;
};
// Loading the YouTube player takes a few seconds, so when the takeover is coming (10th click on
// the flame button, or 00:59:30) the player is loaded in advance, hidden, paused and muted at
// 1:50; starting it is then almost instant. Unused, it is dropped again after 75 s.
let riffWaiting = false, riffDrop = null;
const preloadRiff = () => {
  if (riff) return;
  makeRiff(0, true, METAL_START);
  riffWaiting = true;
  clearTimeout(riffDrop);
  riffDrop = setTimeout(() => {
    if (riffWaiting && !document.body.classList.contains("metal")) { riff.remove(); riff = null; riffWaiting = false; }
  }, 75000);
};
const preloadSoon = () => {  // called every second with the clock check
  const d = new Date(), t = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  if (t >= 3600 - 30 && t < 3600) preloadRiff();
};
const rock = (muted = false) => {
  const d = new Date(), t = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  const late = metalEggAt ? Math.floor((Date.now() - metalEggAt) / 1000)  // seconds since it started
    : forced === "metal" ? 0 : Math.max(0, t - 3600);
  if (!riff) makeRiff(1, muted, METAL_START + late);
  else if (riffWaiting) {  // the preloaded player: jump to the right spot, sound on if allowed, play
    riffWaiting = false;
    if (late) riffCommand("seekTo", [METAL_START + late, true]);
    if (!muted) { riffCommand("unMute"); riffMuted = false; }
    riffCommand("playVideo");
    // preloaded only a moment ago, it may not be ready for commands yet: repeat them a few times
    [1500, 3000, 5000].forEach(ms => setTimeout(() => {
      if (!rocking) return;
      if (!riffMuted) riffCommand("unMute");
      riffCommand("playVideo");
    }, ms));
  } else riffCommand("playVideo");
  rocking = true;
  paintAmp();
};
const riffSound = () => {  // unmute a song that autoplayed muted
  if (!riff || !riffMuted) return;
  riffCommand("unMute");
  riffMuted = false;
  soundAt = performance.now();
  paintAmp();
};
amp.addEventListener("click", e => {
  e.stopPropagation();
  if (performance.now() - soundAt < 600) return;  // this same click just turned the sound on
  if (amp.classList.contains("epic")) {  // epic song (see the epic finale below)
    if (epicMuted) epicSound();
    else if (epicPlaying) { epicCommand("pauseVideo"); epicPlaying = false; paintAmp(); }
    else epicPlay();
    return;
  }
  if (riffMuted) riffSound();
  else if (rocking) { riffCommand("pauseVideo"); rocking = false; paintAmp(); }
  else rock();
});
const setMetalMusic = on => {
  document.removeEventListener("pointerdown", riffSound);
  document.removeEventListener("keydown", riffSound);
  if (!on) { riff?.remove(); riff = null; rocking = riffMuted = riffWaiting = false; amp.remove(); return; }
  document.body.append(amp);
  const canSound = navigator.userActivation ? navigator.userActivation.hasBeenActive : false;
  rock(!canSound);
  if (!canSound) {
    document.addEventListener("pointerdown", riffSound, { once: true });
    document.addEventListener("keydown", riffSound, { once: true });
  }
};
setMetalMusic(document.body.classList.contains("metal"));
document.addEventListener("metal", e => setMetalMusic(e.detail));

// "More epicness ?": 10 s before a metal takeover ends this button rises in the middle of the
// screen. Clicking it queues the epic finale (epicQueued, see phaseNow) and gets its song ready
// (preloadEpic, below); it stays as "Epicness incoming…" until the metal ends, then goes away.
const moreBtn = document.createElement("button");
moreBtn.id = "more";
moreBtn.type = "button";
moreBtn.addEventListener("click", e => {
  e.stopPropagation();
  if (epicQueued) return;
  epicQueued = true;
  preloadEpic();
  moreBtn.classList.add("queued");
  moreBtn.textContent = "⚔️ Epicness incoming…";
});
// Epic music: the epic video, looped, on the same amp (turned blue). The player is loaded as soon
// as the button is clicked (paused), so it starts at once when the metal ends; the click also
// counts as the gesture browsers need for sound.
const EPIC = "pCUzn7WbUb4";
let epicRiff = null, epicPlaying = false, epicMuted = false;
const epicCommand = (func, args = []) => epicRiff && epicRiff.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
const makeEpicRiff = (autoplay, muted) => {
  epicRiff = document.createElement("iframe");
  epicRiff.id = "epicriff";
  epicRiff.title = "Epic song";
  epicRiff.allow = "autoplay; encrypted-media";
  epicRiff.src = `https://www.youtube.com/embed/${EPIC}?autoplay=${autoplay}&mute=${muted ? 1 : 0}` +
    `&loop=1&playlist=${EPIC}&controls=0&enablejsapi=1`;
  document.body.append(epicRiff);
  epicMuted = muted;
};
const preloadEpic = () => { if (!epicRiff) makeEpicRiff(0, false); };
const epicPlay = () => {
  if (!epicRiff) {
    const canSound = navigator.userActivation ? navigator.userActivation.hasBeenActive : false;
    makeEpicRiff(1, !canSound);  // without any gesture yet (e.g. ?night=epic) it starts muted
  } else epicCommand("playVideo");
  epicPlaying = true;
  // a player that has only just been created ignores commands until it is ready: say "play"
  // again a few times (harmless if it is already playing)
  [1500, 3000, 5000, 8000].forEach(ms => setTimeout(() => { if (epicPlaying) epicCommand("playVideo"); }, ms));
  paintAmp();
};
const epicSound = () => { if (epicRiff && epicMuted) { epicCommand("unMute"); epicMuted = false; soundAt = performance.now(); paintAmp(); } };
const setEpicMusic = on => {
  document.removeEventListener("pointerdown", epicSound);
  if (!on) {
    epicRiff?.remove(); epicRiff = null; epicPlaying = epicMuted = false;
    amp.classList.remove("epic");
    if (!document.body.classList.contains("metal")) amp.remove();
    return;
  }
  amp.classList.add("epic");
  document.body.append(amp);
  epicPlay();
  if (epicMuted) document.addEventListener("pointerdown", epicSound, { once: true });
};
setEpicMusic(document.body.classList.contains("epic"));
document.addEventListener("epic", e => setEpicMusic(e.detail));

// "Back to normal": a small button in the bottom right corner during the epic finale. It ends the
// epic and the page falls back to whatever the clock says (day, or the jazz bar at night).
const leaveBtn = document.createElement("button");
leaveBtn.id = "leave";
leaveBtn.type = "button";
leaveBtn.textContent = "↩ Back to normal";
leaveBtn.addEventListener("click", e => {
  e.stopPropagation();
  epicAt = 0;
  epicLeft = true;
  applyNight();
});
const setLeave = on => on ? document.body.append(leaveBtn) : leaveBtn.remove();
setLeave(document.body.classList.contains("epic"));
document.addEventListener("epic", e => setLeave(e.detail));

const epicTick = () => {  // called every second with the clock check
  const left = document.body.classList.contains("metal") ? metalLeft() : 0;
  if (left > 0 && left <= 10) {
    if (!moreBtn.isConnected) {
      moreBtn.classList.remove("queued");
      moreBtn.textContent = "✨ More epicness ?";
      document.body.append(moreBtn);
    }
  } else moreBtn.remove();
};

// Names / Previews switch: sets data-view on <html> (the CSS does the rest) and remembers it
const viewBtns = document.querySelectorAll(".view button");
const setView = v => {
  root.dataset.view = v;
  viewBtns.forEach(b => b.setAttribute("aria-pressed", b.dataset.view === v));
  try { localStorage.setItem("view", v); } catch (e) {}
};
viewBtns.forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));
viewBtns.forEach(b => b.setAttribute("aria-pressed", b.dataset.view === (root.dataset.view || "names")));

// Search: keep subjects and documents whose text matches, open the sections holding a match.
// Every word typed must appear (in any order, case-insensitive). If the subject itself matches
// (name or code), the whole card stays as usual; otherwise only the matching documents are kept.
// An empty field shows everything again and closes the sections.
const q = document.getElementById("search");
q.addEventListener("input", () => {
  const words = q.value.toLowerCase().trim().split(/\\s+/).filter(Boolean);
  const hit = el => words.every(w => el.textContent.toLowerCase().includes(w));
  let shown = 0;  // number of subjects still visible, to show the no-result message
  document.querySelectorAll("main section").forEach(sec => {
    const whole = !words.length || hit(sec.querySelector("h2")) || hit(sec.querySelector(".code"));
    let any = whole;
    sec.querySelectorAll(".links a").forEach(a => {
      const ok = whole || hit(a);
      a.parentNode.hidden = !ok;
      any ||= ok;
    });
    // A collapsible section is hidden when nothing in it matches, and opened while it holds a
    // match found by document name (folder headings are hidden then, they would be misleading)
    sec.querySelectorAll("details").forEach(d => {
      const inside = [...d.querySelectorAll(".links a")].some(a => !a.parentNode.hidden);
      d.parentNode.hidden = !inside;
      d.querySelectorAll(".group").forEach(g => g.hidden = !whole && !!words.length);
      d.open = words.length > 0 && inside && !whole;
    });
    sec.hidden = !any;
    shown += any;
  });
  document.getElementById("empty").hidden = shown > 0;
});
"""

def label(p, root):
    """Display name of a PDF: "Course notes", "Week 03", or the file name with spaces."""
    if p.relative_to(root).as_posix() in KINDS:
        return KINDS[p.relative_to(root).as_posix()]
    m = WEEK.fullmatch(p.stem)
    if m:
        return f"Week {m[1]}{m[2]}"
    return p.stem.replace("_", " ")

def sources(subject, p, root):
    """Files a built PDF comes from: its .tex and the files it inputs, or the PDF itself.

    p is the PDF in dist/<subject>/, root is dist/<subject>/. The inputs are found with a
    simple regex on \\input{...} / \\include{...} (one level, enough for swent/course.tex).
    A week built from chapters of course.tex (swent) comes from those chapters.
    """
    src = ROOT / subject / p.relative_to(root)
    tex = src.with_suffix(".tex")
    if not tex.exists():
        m = WEEK.fullmatch(p.stem)
        parts = course_weeks(ROOT / subject).get(int(m[1]), []) if m else []
        return [(ROOT / subject / i).with_suffix(".tex") for i in parts] or [src]
    inputs = re.findall(r"\\(?:input|include)\{([^}]+)\}", tex.read_text(encoding="utf-8", errors="replace"))
    return [tex] + [(tex.parent / i).with_suffix(".tex") for i in inputs]

def updated(subject, p, root):
    """Date of the last commit touching the sources (file mtime if never committed).

    Build time would be useless here: on CI every file is fresh, so every PDF would look new.
    This needs the full git history, hence fetch-depth: 0 in the Pages workflow.
    """
    files = [f for f in sources(subject, p, root) if f.exists()]
    out = subprocess.run(
        ["git", "log", "-1", "--format=%ct", "--", *map(str, files)],
        cwd=ROOT, capture_output=True, text=True,
    ).stdout.strip()
    return datetime.fromtimestamp(int(out)) if out else datetime.fromtimestamp(p.stat().st_mtime)

def is_new(when):
    """True for documents changed less than NEW_DAYS ago (they get the "New" badge)."""
    return (datetime.now() - when).days < NEW_DAYS

def link(subject, p, root, when, shot=None):
    """One <li> line: document name (+ "New" badge) on the left, size and date on the right.

    It also carries the first-page thumbnail (or a "PDF" placeholder), only shown in the
    Previews view; the size and date are repeated in the tooltip for that view.
    Documents open in a new tab, so the index stays open next to them.
    """
    rel = p.relative_to(root).as_posix()
    badge = '<span class="new">New</span>' if is_new(when) else ""
    meta = f"{p.stat().st_size / 1e6:.1f} MB · {when:%d %b %Y}"
    thumb = (
        f'<img class="thumb" src="{subject}/{html.escape(shot.relative_to(root).as_posix())}" alt="" loading="lazy">'
        if shot else '<span class="thumb none">PDF</span>'
    )
    return (
        f'<li><a href="{subject}/{html.escape(rel)}" target="_blank" rel="noopener" title="{meta}">{thumb}<span>{html.escape(label(p, root))}{badge}</span>'
        f'<small>{meta}</small></a></li>'
    )

def fold(subject, pdfs, root, when, shots, noun, grouped=True, extra=""):
    """Collapsible list of PDFs, with folder headings when grouped.

    The summary reads "<n> <noun>(s)", e.g. "4 weekly notes", followed by a "<k> new" badge
    when it hides new documents, and by `extra` (HTML, used for the progress bar).
    Returns "" when there is nothing to list, so the section is simply left out.
    """
    if not pdfs:
        return ""
    items, group = [], None
    for p in pdfs:
        folder = p.relative_to(root).parent.as_posix()
        if grouped and folder != "." and folder != group:
            items.append(f'<li class="group">{html.escape(folder)}</li>')
        group = folder
        items.append(link(subject, p, root, when[p], shots[p]))
    n = len(pdfs)
    # The list is folded, so say on the summary when something new is inside
    fresh = sum(is_new(when[p]) for p in pdfs)
    badge = f'<span class="new">{fresh} new</span>' if fresh else ""
    return (
        f'<li class="fold"><details><summary>{n} {noun}{"s" if n > 1 else ""}{badge}{extra}</summary>'
        f'<ul class="links">{"".join(items)}</ul></details></li>'
    )

def progress(weeks, subject):
    """Bar showing the latest weekly note against the length of the semester.

    Progress is the highest week number published (week04 -> 4/14), not the number of files,
    so a missing week does not shift the bar. Capped at 100%.
    """
    if not weeks:
        return ""
    total = subject.get("weeks", SEMESTER_WEEKS)
    last = max(int(WEEK.fullmatch(p.stem)[1]) for p in weeks)
    pct = min(100, round(100 * last / total))
    return (
        f'<span class="progress" title="Week {last} of {total}">'
        f'<span class="bar"><span style="width:{pct}%"></span></span>{last}/{total}</span>'
    )

TOC_TITLES = {"contents", "table of contents", "table des matières", "sommaire"}
# A table of contents line ends with a page number, often after dot leaders: "1.2 Policy . . . 5"
TOC_LINE = re.compile(r"\s\d+\s*$")

def content_page(p):
    """First page after the table of contents of a course PDF (1 if there is none).

    Reads the text of the first pages with pdftotext (poppler): the TOC starts on the page whose
    heading is "Contents" (or a French equivalent) and goes on while most lines end with a page
    number. The page right after it is the first page of actual content.
    """
    if not PDFTOTEXT:
        return 1
    out = subprocess.run(
        [PDFTOTEXT, "-f", "1", "-l", "12", "-enc", "UTF-8", str(p), "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    ).stdout
    pages = [[l.strip() for l in page.splitlines() if l.strip()] for page in out.split("\f")]
    start = next((i for i, lines in enumerate(pages) if any(l.lower() in TOC_TITLES for l in lines[:3])), None)
    if start is None:
        return 1
    end = start + 1
    while end < len(pages) and pages[end] and sum(bool(TOC_LINE.search(l)) for l in pages[end]) > len(pages[end]) / 2:
        end += 1
    return end + 1 if end < len(pages) and pages[end] else 1

def preview(p):
    """Small PNG of a page of a PDF (week01.pdf -> week01.pdf.p1.png), or None.

    The first page, except for course notes, where the title page and the table of contents
    say nothing: their preview shows the first page of content instead (see content_page).
    Made with pdftoppm (poppler), only when missing or older than the PDF. Without pdftoppm,
    or if the PDF cannot be read, there is simply no preview and the page shows the name only.
    """
    page = content_page(p) if p.name == "course.pdf" else 1
    png = p.with_name(f"{p.name}.p{page}.png")  # page in the name, so a new page means a new preview
    if png.exists() and png.stat().st_mtime >= p.stat().st_mtime:
        return png
    if not PDFTOPPM:
        return None
    subprocess.run(
        [PDFTOPPM, "-f", str(page), "-l", str(page), "-png", "-singlefile", "-scale-to", str(PREVIEW_PX),
         str(p), str(png.with_suffix(""))],  # pdftoppm adds the .png itself
        capture_output=True,
    )
    return png if png.exists() else None

def natural(p):
    """Sort key that orders numbers by value: week2 before week10, 1.6 before 2.4."""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.as_posix())]

def build_index():
    """Write dist/index.html from whatever PDFs are in dist/ (subjects without any are hidden)."""
    cards = []
    for i, s in enumerate(CONFIG):
        root = DIST / s["id"]
        pdfs = list(root.rglob("*.pdf")) if root.is_dir() else []
        if not pdfs:
            continue
        when = {p: updated(s["id"], p, root) for p in pdfs}  # one git call per PDF, done once
        shots = {p: preview(p) for p in pdfs}               # first-page previews (None if unavailable)
        # Course notes stay visible on the card, everything else goes in the collapsible sections
        course = root / "course.pdf"
        main = [course] if course in pdfs else []
        rest = sorted(
            (p for p in pdfs if p not in main),
            key=lambda p: (
                len(p.relative_to(root).parts) > 1,          # top-level files first
                ORDER.index(p.name) if p.parent == root and p.name in ORDER else len(ORDER),
                natural(p.relative_to(root)),
            ),
        )
        # Weekly notes are recognised by their name (weekNN), wherever they are stored
        weeks = [p for p in rest if WEEK.fullmatch(p.stem)]
        others = [p for p in rest if p not in weeks]
        links = "".join(link(s["id"], p, root, when[p], shots[p]) for p in main)
        links += fold(s["id"], weeks, root, when, shots, "weekly note", grouped=False, extra=progress(weeks, s))
        links += fold(s["id"], others, root, when, shots, "more document")
        exam = f'<p class="exam">Exam: {html.escape(s["exam"])}</p>' if s.get("exam") else ""
        # --c = accent colour of the card, from subjects.json or the palette (in file order);
        # order = position among the cards, used when the two columns collapse into one (CSS .grid)
        cards.append(
            f'<section style="--c:{s.get("color", PALETTE[i % len(PALETTE)])};order:{len(cards)}"><span class="code">{s["id"]}</span>'
            f'<h2>{html.escape(s["name"])}</h2>{exam}<ul class="links">{links}</ul></section>'
        )
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Notes BA5</title>
<link rel="preconnect" href="https://www.youtube.com"><link rel="preconnect" href="https://i.ytimg.com">
<script>{THEME_JS}</script>
<style>{CSS}</style></head><body><div class="wrap">
<header><div class="tools"><button id="fire" type="button" aria-label="Flame mode" title="Flame mode" aria-pressed="false">🔥</button><button id="theme" type="button" aria-label="Toggle dark mode"></button></div>
<h1>Notes BA5</h1><p class="sub">EPFL IN, autumn semester: course notes, weekly notes and cheat sheets</p>
<div class="searchrow"><input id="search" type="search" placeholder="Search a course, a week, a sheet…" aria-label="Search documents" autocomplete="off">
<div class="view" role="group" aria-label="Display"><button type="button" data-view="names">Names</button><button type="button" data-view="previews">Previews</button></div></div></header>
<main class="grid"><div class="col">{"".join(cards[0::2])}</div><div class="col">{"".join(cards[1::2])}</div></main>
<p id="empty" hidden>No document matches this search.</p>
<footer>Generated {datetime.now():%Y-%m-%d %H:%M} by build.py</footer>
</div><script>{JS}</script></body></html>"""
    DIST.mkdir(exist_ok=True)
    (DIST / "index.html").write_text(page, encoding="utf-8")
    ok("dist/index.html")

build_index()

# ── Summary ──────────────────────────────────────────────────────────────────
print(f"\n{'─'*50}")
ok_count  = sum(1 for v in results.values() if v == "ok")
err_count = sum(1 for v in results.values() if v == "error")
print(f"  {GREEN}{ok_count} succeeded{RESET}  |  {RED}{err_count} failed{RESET}")
if err_count:
    sys.exit(1)
