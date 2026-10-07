# Drummond Mechatronics website

A static website (plain HTML, CSS and JavaScript, no build step). Open `index.html` in a browser to view it, or host the folder anywhere (GitHub Pages, Netlify, Cloudflare Pages).

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: hero, products, how we work, gallery, testimonials, enquiry form |
| `products/water-monitor.html` | Water tank monitoring, with the demo usage dashboard |
| `products/smart-filtration.html` | Smart filtration (concept) |
| `products/acid-dosing.html` | Automated acid dosing for dairy (concept) |

## Before going live, replace the placeholders

- **Business name**: "Drummond Mechatronics" is a placeholder. Find and replace it across all `.html` files.
- **Phone and email**: search for `000 000 0000`, `+640000000000` and `hello@example.com` in the HTML files, and `CONTACT_EMAIL` in `assets/js/main.js`.
- **Product photos**: `assets/img/water-monitor.svg`, `smart-filtration.svg` and `acid-dosing.svg` are illustrations. To use photos, add e.g. `water-monitor.jpg` and update the `src` in `index.html` and the product page.
- **Gallery**: `assets/img/gallery-1.svg` to `gallery-5.svg` are empty placeholders. Swap in your photos and edit the captions in `index.html`.
- **Testimonials**: the three quotes on the home page are placeholder text. Replace them with real customer quotes.
- **Enquiry form**: by default it opens the visitor's email app with the message filled in. To receive enquiries directly, create a free form at a service such as Formspree and paste its URL into `FORM_ENDPOINT` in `assets/js/main.js`.

## Water monitor dashboard

`assets/js/dashboard.js` draws the dashboard from sample data generated in `loadTankData()`. When the receiver can send real readings, replace that function with a `fetch` that returns the same shape (described at the top of the file).

## Colours and fonts

All colours are set at the top of `assets/css/style.css` (`:root`), with a dark-mode set below it. The font is Archivo from Google Fonts.

## Publishing on GitHub Pages

In the repository on GitHub, go to Settings → Pages, choose "Deploy from a branch", then select the branch and `/ (root)`.
