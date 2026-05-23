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
 * JS API:
 *   Ashaar.renderText(str) → HTML string
 *   Ashaar.init(selector)  → processes matching elements in place
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Ashaar = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Matches any separator character with optional surrounding spaces
  var SEP_RE = /\s*[\\*|]\s*/;

  var STANZA_SEP_RE = /\n{2,}/;

  // A line that is exactly "---" (possibly surrounded by whitespace)
  var POEM_SEP_RE = /\n[ \t]*---[ \t]*(?:\n|$)/g;

  // ── Parsing ──────────────────────────────────────────────────────────────

  /**
   * Parse a single raw line into an array of items.
   *
   * Returns an array of:
   *   { type: 'bayt',  sadr, ajuz, sadrRefrain, ajuzRefrain }
   *   { type: 'misra', text, isRefrain, needsPairing }
   *
   * needsPairing=true  → trailing separator was present; pair with next line
   * needsPairing=false → bare line; display solo/full-width
   */
  function parseLine(raw) {
    var line = raw.trim();
    if (!line) return null;

    // Strip refrain marker
    var isRefrain = /\s*%\s*$/.test(line);
    if (isRefrain) line = line.replace(/\s*%\s*$/, '').trim();
    if (!line) return null;

    // Split on separators; a trailing separator leaves an empty string at end
    var parts = line.split(SEP_RE).map(function (p) { return p.trim(); });

    // Trailing separator → last element will be ''
    var trailingPairing = parts.length > 1 && parts[parts.length - 1] === '';
    var cleanParts = parts.filter(function (p) { return p.length > 0; });

    if (!cleanParts.length) return null;

    // Two or more non-empty parts → inline bayt(s)
    if (cleanParts.length >= 2) {
      var result = [];
      for (var i = 0; i < cleanParts.length; i += 2) {
        if (i + 1 < cleanParts.length) {
          result.push({
            type: 'bayt',
            sadr: cleanParts[i],
            ajuz: cleanParts[i + 1],
            sadrRefrain: isRefrain,
            ajuzRefrain: isRefrain
          });
        } else {
          // Odd leftover part → solo misra
          result.push({
            type: 'misra',
            text: cleanParts[i],
            isRefrain: isRefrain,
            needsPairing: trailingPairing
          });
        }
      }
      return result;
    }

    // Single part
    return [{
      type: 'misra',
      text: cleanParts[0],
      isRefrain: isRefrain,
      needsPairing: trailingPairing
    }];
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
      } else if (
        cur.needsPairing &&
        i + 1 < items.length &&
        items[i + 1].type === 'misra'
      ) {
        // Trailing-separator misra paired with whatever follows (refrain or not)
        var nxt = items[i + 1];
        bayts.push({
          type: 'bayt',
          sadr: cur.text,
          ajuz: nxt.text,
          sadrRefrain: cur.isRefrain,
          ajuzRefrain: nxt.isRefrain
        });
        i += 2;
      } else {
        // Bare lone misra → full-width solo
        bayts.push({
          type: 'bayt',
          sadr: cur.text,
          ajuz: null,
          sadrRefrain: cur.isRefrain,
          ajuzRefrain: false
        });
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
      var soloCls = 'ashaar-misra ashaar-misra--solo' +
        (b.sadrRefrain ? ' ashaar-misra--refrain' : '');
      return '<div class="' + baseCls + ' ashaar-bayt--solo">' +
        '<span class="' + soloCls + '">' + esc(b.sadr) + '</span>' +
        '</div>';
    }

    // DOM order: sadr first → appears on right in RTL flex row
    var sadrCls = 'ashaar-misra ashaar-misra--sadr' +
      (b.sadrRefrain ? ' ashaar-misra--refrain' : '');
    var ajuzCls = 'ashaar-misra ashaar-misra--ajuz' +
      (b.ajuzRefrain ? ' ashaar-misra--refrain' : '');

    return '<div class="' + baseCls + '">' +
      '<span class="' + sadrCls + '">' + esc(b.sadr) + '</span>' +
      '<span class="ashaar-gap" aria-hidden="true"></span>' +
      '<span class="' + ajuzCls + '">' + esc(b.ajuz) + '</span>' +
      '</div>';
  }

  function stanzaClass(bayts) {
    var mainCount = bayts.filter(function (b) { return !b.sadrRefrain || !b.ajuzRefrain; }).length;
    var typeMap = { 1: 'bayt', 2: 'rubaei', 3: 'sudaisi' };
    var mod = typeMap[mainCount] || 'multi';
    return 'ashaar-stanza ashaar-stanza--' + mod;
  }

  function renderStanza(s) {
    return '<div class="' + stanzaClass(s.bayts) + '">' +
      s.bayts.map(renderBayt).join('') +
      '</div>';
  }

  function renderPoem(p) {
    return '<div class="ashaar-poem">' +
      p.stanzas.map(renderStanza).join('') +
      '</div>';
  }

  function render(poems) {
    return poems.map(renderPoem).join('');
  }

  function renderText(text) {
    return render(parse(text));
  }

  // ── DOM initialisation ───────────────────────────────────────────────────

  function init(selector) {
    var els = document.querySelectorAll(selector || '[data-ashaar]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var src = el.getAttribute('data-ashaar');
      if (!src || !src.trim()) src = el.textContent || '';
      el.innerHTML = renderText(src);
      el.removeAttribute('data-ashaar');
      if (!el.classList.contains('ashaar')) el.classList.add('ashaar');
    }
  }

  return { parse: parse, render: render, renderText: renderText, init: init };
}));
