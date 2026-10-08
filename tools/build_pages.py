"""Generates the static HTML pages for the Kinetiq site."""
import os

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PHONE_DISPLAY = "000 000 0000"
PHONE_TEL = "+640000000000"
EMAIL = "hello@example.com"

FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='5' y='4' width='5' height='24' rx='1.5' fill='%231c2227'/%3E"
           "%3Cpath d='M14 16 25 5M14 16l11 11' stroke='%237a1f2b' stroke-width='5' stroke-linecap='round'/%3E%3Ccircle cx='14' cy='16' r='3.6' fill='%23fff' stroke='%231c2227' stroke-width='2.4'/%3E%3C/svg%3E")

LOGO = ('<svg viewBox="0 0 32 32" aria-hidden="true"><rect class="bar" x="5" y="4" width="5" height="24" rx="1.5"/>'
        '<path d="M14 16 25 5M14 16l11 11" stroke="#7a1f2b" stroke-width="5" stroke-linecap="round"/>'
        '<circle class="pivot" cx="14" cy="16" r="3.6"/><circle class="pivot-hole" cx="14" cy="16" r="1.4"/></svg>')

I = {
    "phone": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    "pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.6 2.5L16 9.5"/></svg>',
    "user": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    "info": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    "wrench": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-4-4 8-8-1.3-1.3a4 4 0 0 0-5-5l2.6 2.6-2.1 2.1L8.6 4.8"/></svg>',
    "cpu": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
    "radio": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/></svg>',
    "battery": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2M6 10v4M10 10v4"/></svg>',
    "bell": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    "drop": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
    "layers": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
    "gauge": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-6"/></svg>',
    "chart": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/></svg>',
    "shield": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/></svg>',
    "home": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>',
    "tank": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M5 13h14"/></svg>',
    "settings": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    "out": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    "warn": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17v.5"/></svg>',
}


def head(title, desc, root):
    full = "Kinetiq" if title is None else f"{title} | Kinetiq"
    return f"""<!doctype html>
<html lang="en-NZ">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{full}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#1b2126">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{root}assets/css/style.css">
  <link rel="icon" href="{FAVICON}">
</head>
"""


NAV = [("Products", "index.html#products"), ("Services", "services.html"), ("Projects", "projects.html"), ("About", "about.html"), ("Contact", "index.html#contact")]


def header(root, current=None, over_hero=False):
    links = "\n".join(
        f'        <a href="{root}{href}"{" aria-current=\"page\"" if label == current else ""}>{label}</a>' for label, href in NAV)
    cls = "site-header over-hero" if over_hero else "site-header"
    return f"""<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="{cls}">
    <div class="wrap">
      <a class="brand" href="{root}index.html" aria-label="Kinetiq home">{LOGO}Kinetiq</a>
      <nav class="nav" id="nav" aria-label="Main">
{links}
      </nav>
      <div class="header-actions">
        <a class="btn btn-ghost btn-sm hide-sm" href="tel:{PHONE_TEL}">{I['phone']}{PHONE_DISPLAY}</a>
        <a class="btn btn-primary btn-sm" href="{root}portal/login.html">{I['user']}Client login</a>
      </div>
      <button class="menu-toggle" aria-expanded="false" aria-controls="nav">Menu</button>
    </div>
  </header>
"""


def footer(root, scripts=()):
    extra = "".join(f'\n  <script src="{root}assets/js/{s}"></script>' for s in scripts)
    return f"""
  <footer class="site-footer">
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <a class="brand" href="{root}index.html" aria-label="Kinetiq home">{LOGO}Kinetiq</a>
          <p>New Zealand engineering company building tank monitoring, pump control and automation for farms, rural properties and organisations.</p>
        </div>
        <div>
          <h4>Products</h4>
          <ul>
            <li><a href="{root}products/water-monitor.html">Water tank monitoring</a></li>
            <li><a href="{root}projects/tank-monitor-live.html">Live demo &amp; pump control</a></li>
            <li><a href="{root}products/smart-filtration.html">Smart filtration</a></li>
            <li><a href="{root}products/acid-dosing.html">Automated acid dosing</a></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a href="{root}services.html">Services</a></li>
            <li><a href="{root}projects.html">Projects</a></li>
            <li><a href="{root}about.html">About</a></li>
            <li><a href="{root}portal/login.html">Client login</a></li>
          </ul>
        </div>
        <div>
          <h4>Get in touch</h4>
          <ul>
            <li><a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>
            <li><a href="mailto:{EMAIL}">{EMAIL}</a></li>
            <li>New Zealand</li>
          </ul>
        </div>
      </div>
      <div class="footer-base">
        <p>© <span data-year></span> Kinetiq</p>
        <p>Designed and built in New Zealand</p>
      </div>
    </div>
  </footer>

  <script src="{root}assets/js/main.js"></script>{extra}
</body>
</html>
"""


def cta(root, title="Got a job worth automating?", text="Tell us what's eating your time. We'll tell you honestly whether a machine can do it."):
    return f"""
    <section class="cta">
      <svg class="bg-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="4" width="5" height="24" rx="1.5" fill="#fff"/><path d="M14 16 25 5M14 16l11 11" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>
      <div class="wrap" data-reveal>
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <a class="btn" href="{root}index.html#contact">Talk to an engineer</a>
      </div>
    </section>
"""


def write(path, html):
    full = os.path.join(SITE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as f:
        f.write(html)
    print("wrote", path)


def img(root, name, alt, eager=False, width=1600, height=1200):
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return f'<img src="{root}assets/img/renders/{name}.webp" alt="{alt}" width="{width}" height="{height}" {load} decoding="async">'


# =========================================================================
# Shared bits for the tank monitor
# =========================================================================
# Which rotating render is used where. Each is a folder of frames in
# assets/img/turntables/<name>/00.webp, 01.webp, ...
TT = {
    "tanksteel": dict(frames=24, mode="pingpong", alt="Kinetiq tank monitor installed on a corrugated steel farm tank, cut away to show the pressure probe on the tank floor"),
    "tankpoly": dict(frames=24, mode="pingpong", alt="Kinetiq tank monitor mounted on a plastic rainwater tank, cut away to show the pressure probe on the tank floor"),
    "kit": dict(frames=36, mode="loop", alt="Kinetiq tank monitor: grey enclosure with solar panel and antenna, coiled cable and stainless pressure probe"),
    "exploded": dict(frames=36, mode="loop", alt="Exploded view of the Kinetiq tank monitor showing the solar panel, enclosure, circuit board, battery and probe"),
}
HERO_TT = "tanksteel"      # homepage hero
PRODUCT_TT = "kit"         # product page hero

DRAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3"/></svg>'


def turntable(root, name, eager=False, hint=True):
    t = TT[name]
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    h = f'<p class="turntable-hint">{DRAG}Drag to turn it</p>' if hint else ""
    return (f'<div class="turntable" data-turntable="{root}assets/img/turntables/{name}" data-frames="{t["frames"]}" data-mode="{t["mode"]}" role="img" aria-label="{t["alt"]}. Rotating view; drag or use the arrow keys to turn it.">'
            f'<img src="{root}assets/img/turntables/{name}/00.webp" alt="" width="1200" height="900" {load} decoding="async"></div>{h}')


def frame(root, name, alt, i=0, eager=False):
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return f'<img src="{root}assets/img/turntables/{name}/{i:02d}.webp" alt="{alt}" width="1200" height="900" {load} decoding="async">'


I.update({
    "probe": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2v9"/><rect x="9" y="11" width="6" height="10" rx="2"/><path d="M9 17h6"/></svg>',
    "sun": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    "router": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 16.5h.01M11 16.5h.01M17 13V8M14 5.5a4 4 0 0 1 6 0"/></svg>',
    "cloud": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8H7z"/></svg>',
    "phone2": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    "pump": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 12 8 6M12 12l6 2M12 12l-2 7"/></svg>',
    "cow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 8 3 5M19 8l2-3"/><path d="M6 8h12v6a6 6 0 0 1-12 0z"/><path d="M9 15h.01M15 15h.01"/></svg>',
    "hills": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 19 9 9l4 6 3-4 6 8z"/></svg>',
    "building": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg>',
})

FLOW = [
    ("probe", "Pressure probe", "A stainless probe sits on the tank floor and measures the weight of water above it, which gives the depth.", "In the tank"),
    ("sun", "Sensor unit", "Reads the probe on a schedule. A small solar panel keeps its battery topped up, so there are no wires to run.", "On the tank"),
    ("radio", "LoRa radio link", "Sends each reading by long-range radio to the house, across paddocks and hills, with no mobile coverage needed.", "Up to 5 km (target)"),
    ("router", "Receiver", "Sits in the house or shed, shows every tank on its screen and uploads readings over your Wi-Fi.", "In the house"),
    ("phone2", "App & website", "Levels, usage, alerts and pump control from your phone or computer, wherever you are.", "Anywhere"),
]


def flow_block():
    items = "\n".join(f"""          <li><span class="node">{I[ic]}</span><div><h3>{t}</h3><p>{d}</p><span class="tag">{tag}</span></div></li>""" for ic, t, d, tag in FLOW)
    return f"""        <ol class="flow" data-stagger>
{items}
        </ol>"""


SEGMENTS = [
    ("cow", "Dairy farms", "Keep an eye on shed and wash-down water, and fill the tank from the bore automatically before milking."),
    ("hills", "Sheep &amp; beef", "Stock-water tanks spread over hill country, checked from the house instead of the ute."),
    ("home", "Lifestyle blocks &amp; rural homes", "Know how much rainwater is left for the house and get an alert before it runs low."),
    ("building", "Councils, marae, schools &amp; businesses", "Shared or community supplies with a clear record of levels and usage for everyone responsible."),
]


def segments_block():
    items = "\n".join(f"""          <div class="segment"><div class="ico">{I[ic]}</div><h3>{t}</h3><p>{d}</p></div>""" for ic, t, d in SEGMENTS)
    return f"""        <div class="segments" data-stagger>
{items}
        </div>"""


TARGET_STATS = """          <div class="stat"><p class="num" data-count="5">5<small>km</small></p><p>LoRa range to the receiver, line of sight</p></div>
          <div class="stat"><p class="num" data-count="15">15<small>min</small></p><p>Between readings, faster while the pump runs</p></div>
          <div class="stat"><p class="num" data-count="1">1<small>cm</small></p><p>Level resolution from the pressure probe</p></div>
          <div class="stat"><p class="num" data-count="5">5<small>m</small></p><p>Maximum tank depth</p></div>"""


def trial_form(r):
    return f"""        <form class="form" id="quote-form" novalidate data-reveal>
          <div class="field">
            <label for="f-name">Name</label>
            <input id="f-name" name="name" autocomplete="name" required>
            <p class="error" id="f-name-err">Enter your name.</p>
          </div>
          <div class="field">
            <label for="f-phone">Phone <span class="hint">(optional)</span></label>
            <input id="f-phone" name="phone" type="tel" autocomplete="tel">
          </div>
          <div class="field full">
            <label for="f-email">Email</label>
            <input id="f-email" name="email" type="email" autocomplete="email" required>
            <p class="error" id="f-email-err">Enter an email address like name@example.com.</p>
          </div>
          <div class="field full">
            <label for="f-product">What are you interested in?</label>
            <select id="f-product" name="product">
              <option>Tank monitor trial</option>
              <option>Tank monitor with pump control</option>
              <option>Smart filtration</option>
              <option>Automated acid dosing</option>
              <option>Custom machine design</option>
              <option>Electronics &amp; PCB design</option>
              <option>PLC programming</option>
              <option>Automation &amp; control</option>
              <option>Installation &amp; maintenance</option>
              <option>Something else</option>
            </select>
          </div>
          <div class="field full">
            <label for="f-msg">About your site</label>
            <textarea id="f-msg" name="message" required placeholder="e.g. Dairy farm near Te Awamutu. Two 30,000 L concrete tanks fed from a bore, about 600 m from the house."></textarea>
            <p class="error" id="f-msg-err">Tell us a little about your tanks or project.</p>
          </div>
          <div class="full"><button class="btn btn-primary" type="submit">Send</button></div>
          <p class="form-status" id="form-status" role="status"></p>
        </form>"""


# =========================================================================
# Home
# =========================================================================
def home():
    r = ""
    services = [
        ("gears", "Custom machine design", "One-off machines and mechanisms designed around the job, from concept sketches to CAD and a working build.", "services.html#machine-design"),
        ("pcb", "Electronics &amp; PCB design", "Sensor boards, controllers and long-range wireless telemetry, designed and tested in-house.", "services.html#electronics"),
        ("plc", "PLC programming", "Programming, commissioning and fault-finding for PLC-controlled plant, new or existing.", "services.html#plc"),
    ]
    svc_cards = "\n".join(f"""          <a class="service" href="{href}">
            <div class="service-media">{img(r, n, '', width=1600, height=1000)}</div>
            <div class="service-body"><h3>{t}</h3><p>{d}</p></div>
          </a>""" for n, t, d, href in services)
    html = head(None, "Kinetiq is a New Zealand engineering company. Our tank monitor reads water levels from the bottom of the tank, runs on solar power and sends readings by LoRa radio to your house, phone and computer.", r)
    html += header(r, over_hero=True)
    html += f"""
  <main id="main">
    <section class="hero on-dark" aria-labelledby="hero-title">
      <div class="hero-media">{img(r, 'hero', 'Kinetiq tank monitor with solar panel and antenna mounted on the roof of a corrugated steel water tank', eager=True, width=2400, height=1300)}</div>
      <div class="wrap">
        <div class="hero-copy">
          <p class="kicker" data-reveal>Mechatronics for New Zealand farms</p>
          <h1 id="hero-title" data-reveal style="--d:.08s">Smart machines for the jobs that never stop.</h1>
          <p class="lede" data-reveal style="--d:.16s">We design, build and install sensors, controllers and automation for farms, rural properties and organisations. Our tank monitor is built and working, and we're taking sites for the trial now.</p>
          <div class="hero-actions" data-reveal style="--d:.24s">
            <a class="btn btn-primary" href="products/water-monitor.html">See the tank monitor</a>
            <a class="btn btn-ghost" href="#contact">Join the trial</a>
          </div>
        </div>
      </div>
      <aside class="live-card" data-live aria-label="Example live tank reading">
        <div class="top"><span class="live-dot">Live</span><span>Tank 1 · House</span></div>
        <p class="big">62<small>% full</small></p>
        <div class="meter"><span style="width:62%"></span></div>
        <p><span data-litres>13,640 L</span> · updated <span data-ago>just now</span> · demo</p>
      </aside>
    </section>

    <section class="stats" aria-label="Tank monitor design targets">
      <div class="wrap">
        <div class="stats-grid" data-stagger>
{TARGET_STATS}
        </div>
        <p class="target-note">Design targets for the production unit. We'll publish measured figures as trials finish.</p>
      </div>
    </section>

    <section id="products">
      <div class="wrap">
        <div class="section-head" data-reveal>
          <p class="kicker">Products</p>
          <h2>Built for the paddock, not the lab</h2>
          <p class="lede">One system finished and in trials, two more on the drawing board. Built for dairy farms, sheep and beef, lifestyle blocks, and councils, marae, schools and businesses.</p>
        </div>

        <div class="flagship">
          <div class="flagship-media" data-reveal="zoom">
            {img(r, 'unit', 'Kinetiq tank monitor: grey enclosure with solar panel and antenna, coiled cable and stainless pressure probe')}
            <div class="inset">{img(r, 'receiver', 'Kinetiq receiver showing tank level on its screen')}</div>
          </div>
          <div data-reveal>
            <span class="badge ready">Completed</span>
            <h2 style="margin-top:14px">Water tank monitoring</h2>
            <p class="lede">A stainless pressure probe on the tank floor measures the water depth. The solar-powered sensor unit sends each reading by LoRa radio to a receiver in the house, which uploads it over Wi-Fi to the Kinetiq app and website.</p>
            <ul class="checks">
              <li>{I['check']}<span>Submersible pressure probe that reads the level from the bottom of the tank</span></li>
              <li>{I['check']}<span>Solar panel and battery, so no power or phone signal is needed at the tank</span></li>
              <li>{I['check']}<span>Levels, daily use, alerts and pump control on your phone or computer</span></li>
            </ul>
            <div class="hero-actions" style="margin-top:0"><a class="btn btn-primary" href="products/water-monitor.html">Explore the tank monitor</a><a class="btn btn-ghost" href="projects/tank-monitor-live.html">Live demo</a></div>
          </div>
        </div>

        <div class="cards" style="margin-top:clamp(40px,6vw,72px)" data-stagger>
          <a class="card" href="products/smart-filtration.html">
            <div class="card-media">{img(r, 'filtration', 'Mock-up of a three-stage smart filtration unit with pressure gauges and controller')}<span class="badge mock">Mock-up</span></div>
            <div class="card-body"><h3>Smart filtration</h3><p>Pressure sensors on each filter stage tell you which cartridge needs changing and when.</p><span class="link-arrow">See the concept {I['arrow']}</span></div>
          </a>
          <a class="card" href="products/acid-dosing.html">
            <div class="card-media">{img(r, 'dosing', 'Mock-up of an automated acid dosing system with chemical drum, peristaltic pump and controller')}<span class="badge mock">Mock-up</span></div>
            <div class="card-body"><h3>Automated acid dosing</h3><p>Measured acid for every dairy plant wash, logged automatically, with no one handling chemicals.</p><span class="link-arrow">See the concept {I['arrow']}</span></div>
          </a>
        </div>
      </div>
    </section>

    <section class="dark" id="services">
      <div class="wrap">
        <div class="section-head split" data-reveal>
          <div>
            <p class="kicker">Services</p>
            <h2>From an idea on a napkin to a machine on site</h2>
          </div>
          <a class="btn btn-ghost" href="services.html" style="color:#fff">All services</a>
        </div>
        <div class="services" data-stagger>
{svc_cards}
          <a class="service textonly" href="services.html#automation">
            <div class="service-body"><div class="service-icon">{I['gauge']}</div><h3>Automation &amp; control</h3><p>Pumps, valves, motors and sensors tied together so the process runs itself, with alarms when it needs you.</p></div>
          </a>
          <a class="service textonly" href="services.html#install">
            <div class="service-body"><div class="service-icon">{I['wrench']}</div><h3>Installation &amp; maintenance</h3><p>We fit what we build, commission it on site and stay on call for servicing, spares and updates.</p></div>
          </a>
        </div>
      </div>
    </section>

    <section id="process">
      <div class="wrap">
        <div class="section-head" data-reveal>
          <p class="kicker">How we work</p>
          <h2>Four steps from problem to installed system</h2>
        </div>
        <ol class="process">
          <li><span></span><h3>See the problem</h3><p>We visit, look at the site and work out what's going wrong and what it costs you.</p></li>
          <li><span></span><h3>Design &amp; prototype</h3><p>Mechanics, electronics and software, designed together and proven on the bench.</p></li>
          <li><span></span><h3>Install &amp; trial</h3><p>We fit it and run it alongside your current routine until it earns its place.</p></li>
          <li><span></span><h3>Support it</h3><p>Firmware updates, spare parts and a real person to call when you need one.</p></li>
        </ol>
      </div>
    </section>

    <section class="band" id="project">
      <div class="wrap">
        <div class="section-head split" data-reveal>
          <div>
            <p class="kicker">Projects</p>
            <h2>What we've built</h2>
          </div>
          <a class="btn btn-ghost" href="projects.html">All projects</a>
        </div>
        <div class="project" data-reveal>
          <a class="project-media" href="projects/tank-monitor-live.html" aria-label="Open the tank monitor live view">{img(r, 'installed', 'Kinetiq tank monitor installed on a farm tank, cut away to show the probe on the tank floor')}</a>
          <div class="project-body">
            <span class="badge ready">Completed</span>
            <h3 style="font-size:1.6rem">Tank monitoring &amp; pump control</h3>
            <p class="muted">Rural properties often find out a tank is empty when the taps stop. We built a probe, sensor unit and receiver that report each tank's level, daily use and days remaining, and can run the pump that fills it.</p>
            <dl class="facts">
              <div><dt>Sensing</dt><dd>Submersible pressure probe</dd></div>
              <div><dt>Power</dt><dd>Solar + battery</dd></div>
              <div><dt>Link</dt><dd>LoRa → receiver → Wi-Fi → cloud</dd></div>
              <div><dt>Control</dt><dd>Fill pump: manual, auto, schedule</dd></div>
            </dl>
            <div class="actions"><a class="btn btn-primary" href="projects/tank-monitor-live.html">Open live view</a><a class="btn btn-ghost" href="products/water-monitor.html">Product details</a></div>
          </div>
        </div>
      </div>
    </section>
{cta(r)}
    <section id="contact">
      <div class="wrap contact-grid">
        <div data-reveal>
          <p class="kicker">Contact</p>
          <h2>Join the trial, or tell us about a problem</h2>
          <p class="lede">We're taking farms, rural properties and organisations around New Zealand for the tank monitor trial. For anything else, describe the job you'd like automated and we'll reply with whether we can help and a rough price.</p>
          <div class="contact-direct">
            <a href="tel:{PHONE_TEL}">{I['phone']}{PHONE_DISPLAY}</a>
            <a href="mailto:{EMAIL}">{I['mail']}{EMAIL}</a>
            <span>{I['pin']}New Zealand</span>
          </div>
        </div>
        <form class="form" id="quote-form" novalidate data-reveal>
          <div class="field">
            <label for="f-name">Name</label>
            <input id="f-name" name="name" autocomplete="name" required>
            <p class="error" id="f-name-err">Enter your name.</p>
          </div>
          <div class="field">
            <label for="f-phone">Phone <span class="hint">(optional)</span></label>
            <input id="f-phone" name="phone" type="tel" autocomplete="tel">
          </div>
          <div class="field full">
            <label for="f-email">Email</label>
            <input id="f-email" name="email" type="email" autocomplete="email" required>
            <p class="error" id="f-email-err">Enter an email address like name@example.com.</p>
          </div>
          <div class="field full">
            <label for="f-product">What's it about?</label>
            <select id="f-product" name="product">
              <option>Tank monitor trial</option>
              <option>Tank monitor with pump control</option>
              <option>Smart filtration</option>
              <option>Automated acid dosing</option>
              <option>Custom machine design</option>
              <option>Electronics &amp; PCB design</option>
              <option>PLC programming</option>
              <option>Automation &amp; control</option>
              <option>Installation &amp; maintenance</option>
              <option>Something else</option>
            </select>
          </div>
          <div class="field full">
            <label for="f-msg">Describe the problem</label>
            <textarea id="f-msg" name="message" required placeholder="e.g. Two 25,000 L tanks on a hill, filled from the bore, about 400 m from the house. We only find out they're empty when the taps stop."></textarea>
            <p class="error" id="f-msg-err">Tell us a little about the problem.</p>
          </div>
          <div class="full"><button class="btn btn-primary" type="submit">Send enquiry</button></div>
          <p class="form-status" id="form-status" role="status"></p>
        </form>
      </div>
    </section>
  </main>
"""
    html += footer(r)
    write("index.html", html)


# =========================================================================
# Services
# =========================================================================
def services():
    r = ""
    rows = [
        ("machine-design", "gears", False, "Custom machine design", "When there's no off-the-shelf machine for the job, we design one. Mechanisms, frames, drives and enclosures, modelled in CAD and built to survive farm conditions.",
         ["Concept design and feasibility", "3D CAD modelling and drawings", "Motor, gearbox and actuator selection", "Prototype fabrication and testing"]),
        ("electronics", "pcb", False, "Electronics &amp; PCB design", "Custom circuit boards for sensing, control and wireless communication. The boards inside our tank monitor were designed and tested in-house.",
         ["Schematic and PCB layout", "Low-power, battery-run designs", "LoRa and other long-range radio links", "Firmware for microcontrollers"]),
        ("plc", "plc", True, "PLC programming", "Programming and commissioning for PLC-controlled plant, whether it's a new control panel or an existing system that needs changes or fault-finding.",
         ["Ladder logic and structured text", "HMI screens and alarms", "Changes to existing programs", "On-site commissioning and fault-finding"]),
        ("automation", "dosing", True, "Automation &amp; control", "We tie pumps, valves, motors and sensors together so a process runs on its own, logs what it did and tells you when something's wrong.",
         ["Pump and valve control", "Sensor integration and calibration", "Remote monitoring and alerts", "Data logging and reports"]),
        ("install", "installed", False, "Installation &amp; maintenance", "We fit what we build, commission it on site and stay on call afterwards. Servicing, spare parts and firmware updates are all handled by the people who designed it.",
         ["On-site installation", "Commissioning and handover", "Scheduled servicing", "Repairs, spares and updates"]),
    ]
    blocks = []
    for id_, image, light, title, text, items in rows:
        lis = "".join(f"<li>{x}</li>" for x in items)
        blocks.append(f"""        <div class="detail" id="{id_}">
          <div class="detail-media{' light' if light else ''}" data-reveal="zoom">{img(r, image, '')}</div>
          <div data-reveal>
            <h2>{title}</h2>
            <p class="lede">{text}</p>
            <ul>{lis}</ul>
          </div>
        </div>""")
    html = head("Services", "Custom machine design, electronics and PCB design, PLC programming, automation and installation for New Zealand farms and rural businesses.", r)
    html += header(r, "Services")
    html += f"""
  <main id="main">
    <section class="page-hero with-media">
      <div class="wrap">
        <div>
          <p class="kicker" data-reveal>Services</p>
          <h1 data-reveal style="--d:.08s">Mechanical, electrical and software, under one roof.</h1>
          <p class="lede" data-reveal style="--d:.16s">Mechatronics means the moving parts, the electronics and the code are designed together. That's how we work on every job, big or small.</p>
        </div>
        <div class="page-hero-media" data-reveal="zoom">{img(r, 'hero', 'Kinetiq tank monitor installed on a corrugated water tank', eager=True, width=2400, height=1300)}</div>
      </div>
    </section>

    <section>
      <div class="wrap">
{chr(10).join(blocks)}
      </div>
    </section>
{cta(r, "Not sure which service you need?", "Describe the problem and we'll work out the right mix.")}
  </main>
"""
    html += footer(r)
    write("services.html", html)


# =========================================================================
# Projects
# =========================================================================
def projects():
    r = ""
    html = head("Projects", "Kinetiq projects: the completed tank monitor with live view and pump control, plus smart filtration and automated acid dosing mock-ups.", r)
    html += header(r, "Projects")
    html += f"""
  <main id="main">
    <section class="page-hero">
      <div class="wrap">
        <p class="kicker" data-reveal>Projects</p>
        <h1 data-reveal style="--d:.08s">What we've built, and what's next.</h1>
        <p class="lede" data-reveal style="--d:.16s">Every project starts with a real problem on a real property. Completed work is marked as completed, and ideas still in design are marked as mock-ups.</p>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="section-head split" style="margin-bottom:28px">
          <div class="chips" role="group" aria-label="Filter projects">
            <button type="button" data-filter="all" aria-pressed="true">All</button>
            <button type="button" data-filter="completed" aria-pressed="false">Completed</button>
            <button type="button" data-filter="mockup" aria-pressed="false">Mock-ups</button>
          </div>
        </div>

        <article class="project" data-status="completed" data-reveal>
          <a class="project-media" href="projects/tank-monitor-live.html" aria-label="Open the tank monitor live view">{img(r, 'installed', 'Kinetiq tank monitor installed on a farm tank')}</a>
          <div class="project-body">
            <span class="badge ready">Completed</span>
            <h2 style="font-size:1.8rem">Tank monitoring &amp; pump control</h2>
            <p class="muted">On rural properties, tanks are often far from the house and checked by climbing a ladder, or not at all until the taps stop. A stainless pressure probe on the tank floor measures the depth. A solar-powered sensor unit sends it by LoRa radio to a receiver in the house, which uploads it over Wi-Fi so levels, usage and pump control are on your phone or computer.</p>
            <dl class="facts">
              <div><dt>Sensing</dt><dd>Submersible pressure probe</dd></div>
              <div><dt>Power</dt><dd>Solar + battery</dd></div>
              <div><dt>Link</dt><dd>LoRa → receiver → Wi-Fi → cloud</dd></div>
              <div><dt>Status</dt><dd>Built and working · trials open</dd></div>
            </dl>
            <div class="actions"><a class="btn btn-primary" href="projects/tank-monitor-live.html">Open live view</a><a class="btn btn-ghost" href="products/water-monitor.html">Product details</a></div>
          </div>
        </article>

        <article class="project" data-status="mockup" data-reveal>
          <div class="project-media">{img(r, 'filtration', 'Mock-up of a smart filtration unit')}</div>
          <div class="project-body">
            <span class="badge mock">Mock-up</span>
            <h2 style="font-size:1.8rem">Smart filtration</h2>
            <p class="muted">Filter cartridges are usually changed by the calendar, so good ones get thrown out and blocked ones stay in. This concept measures pressure across each stage and tells you which one actually needs changing.</p>
            <dl class="facts">
              <div><dt>Problem</dt><dd>Guesswork on filter changes</dd></div>
              <div><dt>Concept</dt><dd>Pressure, flow and UV monitoring</dd></div>
              <div><dt>Disciplines</dt><dd>Sensing, control, plumbing</dd></div>
              <div><dt>Status</dt><dd>Mock-up</dd></div>
            </dl>
            <div class="actions"><a class="btn btn-ghost" href="products/smart-filtration.html">See the concept</a></div>
          </div>
        </article>

        <article class="project" data-status="mockup" data-reveal>
          <div class="project-media">{img(r, 'dosing', 'Mock-up of an automated acid dosing system')}</div>
          <div class="project-body">
            <span class="badge mock">Mock-up</span>
            <h2 style="font-size:1.8rem">Automated acid dosing</h2>
            <p class="muted">Dairy plant washes often rely on someone measuring acid by hand, twice a day. This concept doses straight from the drum with a peristaltic pump and logs every wash.</p>
            <dl class="facts">
              <div><dt>Problem</dt><dd>Hand-measured chemical dosing</dd></div>
              <div><dt>Concept</dt><dd>Peristaltic pump + controller</dd></div>
              <div><dt>Disciplines</dt><dd>Fluid handling, control, logging</dd></div>
              <div><dt>Status</dt><dd>Mock-up</dd></div>
            </dl>
            <div class="actions"><a class="btn btn-ghost" href="products/acid-dosing.html">See the concept</a></div>
          </div>
        </article>
      </div>
    </section>
{cta(r, "Have a project in mind?", "Tell us about it. Many of our best ideas started with a customer's problem.")}
  </main>
"""
    html += footer(r)
    write("projects.html", html)


# =========================================================================
# About
# =========================================================================
def about():
    r = ""
    html = head("About", "Kinetiq is a New Zealand engineering company building tank monitoring, pump control and automation for farms, rural properties and organisations.", r)
    html += header(r, "About")
    html += f"""
  <main id="main">
    <section class="page-hero with-media">
      <div class="wrap">
        <div>
          <p class="kicker" data-reveal>About Kinetiq</p>
          <h1 data-reveal style="--d:.08s">Engineers who'd rather fix the problem than sell you a gadget.</h1>
          <p class="lede" data-reveal style="--d:.16s">Kinetiq is a New Zealand engineering company. We design and build practical machines, sensors and control systems for farms, rural properties and the organisations that look after shared water.</p>
        </div>
        <div class="page-hero-media" data-reveal="zoom">{img(r, 'pcb', 'Close-up of a Kinetiq circuit board', eager=True, width=1600, height=1000)}</div>
      </div>
    </section>

    <section>
      <div class="wrap split-2">
        <div data-reveal>
          <p class="kicker">Our story</p>
          <h2>It started with an empty tank</h2>
        </div>
        <div data-reveal>
          <p class="lede">Rural life runs on systems most people never think about: water, pumps, filters, wash-downs. When they fail, you find out the hard way.</p>
          <p class="muted">Our first project was a simple question: why do you have to climb a ladder to find out how much water is in the tank? The answer became the Kinetiq tank monitor: a pressure probe on the tank floor, a solar-powered sensor unit and a receiver that puts the level on your phone, and can run the pump that fills the tank.</p>
          <p class="muted">Since then we've been turning other everyday farm jobs into machines that run themselves. Filter changes and acid dosing are next on the bench. Each system is designed in New Zealand for New Zealand conditions: long distances, patchy coverage, mud, weather and all.</p>
        </div>
      </div>
    </section>

    <section class="band">
      <div class="wrap">
        <div class="section-head" data-reveal>
          <p class="kicker">Who we work with</p>
          <h2>Built for the way New Zealand uses water</h2>
        </div>
{segments_block()}
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="section-head" data-reveal>
          <p class="kicker">What we stand for</p>
          <h2>How we do things</h2>
        </div>
        <div class="values" data-stagger>
          <div class="value"><h3>Built for the paddock</h3><p>Enclosures that shrug off weather, radios that don't need cell coverage, batteries that last years. If it can't survive a farm, it doesn't leave the workshop.</p></div>
          <div class="value"><h3>Honest engineering</h3><p>We'll tell you if a machine isn't the answer. When it is, we explain what it does, what it costs and what it needs from you, in plain language.</p></div>
          <div class="value"><h3>We stay on call</h3><p>The people who designed your system are the people who service it. Spares, firmware updates and fault-finding all come straight from us.</p></div>
        </div>
      </div>
    </section>

    <section class="band">
      <div class="wrap">
        <div class="section-head" data-reveal>
          <p class="kicker">Capabilities</p>
          <h2>Everything a machine needs, designed together</h2>
        </div>
        <div class="feature-grid" data-stagger>
          <div><div class="ico">{I['wrench']}</div><h3>Mechanical</h3><p>Mechanisms, drives, frames and weatherproof enclosures, modelled in CAD and built to last.</p></div>
          <div><div class="ico">{I['cpu']}</div><h3>Electronics</h3><p>Custom PCBs for sensing, control and power, designed for low power and long life.</p></div>
          <div><div class="ico">{I['radio']}</div><h3>Wireless</h3><p>Long-range LoRa links that reach across a farm without cellular coverage.</p></div>
          <div><div class="ico">{I['layers']}</div><h3>Software &amp; PLC</h3><p>Microcontroller firmware, PLC programs and the dashboards you use to see it all.</p></div>
          <div><div class="ico">{I['chart']}</div><h3>Data</h3><p>Logging, trends and alerts that turn raw readings into decisions.</p></div>
          <div><div class="ico">{I['shield']}</div><h3>Support</h3><p>Installation, commissioning and servicing from the people who built it.</p></div>
        </div>
      </div>
    </section>
{cta(r, "Let's talk about your property", "We work with farms and rural properties throughout New Zealand.")}
  </main>
"""
    html += footer(r)
    write("about.html", html)


# =========================================================================
# Product pages
# =========================================================================
def water():
    r = "../"
    html = head("Water Tank Monitoring", "The Kinetiq tank monitor: a submersible pressure probe, solar-powered sensor unit and LoRa receiver that put tank levels, usage and pump control on your phone.", r)
    html += header(r, "Products")
    html += f"""
  <main id="main">
    <section class="page-hero with-media light">
      <div class="wrap">
        <div>
          <p class="crumbs"><a href="{r}projects.html">Projects</a> / Water tank monitoring</p>
          <span class="badge ready" data-reveal>Completed · trials open</span>
          <h1 data-reveal style="--d:.08s;margin-top:14px">Know how much water is in every tank, from anywhere.</h1>
          <p class="lede" data-reveal style="--d:.16s">A stainless pressure probe on the tank floor measures the depth. A solar-powered sensor unit sends it by LoRa radio to a receiver in the house, which uploads it over Wi-Fi to the Kinetiq app and website.</p>
          <div class="hero-actions" data-reveal style="--d:.24s">
            <a class="btn btn-primary" href="{r}projects/tank-monitor-live.html">Open the live demo</a>
            <a class="btn btn-ghost" href="{r}index.html?product=Tank%20monitor%20trial#contact">Join the trial</a>
          </div>
        </div>
        <div class="page-hero-media" data-reveal="zoom">{img(r, 'unit', 'Kinetiq tank monitor: enclosure with solar panel and antenna, coiled cable and stainless pressure probe', eager=True)}</div>
      </div>
    </section>

    <section class="stats" style="padding-top:clamp(48px,6vw,72px)" aria-label="Design targets">
      <div class="wrap">
        <div class="stats-grid" data-stagger>
{TARGET_STATS}
        </div>
        <p class="target-note">Design targets for the production unit.</p>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="section-head" data-reveal><p class="kicker">How it works</p><h2>From the bottom of the tank to your phone</h2></div>
{flow_block()}
      </div>
    </section>

    <section id="dashboard" class="band">
      <div class="wrap">
        <div class="section-head" data-reveal>
          <p class="kicker">Usage demo</p>
          <h2>Your water, at a glance</h2>
          <p class="lede">This is what you see in the app and on the website. It's running on sample data for two tanks. For live levels and pump control, open the <a href="{r}projects/tank-monitor-live.html">live demo</a>.</p>
        </div>
{dashboard_block()}
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="section-head" data-reveal><p class="kicker">Features</p><h2>Simple on the outside, clever on the inside</h2></div>
        <div class="feature-grid" data-stagger>
          <div><div class="ico">{I['probe']}</div><h3>Reads from the tank floor</h3><p>A submersible pressure probe measures the weight of water above it. Foam, condensation and lids don't affect the reading.</p></div>
          <div><div class="ico">{I['sun']}</div><h3>Solar powered</h3><p>A small solar panel keeps the battery charged, so there are no wires to run and no batteries to swap.</p></div>
          <div><div class="ico">{I['radio']}</div><h3>Long-range radio</h3><p>LoRa radio reaches across paddocks and hills with no mobile coverage or Wi-Fi needed at the tank.</p></div>
          <div><div class="ico">{I['bell']}</div><h3>Low-water alerts</h3><p>Set a level for each tank. When it drops below, you get an alert before the taps stop.</p></div>
          <div><div class="ico">{I['pump']}</div><h3>Pump control</h3><p>Fill the tank by hand, by level or on a schedule, with dry-run, overfill and run-time cut-outs.</p></div>
          <div><div class="ico">{I['tank']}</div><h3>Many tanks, one receiver</h3><p>House, stock and fire-fighting tanks all show in one place.</p></div>
        </div>
      </div>
    </section>

    <section class="band">
      <div class="wrap split-2">
        <div data-reveal>
          <p class="kicker">Inside the unit</p>
          <h2>Built to sit on a tank for years</h2>
          <p class="lede">A sealed enclosure holds the controller board, LoRa radio and rechargeable battery, with the solar panel on a tilted mount on top.</p>
          <div class="flagship-media" style="margin-top:24px;background:#1b2126">{img(r, 'exploded', 'Exploded view of the Kinetiq tank monitor: solar panel, enclosure, circuit board, battery and probe', width=1200, height=900)}</div>
        </div>
        <div data-reveal>
          <p class="kicker">Specifications (design targets)</p>
          <table class="spec-table">
            <tr><th scope="row">Level sensor</th><td>Submersible pressure probe, stainless steel</td></tr>
            <tr><th scope="row">Tank depth</th><td>Up to 5 m</td></tr>
            <tr><th scope="row">Resolution</th><td>1 cm</td></tr>
            <tr><th scope="row">Power</th><td>Solar panel with rechargeable battery</td></tr>
            <tr><th scope="row">Radio</th><td>LoRa to receiver, up to 5 km line of sight</td></tr>
            <tr><th scope="row">Reading interval</th><td>Every 15 minutes; faster while the pump runs</td></tr>
            <tr><th scope="row">Receiver</th><td>Mains powered, on-screen levels, Wi-Fi upload to the cloud</td></tr>
            <tr><th scope="row">Pump control</th><td>Manual, auto by level, schedule; dry-run, overfill and run-time cut-outs</td></tr>
          </table>
          <p class="kicker" style="margin-top:32px">The receiver</p>
          <div class="flagship-media">{img(r, 'receiver', 'Kinetiq receiver unit with tank level display')}</div>
        </div>
      </div>
    </section>
{cta(r, "Want monitors on your tanks?", "We're taking sites for the trial now. Tell us how many tanks you have and how far they are from the house.")}
  </main>
"""
    html += footer(r, ["dashboard.js"])
    write("products/water-monitor.html", html)


def dashboard_block():
    return """        <div class="dash" data-reveal>
          <div class="dash-controls">
            <div>
              <label for="tank-select">Tank</label>
              <select id="tank-select"></select>
            </div>
            <div class="seg" role="group" aria-label="Time range">
              <button type="button" data-range="7" aria-pressed="false">7 days</button>
              <button type="button" data-range="30" aria-pressed="true">30 days</button>
              <button type="button" data-range="90" aria-pressed="false">90 days</button>
            </div>
            <span class="demo-flag">Sample data</span>
          </div>
          <div class="dash-top">
            <div class="gauge">
              <svg viewBox="0 0 120 150" role="img" aria-labelledby="gauge-label">
                <clipPath id="gauge-clip"><rect x="10" y="10" width="100" height="130" rx="4"/></clipPath>
                <rect id="gauge-water" class="gauge-water" x="10" y="60" width="100" height="80" clip-path="url(#gauge-clip)"/>
                <rect class="gauge-shell" x="10" y="10" width="100" height="130" rx="4"/>
              </svg>
              <p class="visually-hidden" id="gauge-label">Current tank level</p>
              <div id="status"></div>
            </div>
            <div class="tiles">
              <div class="tile"><p class="k">Current level</p><p class="v" id="kpi-level">–</p><p class="d" id="kpi-level-d"></p></div>
              <div class="tile"><p class="k">Average daily use</p><p class="v" id="kpi-avg">–</p><p class="d" id="kpi-avg-d"></p></div>
              <div class="tile"><p class="k">Days remaining</p><p class="v" id="kpi-days">–</p><p class="d">At your average use, with no rain</p></div>
              <div class="tile"><p class="k">Rain collected</p><p class="v" id="kpi-rain">–</p><p class="d" id="kpi-rain-d"></p></div>
            </div>
          </div>
          <div class="chart-block">
            <div class="chart-head"><h3 id="use-title">Daily water use</h3><p class="sub">Litres per day. Dashed line shows the average.</p></div>
            <div class="chart-wrap"><svg class="chart" id="use-chart" role="img" aria-labelledby="use-title"></svg><div class="tooltip" id="use-tip"></div></div>
          </div>
          <div class="chart-block">
            <div class="chart-head"><h3 id="level-title">Tank level</h3><p class="sub">Percent full. Rises are rainfall or a refill.</p></div>
            <div class="chart-wrap"><svg class="chart" id="level-chart" role="img" aria-labelledby="level-title"></svg><div class="tooltip" id="level-tip"></div></div>
          </div>
          <details class="table-view">
            <summary>Show the data as a table</summary>
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th scope="col">Date</th><th scope="col">Used (L)</th><th scope="col">Rain in (L)</th><th scope="col">Level at end of day</th></tr></thead>
                <tbody id="data-rows"></tbody>
              </table>
            </div>
          </details>
        </div>"""


def concept(fn, title, desc, image, alt, h1, lede, features, specs, cta_t, cta_p, product):
    r = "../"
    feats = "\n".join(f'          <div><div class="ico">{I[ic]}</div><h3>{a}</h3><p>{b}</p></div>' for ic, a, b in features)
    rows = "\n".join(f'            <tr><th scope="row">{a}</th><td>{b}</td></tr>' for a, b in specs)
    q = product.replace(" ", "%20")
    html = head(title, desc, r)
    html += header(r, "Products")
    html += f"""
  <main id="main">
    <section class="page-hero with-media light">
      <div class="wrap">
        <div>
          <p class="crumbs"><a href="{r}projects.html">Projects</a> / {product}</p>
          <span class="badge mock" data-reveal>Mock-up</span>
          <h1 data-reveal style="--d:.08s;margin-top:14px">{h1}</h1>
          <p class="lede" data-reveal style="--d:.16s">{lede}</p>
          <div class="hero-actions" data-reveal style="--d:.24s">
            <a class="btn btn-primary" href="{r}index.html?product={q}#contact">Register interest</a>
            <a class="btn btn-ghost" href="#features">How it would work</a>
          </div>
        </div>
        <div class="page-hero-media" data-reveal="zoom">{img(r, image, alt, eager=True)}</div>
      </div>
    </section>

    <section id="features" class="band">
      <div class="wrap">
        <div class="notice" data-reveal style="margin-bottom:40px">{I['info']}<p>This product is a design mock-up. The render shows how it could look, and the details below will change as we design and test it.</p></div>
        <div class="section-head" data-reveal><p class="kicker">How it would work</p><h2>The idea</h2></div>
        <div class="feature-grid" data-stagger>
{feats}
        </div>
      </div>
    </section>

    <section>
      <div class="wrap split-2">
        <div data-reveal><p class="kicker">Planned specifications</p><h2>Early targets</h2><p class="muted">Concept-stage numbers, shared so you can tell us whether they fit your setup.</p></div>
        <div data-reveal>
          <table class="spec-table">
{rows}
          </table>
        </div>
      </div>
    </section>
{cta(r, cta_t, cta_p)}
  </main>
"""
    html += footer(r)
    write("products/" + fn, html)


def filtration():
    concept("smart-filtration.html", "Smart Filtration",
            "Smart filtration concept: pressure sensing on each filter stage tells you exactly when a cartridge needs changing.",
            "filtration", "Mock-up of a three-stage smart filtration unit with pressure gauges and a controller",
            "Change filters when they need it, not when the calendar says.",
            "Our smart filtration concept measures water pressure before and after each filter. As a cartridge clogs, the pressure difference rises, and the controller tells you which one to change and roughly when.",
            [("gauge", "Pressure across each stage", "Sensors either side of every housing show exactly which filter is clogging: sediment, carbon or UV."),
             ("bell", "Change reminders that mean something", "Alerts based on real flow, so you don't bin good filters or run with blocked ones."),
             ("chart", "Flow and usage logging", "See how much water has gone through each day. Useful for rainwater, bores and small schemes."),
             ("shield", "UV lamp monitoring", "Know straight away if a UV lamp fails or reaches its rated hours, not after a water test."),
             ("drop", "Automatic flush", "An optional motorised valve back-flushes the sediment stage when pressure climbs."),
             ("layers", "Fits your existing housings", "Designed to retrofit standard 10\" and 20\" housings, so you keep your usual cartridges.")],
            [("Stages monitored", "Up to 4"), ("Sensors", "Pressure transducers, flow meter, UV lamp current"), ("Alerts", "On-screen, text or app"), ("Connects to", "The same receiver and portal as the tank monitor")],
            "Have a filtration setup that's a hassle?", "Tell us what you're filtering and how often you change cartridges.", "Smart filtration")


def dosing():
    concept("acid-dosing.html", "Automated Acid Dosing",
            "Automated acid dosing concept for dairy plant wash: a measured dose every wash, logged, with no one handling chemicals by hand.",
            "dosing", "Mock-up of an automated acid dosing system with a chemical drum, peristaltic pump and controller",
            "The right acid dose in every dairy wash, without anyone pouring it.",
            "Plant wash often means someone measuring acid by hand, twice a day. Our concept draws straight from the drum, doses the right amount for each wash and keeps a record you can show your milk company.",
            [("drop", "Measured to the millilitre", "A peristaltic pump delivers a set volume each wash: never too weak to clean, never too strong for the rubberware."),
             ("shield", "No hand-handling", "Acid goes straight from drum to wash line. Less splashing, fewer burns and no measuring jug."),
             ("gauge", "Triggered by the wash", "The controller senses when a wash starts and doses at the right point in the cycle."),
             ("chart", "Wash records", "Every wash logged with time, dose and temperature, ready for audits."),
             ("bell", "Low-drum warning", "A level sensor warns you before the drum runs out, so no wash runs without acid."),
             ("layers", "Alkali too", "A second pump can handle detergent or alkali on alternate washes.")],
            [("Dose range", "50 mL to 2 L per wash, adjustable"), ("Pumps", "1 or 2 peristaltic, acid-rated tubing"), ("Sensors", "Drum level, wash temperature, optional conductivity"), ("Records", "Stored on the controller, exportable to a spreadsheet")],
            "Run a dairy shed?", "Tell us about your plant wash setup and herd size.", "Automated acid dosing")


# =========================================================================
# Client portal
# =========================================================================
def portal_login():
    r = "../"
    html = head("Client Login", "Sign in to the Kinetiq client portal to see your tank levels, usage and alerts.", r)
    html += f"""<body>
  <main id="main" class="auth">
    <div class="auth-panel">
      <a class="brand" href="{r}index.html" aria-label="Kinetiq home">{LOGO}Kinetiq</a>
      <h1 style="font-size:clamp(2rem,4vw,2.8rem)">Client portal</h1>
      <p class="lede" style="margin-bottom:28px">Sign in to see your tanks, usage and alerts.</p>
      <div class="notice" style="max-width:420px;margin-bottom:24px">{I['info']}<p>This is a demo. Press <strong>Sign in</strong> to look around. Nothing you type is checked or sent.</p></div>
      <form class="auth-form" id="login-form">
        <div class="field"><label for="l-email">Email</label><input id="l-email" type="email" autocomplete="off" placeholder="you@example.com"></div>
        <div class="field"><label for="l-pass">Password</label><input id="l-pass" type="password" autocomplete="off"></div>
        <div class="row"><label><input type="checkbox"> Keep me signed in</label><a href="{r}index.html#contact">Need help?</a></div>
        <button class="btn btn-primary" type="submit">Sign in</button>
        <p class="muted" style="font-size:.93rem">Don't have an account? Accounts are set up when your system is installed. <a href="{r}index.html#contact">Contact us</a>.</p>
      </form>
    </div>
    <div class="auth-media">
      {img(r, 'receiver', 'Kinetiq receiver showing a tank at 62 percent', eager=True)}
      <div class="caption"><strong>Every tank, one screen.</strong><p>Your receiver and the portal show the same live readings.</p></div>
    </div>
  </main>
  <script src="{r}assets/js/main.js"></script>
</body>
</html>
"""
    write("portal/login.html", html)


def portal_dashboard():
    r = "../"
    html = head("Dashboard", "Kinetiq client portal dashboard (demo).", r)
    html += f"""<body>
  <a class="skip" href="#main">Skip to content</a>
  <div class="app">
    <aside class="app-side">
      <a class="brand" href="{r}index.html" aria-label="Kinetiq home">{LOGO}Kinetiq</a>
      <nav class="app-nav" aria-label="Portal">
        <a href="dashboard.html" aria-current="page">{I['home']}Overview</a>
        <a href="dashboard.html#tanks">{I['tank']}Tanks</a>
        <a href="{r}projects/tank-monitor-live.html">{I['gauge']}Live &amp; pump</a>
        <a href="dashboard.html#alerts">{I['bell']}Alerts</a>
        <a href="dashboard.html#settings">{I['settings']}Settings</a>
      </nav>
      <div class="foot"><p>Demo account with sample data.</p><a href="login.html">{''}Sign out</a></div>
      <a class="btn btn-ghost btn-sm app-menu" href="login.html" style="color:#fff">Sign out</a>
    </aside>
    <div class="app-main">
      <header class="app-top">
        <h1>Overview</h1>
        <div class="who"><span>Demo farm</span><span class="avatar" aria-hidden="true">DF</span><a class="btn btn-ghost btn-sm" href="login.html">{I['out']}Sign out</a></div>
      </header>
      <main id="main" class="app-body">
        <div class="notice">{I['info']}<p>You're viewing a demo of the client portal with sample data. Real accounts show live readings from your own sensors.</p></div>
        <section id="tanks" style="padding:0" aria-label="Your tanks">
          <div class="tank-list" id="tank-cards"></div>
        </section>
        <div class="app-grid">
{dashboard_block()}
          <div style="display:grid;gap:24px">
            <section class="panel" id="alerts" style="padding:20px">
              <h2>Recent alerts</h2>
              <ul class="alerts">
                <li><span style="color:var(--warn)">{I['warn']}</span><span>Tank 2 dropped below 40%</span><span class="t">2 days ago</span></li>
                <li><span style="color:var(--water)">{I['drop']}</span><span>Tank 1 rose 9% after rain</span><span class="t">5 days ago</span></li>
                <li><span style="color:var(--ok)">{I['check']}</span><span>Sensor battery check passed</span><span class="t">1 week ago</span></li>
              </ul>
            </section>
            <section class="panel" id="settings" style="padding:20px">
              <h2>Alert settings</h2>
              <table class="spec-table" style="font-size:.95rem">
                <tr><th scope="row">Low-water alert</th><td>Below 20%</td></tr>
                <tr><th scope="row">Leak alert</th><td>Overnight drop &gt; 5%</td></tr>
                <tr><th scope="row">Send alerts to</th><td>Text and email</td></tr>
              </table>
            </section>
          </div>
        </div>
      </main>
    </div>
  </div>
  <script src="{r}assets/js/main.js"></script>
  <script src="{r}assets/js/dashboard.js"></script>
</body>
</html>
"""
    write("portal/dashboard.html", html)


# =========================================================================
# Live view + pump control (mock-up)
# =========================================================================
def live():
    r = "../"
    html = head("Tank Monitor Live", "Live view of a Kinetiq tank monitor with pump control (demo with simulated data).", r)
    html += header(r, "Projects")
    html += f"""
  <main id="main">
    <section style="padding-top:clamp(32px,5vw,56px)">
      <div class="wrap">
        <p class="crumbs"><a href="{r}projects.html">Projects</a> / <a href="{r}products/water-monitor.html">Tank monitor</a> / Live view</p>
        <div class="live-head">
          <div>
            <span class="badge mock">Mock-up · simulated data</span>
            <h1>Tank 1 · Shed supply</h1>
            <p class="muted" style="margin:0">25,000 L concrete tank, filled from the bore. Time runs fast here: 1 second = 1 minute.</p>
          </div>
          <div class="live-meta">
            <span class="pill live">Live</span>
            <span class="pill">Sim time <strong id="r-clock" style="margin-left:4px">--:--</strong></span>
            <span class="pill">Receiver online</span>
          </div>
        </div>
        <p class="visually-hidden" aria-live="polite" id="live-announce"></p>

        <div class="live-grid">
          <div class="panel">
            <h2>Level now</h2>
            <div class="tank-view">
              <svg class="tank-svg" viewBox="0 0 200 300" aria-hidden="true">
                <path class="pipe" d="M190 6 H150 V24"/>
                <path class="stream" d="M150 26 V280"/>
                <clipPath id="tclip"><rect x="40" y="30" width="120" height="250" rx="6"/></clipPath>
                <g clip-path="url(#tclip)">
                  <rect id="tank-water" class="water" x="40" y="140" width="120" height="140"/>
                  <line id="tank-surface" class="surface" x1="40" x2="160" y1="140" y2="140"/>
                </g>
                <path class="probe-cable" d="M70 22 V262"/>
                <rect class="probe" x="65" y="262" width="10" height="16" rx="2"/>
                <rect class="shell" x="40" y="30" width="120" height="250" rx="6"/>
                <g>
                  <line class="tick" x1="30" x2="40" y1="30" y2="30"/><text class="tl" x="26" y="34" text-anchor="end">100</text>
                  <line class="tick" x1="30" x2="40" y1="92.5" y2="92.5"/><text class="tl" x="26" y="96.5" text-anchor="end">75</text>
                  <line class="tick" x1="30" x2="40" y1="155" y2="155"/><text class="tl" x="26" y="159" text-anchor="end">50</text>
                  <line class="tick" x1="30" x2="40" y1="217.5" y2="217.5"/><text class="tl" x="26" y="221.5" text-anchor="end">25</text>
                  <line class="tick" x1="30" x2="40" y1="280" y2="280"/><text class="tl" x="26" y="284" text-anchor="end">0%</text>
                </g>
              </svg>
              <div>
                <p class="big-read"><span id="tank-pct">--</span><small>% full</small></p>
                <p class="read-sub"><span id="tank-litres">--</span> L of 25,000 L</p>
                <div id="level-status" class="status ok" style="margin-top:12px"></div>
                <div class="read-grid">
                  <div class="tile"><p class="k">Change, last hour</p><p class="v" id="r-flow">–</p><p class="d" id="r-flow-d"></p></div>
                  <div class="tile"><p class="k">Used today</p><p class="v" id="r-today">–</p><p class="d">Since midnight</p></div>
                  <div class="tile"><p class="k">Water left</p><p class="v" id="r-days">–</p><p class="d">At the 14-day average, without pumping</p></div>
                  <div class="tile"><p class="k">Last reading</p><p class="v" style="font-size:1.3rem">Just now</p><p class="d">Every minute while live</p></div>
                </div>
              </div>
            </div>
          </div>

          <div class="panel" aria-labelledby="pump-title">
            <h2 id="pump-title">Bore pump</h2>
            <div class="pump-state off" id="pump-state" aria-live="polite">
              <span class="lamp">{I['pump']}</span><strong>Stopped</strong><span class="why"></span>
            </div>
            <div class="pump-buttons">
              <button class="btn btn-primary" type="button" id="pump-start">Start pump</button>
              <button class="btn btn-stop" type="button" id="pump-stop">Stop pump</button>
            </div>
            <button class="btn btn-ghost btn-sm" type="button" id="pump-reset" hidden style="margin-top:10px">Clear fault</button>
            <div class="confirm" id="pump-confirm" hidden>
              <p id="confirm-text"></p>
              <div class="row"><button class="btn btn-primary btn-sm" type="button" id="confirm-yes">Start pump</button><button class="btn btn-ghost btn-sm" type="button" id="confirm-no">Cancel</button></div>
            </div>
            <p class="mode-note" id="manual-note">Starting by hand works in any mode. Auto and schedule rules take over again once it stops.</p>

            <div class="ctl-section">
              <h3>Mode</h3>
              <div class="seg block" role="group" aria-label="Pump mode">
                <button type="button" data-mode="manual" aria-pressed="false">Manual</button>
                <button type="button" data-mode="auto" aria-pressed="true">Auto</button>
                <button type="button" data-mode="schedule" aria-pressed="false">Schedule</button>
              </div>
              <div data-mode-panel="manual" hidden><p class="mode-note">The pump only runs when you start it. Safety cut-outs still apply.</p></div>
              <div data-mode-panel="auto" style="margin-top:14px">
                <div class="range"><label for="auto-start">Start when below</label><output id="auto-start-out" for="auto-start"></output><input type="range" id="auto-start" min="10" max="80" step="5" data-label="Auto start level"></div>
                <div class="range"><label for="auto-stop">Stop when it reaches</label><output id="auto-stop-out" for="auto-stop"></output><input type="range" id="auto-stop" min="30" max="95" step="5" data-label="Auto stop level"></div>
              </div>
              <div data-mode-panel="schedule" hidden style="margin-top:14px">
                <div class="times">
                  <div><label for="sched-start">Run from</label><input type="time" id="sched-start"></div>
                  <div><label for="sched-end">Until</label><input type="time" id="sched-end"></div>
                </div>
                <p class="mode-note">Every day. Inside these hours the pump fills to the auto stop level.</p>
              </div>
            </div>

            <div class="ctl-section">
              <h3>Safety cut-outs</h3>
              <label class="check"><input type="checkbox" id="dry-run"><span>Dry-run protection<small>Stops the pump if the level doesn't rise after it starts.</small></span></label>
              <div class="range"><label for="no-rise">Stop if no rise after</label><output id="no-rise-out" for="no-rise"></output><input type="range" id="no-rise" min="5" max="30" step="5" data-label="No-rise timeout"></div>
              <div class="range"><label for="high-cut">Overfill cut-off</label><output id="high-cut-out" for="high-cut"></output><input type="range" id="high-cut" min="85" max="100" step="1" data-label="Overfill cut-off"></div>
              <div class="range"><label for="max-run">Maximum run time</label><output id="max-run-out" for="max-run"></output><input type="range" id="max-run" min="60" max="600" step="30" data-label="Maximum run time"></div>
              <label class="check" style="margin-top:8px"><input type="checkbox" id="sim-dry"><span>Test: cut off the water source<small>Simulates a dry bore so you can see the protection trip.</small></span></label>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:24px">
          <div class="chart-head"><h2 style="margin:0">Level, last 24 hours</h2><p class="sub" style="margin:0">Shaded areas show when the pump ran.</p></div>
          <div class="chart-wrap"><svg class="chart24" id="level24" role="img" aria-label="Tank level over the last 24 hours with pump run times shaded"></svg><div class="tooltip" id="level24-tip"></div></div>
          <div class="legend"><span><i style="background:var(--water)"></i>Level</span><span><i style="background:var(--ok);opacity:.35"></i>Pump running</span><span><i style="background:var(--maroon);height:2px"></i>Auto start / stop levels</span></div>
        </div>

        <div class="two-col" style="margin-top:24px">
          <div class="panel">
            <h2>Daily water use</h2>
            <p class="sub">Last 14 days and today so far. Hover a bar for its value.</p>
            <svg id="days14" role="img" aria-label="Daily water use for the last 14 days"></svg>
          </div>
          <div class="panel">
            <h2>Pump events</h2>
            <ul class="log" id="event-log"></ul>
          </div>
        </div>

        <div class="two-col" style="margin-top:24px">
          <div class="panel">
            <h2>System health</h2>
            <ul class="health">
              <li><span>Sensor battery</span><span>87%</span></li>
              <li><span>Solar</span><span id="h-solar">–</span></li>
              <li><span>LoRa signal</span><span>−92 dBm · Good</span></li>
              <li><span>Receiver</span><span>Online · Wi-Fi</span></li>
              <li><span>Probe</span><span>OK · 2.31 m cable depth</span></li>
            </ul>
          </div>
          <div class="panel">
            <h2>Want this on your tank?</h2>
            <p class="muted">This page runs on simulated data. Trial sites see their own tanks and control their own pumps here.</p>
            <a class="btn btn-primary" href="{r}index.html?product=Tank%20monitor%20with%20pump%20control#contact">Join the trial</a>
          </div>
        </div>
      </div>
    </section>
  </main>
"""
    html += footer(r, ["live.js"])
    write("projects/tank-monitor-live.html", html)



home(); services(); projects(); about(); water(); live(); filtration(); dosing(); portal_login(); portal_dashboard()
