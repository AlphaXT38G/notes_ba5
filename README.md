# Notes BA4

LaTeX notes for the BA4 IN semester at EPFL.

---

## Build

Compile all subjects and sync PDFs to `_overview/`:

```bash
python build.py
```

Compile specific subjects:

```bash
python build.py algo
python build.py algo iml sigproc
```

---

## Exam Instructions (for spring 2026 session)

| Subject | Allowed |
|---|---|
| Computer Systems | 4 double-sided A4 sheets, any format |
| Signal Processing | 2 double-sided A4 sheets, handwritten only |
| Algorithms I | 1 double-sided A4 sheet, any format |

---

## Subjects

### Computer Systems — `compsys/`
- [Cheat sheet](_overview/compsys/cheatsheet.pdf)

### Signal Processing — `sigproc/`
- [Cheat sheet](_overview/sigproc/cheatsheet.pdf)

### Algorithms I — `algo/`
- [Cheat sheet](_overview/algo/cheatsheet.pdf)
- [Course notes](_overview/algo/course.pdf)
- [Condensed algos](_overview/algo/algos_condensed.pdf)

### Introduction to Machine Learning — `iml/`
- [Cheat sheet](_overview/iml/cheatsheet.pdf)
- [Course notes](_overview/iml/course.pdf)
- [Python notes](_overview/iml/python_raw_notes.pdf)

### Introduction aux sciences du vivant (pour IC) — `isv/`
- [Course notes](_overview/isv/course.pdf)
- [Basic non formateed course notes](_overview/isv/SV_notes_basic.pdf)


---

## Setup

[LaTeX environment setup tutorial for VS code](https://www.youtube.com/watch?v=4lyHIQl4VM8)

---

## Structure

```
notes_ba4/
├── _overview/      # Compiled PDFs, one folder per subject
├── _shared/        # Shared LaTeX style files
├── algo/           # Algorithms I course
├── iml/            # Introduction to machine learning course
├── sigproc/        # Signal processing course
├── compsys/        # Computer systems course
└── isv/            # Intoduction aux sciences du vivant (pour IC) course
```

Each subject folder contains `.tex` sources; run `build.py` to recompile.
The `.tex` disponible for each course, for each folder may change but are mainly composed of `course.tex` and `cheatsheet.tex`. 

---

## Authors

<a href="https://github.com/AlphaXT38G/notes_ba4/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AlphaXT38G/notes_ba4" alt="Contributors">
</a>
