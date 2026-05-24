/**
 * test/parser.test.js — Unit tests for ashaar.js parser and renderer
 *
 * Runs in Node.js (node test/parser.test.js) or a browser console.
 * Output is TAP-compatible.
 *
 *   node test/parser.test.js
 *   node test/parser.test.js | npx tap-spec   (pretty output)
 */

/* global require, module, process */
var Ashaar = (typeof require !== 'undefined')
  ? require('../ashaar.js')
  : window.Ashaar;

var corpus = (typeof require !== 'undefined')
  ? require('./corpus.js')
  : window.__corpus;

// ── Minimal TAP emitter ─────────────────────────────────────────────────────

var _n = 0, _pass = 0, _fail = 0, _log = [];

function diag(msg) { _log.push('# ' + msg); }

function ok(cond, desc) {
  _n++;
  if (cond) {
    _log.push('ok ' + _n + ' - ' + desc);
    _pass++;
  } else {
    _log.push('not ok ' + _n + ' - ' + desc);
    _fail++;
  }
}

function eq(actual, expected, desc) {
  var pass = actual === expected;
  if (!pass) diag('  expected: ' + JSON.stringify(expected));
  if (!pass) diag('  actual:   ' + JSON.stringify(actual));
  ok(pass, desc);
}

function deepEq(actual, expected, desc) {
  eq(JSON.stringify(actual), JSON.stringify(expected), desc);
}

function finish() {
  _log.unshift('TAP version 13\n1..' + _n);
  var out = _log.join('\n');
  if (typeof process !== 'undefined') {
    process.stdout.write(out + '\n');
    process.exit(_fail > 0 ? 1 : 0);
  } else {
    console.log(out);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parse(text) { return Ashaar.parse(text); }
function render(text) { return Ashaar.renderText(text); }

function countBayts(poems) {
  return poems.reduce(function (s, p) {
    return s + p.stanzas.reduce(function (ss, st) { return ss + st.bayts.length; }, 0);
  }, 0);
}

function countStanzas(poems) {
  return poems.reduce(function (s, p) { return s + p.stanzas.length; }, 0);
}

function allBayts(poems) {
  var out = [];
  poems.forEach(function (p) {
    p.stanzas.forEach(function (s) {
      s.bayts.forEach(function (b) { out.push(b); });
    });
  });
  return out;
}

// ── 1. Basic parsing ─────────────────────────────────────────────────────────

diag('1. Basic parsing');

(function testInlineSeparators() {
  var backslash = parse('sadr \\ ajuz');
  var asterisk  = parse('sadr * ajuz');
  var pipe      = parse('sadr | ajuz');

  ok(backslash.length === 1 && backslash[0].stanzas[0].bayts[0].type === 'bayt',
     'backslash separator produces a bayt');
  eq(backslash[0].stanzas[0].bayts[0].sadr, 'sadr', 'sadr extracted from backslash');
  eq(backslash[0].stanzas[0].bayts[0].ajuz, 'ajuz', 'ajuz extracted from backslash');

  eq(asterisk[0].stanzas[0].bayts[0].sadr, 'sadr', 'asterisk separator — sadr');
  eq(asterisk[0].stanzas[0].bayts[0].ajuz, 'ajuz', 'asterisk separator — ajuz');

  eq(pipe[0].stanzas[0].bayts[0].sadr, 'sadr', 'pipe separator — sadr');
  eq(pipe[0].stanzas[0].bayts[0].ajuz, 'ajuz', 'pipe separator — ajuz');
}());

(function testSoloMisra() {
  var poems = parse('bare line\nsecond line');
  eq(poems.length, 1, 'solo misras: one poem');
  eq(countBayts(poems), 2, 'solo misras: two bayts');
  var bayts = allBayts(poems);
  eq(bayts[0].ajuz, null, 'solo misra has null ajuz');
  eq(bayts[0].sadr, 'bare line', 'solo misra sadr is the line text');
}());

(function testTrailingPair() {
  var poems = parse('sadr \\\najuz');
  eq(poems.length, 1, 'trailing-pair: one poem');
  var bayts = allBayts(poems);
  eq(bayts.length, 1, 'trailing-pair: one bayt');
  eq(bayts[0].sadr, 'sadr', 'trailing-pair sadr');
  eq(bayts[0].ajuz, 'ajuz', 'trailing-pair ajuz');
}());

(function testTrailingPairMultiple() {
  var text = 'misra1 \\\nmisra2\nmisra3 \\\nmisra4';
  var poems = parse(text);
  var bayts = allBayts(poems);
  eq(bayts.length, 2, 'two trailing-pairs → two bayts');
  eq(bayts[0].sadr, 'misra1', 'first pair sadr');
  eq(bayts[0].ajuz, 'misra2', 'first pair ajuz');
  eq(bayts[1].sadr, 'misra3', 'second pair sadr');
  eq(bayts[1].ajuz, 'misra4', 'second pair ajuz');
}());

(function testMixedSoloAndPaired() {
  // A bare line after a trailing-pair line should NOT be auto-paired
  // if the bare line has no trailing backslash.
  var text = 'solo line\npaired sadr \\\npaired ajuz';
  var poems = parse(text);
  var bayts = allBayts(poems);
  eq(bayts.length, 2, 'solo then trailing-pair: two bayts');
  eq(bayts[0].ajuz, null, 'solo line stays solo');
  eq(bayts[1].sadr, 'paired sadr', 'trailing-pair sadr ok');
  eq(bayts[1].ajuz, 'paired ajuz', 'trailing-pair ajuz ok');
}());

// ── 2. Stanza and poem boundaries ───────────────────────────────────────────

diag('2. Stanza and poem boundaries');

(function testStanzaBoundary() {
  var text = 'a \\ b\n\nc \\ d';
  var poems = parse(text);
  eq(poems.length, 1, 'blank line: still one poem');
  eq(countStanzas(poems), 2, 'blank line: two stanzas');
}());

(function testPoemBoundary() {
  var text = 'a \\ b\n---\nc \\ d';
  var poems = parse(text);
  eq(poems.length, 2, '--- separator: two poems');
  eq(countBayts(poems), 2, '--- separator: one bayt per poem');
}());

(function testMultiplePoems() {
  var text = 'p1a \\ p1b\n---\np2a \\ p2b\n---\np3a \\ p3b';
  var poems = parse(text);
  eq(poems.length, 3, 'three poems from two --- separators');
}());

(function testEmptyInput() {
  eq(parse('').length, 0, 'empty string → zero poems');
  eq(parse('   ').length, 0, 'whitespace-only → zero poems');
  eq(parse('\n\n\n').length, 0, 'blank lines only → zero poems');
}());

// ── 3. Refrain markers ───────────────────────────────────────────────────────

diag('3. Refrain markers');

(function testFullRefrain() {
  var poems = parse('sadr \\ ajuz %');
  var b = allBayts(poems)[0];
  ok(b.sadrRefrain, 'full-refrain bayt: sadrRefrain true');
  ok(b.ajuzRefrain, 'full-refrain bayt: ajuzRefrain true');
}());

(function testSoloRefrain() {
  var poems = parse('solo misra %');
  var b = allBayts(poems)[0];
  ok(b.sadrRefrain, 'solo refrain: sadrRefrain true');
  ok(!b.ajuzRefrain, 'solo refrain: ajuzRefrain false');
  ok(b.ajuz === null, 'solo refrain: no ajuz');
}());

(function testPerMisraRefrain() {
  // Sadr is refrain, ajuz is not — trailing-pair format
  var poems = parse('sadr % \\\najuz');
  var b = allBayts(poems)[0];
  ok(b.sadrRefrain,  'per-misra refrain: sadrRefrain true');
  ok(!b.ajuzRefrain, 'per-misra refrain: ajuzRefrain false');
  eq(b.sadr, 'sadr', 'per-misra refrain: sadr text');
  eq(b.ajuz, 'ajuz', 'per-misra refrain: ajuz text');
}());

(function testRefrainNotStrippedFromText() {
  var poems = parse('some text %');
  var b = allBayts(poems)[0];
  eq(b.sadr, 'some text', 'refrain marker stripped from text');
}());

// ── 4. Corpus integration tests ─────────────────────────────────────────────

diag('4. Corpus integration');

if (corpus) {
  corpus.CORPUS.forEach(function (poem) {
    var poems = parse(poem.text);

    if (poem.expectedPoems !== undefined) {
      eq(poems.length, poem.expectedPoems,
         poem.id + ': expected ' + poem.expectedPoems + ' poem(s)');
    }

    if (poem.expectedStanzas !== undefined) {
      eq(countStanzas(poems), poem.expectedStanzas,
         poem.id + ': expected ' + poem.expectedStanzas + ' stanza(s)');
    }

    if (poem.expectedBayts !== undefined) {
      eq(countBayts(poems), poem.expectedBayts,
         poem.id + ': expected ' + poem.expectedBayts + ' bayt(s)');
    }

    if (poem.expectedRefrains !== undefined) {
      var refrainCount = allBayts(poems).filter(function (b) {
        return b.sadrRefrain || b.ajuzRefrain;
      }).length;
      eq(refrainCount, poem.expectedRefrains,
         poem.id + ': expected ' + poem.expectedRefrains + ' refrain bayt(s)');
    }
  });
} else {
  diag('  corpus.js not loaded — skipping corpus integration tests');
}

// ── 5. Renderer output ───────────────────────────────────────────────────────

diag('5. Renderer output');

(function testRenderedStructure() {
  var html = render('sadr \\ ajuz');
  ok(html.indexOf('ashaar-poem') !== -1,   'render: contains ashaar-poem');
  ok(html.indexOf('ashaar-stanza') !== -1, 'render: contains ashaar-stanza');
  ok(html.indexOf('ashaar-bayt') !== -1,   'render: contains ashaar-bayt');
  ok(html.indexOf('ashaar-misra--sadr') !== -1, 'render: contains ashaar-misra--sadr');
  ok(html.indexOf('ashaar-misra--ajuz') !== -1, 'render: contains ashaar-misra--ajuz');
  ok(html.indexOf('ashaar-gap') !== -1,    'render: contains ashaar-gap');
}());

(function testRenderedSoloMisra() {
  var html = render('solo line');
  ok(html.indexOf('ashaar-bayt--solo') !== -1,   'render solo: ashaar-bayt--solo class');
  ok(html.indexOf('ashaar-misra--solo') !== -1,  'render solo: ashaar-misra--solo class');
  ok(html.indexOf('ashaar-misra--sadr') === -1,  'render solo: no sadr class');
}());

(function testRenderedRefrain() {
  var html = render('sadr \\ ajuz %');
  ok(html.indexOf('ashaar-misra--refrain') !== -1, 'render: refrain class present');
  ok(html.indexOf('ashaar-bayt--refrain')  !== -1, 'render: bayt-level refrain class');
}());

(function testXssEscaping() {
  var html = render('<script> \\ </script>');
  ok(html.indexOf('<script>') === -1,     'XSS: < is escaped');
  ok(html.indexOf('&lt;script&gt;') !== -1, 'XSS: entities present in output');
}());

(function testAmpersandEscaping() {
  var html = render('a & b \\ c & d');
  ok(html.indexOf('&amp;') !== -1, 'ampersand is escaped');
  ok(html.indexOf(' & ') === -1,   'raw ampersand not in output');
}());

(function testStanzaTypeClasses() {
  eq(render('a \\ b').match(/ashaar-stanza--bayt/)    ? 'yes' : 'no', 'yes', 'one bayt → stanza--bayt');
  ok(render('a \\ b\nc \\ d').indexOf('ashaar-stanza--rubaei') !== -1,
     'two bayts → stanza--rubaei');
  ok(render('a \\ b\nc \\ d\ne \\ f').indexOf('ashaar-stanza--sudaisi') !== -1,
     'three bayts → stanza--sudaisi');
  ok(render('a \\ b\nc \\ d\ne \\ f\ng \\ h').indexOf('ashaar-stanza--multi') !== -1,
     'four bayts → stanza--multi');
}());

// ── 6. Edge cases ─────────────────────────────────────────────────────────────

diag('6. Edge cases');

(function testLeadingTrailingWhitespace() {
  var poems = parse('  sadr \\ ajuz  ');
  eq(allBayts(poems)[0].sadr, 'sadr', 'leading/trailing whitespace stripped from sadr');
  eq(allBayts(poems)[0].ajuz, 'ajuz', 'leading/trailing whitespace stripped from ajuz');
}());

(function testMultipleSeparatorsOnOneLine() {
  // Three parts → one bayt + one solo misra (odd leftover)
  var poems = parse('a \\ b \\ c');
  var bayts = allBayts(poems);
  eq(bayts[0].sadr, 'a', 'first pair sadr');
  eq(bayts[0].ajuz, 'b', 'first pair ajuz');
  eq(bayts[1].sadr, 'c', 'odd leftover becomes solo');
  ok(bayts[1].ajuz === null, 'odd leftover has no ajuz');
}());

(function testPoemSeparatorWithWhitespace() {
  var poems = parse('a \\ b\n  ---  \nc \\ d');
  eq(poems.length, 2, '--- with surrounding spaces still splits poems');
}());

(function testRealArabicText() {
  var text = 'قِفَا نَبْكِ مِنْ ذِكْرَى حَبِيبٍ وَمَنْزِلِ \\ بِسِقْطِ اللِّوَى بَيْنَ الدَّخُولِ فَحَوْمَلِ';
  var poems = parse(text);
  var b = allBayts(poems)[0];
  eq(b.sadr, 'قِفَا نَبْكِ مِنْ ذِكْرَى حَبِيبٍ وَمَنْزِلِ', 'Arabic sadr preserved');
  eq(b.ajuz, 'بِسِقْطِ اللِّوَى بَيْنَ الدَّخُولِ فَحَوْمَلِ', 'Arabic ajuz preserved');
}());

(function testRealPersianText() {
  var text = 'بشنو این نی چون حکایت می‌کند \\ از جدایی‌ها شکایت می‌کند';
  var poems = parse(text);
  var b = allBayts(poems)[0];
  eq(b.sadr, 'بشنو این نی چون حکایت می‌کند', 'Persian sadr preserved');
}());

(function testRealUrduText() {
  var text = 'ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے \\ بہت نکلے مرے ارمان لیکن پھر بھی کم نکلے';
  var poems = parse(text);
  var b = allBayts(poems)[0];
  eq(b.sadr, 'ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے', 'Urdu sadr preserved');
}());

// ── Done ────────────────────────────────────────────────────────────────────

finish();
