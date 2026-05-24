/**
 * test/fonts.js — Font definitions for ashaar.js visual testing
 *
 * Covers five classical Arabic calligraphic styles plus the custom
 * FatemiMaqala font. All open-source fonts use SIL OFL 1.1.
 *
 * Diwani note: No production-quality open-source Diwani font exists
 * as of 2026. The entry below uses Rakkas (decorative display Arabic,
 * OFL) as the closest freely available substitute and documents the gap.
 *
 * Font loading: all Google Fonts entries use the CSS API; FatemiMaqala
 * is loaded from test/fonts/ (caller must supply the file).
 */

var FONTS = [

  // ── Naskh ──────────────────────────────────────────────────────────────
  // Traditional Arabic manuscript and print style. The default choice for
  // body-sized Arabic/Persian text on the web.

  {
    id:          'amiri',
    family:      'Amiri',
    cssName:     '"Amiri", serif',
    style:       'naskh',
    scripts:     ['arabic', 'persian', 'urdu'],
    weights:     ['400', '700'],
    designer:    'Khaled Hosny',
    license:     'SIL OFL 1.1',
    source:      'https://github.com/aliftype/amiri',
    googleFonts: 'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap',
    notes:       'High-quality Naskh with extensive kashida/tatweel GSUB support. ' +
                 'Recommended for Arabic poetry. Contains full tashkeel coverage.',
    probeExpected: { tierQualityMin: { 12: 0.55 } }, // Seen/Sad should score well
  },

  {
    id:          'scheherazade-new',
    family:      'Scheherazade New',
    cssName:     '"Scheherazade New", serif',
    style:       'naskh',
    scripts:     ['arabic', 'persian'],
    weights:     ['400', '700'],
    designer:    'SIL International',
    license:     'SIL OFL 1.1',
    source:      'https://github.com/silnrsi/font-scheherazade',
    googleFonts: 'https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&display=swap',
    notes:       'SIL\'s flagship Arabic font. Excellent OpenType justification table (jstf). ' +
                 'Covers rare Unicode Arabic characters and Qurʾānic marks.',
  },

  {
    id:          'noto-naskh',
    family:      'Noto Naskh Arabic',
    cssName:     '"Noto Naskh Arabic", serif',
    style:       'naskh',
    scripts:     ['arabic', 'persian'],
    weights:     ['400', '700'],
    designer:    'Google / Monotype',
    license:     'SIL OFL 1.1',
    source:      'https://github.com/notofonts/arabic',
    googleFonts: 'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap',
    notes:       'Google Noto pan-Unicode Naskh. Good fallback coverage; fewer ' +
                 'calligraphic refinements than Amiri but broader character support.',
  },

  // ── Nastaliq ───────────────────────────────────────────────────────────
  // Persian/Urdu hanging cursive style. Diagonal baseline; complex
  // stacking ligatures. Requires larger line-height.

  {
    id:          'noto-nastaliq-urdu',
    family:      'Noto Nastaliq Urdu',
    cssName:     '"Noto Nastaliq Urdu", serif',
    style:       'nastaliq',
    scripts:     ['urdu', 'persian'],
    weights:     ['400', '700'],
    designer:    'Google / Monotype',
    license:     'SIL OFL 1.1',
    source:      'https://github.com/notofonts/nastaliq-urdu',
    googleFonts: 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400..700&display=swap',
    cssOverrides: { lineHeight: '3.5', fontSize: '1.2rem' },
    notes:       'The primary open-source Nastaliq font. The diagonal baseline means ' +
                 'kashida justification interacts differently with ascenders/descenders — ' +
                 'calibrate separately from Naskh fonts.',
  },

  {
    id:          'mirza',
    family:      'Mirza',
    cssName:     '"Mirza", serif',
    style:       'nastaliq',  // Nastaliq-influenced; formal name is "Indo-Persian"
    scripts:     ['urdu', 'persian', 'arabic'],
    weights:     ['400', '700'],
    designer:    'Khaled Hosny',
    license:     'SIL OFL 1.1',
    source:      'https://github.com/aliftype/mirza',
    googleFonts: 'https://fonts.googleapis.com/css2?family=Mirza:wght@400;700&display=swap',
    notes:       'A Nastaliq-influenced bookhand; simpler than full Nastaliq, ' +
                 'suitable for shorter display contexts. Works across Arabic/Persian/Urdu.',
  },

  // ── Ruqaa ──────────────────────────────────────────────────────────────
  // Simplified, fast-written connected style. Minimal stroke variation;
  // frequent ligature simplification. Common in handwriting and signage.

  {
    id:          'aref-ruqaa',
    family:      'Aref Ruqaa',
    cssName:     '"Aref Ruqaa", serif',
    style:       'ruqaa',
    scripts:     ['arabic', 'persian', 'urdu'],
    weights:     ['400', '700'],
    designer:    'Abdullah Aref & Khaled Hosny',
    license:     'SIL OFL 1.1',
    source:      'https://github.com/aliftype/aref-ruqaa',
    googleFonts: 'https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&display=swap',
    notes:       'Purpose-built Ruqaa font with characteristic simplified letterforms. ' +
                 'Also available as "Aref Ruqaa Ink" with rougher texture variant.',
  },

  // ── Diwani ─────────────────────────────────────────────────────────────
  // Ottoman Chancery style; highly ornate with extended ascenders and
  // characteristic Hamza flourishes above the baseline.
  //
  // ⚠ OPEN-SOURCE GAP: No true production-quality Diwani font exists under
  // a permissive licence as of 2026. Rakkas is used here as the closest
  // available alternative (decorative Arabic display, OFL 1.1). Authentic
  // Diwani requires a commercial licence from Boutros Fonts or DecoType.

  {
    id:          'rakkas',
    family:      'Rakkas',
    cssName:     '"Rakkas", serif',
    style:       'diwani',
    scripts:     ['arabic'],
    weights:     ['400'],
    designer:    'Zeynep Akay',
    license:     'SIL OFL 1.1',
    source:      'https://github.com/koopajah/Rakkas',
    googleFonts: 'https://fonts.googleapis.com/css2?family=Rakkas&display=swap',
    gap:         true,
    gapNote:     'Rakkas is a decorative display Arabic, not a true Diwani. ' +
                 'It is used here as the best available open-source substitute. ' +
                 'For authentic Diwani, consider: Boutros Diwani (commercial), ' +
                 'DecoType Naskh (commercial), or Winsoft Diwani (commercial).',
    notes:       'Display-weight only; suited to titles and headers, not body text. ' +
                 'Justification calibration not recommended at body sizes.',
    cssOverrides: { fontSize: '1.6rem' },
  },

  // ── Thuluth ────────────────────────────────────────────────────────────
  // Large classical monumental Arabic; elongated ascenders and extended
  // horizontal strokes. Traditionally used for architecture, manuscripts,
  // and Qurʾānic headings. Kashida is native to the style.

  {
    id:          'reem-kufi-ink',
    family:      'Reem Kufi Ink',
    cssName:     '"Reem Kufi Ink", serif',
    style:       'thuluth',   // Kufi/Thuluth blend; geometric proportions
    scripts:     ['arabic'],
    weights:     ['400'],
    designer:    'Pascal Zoghbi / 29Letters',
    license:     'SIL OFL 1.1',
    source:      'https://github.com/29letters/Reem-Kufi',
    googleFonts: 'https://fonts.googleapis.com/css2?family=Reem+Kufi+Ink&display=swap',
    gap:         false,
    notes:       'Reem Kufi Ink sits between Kufic and Thuluth in proportions. ' +
                 'Use at display sizes (≥ 2rem). A pure open-source Thuluth ' +
                 'remains uncommon; Layla Thuluth (fontlibrary.org, OFL) is an ' +
                 'alternative but requires self-hosting.',
    cssOverrides: { fontSize: '1.8rem', lineHeight: '2.8' },
  },

  // ── FatemiMaqala ──────────────────────────────────────────────────────
  // User's custom font — expects file at test/fonts/FatemiMaqala.woff2
  // (or .ttf). Style classification and probe results will be determined
  // by the calibration run.

  {
    id:          'fatemi-maqala',
    family:      'FatemiMaqala',
    cssName:     '"FatemiMaqala", "Amiri", serif',  // Amiri fallback
    style:       'custom',
    scripts:     ['arabic', 'persian', 'urdu'],
    weights:     ['400'],
    designer:    'local / user-supplied',
    license:     'user-supplied',
    source:      'local',
    localFile:   'test/fonts/FatemiMaqala.woff2',   // caller must supply
    googleFonts: null,
    notes:       'User-supplied font. Calibrate with AshaarTune.probeFont() and ' +
                 'AshaarTune.calibrate() to generate a baked recipe. The file must ' +
                 'be served from the same origin or with CORS headers.',
    cssOverrides: {},
  },

];

// ── Helpers ────────────────────────────────────────────────────────────────

var FONTS_BY_STYLE = FONTS.reduce(function (acc, f) {
  (acc[f.style] = acc[f.style] || []).push(f);
  return acc;
}, {});

var FONTS_BY_ID = FONTS.reduce(function (acc, f) { acc[f.id] = f; return acc; }, {});

/** Build a <style> block loading all Google-hosted fonts. */
function buildGoogleFontsStyle() {
  var urls = FONTS
    .filter(function (f) { return f.googleFonts; })
    .map(function (f) { return f.googleFonts; });
  return urls.map(function (u) { return '@import url("' + u + '");'; }).join('\n');
}

/** Build a @font-face block for a local font file. */
function buildLocalFontFace(font) {
  if (!font.localFile) return '';
  var ext  = font.localFile.split('.').pop();
  var fmt  = ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : 'truetype';
  return '@font-face {\n' +
    '  font-family: "' + font.family + '";\n' +
    '  src: url("../' + font.localFile + '") format("' + fmt + '");\n' +
    '  font-weight: 400;\n' +
    '  font-style: normal;\n' +
    '}';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FONTS: FONTS,
    FONTS_BY_STYLE: FONTS_BY_STYLE,
    FONTS_BY_ID: FONTS_BY_ID,
    buildGoogleFontsStyle: buildGoogleFontsStyle,
    buildLocalFontFace: buildLocalFontFace,
  };
}
