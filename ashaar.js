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
 *   Ashaar.renderText(str, opts?)    → HTML string
 *   Ashaar.init(selector?, opts?)    → processes matching elements in place
 *   Ashaar.justifyEl(containerEl)    → apply kashida justification to one element
 *
 *   opts.justify:
 *     'css'     — adds ashaar--justify class (text-justify: auto, browser-native)
 *     'kashida' — JS tatweel insertion with DOM measurement (most accurate)
 *     'spacing' — JS word-spacing/scale balancing without inserting tatweels
 *     true      — alias for 'kashida'
 *   opts.layout:
 *     'columns' — two-column bayts
 *     'stacked' — sadr above ajuz, with ajuz indented
 *     'auto'    — use columns unless a hemistich wraps, then stack the block
 *   opts.gapWidth:
 *     CSS length for inter-hemistich spacing, mapped to --ashaar-gap-width
 *   opts.gapSymbol:
 *     optional visible symbol rendered between hemistiches
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Ashaar = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {

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

    // % may appear at the very end, or just before a trailing separator: "text % \"
    var isRefrain = /\s*%\s*$/.test(line) || /\s*%\s*[\\*|]\s*$/.test(line);
    if (isRefrain) line = line.replace(/\s*%(\s*[\\*|]\s*)$/, '$1').replace(/\s*%\s*$/, '').trim();
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

  function cssLength(value) {
    if (typeof value === 'number' && isFinite(value)) return value + 'px';
    if (value !== undefined && value !== null) return String(value);
    return '';
  }

  function applyRenderOptions(containerEl, opts) {
    opts = opts || {};
    if (opts.gapWidth !== undefined) {
      containerEl.style.setProperty('--ashaar-gap-width', cssLength(opts.gapWidth));
    }
  }

  function renderBayt(b, opts) {
    opts = opts || {};
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
    var gapSymbol = opts.gapSymbol === undefined || opts.gapSymbol === null ? '' : String(opts.gapSymbol);
    var gapHtml = gapSymbol ? '<span class="ashaar-gap-symbol">' + esc(gapSymbol) + '</span>' : '';

    return '<div class="' + baseCls + '">' +
      '<span class="' + sadrCls + '">' + esc(b.sadr) + '</span>' +
      '<span class="ashaar-gap" aria-hidden="true">' + gapHtml + '</span>' +
      '<span class="' + ajuzCls + '">' + esc(b.ajuz) + '</span>' +
      '</div>';
  }

  function stanzaClass(bayts) {
    var mainCount = bayts.filter(function (b) { return !b.sadrRefrain || !b.ajuzRefrain; }).length;
    var typeMap = { 1: 'bayt', 2: 'rubaei', 3: 'sudaisi' };
    return 'ashaar-stanza ashaar-stanza--' + (typeMap[mainCount] || 'multi');
  }

  function renderStanza(s, opts) {
    return '<div class="' + stanzaClass(s.bayts) + '">' + s.bayts.map(function (b) {
      return renderBayt(b, opts);
    }).join('') + '</div>';
  }

  function renderPoem(p, opts) {
    return '<div class="ashaar-poem">' + p.stanzas.map(function (s) {
      return renderStanza(s, opts);
    }).join('') + '</div>';
  }

  function render(poems, opts) {
    return poems.map(function (p) { return renderPoem(p, opts); }).join('');
  }

  function renderText(text, opts) { return render(parse(text), opts); }

  // ── Layout selection ──────────────────────────────────────────────────────

  function afterFonts(fn) {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fn);
    } else {
      setTimeout(fn, 150);
    }
  }

  function numericLineHeight(el) {
    var cs = window.getComputedStyle(el);
    var lh = parseFloat(cs.lineHeight);
    if (isFinite(lh)) return lh;
    return (parseFloat(cs.fontSize) || 16) * 1.2;
  }

  function misraWraps(span) {
    var rect = span.getBoundingClientRect();
    return rect.height > numericLineHeight(span) * 1.35;
  }

  function stackBelowWidth(opts) {
    opts = opts || {};
    var value = opts.stackBelow !== undefined ? opts.stackBelow : opts.autoStackBelow;
    var width = typeof value === 'number' ? value : parseFloat(value);
    return isFinite(width) && width > 0 ? width : null;
  }

  function applyAutoLayout(containerEl, opts) {
    opts = opts || {};
    var wasStacked = containerEl.classList.contains('ashaar--stacked');
    containerEl.classList.remove('ashaar--stacked');
    var spans = containerEl.querySelectorAll('.ashaar-misra--sadr, .ashaar-misra--ajuz');
    var breakpoint = stackBelowWidth(opts);
    var shouldStack = breakpoint !== null && containerEl.getBoundingClientRect().width <= breakpoint;

    if (!shouldStack) {
      for (var i = 0; i < spans.length; i++) {
        if (misraWraps(spans[i])) {
          shouldStack = true;
          break;
        }
      }
    }
    if (shouldStack) containerEl.classList.add('ashaar--stacked');
    return wasStacked !== shouldStack;
  }

  function observeAutoLayout(containerEl, opts) {
    if (typeof window === 'undefined' || !window.ResizeObserver) return;
    if (containerEl._ashaarAutoLayoutObserver) containerEl._ashaarAutoLayoutObserver.disconnect();
    var ro = new ResizeObserver(function () {
      applyAutoLayout(containerEl, opts);
    });
    ro.observe(containerEl);
    containerEl._ashaarAutoLayoutObserver = ro;
  }

  // ── Kashida / tatweel justification ───────────────────────────────────────
  //
  // A tatweel slot is legal only after a character that shapes as initial or
  // medial: it must connect onward to the following visible Arabic letter.
  // Diacritics are ignored for shaping, ZWNJ is a hard joining boundary, and
  // lam-alef sequences are left untouched.

  // Ensure AshaarJustify is accessible; it may be loaded as a separate script before this one
  function getJustifyModule() {
    // In browser: try globalThis first, then window
    if (typeof globalThis !== 'undefined' && globalThis.AshaarJustify) return globalThis.AshaarJustify;
    if (typeof window !== 'undefined' && window.AshaarJustify) return window.AshaarJustify;
    // In Node/CommonJS: try require
    if (typeof require === 'function' && typeof module !== 'undefined' && module.exports) {
      try { return require('./ashaar-justify'); } catch (e) {}
    }
    return null;
  }
  
  var Justify = getJustifyModule();

  function countWordGaps(text) {
    var m = text.match(/\s+/g);
    return m ? m.length : 0;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function justifyMisra(spanEl, probe, targetWidth, opts) {
    opts = opts || {};
    var text = spanEl.dataset.ashaarOriginal;
    if (text === undefined) {
      text = spanEl.textContent;
      spanEl.dataset.ashaarOriginal = text;
    }
    if (!text.trim()) return;

    spanEl.style.fontSize = '';
    spanEl.style.wordSpacing = '';
    probe.style.fontSize = '';
    probe.style.wordSpacing = '';

    var available = targetWidth || spanEl.getBoundingClientRect().width;
    if (!available) return;
    var natural = probeWidth(probe, text);
    var wordGaps = countWordGaps(text);
    var cs = window.getComputedStyle(spanEl);
    var fontSize = parseFloat(cs.fontSize) || 16;
    var maxWordSpacing = typeof opts.maxWordSpacing === 'number' ? opts.maxWordSpacing : fontSize * 0.28;
    var minWordSpacing = typeof opts.minWordSpacing === 'number' ? opts.minWordSpacing : -fontSize * 0.08;
    var desiredWordSpacing = wordGaps ? (available - natural) / wordGaps : 0;
    var wordSpacing = wordGaps ? clamp(desiredWordSpacing, minWordSpacing, maxWordSpacing) : 0;
    if (wordSpacing) {
      spanEl.style.wordSpacing = Math.round(wordSpacing * 100) / 100 + 'px';
      probe.style.wordSpacing = spanEl.style.wordSpacing;
      natural = probeWidth(probe, text);
    }

    var scale = 1;
    var maxScaleDown = typeof opts.maxScaleDown === 'number' ? opts.maxScaleDown : 0.06;
    if (natural > available && maxScaleDown > 0) {
      scale = Math.max(1 - maxScaleDown, available / natural);
      spanEl.style.fontSize = Math.round(scale * 1000) / 10 + '%';
    }

    var effectiveTarget = available / scale;
    if (natural >= effectiveTarget - 1) { spanEl.textContent = text; return; }
    if (opts.method === 'spacing' || opts.tatweel === false) { spanEl.textContent = text; return; }

    // Re-check Justify in case it wasn't available at module load time
    var currentJustify = Justify || getJustifyModule();
    if (!currentJustify || typeof currentJustify.spreadTatweels !== 'function') {
      spanEl.textContent = text;
      return;
    }

    var lo = 1, hi = text.replace(/\s/g, '').length, best = text;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var candidate = currentJustify.spreadTatweels(text, mid);
      if (probeWidth(probe, candidate) <= effectiveTarget) { best = candidate; lo = mid + 1; }
      else { hi = mid - 1; }
    }
    spanEl.textContent = best;
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

  function blockTargets(spans, probe, opts) {
    opts = opts || {};
    var metrics = [];
    var longest = 0;

    for (var i = 0; i < spans.length; i++) {
      var span = spans[i];
      var text = span.dataset.ashaarOriginal;
      if (text === undefined) text = span.textContent;
      span.style.fontSize = '';
      span.textContent = text;
      var natural = probeWidth(probe, text);
      var available = span.getBoundingClientRect().width;
      if (natural > longest) longest = natural;
      metrics.push({ available: available, natural: natural });
    }

    if (opts.balance === false) {
      return metrics.map(function (m) { return m.available; });
    }

    var fill = typeof opts.balanceFill === 'number' ? opts.balanceFill : 1.04;
    var shared = longest * fill;
    return metrics.map(function (m) {
      return Math.min(m.available, shared);
    });
  }

  /**
   * Apply kashida justification to all two-column misras inside `containerEl`.
   * Waits for fonts to load, then sets up a ResizeObserver for responsive updates.
   */
  function justifyEl(containerEl, opts) {
    opts = opts || {};
    var SELECTOR = '.ashaar-misra--sadr, .ashaar-misra--ajuz';

    function run() {
      if (opts.layout === 'auto') containerEl.classList.remove('ashaar--stacked');
      var spans = containerEl.querySelectorAll(SELECTOR);
      if (!spans.length) return;
      var probe = createProbe(spans[0]);
      var targets = blockTargets(spans, probe, opts);
      for (var i = 0; i < spans.length; i++) justifyMisra(spans[i], probe, targets[i], opts);
      document.body.removeChild(probe);
      if (opts.layout === 'auto') applyAutoLayout(containerEl, opts);
    }

    if (typeof document === 'undefined') return;

    afterFonts(function () {
      run();
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(run);
        ro.observe(containerEl);
      }
    });
  }

  // ── DOM initialisation ────────────────────────────────────────────────────

  /**
   * init(selector?, opts?)
   *   opts.justify: 'css' | 'kashida' | true | false
   *   opts.layout:  'columns' | 'stacked' | 'auto'
   */
  function init(selector, opts) {
    if (selector && typeof selector === 'object' && !opts) { opts = selector; selector = null; }
    opts = opts || {};
    var els = document.querySelectorAll(selector || '[data-ashaar]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var src = el.getAttribute('data-ashaar');
      var storedSrc = el.getAttribute('data-ashaar-source');
      if ((!src || !src.trim()) && storedSrc) src = storedSrc;
      if (!src || !src.trim()) src = el.textContent || '';
      el.setAttribute('data-ashaar-source', src);
      el.innerHTML = renderText(src, opts);
      el.removeAttribute('data-ashaar');
      if (!el.classList.contains('ashaar')) el.classList.add('ashaar');
      applyRenderOptions(el, opts);
      if (opts.layout === 'stacked') el.classList.add('ashaar--stacked');

      (function (targetEl) {
        afterFonts(function () {
          if (opts.layout === 'auto') {
            applyAutoLayout(targetEl, opts);
            observeAutoLayout(targetEl, opts);
          }

          if (opts.justify === 'css') {
            targetEl.classList.add('ashaar--justify');
          } else if (opts.justify === 'spacing') {
            justifyEl(targetEl, Object.assign({}, opts, { method: 'spacing', tatweel: false }));
          } else if (opts.justify === 'kashida' || opts.justify === true) {
            justifyEl(targetEl, opts);
          }
        });
      }(el));
    }
  }

  return { parse: parse, render: render, renderText: renderText, init: init, justifyEl: justifyEl, applyAutoLayout: applyAutoLayout, applyRenderOptions: applyRenderOptions };
}));
