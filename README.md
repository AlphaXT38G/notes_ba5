# Notes BA5

LaTeX notes for the BA5 IN semester at EPFL.

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

## Exam Instructions (for autumn 2026 session)

| Subject | Allowed |
|---|---|
| Computer security and privacy| _____ |
| The software enterprise - from ideas to products | _____ |
| Algebra | _____ |
| Modeles stochastiques pour les communications | _____ |
| Numerical methods for visual computing and ML | _____ |
| Electronique I | _____ |
| Responsible software | _____ |


---

## Subjects

### Computer security and privacy — `compsec/`
- [Cheat sheet](_overview/compsec/cheatsheet.pdf)

### The software enterprise - from ideas to products — `swent/`
- [Cheat sheet](_overview/swent/cheatsheet.pdf)

### Algebra — `algebra/`
- [Cheat sheet](_overview/algebra/cheatsheet.pdf)
- [Course notes](_overview/algebra/course.pdf)

### Modeles stochastiques pour les communications — `modstoc/`
- [Cheat sheet](_overview/modstoc/cheatsheet.pdf)
- [Course notes](_overview/modstoc/course.pdf)

### Numerical methods for visual computing and ML — `nummet/`
- [Cheat sheet](_overview/nummet/cheatsheet.pdf)
- [Course notes](_overview/nummet/course.pdf)

### Electronique I — `elec/`
- [Cheat sheet](_overview/elec/cheatsheet.pdf)
- [Course notes](_overview/elec/course.pdf)

### Responsible software — `respsoft/`
- [Cheat sheet](_overview/respsoft/cheatsheet.pdf)
- [Course notes](_overview/respsoft/course.pdf)


---

## Setup

[LaTeX environment setup tutorial for VS code](https://www.youtube.com/watch?v=4lyHIQl4VM8)

---

## Structure

```
notes_ba4/
├── _overview/   # Compiled PDFs, one folder per subject
├── _shared/     # Shared LaTeX style files
├── compsec/     # Computer security and privacy course
├── swent/       # The software enterprise - from ideas to products course
├── algebra/     # Algebra course
├── modstoc/     # Modeles stochastiques pour les communications course
├── nummet/      # Numerical methods for visual computing and ML course
├── elec/        # Electronique I course
└── respsoft/    # Responsible software course
```

Each subject folder contains `.tex` sources; run `build.py` to recompile.
The `.tex` disponible for each course, for each folder may change but are mainly composed of `course.tex` and `cheatsheet.tex`. 

---

## Authors

<a href="https://github.com/AlphaXT38G/notes_ba5/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AlphaXT38G/notes_ba5" alt="Contributors">
</a>
