/**
 * Ashaar.js — Arabic/Urdu/Persian poetry formatter
 *
 * Input format (plain text):
 *
 *   Inline bayt (two hemistiches on one line):
 *     sadr \ ajuz            (backslash separator)
 *     sadr * ajuz            (asterisk separator)
 *
 *   Trailing-pair misra (hemistich that pairs with the next line):
 *     sadr \                 (trailing backslash — pairs with next line)
 *     ajuz                   (bare next line becomes the ajuz)
 *
 *   Solo misra (bare line with no backslash — never auto-paired):
 *     text                   (full-width centered)
 *
 *   Stanza separator: blank line
 *   Poem separator:  a line containing only ---
 *
 *   Refrain marker: append % to any line
 *     sadr \ ajuz %          (whole bayt is refrain)
 *     sadr \ %               (only sadr is refrain — pairs with next)
 *     sadr %                 (solo refrain)
 *
 * DOM usage:
 *   <div data-ashaar>poem text here</div>
 *   <script>Ashaar.init();</script>
 *
 *   CSS-native justification (text-justify: auto):
 *   <div class="ashaar ashaar--justify" data-ashaar>…</div>
 *
 * JS API:
 *   Ashaar.renderText(str)           → HTML string
 *   Ashaar.init(selector?, opts?)    → processes matching elements in place
 *   Ashaar.justifyEl(containerEl)    → apply kashida justification to one element
 *
 *   opts.justify:
 *     'css'     — adds ashaar--justify class (text-justify: auto, browser-native)
 *     'kashida' — JS tatweel insertion with DOM measurement (most accurate)
 *     true      — alias for 'kashida'
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Ashaar = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // ── Separators and structure regexes ──────────────────────────────────────

  var SEP_RE       = /\s*[\\*|]\s*/;
  var STANZA_SEP_RE = /\n{2,}/;
  var POEM_SEP_RE   = /\n[ \t]*---[ \t]*(?:\n|$)/g;

  // ── Parsing ───────────────────────────────────────────────────────────────

  /**
   * Parse a single raw line into an array of items:
   *   { type: 'bayt',  sadr, ajuz, sadrRefrain, ajuzRefrain }
   *   { type: 'misra', text, isRefrain, needsPairing }
   *
   * needsPairing=true  → trailing separator present; pair with next line
   * needsPairing=false → bare line; display solo/full-width
   */
  function parseLine(raw) {
    var line = raw.trim();
    if (!line) return null;

    var isRefrain = /\s*%\s*$/.test(line);
    if (isRefrain) line = line.replace(/\s*%\s*$/, '').trim();
    if (!line) return null;

    var parts = line.split(SEP_RE).map(function (p) { return p.trim(); });
    var trailingPairing = parts.length > 1 && parts[parts.length - 1] === '';
    var cleanParts = parts.filter(function (p) { return p.length > 0; });
    if (!cleanParts.length) return null;

    if (cleanParts.length >= 2) {
      var result = [];
      for (var i = 0; i < cleanParts.length; i += 2) {
        if (i + 1 < cleanParts.length) {
          result.push({
            type: 'bayt',
            sadr: cleanParts[i], ajuz: cleanParts[i + 1],
            sadrRefrain: isRefrain, ajuzRefrain: isRefrain
          });
        } else {
          result.push({
            type: 'misra', text: cleanParts[i],
            isRefrain: isRefrain, needsPairing: trailingPairing
          });
        }
      }
      return result;
    }

    return [{ type: 'misra', text: cleanParts[0], isRefrain: isRefrain, needsPairing: trailingPairing }];
  }

  function parseStanza(text) {
    var items = [];
    text.split('\n').forEach(function (raw) {
      var parsed = parseLine(raw);
      if (parsed) items = items.concat(parsed);
    });

    var bayts = [];
    var i = 0;
    while (i < items.length) {
      var cur = items[i];
      if (cur.type === 'bayt') {
        bayts.push(cur);
        i++;
      } else if (cur.needsPairing && i + 1 < items.length && items[i + 1].type === 'misra') {
        var nxt = items[i + 1];
        bayts.push({
          type: 'bayt',
          sadr: cur.text, ajuz: nxt.text,
          sadrRefrain: cur.isRefrain, ajuzRefrain: nxt.isRefrain
        });
        i += 2;
      } else {
        bayts.push({ type: 'bayt', sadr: cur.text, ajuz: null, sadrRefrain: cur.isRefrain, ajuzRefrain: false });
        i++;
      }
    }

    return bayts.length ? { bayts: bayts } : null;
  }

  function parsePoem(text) {
    var trimmed = text.trim();
    if (!trimmed) return null;
    var stanzas = trimmed.split(STANZA_SEP_RE).map(parseStanza).filter(Boolean);
    return stanzas.length ? { stanzas: stanzas } : null;
  }

  function parse(text) {
    var chunks = ('\n' + text + '\n').split(POEM_SEP_RE);
    return chunks.map(parsePoem).filter(Boolean);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderBayt(b) {
    var isFullRefrain = b.sadrRefrain && (!b.ajuz || b.ajuzRefrain);
    var baseCls = 'ashaar-bayt' + (isFullRefrain ? ' ashaar-bayt--refrain' : '');

    if (!b.ajuz) {
      var soloCls = 'ashaar-misra ashaar-misra--solo' + (b.sadrRefrain ? ' ashaar-misra--refrain' : '');
      return '<div class="' + baseCls + ' ashaar-bayt--solo">' +
        '<span class="' + soloCls + '">' + esc(b.sadr) + '</span></div>';
    }

    // DOM order: sadr first → appears on right in RTL flex row
    var sadrCls = 'ashaar-misra ashaar-misra--sadr' + (b.sadrRefrain ? ' ashaar-misra--refrain' : '');
    var ajuzCls = 'ashaar-misra ashaar-misra--ajuz' + (b.ajuzRefrain ? ' ashaar-misra--refrain' : '');

    return '<div class="' + baseCls + '">' +
      '<span class="' + sadrCls + '">' + esc(b.sadr) + '</span>' +
      '<span class="ashaar-gap" aria-hidden="true"></span>' +
      '<span class="' + ajuzCls + '">' + esc(b.ajuz) + '</span>' +
      '</div>';
  }

  function stanzaClass(bayts) {
    var mainCount = bayts.filter(function (b) { return !b.sadrRefrain || !b.ajuzRefrain; }).length;
    var typeMap = { 1: 'bayt', 2: 'rubaei', 3: 'sudaisi' };
    return 'ashaar-stanza ashaar-stanza--' + (typeMap[mainCount] || 'multi');
  }

  function renderStanza(s) {
    return '<div class="' + stanzaClass(s.bayts) + '">' + s.bayts.map(renderBayt).join('') + '</div>';
  }

  function renderPoem(p) {
    return '<div class="ashaar-poem">' + p.stanzas.map(renderStanza).join('') + '</div>';
  }

  function render(poems) { return poems.map(renderPoem).join(''); }

  function renderText(text) { return render(parse(text)); }

  // ── Kashida / tatweel justification ───────────────────────────────────────

  // Arabic-script characters that connect on both sides (U+0640 tatweel can follow them).
  // Covers core Arabic + common Persian/Urdu extensions.
  var DUAL_JOIN_RE = /[بت-خس-غف-هى-يـپچژکگںڻڼھہیېۑ]/;

  var TATWEEL = 'ـ';

  /** Return indices (insertion points) within `word` where tatweel can go. */
  function tatweelSlots(word) {
    var pts = [];
    for (var i = 0; i < word.length - 1; i++) {
      if (DUAL_JOIN_RE.test(word[i])) pts.push(i + 1);
    }
    return pts;
  }

  /**
   * Distribute `n` tatweels evenly across the available slots in `text`,
   * inserting more in longer words proportionally.
   */
  function spreadTatweels(text, n) {
    if (n <= 0) return text;
    var words = text.split(' ');
    var allSlots = [];
    words.forEach(function (w, wi) {
      tatweelSlots(w).forEach(function (pos) { allSlots.push({ wi: wi, pos: pos }); });
    });
    if (!allSlots.length) return text;

    // Even stride through available slots
    var step = allSlots.length / Math.min(n, allSlots.length);
    var insertMap = {};
    for (var i = 0; i < Math.min(n, allSlots.length); i++) {
      var s = allSlots[Math.min(Math.floor(i * step), allSlots.length - 1)];
      var key = s.wi + ':' + s.pos;
      insertMap[key] = (insertMap[key] || 0) + 1;
    }

    return words.map(function (w, wi) {
      var chars = w.split('');
      var offset = 0;
      var ins = [];
      for (var key in insertMap) {
        var parts = key.split(':');
        if (+parts[0] === wi) ins.push({ pos: +parts[1], count: insertMap[key] });
      }
      ins.sort(function (a, b) { return a.pos - b.pos; });
      ins.forEach(function (entry) {
        var t = '';
        for (var k = 0; k < entry.count; k++) t += TATWEEL;
        chars.splice(entry.pos + offset, 0, t);
        offset += entry.count;
      });
      return chars.join('');
    }).join(' ');
  }

  /** Create a hidden measurement probe styled after `referenceEl`. */
  function createProbe(referenceEl) {
    var cs = window.getComputedStyle(referenceEl);
    var p = document.createElement('span');
    p.setAttribute('aria-hidden', 'true');
    p.style.position      = 'absolute';
    p.style.visibility    = 'hidden';
    p.style.whiteSpace    = 'nowrap';
    p.style.pointerEvents = 'none';
    p.style.top           = '-9999px';
    p.style.left          = '-9999px';
    p.style.fontSize      = cs.fontSize;
    p.style.fontFamily    = cs.fontFamily;
    p.style.fontWeight    = cs.fontWeight;
    p.style.fontStyle     = cs.fontStyle;
    p.style.letterSpacing = cs.letterSpacing;
    p.style.direction     = 'rtl';
    var ffs = cs.fontFeatureSettings || cs.webkitFontFeatureSettings;
    if (ffs && ffs !== 'normal') p.style.fontFeatureSettings = ffs;
    document.body.appendChild(p);
    return p;
  }

  function probeWidth(probe, text) {
    probe.textContent = text;
    return probe.getBoundingClientRect().width;
  }

  /**
   * Justify one misra span by inserting tatweels to fill its available width.
   * Reuses a shared probe element for all measurements.
   */
  function justifyMisra(spanEl, probe) {
    var text = spanEl.dataset.ashaarOriginal;
    if (text === undefined) {
      // Store the original text the first time
      text = spanEl.textContent;
      spanEl.dataset.ashaarOriginal = text;
    }
    if (!text.trim()) return;

    var available = spanEl.getBoundingClientRect().width;
    if (!available) return;

    var natural = probeWidth(probe, text);
    if (natural >= available - 1) { spanEl.textContent = text; return; }

    // Binary search: maximum tatweel count that still fits
    var lo = 1, hi = text.replace(/\s/g, '').length, best = text;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var candidate = spreadTatweels(text, mid);
      if (probeWidth(probe, candidate) <= available) { best = candidate; lo = mid + 1; }
      else { hi = mid - 1; }
    }
    spanEl.textContent = best;
  }

  /**
   * Apply kashida justification to all two-column misras inside `containerEl`.
   * Waits for fonts to load, then sets up a ResizeObserver for responsive updates.
   */
  function justifyEl(containerEl) {
    var SELECTOR = '.ashaar-misra--sadr, .ashaar-misra--ajuz';

    function run() {
      var spans = containerEl.querySelectorAll(SELECTOR);
      if (!spans.length) return;
      var probe = createProbe(spans[0]);
      for (var i = 0; i < spans.length; i++) justifyMisra(spans[i], probe);
      document.body.removeChild(probe);
    }

    if (typeof document === 'undefined') return;

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        run();
        if (window.ResizeObserver) {
          var ro = new ResizeObserver(run);
          ro.observe(containerEl);
        }
      });
    } else {
      setTimeout(run, 150);
    }
  }

  // ── DOM initialisation ────────────────────────────────────────────────────

  /**
   * init(selector?, opts?)
   *   opts.justify: 'css' | 'kashida' | true | false
   */
  function init(selector, opts) {
    if (selector && typeof selector === 'object' && !opts) { opts = selector; selector = null; }
    opts = opts || {};
    var els = document.querySelectorAll(selector || '[data-ashaar]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var src = el.getAttribute('data-ashaar');
      if (!src || !src.trim()) src = el.textContent || '';
      el.innerHTML = renderText(src);
      el.removeAttribute('data-ashaar');
      if (!el.classList.contains('ashaar')) el.classList.add('ashaar');

      if (opts.justify === 'css') {
        el.classList.add('ashaar--justify');
      } else if (opts.justify === 'kashida' || opts.justify === true) {
        justifyEl(el);
      }
    }
  }

  return { parse: parse, render: render, renderText: renderText, init: init, justifyEl: justifyEl };
}));
