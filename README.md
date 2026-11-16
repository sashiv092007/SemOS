# SemOS

A semester workspace for students: cheat sheets, grade planning, clean notes and assignment scheduling in one place.

## Pages

| Page | Path | What it does |
| --- | --- | --- |
| Landing | `/` | Overview, a live countdown to your deadline and a preview of the Mastersheet workspace. |
| Mastersheet | `/mastersheet` | Enter a subject, unit and topic tags, attach notes and previous papers, and see a printable revision sheet update live alongside a readiness score. |
| Grade Analyzer | `/grade-analyzer` | Enter a target SGPA and your marks so far. Shows your projected SGPA, the minimum marks needed in each subject, a pass check and which subject pays off most. |
| Note Builder | `/note-builder` | Upload photos, screenshots or PDFs and read the notes page by page, with zoom, thumbnails, copy and PDF export. |
| Roadmap | `/roadmap` | Enter assignments, the hours each needs and the days you have. Orders them largest first, splits the time and counts down to the deadline (`7 days:00h:00min`). |

## Current status

Working fully in the browser, with no account needed:

- **Grade Analyzer** calculations, on a 10-point scale with an optional relative curve.
- **Roadmap** scheduling and countdown, saved in your browser.
- **Note Builder** reader and PDF export.
- **Mastersheet** live preview.

Not connected yet:

- **AI and OCR.** Uploaded files are not read. The Mastersheet uses a small built-in bank of Operating Systems topics, and the Note Builder shows sample notes. Both pages say so on screen.
- **Sign-in.** Nothing syncs across devices.

## Planned

- AI generation from uploaded notes, textbooks and previous papers
- Reading the syllabus and evaluation pattern from an uploaded file
- A spoiler-free LeetCode concept decoder
- Sign-in to save and sync

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Built with

Next.js, React, TypeScript, Tailwind CSS, Lucide icons and jsPDF.
