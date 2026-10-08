/* Kinetiq site editor.
 *
 * Add ?edit to any page address (e.g. https://ollydrummond.github.io/Website/?edit)
 * or press Ctrl+Shift+E. Click any text to change it, then press Save. Saving
 * commits the change to the website's files on GitHub using your own access
 * token, so only you can save. GitHub Pages republishes within a minute or two.
 */
(() => {
  const REPO = "OllyDrummond/Website";
  const BRANCH = "claude/awesome-ramanujan-fixnyr";
  const TOKEN_KEY = "kinetiq-editor-token";

  // Work out the site root from this script's own address, so the page path is
  // right on GitHub Pages (/Website/...), on another host, or from a local copy.
  const scriptSrc = document.currentScript ? document.currentScript.src : "";
  const siteRoot = scriptSrc.replace(/assets\/js\/editor\.js.*$/, "");

  function pagePath() {
    let p = location.href.split(/[?#]/)[0];
    if (siteRoot && p.startsWith(siteRoot)) p = p.slice(siteRoot.length);
    else p = location.pathname.replace(/^\//, "");
    if (p === "" || p.endsWith("/")) p += "index.html";
    return decodeURIComponent(p);
  }

  const store = {
    get() { try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } },
    set(t, remember) {
      try { (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, t); } catch { /* storage blocked: keep in memory only */ }
      memToken = t;
    },
    clear() { try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } memToken = ""; },
  };
  let memToken = "";
  const token = () => memToken || store.get();

  let active = false;
  const originals = new Map();

  // ---------- UI ----------
  const css = `
  .ke-bar{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:9999;display:flex;flex-wrap:wrap;align-items:center;gap:10px;max-width:calc(100% - 24px);background:#1c2227;color:#e9edef;border:1px solid #343d44;border-radius:14px;padding:10px 12px 10px 16px;box-shadow:0 16px 40px rgba(0,0,0,.35);font:500 14px/1.4 Archivo,system-ui,sans-serif}
  .ke-bar strong{font-weight:700}
  .ke-bar .ke-count{color:#a9b4ba}
  .ke-bar button{font:inherit;font-weight:700;border-radius:999px;padding:8px 14px;border:1.5px solid #4b555c;background:transparent;color:#e9edef;cursor:pointer}
  .ke-bar button.ke-primary{background:#7a1f2b;border-color:#7a1f2b;color:#fff}
  .ke-bar button:disabled{opacity:.45;cursor:not-allowed}
  .ke-bar button:focus-visible,.ke-panel button:focus-visible,.ke-panel input:focus-visible{outline:3px solid #5aa6e6;outline-offset:2px}
  .ke-status{flex-basis:100%;font-size:13px;color:#a9b4ba;margin:0}
  .ke-status.ok{color:#7fd6a2}.ke-status.bad{color:#f39a92}
  html.ke-on [data-e]{outline:1.5px dashed rgba(90,166,230,.55);outline-offset:3px;border-radius:2px;cursor:text}
  html.ke-on [data-e]:hover{outline-color:#5aa6e6;background:rgba(90,166,230,.08)}
  html.ke-on [data-e]:focus{outline:2px solid #5aa6e6;background:rgba(90,166,230,.12)}
  html.ke-on [data-e].ke-changed{outline:2px solid #e0a043}
  html.ke-on [data-reveal]{opacity:1!important;transform:none!important}
  .ke-panel{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(10,14,18,.55);padding:16px}
  .ke-card{width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#1c2227;border-radius:14px;padding:24px;font:400 15px/1.55 Archivo,system-ui,sans-serif}
  .ke-card h2{font:800 22px/1.2 Archivo,system-ui,sans-serif;margin:0 0 10px}
  .ke-card ol{padding-left:20px;margin:10px 0 16px}
  .ke-card li{margin-bottom:6px}
  .ke-card code{background:#eef1ef;padding:1px 5px;border-radius:4px;font-size:13px}
  .ke-card label{display:block;font-weight:600;margin:12px 0 6px}
  .ke-card input[type=password]{width:100%;font:inherit;padding:10px 12px;border:1.5px solid #d6dbde;border-radius:8px}
  .ke-card .row{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px}
  .ke-card .check{display:flex;gap:8px;align-items:center;margin-top:10px;font-weight:500}
  .ke-card button{font:inherit;font-weight:700;border-radius:999px;padding:9px 16px;border:1.5px solid #1c2227;background:transparent;cursor:pointer}
  .ke-card button.ke-primary{background:#7a1f2b;border-color:#7a1f2b;color:#fff}
  .ke-card .err{color:#b42318;font-weight:600;margin:10px 0 0}
  @media (prefers-color-scheme: dark){.ke-card{background:#1a2025;color:#e9edef}.ke-card code{background:#222a30}.ke-card input[type=password]{background:#12171b;color:#e9edef;border-color:#313a41}.ke-card button{border-color:#e9edef;color:#e9edef}}
  `;
  let bar, statusEl, countEl, saveBtn;

  function setStatus(text, kind = "") {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = "ke-status" + (kind ? " " + kind : "");
  }

  function changed() {
    return [...originals.entries()].filter(([el, html]) => el.innerHTML !== html);
  }

  function updateCount() {
    const n = changed().length;
    document.querySelectorAll("[data-e]").forEach((el) => el.classList.toggle("ke-changed", originals.has(el) && el.innerHTML !== originals.get(el)));
    countEl.textContent = n ? `${n} change${n === 1 ? "" : "s"} not saved` : "No changes yet";
    saveBtn.disabled = n === 0;
  }

  function start() {
    if (active) return;
    active = true;
    const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);
    document.documentElement.classList.add("ke-on");
    document.querySelectorAll("[data-e]").forEach((el) => {
      originals.set(el, el.innerHTML);
      el.contentEditable = "true";
      el.spellcheck = true;
    });
    bar = document.createElement("div");
    bar.className = "ke-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Site editor");
    bar.innerHTML = `<strong>Editing text</strong><span class="ke-count"></span>
      <button type="button" class="ke-primary" data-k="save">Save changes</button>
      <button type="button" data-k="undo">Undo all</button>
      <button type="button" data-k="exit">Exit</button>
      <p class="ke-status" aria-live="polite">Click any outlined text to change it.</p>`;
    document.body.appendChild(bar);
    statusEl = bar.querySelector(".ke-status");
    countEl = bar.querySelector(".ke-count");
    saveBtn = bar.querySelector('[data-k="save"]');
    bar.addEventListener("click", (e) => {
      const k = e.target.closest("button")?.dataset.k;
      if (k === "save") save();
      if (k === "undo") undoAll();
      if (k === "exit") exit();
    });
    updateCount();
  }

  function undoAll() {
    originals.forEach((html, el) => { el.innerHTML = html; });
    updateCount();
    setStatus("All changes undone.");
  }

  function exit() {
    if (changed().length && !confirmInline()) return;
    const url = new URL(location.href); url.searchParams.delete("edit");
    location.href = url.toString();
  }
  let exitArmed = false;
  function confirmInline() {
    if (exitArmed) return true;
    exitArmed = true;
    setStatus("You have unsaved changes. Press Exit again to leave without saving.", "bad");
    setTimeout(() => { exitArmed = false; }, 6000);
    return false;
  }

  // Keep edits to plain text (plus line breaks and bold/italic)
  function clean(html) {
    const box = document.createElement("div");
    box.innerHTML = html;
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 1) {
          const tag = c.tagName.toLowerCase();
          if (["br", "strong", "em", "b", "i", "small"].includes(tag)) { [...c.attributes].forEach((a) => c.removeAttribute(a.name)); walk(c); }
          else if (["span", "a", "abbr"].includes(tag)) { walk(c); }
          else if (tag === "div" || tag === "p") { walk(c); c.before(document.createElement("br")); c.replaceWith(...c.childNodes); }
          else c.replaceWith(document.createTextNode(c.textContent));
        }
      });
    };
    walk(box);
    return box.innerHTML.replace(/(<br>\s*)+$/, "").replace(/^\s*<br>/, "");
  }

  // ---------- typing behaviour ----------
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "E" || e.key === "e")) { e.preventDefault(); start(); return; }
    if (!active) return;
    const el = e.target.closest && e.target.closest("[data-e]");
    if (!el) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey && /^(P|LI|DD|TD|BLOCKQUOTE)$/.test(el.tagName)) document.execCommand("insertLineBreak");
      else el.blur();
    }
    if (e.key === "Escape") el.blur();
  });
  document.addEventListener("input", (e) => { if (active && e.target.closest && e.target.closest("[data-e]")) updateCount(); });
  document.addEventListener("paste", (e) => {
    if (!active || !e.target.closest || !e.target.closest("[data-e]")) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text.replace(/\s*\n\s*/g, " "));
  });
  // links and buttons shouldn't fire while editing their text
  document.addEventListener("click", (e) => {
    if (!active || (bar && bar.contains(e.target))) return;
    const link = e.target.closest("a, button, summary");
    if (link && !link.closest(".ke-panel")) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener("submit", (e) => { if (active) e.preventDefault(); }, true);

  // ---------- GitHub ----------
  const b64decode = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
  const b64encode = (s) => { const bytes = new TextEncoder().encode(s); let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b))); return btoa(bin); };

  async function gh(path, opts = {}) {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path.split("/").map(encodeURIComponent).join("/")}${opts.method ? "" : `?ref=${encodeURIComponent(BRANCH)}`}`, {
      ...opts,
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token()}`, "X-GitHub-Api-Version": "2022-11-28", ...(opts.headers || {}) },
    });
    if (!res.ok) {
      const err = new Error(String(res.status)); err.status = res.status;
      try { err.detail = (await res.json()).message; } catch { /* ignore */ }
      throw err;
    }
    return res.json();
  }

  // Find the element with data-e="id" in the raw HTML and swap its contents.
  function replaceInner(source, id, html) {
    const open = new RegExp(`<([a-zA-Z][\\w-]*)\\b[^>]*\\sdata-e="${id}"[^>]*>`);
    const m = open.exec(source);
    if (!m) return null;
    const tag = m[1].toLowerCase();
    const start = m.index + m[0].length;
    const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
    re.lastIndex = start;
    let depth = 1, t;
    while ((t = re.exec(source))) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) return source.slice(0, start) + html + source.slice(t.index);
    }
    return null;
  }

  async function save(retry = true) {
    const edits = changed();
    if (!edits.length) return;
    if (!token()) { askToken(); return; }
    saveBtn.disabled = true;
    const path = pagePath();
    setStatus(`Saving ${edits.length} change${edits.length === 1 ? "" : "s"} to ${path}…`);
    try {
      const file = await gh(path);
      const source = b64decode(file.content);
      // Replace only the edited text in the file; everything else stays byte-for-byte the same.
      let out = source, applied = 0;
      for (const [el] of edits) {
        const next = replaceInner(out, el.dataset.e, clean(el.innerHTML));
        if (next !== null) { out = next; applied++; }
      }
      if (!applied) throw Object.assign(new Error("nothing"), { detail: "Couldn't find this text in the saved page. Reload the page and try again" });
      await gh(path, { method: "PUT", body: JSON.stringify({ message: `Edit text on ${path} (site editor)`, content: b64encode(out), sha: file.sha, branch: BRANCH }) });
      edits.forEach(([el]) => originals.set(el, el.innerHTML));
      updateCount();
      setStatus("Saved. The live site will show your changes in a minute or two.", "ok");
    } catch (err) {
      saveBtn.disabled = false;
      if (err.status === 401 || err.status === 403) { store.clear(); setStatus("GitHub didn't accept the access key. Enter it again.", "bad"); askToken(); }
      else if (err.status === 409 && retry) { save(false); }
      else if (err.status === 404) setStatus(`GitHub couldn't find ${path} on the ${BRANCH} branch. Check the key has access to ${REPO}.`, "bad");
      else setStatus(`Not saved: ${err.detail || "check your internet connection and try again"}.`, "bad");
    }
  }

  function askToken() {
    const panel = document.createElement("div");
    panel.className = "ke-panel";
    panel.innerHTML = `<div class="ke-card" role="dialog" aria-modal="true" aria-labelledby="ke-t">
      <h2 id="ke-t">Connect the editor to GitHub</h2>
      <p>Saving writes your changes into the website's files on GitHub. It needs an access key that only you have. You only do this once per device.</p>
      <ol>
        <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a> (you may need to sign in).</li>
        <li>Name it <code>Kinetiq site editor</code> and pick an expiry date.</li>
        <li>Under <strong>Repository access</strong>, choose <strong>Only select repositories</strong> → <code>${REPO}</code>.</li>
        <li>Under <strong>Permissions → Repository permissions</strong>, set <strong>Contents</strong> to <strong>Read and write</strong>.</li>
        <li>Click <strong>Generate token</strong>, copy it and paste it below.</li>
      </ol>
      <label for="ke-token">Access key</label>
      <input id="ke-token" type="password" autocomplete="off" placeholder="github_pat_…">
      <label class="check"><input type="checkbox" id="ke-remember" checked> Remember on this device</label>
      <p class="err" id="ke-err" hidden></p>
      <div class="row"><button type="button" data-k="cancel">Cancel</button><button type="button" class="ke-primary" data-k="ok">Save changes</button></div>
    </div>`;
    document.body.appendChild(panel);
    const input = panel.querySelector("#ke-token");
    input.focus();
    panel.addEventListener("click", (e) => {
      const k = e.target.closest("button")?.dataset.k;
      if (k === "cancel" || e.target === panel) panel.remove();
      if (k === "ok") {
        const t = input.value.trim();
        if (!t) { const er = panel.querySelector("#ke-err"); er.hidden = false; er.textContent = "Paste your access key first."; return; }
        store.set(t, panel.querySelector("#ke-remember").checked);
        panel.remove();
        save();
      }
    });
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") panel.remove(); if (e.key === "Enter") panel.querySelector('[data-k="ok"]').click(); });
  }

  if (new URLSearchParams(location.search).has("edit") || location.hash === "#edit") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  }
})();
