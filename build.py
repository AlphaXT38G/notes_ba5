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
body.night #fire,body.metal #fire{display:none}  /* no flame mode in the bar or the metal show, see applyNight in JS */
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
   the title vibrating like a riff, lightning bolts striking with a flash (JS adds .bolt and
   #strobe), and an equalizer bouncing along the bottom of the screen (#eq) */
body.metal section{transform-origin:0 100%;animation:headbang .46s ease-in-out infinite alternate}
body.metal .col:nth-child(2) section{animation-delay:-.23s}
body.metal h1{animation:riff .12s steps(2) infinite}
.stage{position:fixed;inset:0;z-index:2;pointer-events:none;overflow:hidden}
.bolt{position:absolute;top:-2vh;width:9rem;height:var(--h);margin-left:-4.5rem;background:linear-gradient(#fff,#e2d4ff 60%,#9b6bff);clip-path:polygon(52% 0,30% 38%,48% 40%,22% 72%,42% 73%,14% 100%,70% 58%,50% 56%,78% 30%,58% 29%,82% 0);filter:drop-shadow(0 0 14px #a77bff) drop-shadow(0 0 30px #fff);opacity:0;animation:strike .5s ease-out forwards}
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
#riff{position:fixed;left:0;bottom:0;width:200px;height:113px;opacity:0;pointer-events:none;z-index:-1;border:0}
@keyframes pump{from{transform:scale(1)}to{transform:scale(1.12)}}
.mosh{position:absolute;bottom:-3rem;filter:drop-shadow(0 0 8px rgba(255,60,0,.8));animation:mosh linear forwards}
@keyframes mosh{0%{transform:translate(0,0) rotate(0) scale(.6)}50%{transform:translate(var(--mx),var(--my)) rotate(calc(var(--spin) / 2)) scale(1.15)}100%{transform:translate(var(--ex),var(--ey)) rotate(var(--spin)) scale(.8);opacity:.2}}
@keyframes headbang{from{transform:rotate(-.7deg) translateY(0)}to{transform:rotate(.7deg) translateY(4px)}}
@keyframes riff{0%{transform:skew(-10deg) translate(0,0)}50%{transform:skew(-10deg) translate(2px,-1px)}}
@keyframes strike{0%{opacity:0}10%{opacity:1}25%{opacity:.25}40%{opacity:1}100%{opacity:0}}
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
/* Reduced motion: no rising flames and no looping animations */
@media(prefers-reduced-motion:reduce){.flames,.air{display:none}body.fire section,#surprise,#hole .disk::before,body.party,body.party h1,body.party section,body.night h1,body.night[data-phase] h1,body.metal::before,body.metal section,body.metal h1,#eq i{animation:none}}
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
fireBtn.addEventListener("click", () => setFire(!document.body.classList.contains("fire")));
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
// After that the page is back to its usual day look.
// Checked every second (the metal phase is short and must start right on time).
// ?night=0 / 1 / evening / closing / metal in the URL forces a phase (handy to try it any time).
const sub = document.querySelector(".sub"), daySub = sub.textContent;
const NIGHT_SUBS = {  // null = keep the usual subtitle
  evening: null,
  closing: "Last call was a while ago.",
  metal: "1:00 AM. Time to headbang. 🤘",
};
const NIGHT = new Set(["evening", "closing"]);  // the jazz bar phases (body.night)
const METAL_SECONDS = 111;  // the song plays from 1:50 to its end, 1 min 51 s later
const forced = new URLSearchParams(location.search).get("night");
const phaseNow = () => {
  if (forced === "0") return null;
  if (forced in NIGHT_SUBS) return forced;
  const d = new Date(), t = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  if (t >= 21 * 3600 + 30 * 60 || t < 45 * 60) return "evening";
  if (t < 3600) return "closing";
  if (t < 3600 + METAL_SECONDS) return "metal";
  return forced === "1" ? "evening" : null;  // ?night=1 during the day: start of the night
};
const applyNight = () => {
  const phase = phaseNow();
  if (phase === (document.body.dataset.phase || null)) return;
  if (phase) document.body.dataset.phase = phase; else delete document.body.dataset.phase;
  sub.textContent = (phase && NIGHT_SUBS[phase]) || daySub;
  const night = NIGHT.has(phase), metal = phase === "metal";
  // Flames on top of the jazz bar or the metal show are too many moving elements (the page
  // lags): both turn the flame mode off, and hide its button while they last (CSS)
  if ((night || metal) && document.body.classList.contains("fire")) setFire(false);
  if (night !== document.body.classList.contains("night")) {
    document.body.classList.toggle("night", night);
    document.dispatchEvent(new CustomEvent("night", { detail: night }));  // for the night extras below
  }
  if (metal !== document.body.classList.contains("metal")) {
    document.body.classList.toggle("metal", metal);
    document.dispatchEvent(new CustomEvent("metal", { detail: metal }));  // for the metal extras below
  }
  document.dispatchEvent(new CustomEvent("phase", { detail: phase }));
};
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
setInterval(applyNight, 1000);

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

// Metal stage: a click-through layer for the lightning, a white strobe and the equalizer,
// all created when the metal phase starts and removed when it ends. A bolt strikes every
// 1.2 - 3.5 s at a random spot, with a flash and a short shake of the page.
const stage = document.createElement("div"), strobe = document.createElement("div"), eq = document.createElement("div");
stage.className = "stage";
strobe.id = "strobe";
eq.id = "eq";
eq.innerHTML = Array.from({ length: 48 }, () =>
  `<i style="--d:${(.18 + Math.random() * .3).toFixed(2)}s;--lo:${(.08 + Math.random() * .2).toFixed(2)};--hi:${(.45 + Math.random() * .55).toFixed(2)}"></i>`
).join("");
let boltTimer = null;
const strike = () => {
  boltTimer = setTimeout(strike, 1200 + Math.random() * 2300);
  if (document.hidden || stage.querySelectorAll(".bolt").length >= 4) return;  // bolts only (see crowded)
  const b = document.createElement("span");
  b.className = "bolt";
  b.style.cssText = `left:${8 + Math.random() * 84}%;--h:${55 + Math.random() * 45}vh;transform:scaleX(${Math.random() < .5 ? -1 : 1})`;
  b.addEventListener("animationend", () => b.remove());
  stage.append(b);
  strobe.animate([{ opacity: 0 }, { opacity: .35 }, { opacity: 0 }], { duration: 180 });
  document.querySelector(".wrap").animate(
    [{ transform: "none" }, { transform: "translate(-6px,3px)" }, { transform: "translate(5px,-4px)" }, { transform: "none" }],
    { duration: 220 });
};
// Mosh pit: rock emojis thrown from the bottom corners, flying across the page in an arc
// (up to --mx/--my, then down to --ex/--ey) while spinning; one every 180 ms, at most 35 at once
let moshTimer = null;
const mosh = () => {
  if (crowded(stage, 35)) return;
  const m = document.createElement("span"), left = Math.random() < .5, w = innerWidth, h = innerHeight;
  const dir = left ? 1 : -1, reach = (.4 + Math.random() * .6) * w;
  m.className = "mosh";
  m.textContent = ["🤘", "💀", "⚡", "🎸", "🔥", "🥁"][Math.floor(Math.random() * 6)];
  m.style.cssText = `${left ? "left" : "right"}:${Math.random() * 12}%;font-size:${1.4 + Math.random() * 1.8}rem;` +
    `--mx:${dir * reach / 2}px;--my:${-(.45 + Math.random() * .45) * h}px;--ex:${dir * reach}px;--ey:${-Math.random() * .2 * h}px;` +
    `--spin:${dir * (360 + Math.random() * 720)}deg;animation-duration:${1.6 + Math.random() * 1.4}s`;
  m.addEventListener("animationend", () => m.remove());
  stage.append(m);
};
const setStage = on => {
  clearTimeout(boltTimer);
  clearInterval(moshTimer);
  stage.replaceChildren();
  [stage, strobe, eq].forEach(el => el.remove());
  if (!on) return;
  document.body.append(stage, strobe, eq);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  strike();
  moshTimer = setInterval(mosh, 180);
};
setStage(document.body.classList.contains("metal"));
document.addEventListener("metal", e => setStage(e.detail));

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
  amp.classList.toggle("playing", rocking);
  amp.querySelector(".label").textContent = !rocking ? "🎸 Click to crank it up"
    : riffMuted ? "🔇 Click anywhere for sound" : "🎸 Rocking — click to mute";
  amp.title = !rocking ? "Play the music" : riffMuted ? "Turn the sound on" : "Pause the music";
};
const riffCommand = func => riff && riff.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
const rock = (muted = false) => {
  if (!riff) {
    const d = new Date(), t = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    const late = forced === "metal" ? 0 : Math.max(0, t - 3600);  // seconds since 1:00:00
    riff = document.createElement("iframe");
    riff.id = "riff";
    riff.title = "Metal song";
    riff.allow = "autoplay; encrypted-media";
    riff.src = `https://www.youtube.com/embed/${METAL}?autoplay=1&mute=${muted ? 1 : 0}` +
      `&start=${METAL_START + late}&end=${METAL_START + METAL_SECONDS}&controls=0&enablejsapi=1`;
    document.body.append(riff);
    riffMuted = muted;
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
  if (riffMuted) riffSound();
  else if (rocking) { riffCommand("pauseVideo"); rocking = false; paintAmp(); }
  else rock();
});
const setMetalMusic = on => {
  document.removeEventListener("pointerdown", riffSound);
  document.removeEventListener("keydown", riffSound);
  if (!on) { riff?.remove(); riff = null; rocking = riffMuted = false; amp.remove(); return; }
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
