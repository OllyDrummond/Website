"""Marks the text on every page as editable by the site editor.

Each piece of plain text (headings, paragraphs, list items, table cells,
labels, plain-text buttons) gets a data-e="<number>" attribute. The editor
(assets/js/editor.js) uses these numbers to find the same text in the page's
source file when it saves.

Safe to re-run: text that already has a number keeps it, new text gets the
next free number.

    python3 tools/mark_editable.py
"""
import os
import re
from bs4 import BeautifulSoup, NavigableString

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PAGES = [
    "index.html", "about.html", "services.html", "projects.html",
    "products/water-monitor.html", "products/smart-filtration.html", "products/acid-dosing.html",
    "projects/tank-monitor-live.html", "portal/login.html", "portal/dashboard.html",
]
TAGS = ["h1", "h2", "h3", "h4", "p", "li", "dt", "dd", "th", "td", "span", "a", "button", "label", "summary", "figcaption", "cite", "strong", "small", "option"]
# Text that the page's own scripts fill in or animate
SKIP_CLASSES = {"num", "big", "tooltip", "why", "demo-flag", "visually-hidden", "skip", "live-dot"}
SKIP_ATTRS = ["data-count", "data-litres", "data-ago", "data-year", "data-live", "data-filter", "data-mode", "data-range", "data-tank", "aria-live"]
BLOCKERS = ["svg", "img", "input", "select", "textarea", "script", "style", "canvas"]
INLINE_OK = {"strong", "em", "b", "i", "br", "small", "span", "a", "abbr"}


def skippable(el):
    for node in [el, *el.parents]:
        if node.name in (None, "[document]"):
            break
        if node.name in ("script", "style", "svg", "head", "select", "nav", "header", "footer", "aside") and node is not el:
            return True
        if node.get("id") and node is not el and node.name not in ("main", "body"):
            # inside a JS-driven region (charts, live readouts, tank cards...)
            if node.get("id") in {"tank-cards", "event-log", "data-rows", "status", "level-status", "pump-state", "pump-confirm"}:
                return True
        if set(node.get("class", [])) & SKIP_CLASSES:
            return True
        if any(node.has_attr(a) for a in SKIP_ATTRS):
            return True
    if el.get("id") and re.match(r"^(tank-|kpi-|r-|h-|gauge-|confirm-|live-|level24|days14|status|f-|l-|data-|event-|pump-state)|.*-(out|err|tip)$", el["id"]):
        return True  # text written by the page's scripts
    return False


def editable(el):
    if el.has_attr("data-e"):
        return False
    if el.find(BLOCKERS):
        return False
    # must hold its own text, and only simple inline markup
    own = "".join(t for t in el.find_all(string=True, recursive=False) if isinstance(t, NavigableString)).strip()
    if not own:
        return False
    if any(child.name and child.name not in INLINE_OK for child in el.children):
        return False
    # don't nest: skip if an ancestor is already editable
    if any(p.has_attr("data-e") for p in el.parents if p.name):
        return False
    return not skippable(el)


def mark(path):
    full = os.path.join(ROOT, path)
    html = open(full, encoding="utf-8").read()
    soup = BeautifulSoup(html, "html.parser")
    used = [int(x["data-e"]) for x in soup.select("[data-e]") if x["data-e"].isdigit()]
    n = max(used, default=0)
    # offsets of each line so bs4's (line, column) positions map into the text
    starts = [0]
    for line in html.splitlines(keepends=True):
        starts.append(starts[-1] + len(line))
    inserts = []
    for el in soup.body.find_all(TAGS):
        if editable(el):
            n += 1
            el["data-e"] = str(n)  # so nested candidates see it
            pos = starts[el.sourceline - 1] + el.sourcepos
            assert html[pos:pos + len(el.name) + 1].lower() == "<" + el.name, (path, el.name, html[pos:pos + 20])
            inserts.append((pos + 1 + len(el.name), f' data-e="{n}"'))
    for pos, text in sorted(inserts, reverse=True):
        html = html[:pos] + text + html[pos:]
    open(full, "w", encoding="utf-8").write(html)
    print(f"{path}: {len(inserts)} new editable text blocks ({n} total)")


def ensure_script(path):
    """Add the editor script to the page if it isn't there yet."""
    full = os.path.join(ROOT, path)
    html = open(full, encoding="utf-8").read()
    if "assets/js/editor.js" in html:
        return
    depth = path.count("/")
    src = "../" * depth + "assets/js/editor.js"
    html = re.sub(r"</body>", f'  <script src="{src}" defer></script>\n</body>', html, count=1)
    open(full, "w", encoding="utf-8").write(html)


if __name__ == "__main__":
    for p in PAGES:
        mark(p)
        ensure_script(p)
