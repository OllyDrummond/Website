# Kinetiq website

A static website (plain HTML, CSS and JavaScript, no build step needed to view it). Open `index.html` in a browser, or host the folder on GitHub Pages, Netlify or Cloudflare Pages.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: product-family hero (all products on stage, linked labels), product grid, services, about us, contact |
| `services.html` | Custom machine design, electronics & PCB, PLC programming, automation & control, install & maintenance |
| `projects.html` | Projects with filters (completed / mock-ups) |
| `about.html` | Company story, who we work with, values and capabilities (no names) |
| `products/water-monitor.html` | Tank monitor product page: how it works, usage demo, features, exploded view, design-target specs |
| `projects/tank-monitor-live.html` | Live view mock-up: real-time level, 24 h chart, daily use, pump control (manual / auto / schedule) and safety cut-outs |
| `products/smart-filtration.html` | Smart filtration (mock-up) |
| `products/acid-dosing.html` | Automated acid dosing (mock-up) |
| `portal/login.html` → `portal/dashboard.html` | Client portal demo. Sign in does nothing but open the dashboard |

## Editing text (in the browser)

1. Open any page and add `?edit` to the end of the address, e.g. `https://ollydrummond.github.io/Website/?edit` or `.../products/water-monitor.html?edit`. (Or press Ctrl+Shift+E.)
2. Everything you can change has a dashed outline. Click it and type. Enter finishes a line; Shift+Enter adds a line break in paragraphs.
3. Press **Save changes**. The first time, the editor asks for a GitHub access key (fine-grained personal access token, limited to this repository, with **Contents: Read and write**). The steps are shown on screen.
4. The change is committed to the `claude/awesome-ramanujan-fixnyr` branch and GitHub Pages republishes it within a minute or two.

Only someone with an access key can save, so visitors can't change the site. The header menu, footer and contact details aren't editable this way (they repeat on every page); ask for those to be changed in the code.

The editor is `assets/js/editor.js`. Text is found by its `data-e` number; `python3 tools/mark_editable.py` marks any new text added to the pages.

`tools/build_pages.py` generated the first version of the pages. The HTML files are now the source, so don't re-run it (it would overwrite edits).

Contact details placeholders live in the page HTML and in `assets/js/main.js` (`CONTACT_EMAIL`).

## Before going live

- **Phone and email** are placeholders (`000 000 0000`, `hello@example.com`).
- **Enquiry form**: by default it opens the visitor's email app. To receive enquiries directly, create a form at a service like Formspree and paste its URL into `FORM_ENDPOINT` in `assets/js/main.js`.
- **Live view** runs a simulation in `assets/js/live.js` (1 second = 1 minute). Real readings and pump commands plug in at `simulateMinute()` / `sendCommand()` once the cloud API exists.
- **Client portal** is a front-end demo with sample data. Real sign-in and live readings need a backend; `loadTankData()` in `assets/js/dashboard.js` is where real data plugs in.

## Images

All product and engineering images in `assets/img/renders/` are 3D renders made with three.js. The tank monitor model is based on the prototype photo. The scenes are in `tools/renders/` (see its README) and can be changed and re-rendered. To use real photos, replace the `.webp` files with your own of the same name.

## Look and feel

Colours (grey, white, water blue, maroon) are set at the top of `assets/css/style.css`, with a dark-mode set below. The font is Archivo from Google Fonts. Scroll animations respect the visitor's "reduce motion" setting.
