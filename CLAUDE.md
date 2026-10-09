# Kinetiq website: rules for working on this repo

Static site (HTML/CSS/JS, no build step) for Kinetiq, a New Zealand mechatronics company that hosts several products (tank monitor, smart filtration, acid dosing) and offers engineering services. Published with GitHub Pages from the `claude/awesome-ramanujan-fixnyr` branch.

## The owner edits text in the browser: keep that working

The owner changes wording themselves with the site editor (`assets/js/editor.js`): they add `?edit` to a page address, click text, and Save commits the change straight to GitHub. So:

1. **Pull before changing anything.** Run `git pull origin claude/awesome-ramanujan-fixnyr` first; the owner's edits arrive as commits like "Edit text on … (site editor)". Never overwrite or revert their wording unless they ask.
2. **The HTML files are the source of truth.** Edit them directly. Do not re-run `tools/build_pages.py`; it is a historical reference and would wipe the owner's edits.
3. **Keep new text editable.** After adding or changing pages or text, run `python3 tools/mark_editable.py`. It gives new text a `data-e` number without touching existing numbers or reformatting files, and adds the editor script to listed pages. New pages must be added to `PAGES` in that script.
4. **Don't renumber or remove `data-e` attributes** on text that stays; the editor finds text by them.
5. Header, footer and contact details are not editable in the browser (they repeat on every page); the owner asks for those to be changed in code.

## Content rules

- Kinetiq is the host company: the homepage stays general (product family first), and individual products get their own pages.
- Tank monitor facts: submersible stainless pressure probe on the tank floor; solar panel + battery; LoRa radio to a receiver in the house; receiver uploads over Wi-Fi to the cloud, app and website; fill-pump control (manual, auto by level, schedule, safety cut-outs). Numbers (5 km, 15 min, 1 cm, 5 m) are **design targets** and must be labelled that way.
- Smart filtration and acid dosing are concepts/mock-ups; label them so.
- Customers: dairy farms, sheep & beef, lifestyle blocks & rural homes, councils/marae/schools/businesses. Tone: engineering company. No team names. No invented customer quotes, numbers or reviews.
- Phone and email are still placeholders (`000 000 0000`, `hello@example.com`).

## Design

- Palette (grey, white, water blue, maroon) and the Archivo font live in `assets/css/style.css` tokens; dark mode is supported. Respect `prefers-reduced-motion`.
- Images are three.js renders; scene sources are in `tools/renders/` (see its README). The unit model in `unit.js` (`unit2`, `probe2`) follows the owner's prototype photo; tanks are NZ rotomoulded poly tanks (`nz.js`).
- Design skills are in `.claude/skills/` (`frontend-design`, `ui-ux-pro-max`).

## Checks before pushing

Serve the folder (`python3 -m http.server`) and screenshot key pages at desktop and 390 px width, light and dark; confirm no console errors or horizontal overflow.
