# Ashaar.js

A lightweight JavaScript library for typesetting Arabic, Urdu, and Persian poetry in HTML. Handles RTL two-column layout, stanza structure, refrain colouring, and optional kashida justification — with no dependencies.

---

## Input format

```
sadr \ ajuz               inline bayt (backslash separator)
sadr * ajuz               inline bayt (asterisk separator)
sadr \                    trailing backslash — pairs with the next line
ajuz

bare line                 solo misra — full-width, centred, never auto-paired

                          blank line → stanza boundary
---                       poem boundary
line %                    refrain marker (whole line)
sadr \ %                  only the sadr is a refrain (pairs with next line)
```

---

## Quick start

### Browser (script tag)

```html
<link rel="stylesheet" href="stylesheet.css">

<div class="ashaar" data-ashaar>
قِفَا نَبْكِ مِنْ ذِكْرَى حَبِيبٍ وَمَنْزِلِ \ بِسِقْطِ اللِّوَى بَيْنَ الدَّخُولِ فَحَوْمَلِ
</div>

<script src="ashaar.js"></script>
<script>Ashaar.init();</script>
```

### Node / CommonJS

```js
const Ashaar = require('./ashaar.js');
const html = Ashaar.renderText(poemString);
```

---

## Use case examples

### 1. Single bayt — inline separator

Both hemistiches on one line, divided by `\`. Rendered as a two-column RTL row (sadr on the right, ajuz on the left).

```
قِفَا نَبْكِ مِنْ ذِكْرَى حَبِيبٍ وَمَنْزِلِ \ بِسِقْطِ اللِّوَى بَيْنَ الدَّخُولِ فَحَوْمَلِ
```

---

### 2. Rubaʿī — quatrain

Two bayts in one stanza. Each bayt is an inline `\`-separated line. Rendered as two rows of two columns.

```
بَكَى الْخَطِيبُ عَلَى الْمِنْبَرِ الرَّفِيعِ \ وَنَاحَ الْحَمَامُ فَوْقَ الْغُصُونِ الْبَدِيعِ
وَأَرَّقَنِي شَوْقُهُ فِي السُّرَى \ فَأَدَّانَ الْفَجْرُ بِالنَّفَحَاتِ السَّرِيعِ
```

---

### 3. Trailing-pair misras

Each line ends with `\`, signalling that it should pair with the following line to form a two-column bayt. Useful when source files store one hemistich per line.

```
أَلَا لَيْتَ شِعْرِي هَلْ أَبِيتَنَّ لَيْلَةً \
بِوَادٍ وَحَوْلِي إِذْخِرٌ وَجَلِيلُ
وَهَلْ أَرِدَنَّ يَوْمًا مِيَاهَ مَجَنَّةٍ \
وَهَلْ يَبْدُوَنَّ لِي شَامَةٌ وَطَفِيلُ
```

---

### 4. Solo misra — full-width centred

A bare line (no `\` anywhere) is never auto-paired. It spans the full container width, centred. Good for titles, maqtas, or single-misra lines that stand alone.

```
لِكُلِّ شَيْءٍ إِذَا مَا تَمَّ نُقْصَانُ
فَلَا يُغَرَّ بِطِيبِ الْعَيْشِ إِنْسَانُ
```

Each of these lines renders full-width because neither contains a `\`.

---

### 5. Stanza and poem boundaries

A blank line separates stanzas within one poem. A line containing only `---` starts a new poem entirely (produces a separate `.ashaar-poem` element).

```
بَيْتٌ أَوَّلُ \ وَمِصْرَاعُهُ الثَّانِي

بَيْتٌ ثَانٍ فِي مَقْطَعٍ جَدِيدٍ \ وَمِصْرَاعُهُ الثَّانِي

---

هَذِهِ قَصِيدَةٌ مُسْتَقِلَّةٌ \ تَبْدَأُ بَعْدَ الْفَاصِلِ
```

---

### 6. Refrain — full bayt

Append `%` to mark an entire bayt as a refrain. The line is rendered with `ashaar-misra--refrain` on both hemistiches (red by default, customisable via `--ashaar-refrain-color`).

```
مری آنکھوں کو نم کر دے \ کوئی نغمہ الم کر دے %

حسین ابنِ علی آئے \ محمد کے نبی آئے

مری آنکھوں کو نم کر دے \ کوئی نغمہ الم کر دے %
```

---

### 7. Per-misra refrain — sadr only

Append `%` to a trailing-pair line. Only that hemistich is coloured as a refrain; the partner line it pairs with is not.

```
یاد آتی ہے وہ گھڑی % \
جب تھے ہم ساتھ چلتے ہیں
```

The sadr ("یاد آتی ہے وہ گھڑی") renders in refrain colour; the ajuz ("جب تھے ہم ساتھ چلتے ہیں") renders normally.

---

### 8. Sudaisī — six-line stanza

Three bayts in one stanza. Rendered as three rows of two columns.

```
أَيَا مَنْ يَرُومُ الْعِلْمَ وَالْحِكْمَةَ الرَّشِيدَهْ \ فَقُمْ وَاطْلُبِ الْعِلْمَ وَلَوْ كَانَ فِي بَعِيدَهْ
وَكُنْ لِلْحَقِيقَةِ طَالِبًا فِي كُلِّ حَالِ \ وَلَا تَتْرُكِ الصِّدْقَ فِي الدُّنْيَا وَلَا تُبَالِ
فَمَا ازْدَادَ إِنْسَانٌ إِلَّا بِعَقْلِهِ \ وَيَبْقَى الثَّنَاءُ لِلْمَرْءِ بَعْدَ رَحِيلِهِ
```

---

## Justification

Three modes are available, each opt-in.

### CSS-native (`justify: 'css'`)

Adds `text-align: justify; text-justify: auto` to each hemistich span. Modern browsers (Chrome, Edge) apply kashida automatically for RTL Arabic text.

```js
Ashaar.init({ justify: 'css' });
```

Or add the class directly:

```html
<div class="ashaar ashaar--justify" data-ashaar>…</div>
```

### JS kashida (`justify: 'kashida'` / `justify: true`)

Inserts Unicode U+0640 TATWEEL characters to fill each column to its exact available width. Uses DOM measurement + binary search, so it works regardless of font. A `ResizeObserver` re-runs automatically on container resize.

```js
Ashaar.init({ justify: 'kashida' });

// Or post-process a single element:
Ashaar.justifyEl(document.querySelector('.my-poem'));
```

Insertion follows the classical Arabic calligraphic priority order (from the HarfBuzz `HB_JustificationClass` enum, MIT licence):

| Priority | Rule |
|----------|------|
| Highest | After **Seen/Sad** (س ش ص ض) in medial/initial form |
| ↓ | Before final **Haa/TaaMarbutah** (ه ة) or **Dal/Dhal** (د ذ) |
| ↓ | Before final **Alef** forms or **Lam/Kaf/Gaf** |
| ↓ | After **Beh-group** (ب پ ت ث) before **Ra/Yaa** |
| ↓ | Before **Waw** (و), **Ain** (ع), **Ghayn** (غ) |
| Lowest | After any other dual-joining character |

### No justification (default)

Both `font-feature-settings: "calt" 1, "kern" 1` are always active, which enables kashida-shaped contextual alternates in quality fonts (Amiri, Scheherazade New) without modifying the text.

---

## ashaar-tune.js — Visual calibration and recipe baking

An optional companion module for optimising kashida justification for a
specific font and text corpus. No runtime dependency on ashaar.js.

### Three-phase workflow

**1. Probe** — analyse a loaded font for designed kashida glyphs

```js
// Measures width deltas at large point size to detect designed glyphs vs. generic stretch
const fp = await AshaarTune.probeFont({ fontFamily: 'Amiri', fontSize: 64 });
// fp.getQuality('س', 'ي')    → 0–1 quality score for a specific pair
// fp.getTierQuality(12)      → average quality for the Seen/Sad priority tier
```

**2. Calibrate** — run a hill-climbing optimiser on your text corpus

The optimiser scores candidates by rendering them to an offscreen canvas
and measuring two visual metrics:

- **Density evenness** — variance of ink-column pixel density within a line
- **Stanza harmony** — Pearson correlation of adjacent line profiles (poetry only)

`poetry` mode weights harmony 65 % / density 35 %. `prose` reverses the weighting.

```js
const session = await AshaarTune.calibrate({
  texts:          [poem1, poem2, longProseBlock],
  fontFamily:     'Amiri',
  fontSize:       32,
  containerWidth: 700,        // px — the column width lines will be justified to
  mode:           'poetry',   // 'poetry' | 'prose'
  fontProfile:    fp,         // from probeFont — optional but improves results
  iterations:     120,
  onProgress:     (i, score) => console.log(i, score),
});

console.log(session.score);  // 0–1
const recipe = session.bake();  // JSON string — save to a .json file
```

**3. Deploy** — load a baked recipe for zero-calibration production use

```js
import recipe from './amiri-poetry.recipe.json' assert { type: 'json' };

const deployer = AshaarTune.loadRecipe(recipe);
deployer.withFontProfile(fp);   // optional — attach font profile for quality boost

Ashaar.init();                            // parse & render HTML only, no justification
deployer.justifyEl(document.querySelector('.ashaar'));  // apply baked params
```

### Baked recipe format

```json
{
  "version":      "1.0",
  "calibratedAt": "2026-01-15T10:30:00.000Z",
  "mode":         "poetry",
  "fontFamily":   "Amiri",
  "score":        0.871,
  "params": {
    "priorityBias":     0.852,
    "targetFill":       0.963,
    "fontQualityBoost": 1.740
  }
}
```

| Parameter | Range | Effect |
|-----------|-------|--------|
| `priorityBias` | 0–1 | 0 = ignore HarfBuzz priority order, distribute uniformly; 1 = strict calligraphic order |
| `targetFill` | 0.8–1.0 | Fraction of column width to fill — values below 1.0 leave breathing room on shorter lines |
| `fontQualityBoost` | 0–5 | Extra weight for slots where the font has a designed kashida glyph |

### ML / custom scoring

The visual scorer is replaceable. Wire in a model-based or remote scorer
before calling `calibrate()`:

```js
AshaarTune.setScorer(async function (lines, ctx, canvas, mode) {
  // lines: array of justified text strings for the current candidate
  // ctx / canvas: Canvas 2D context sized to containerWidth — render here if needed
  const response = await fetch('/api/score', {
    method: 'POST',
    body: JSON.stringify({ lines, mode }),
  });
  return (await response.json()).score;  // must return 0–1
});
```

The calibrator maximises whatever this function returns, so the training
objective is fully configurable.

---

## JS API

```js
// Render a plain-text poem string to an HTML string
Ashaar.renderText(str)  →  string

// Process all [data-ashaar] elements (or a custom selector) in place
Ashaar.init(selector?, opts?)
// opts.justify: 'css' | 'kashida' | true | false (default: false)

// Apply kashida justification to one already-rendered container element
Ashaar.justifyEl(containerEl)

// Low-level access
Ashaar.parse(str)          →  poems[]
Ashaar.render(poems[])     →  string
```

---

## CSS custom properties

Override on `.ashaar` (or any ancestor) to theme:

```css
.ashaar {
  --ashaar-font-family:   "Noto Nastaliq Urdu", "Amiri", serif;
  --ashaar-font-size:     1.4rem;
  --ashaar-line-height:   2.4;
  --ashaar-color:         inherit;
  --ashaar-refrain-color: #b00;
  --ashaar-gap-width:     3%;       /* space between the two columns */
  --ashaar-stanza-gap:    1.8em;
  --ashaar-poem-gap:      3em;
}
```

---

## Generated HTML structure

```html
<div class="ashaar-poem">
  <div class="ashaar-stanza ashaar-stanza--rubaei">

    <div class="ashaar-bayt">
      <span class="ashaar-misra ashaar-misra--sadr">…</span>
      <span class="ashaar-gap" aria-hidden="true"></span>
      <span class="ashaar-misra ashaar-misra--ajuz">…</span>
    </div>

    <!-- solo misra -->
    <div class="ashaar-bayt ashaar-bayt--solo">
      <span class="ashaar-misra ashaar-misra--solo">…</span>
    </div>

    <!-- refrain misra -->
    <div class="ashaar-bayt ashaar-bayt--refrain">
      <span class="ashaar-misra ashaar-misra--sadr ashaar-misra--refrain">…</span>
      …
    </div>

  </div>
</div>
```

Stanza modifier classes: `ashaar-stanza--bayt` (1 bayt), `ashaar-stanza--rubaei` (2 bayts), `ashaar-stanza--sudaisi` (3 bayts), `ashaar-stanza--multi` (4+).
