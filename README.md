# StyledEditor

A WYSIWYG HTML editor built around **named styles**, the way Word's Styles pane works: define how Heading 2 looks once, and every Heading 2 in the document follows. Content stays as clean semantic HTML; appearance lives in a single generated stylesheet that ships with the export.

Accessibility is a first-class requirement, for both the editor itself and the content it produces (WCAG 2.1 AA, with ATAG 2.0 as the guide for authoring support).

**Live demo:** https://lurk404.github.io/wysiwyg/

## What it does

- Named styles for H1–H6, Body, Quote, Callout, Caption and Link, plus custom class-based styles
- Live contrast badges beside every colour picker
- Accessibility checker (headings, links, alt text, contrast, tables) that updates as you type, with overlays in the document
- Tables inserted with caption and scoped headers already in place
- Visual, HTML code, and style-sheet specimen views
- Export to a self-contained HTML file with the stylesheet embedded in rem units, ready to paste into Brightspace's HTML editor

## Run it locally

Requires Node 20 or later.

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173/wysiwyg/).

## Deploying

Every push to `main` builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/StyledEditor.jsx` | The editor — all UI, style system, editing engine and checker |
| `src/storage.js` | Saves editor state to localStorage (stands in for the artifact sandbox's `window.storage`) |
| `src/main.jsx` | Entry point |
| `vite.config.js` | Build config; `base` must match the repo name for Pages |
