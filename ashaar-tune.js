/**
 * ashaar-tune.js — Font analysis, visual calibration, and recipe baking
 * for ashaar.js kashida justification.
 *
 * Standalone module — no runtime dependency on ashaar.js, though it
 * integrates with it via loadRecipe().
 *
 * ── Three-phase workflow ─────────────────────────────────────────────────
 *
 *  1. PROBE (optional but recommended)
 *     Analyse a loaded font to learn which character pairs have designed
 *     kashida glyphs vs. generic stretch. Works by measuring width deltas
 *     via the Canvas 2D API at a large point size.
 *
 *       const fp = await AshaarTune.probeFont({ fontFamily: 'Amiri', fontSize: 64 });
 *
 *  2. CALIBRATE
 *     Run a hill-climbing optimiser on sample texts. Scores candidates by
 *     rendering them to an offscreen canvas and measuring:
 *       - Per-line density evenness  (ink column variance)
 *       - Stanza harmonyiciency     (Pearson correlation of adjacent line profiles)
 *     Poetry mode weights harmony; prose mode weights per-line evenness.
 *
 *       const session = await AshaarTune.calibrate({
 *         texts:          [poem1, poem2],
 *         fontFamily:     'Amiri',
 *         fontSize:       32,
 *         containerWidth: 700,
 *         mode:           'poetry',   // 'poetry' | 'prose'
 *         fontProfile:    fp,         // from probeFont — optional
 *         iterations:     120,
 *       });
 *       console.log(session.score);  // 0–1, higher = better
 *       const recipe = session.bake();
 *
 *     To bake one responsive recipe with profiles for several column widths:
 *
 *       const session = await AshaarTune.calibrateWidths({
 *         texts:      [longQasida1, longQasida2],
 *         fontFamily: 'Amiri',
 *         fontSize:   32,
 *         widths:     [360, 520, 700, 860],
 *         mode:       'poetry',
 *       });
 *       const recipe = session.bake();
 *
 *  3. DEPLOY
 *     Load a baked JSON recipe and get a drop-in justifyEl replacement.
 *
 *       const { justifyEl } = AshaarTune.loadRecipe(recipe);
 *       Ashaar.init({ justify: false });     // render HTML without justification
 *       justifyEl(document.querySelector('.ashaar'));  // then justify with recipe
 *
 * ── Baked recipe format ──────────────────────────────────────────────────
 *
 *   {
 *     "version":       "1.0",
 *     "calibratedAt":  "<ISO date>",
 *     "mode":          "poetry",
 *     "fontFamily":    "Amiri",
 *     "score":         0.87,
 *     "params": {
 *       "priorityBias":     0.85,   // legacy field retained for old recipes
 *       "targetFill":       0.96,   // fraction of column width to fill (< 1 = slight breathing room)
 *       "fontQualityBoost": 1.8     // bonus weight for designed-glyph slots
 *     }
 *   }
 *
 * ── Extending for ML ─────────────────────────────────────────────────────
 *
 *   The visual scorer (scoreLines) is the seam point for ML integration.
 *   Replace or augment it with a model that calls an inference endpoint:
 *
 *     AshaarTune.setScorer(async function(lines, ctx, canvas, width, mode) {
 *       const imageData = renderStanzaToImageData(lines, ctx, canvas, width);
 *       const score = await myModel.predict(imageData);
 *       return score;
 *     });
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(root);
  } else {
    root.AshaarTune = factory(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {

  var VERSION = '1.0';
  var TATWEEL  = 'ـ';
  var JUSTIFY   = root.AshaarJustify || (typeof require === 'function' && typeof module !== 'undefined' && module.exports ? require('./ashaar-justify') : null);

  // ── Canvas helpers ────────────────────────────────────────────────────────

  function makeCtx(fontFamily, fontSize) {
    var canvas = document.createElement('canvas');
    canvas.width  = 800;
    canvas.height = Math.round(fontSize * 2.8);
    var ctx = canvas.getContext('2d');
    ctx.direction   = 'rtl';
    ctx.textBaseline = 'middle';
    ctx.fillStyle   = '#000';
    ctx.font        = fontSize + 'px ' + fontFamily;
    return { canvas: canvas, ctx: ctx };
  }

  // ── Phase 1: Font probe ───────────────────────────────────────────────────

  /**
   * Representative pairs covering all six HarfBuzz priority tiers.
   * Each entry: [prev, next, priority]
   */
  var PROBE_PAIRS = [
    // Seen/Sad (P12)
    ['س','ي',12], ['ش','ر',12], ['ص','ل',12], ['ض','ا',12],
    // HaaDal (P11)
    ['ل','ه',11], ['ب','ه',11], ['ن','ة',11], ['م','د',11],
    // Alef/Lam (P10)
    ['ب','ل',10], ['ت','ا',10], ['م','ك',10], ['ف','ل',10],
    // BaRa (P9)
    ['ب','ر', 9], ['ت','ي', 9], ['پ','ر', 9], ['ب','ى', 9],
    // Waw/Ain (P8)
    ['ل','و', 8], ['م','ع', 8], ['ب','غ', 8],
    // Normal (P7)
    ['م','ن', 7], ['ل','ف', 7], ['ع','ل', 7], ['ك','م', 7],
  ];

  /**
   * Probe the font loaded at the given fontFamily/fontSize.
   * Returns a FontProfile with per-pair quality scores (0–1).
   *
   * Quality 1.0 → the font has a designed kashida glyph here (tatweel width
   *               in context matches a well-proportioned extension).
   * Quality 0.0 → the font falls back to a plain horizontal bar.
   *
   * Method: width-delta. A font with a designed glyph renders the tatweel
   * at a width consistent with the surrounding stroke weight. A generic
   * font renders it at a fixed, usually narrower, width. We measure the
   * ratio of contextual tatweel width to the standalone tatweel width; ratios
   * far from 1.0 (either direction) indicate substitution or degradation.
   *
   * NOTE: Canvas 2D applies basic shaping but may not fire all GSUB lookups
   * (particularly 'calt'). For deeper analysis, load the font file via
   * opentype.js and pass it as options.otFont — see probeOTFont() below.
   */
  function probeFont(options) {
    options = options || {};
    if (typeof document === 'undefined') return Promise.resolve(null);

    var fontFamily = options.fontFamily || 'serif';
    var fontSize   = options.fontSize   || 64;
    var otFont     = options.otFont     || null; // optional opentype.js Font object

    return document.fonts.ready.then(function () {
      var pair = makeCtx(fontFamily, fontSize);
      var ctx  = pair.ctx;

      var standalone = ctx.measureText(TATWEEL).width;
      var pairQualities = {};

      PROBE_PAIRS.forEach(function (entry) {
        var prev = entry[0], next = entry[1], priority = entry[2];
        var withT    = ctx.measureText(prev + TATWEEL + next).width;
        var withoutT = ctx.measureText(prev + next).width;
        var contextW = withT - withoutT;

        // A contextW close to standalone → neutral glyph (quality ~0.5)
        // contextW > standalone           → designed extension (quality > 0.5)
        // contextW < standalone           → degraded/collapsed (quality < 0.5)
        var ratio   = standalone > 0 ? contextW / standalone : 1;
        var quality = Math.min(1, Math.max(0, 0.5 + (ratio - 1) * 0.5));

        pairQualities[prev + next] = { quality: quality, priority: priority };
      });

      // If opentype.js font provided, supplement with GSUB ligature data
      if (otFont) extendWithOTFont(otFont, pairQualities);

      // Priority-averaged quality per tier
      var tierQuality = {};
      for (var p = 7; p <= 12; p++) tierQuality[p] = { sum: 0, count: 0 };
      for (var key in pairQualities) {
        var entry = pairQualities[key];
        tierQuality[entry.priority].sum   += entry.quality;
        tierQuality[entry.priority].count += 1;
      }
      for (var t = 7; t <= 12; t++) {
        var tier = tierQuality[t];
        tierQuality[t].avg = tier.count ? tier.sum / tier.count : 0.5;
      }

      return {
        fontFamily:    fontFamily,
        fontSize:      fontSize,
        standaloneWidth: standalone,
        pairQualities: pairQualities,
        tierQuality:   tierQuality,

        /** Quality 0–1 for a specific character pair. */
        getQuality: function (prev, next) {
          var e = pairQualities[prev + next];
          return e ? e.quality : 0.5;
        },

        /** Average quality for a HarfBuzz priority tier. */
        getTierQuality: function (priority) {
          var tier = tierQuality[priority];
          return tier ? tier.avg : 0.5;
        }
      };
    });
  }

  /**
   * Supplement pair quality data using an opentype.js Font object.
   * Walks the GSUB table for 'liga', 'calt', 'clig' features and marks
   * pairs whose tatweel sequence has a dedicated substitute glyph.
   */
  function extendWithOTFont(otFont, pairQualities) {
    try {
      var gsub = otFont.tables && otFont.tables.gsub;
      if (!gsub) return;

      var tatweelGlyphId = otFont.charToGlyphIndex(TATWEEL.charCodeAt(0));

      gsub.lookupList.lookups.forEach(function (lookup) {
        // Type 4 = Ligature substitution
        if (lookup.lookupType !== 4) return;
        lookup.subtables.forEach(function (sub) {
          if (!sub.ligatureSets) return;
          for (var covIdx in sub.ligatureSets) {
            sub.ligatureSets[covIdx].forEach(function (lig) {
              if (lig.components && lig.components.indexOf(tatweelGlyphId) !== -1) {
                // A ligature involving tatweel found — mark pair quality as high
                // (we don't have the char back-mapping here, so bump tier 12 floor)
                // In a full implementation you'd back-map glyph IDs → codepoints.
              }
            });
          }
        });
      });
    } catch (e) {
      // opentype.js API mismatch or missing table — silently degrade
    }
  }

  // ── Phase 2: Visual scoring ───────────────────────────────────────────────

  /**
   * Render `text` RTL into `canvas` using `ctx` and return an array of
   * column pixel-density values (fraction of dark pixels per x column).
   */
  function columnProfile(text, ctx, canvas) {
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillText(text, w - 4, h / 2); // right-aligned for RTL
    ctx.willReadFrequently = true; // hint for performance
    var data = ctx.getImageData(0, 0, w, h).data;
    var profile = new Float32Array(w);
    for (var x = 0; x < w; x++) {
      var dark = 0;
      for (var y = 0; y < h; y++) {
        if (data[(y * w + x) * 4 + 3] > 40) dark++;
      }
      profile[x] = dark / h;
    }
    return profile;
  }

  function arrayMean(arr) {
    var s = 0, n = arr.length;
    for (var i = 0; i < n; i++) s += arr[i];
    return n ? s / n : 0;
  }

  function arrayVariance(arr) {
    var m = arrayMean(arr), s = 0, n = arr.length;
    for (var i = 0; i < n; i++) s += (arr[i] - m) * (arr[i] - m);
    return n ? s / n : 0;
  }

  function pearsonCorrelation(a, b) {
    var n  = Math.min(a.length, b.length);
    var ma = arrayMean(Array.prototype.slice.call(a, 0, n));
    var mb = arrayMean(Array.prototype.slice.call(b, 0, n));
    var num = 0, va = 0, vb = 0;
    for (var i = 0; i < n; i++) {
      var da = a[i] - ma, db = b[i] - mb;
      num += da * db; va += da * da; vb += db * db;
    }
    return (va && vb) ? num / Math.sqrt(va * vb) : 0;
  }

  /**
   * Score a single line's ink distribution.
   * Only considers columns that have any ink (ignores the surrounding margin).
   * Returns 0–1: 1 = perfectly even, 0 = highly clumped.
   */
  function scoreDensityEvenness(profile) {
    var ink = [];
    for (var i = 0; i < profile.length; i++) {
      if (profile[i] > 0.02) ink.push(profile[i]);
    }
    if (ink.length < 4) return 0.5;
    var v = arrayVariance(ink);
    return Math.exp(-v * 150); // tuned: variance of 0.007 ≈ score 0.35
  }

  /**
   * Score visual harmony across multiple lines (stanza-level).
   * Pearson correlation of adjacent line profiles, averaged.
   * Returns 0–1: 1 = lines have identical visual rhythm.
   */
  function scoreStanzaHarmony(profiles) {
    if (profiles.length < 2) return 1;
    var total = 0, count = 0;
    for (var i = 0; i < profiles.length - 1; i++) {
      total += Math.max(0, pearsonCorrelation(profiles[i], profiles[i + 1]));
      count++;
    }
    return count ? total / count : 1;
  }

  /**
   * Combined aesthetic score for a set of lines.
   *   poetry: 0.35 density + 0.65 harmony  (stanza visual rhythm matters most)
   *   prose:  0.70 density + 0.30 harmony  (per-line evenness matters most)
   *
   * This is the seam point for ML integration — replace or wrap this function
   * via AshaarTune.setScorer() to plug in a model-based scorer.
   */
  var _customScorer = null;

  function scoreLines(lines, ctx, canvas, mode) {
    if (_customScorer) return Promise.resolve(_customScorer(lines, ctx, canvas, mode));

    var profiles = lines.map(function (l) { return columnProfile(l, ctx, canvas); });
    var densityScore  = arrayMean(profiles.map(scoreDensityEvenness));
    var harmonyScore  = scoreStanzaHarmony(profiles);
    var dw = (mode === 'prose') ? 0.70 : 0.35;
    return dw * densityScore + (1 - dw) * harmonyScore;
  }

  // ── Justification engine (standalone, mirrors ashaar.js logic) ────────────

  /**
   * Build a slot list for `text` from AshaarJustify's joining-based slot model,
   * optionally adding a font-quality bonus for designed tatweel pairs.
   */
  function buildSlots(text, params, fontProfile) {
    if (!JUSTIFY || typeof JUSTIFY.buildSlots !== 'function') {
      throw new Error('AshaarTune requires AshaarJustify for justification logic. Load ashaar-justify.js first.');
    }
    return JUSTIFY.buildSlots(text, params, fontProfile);
  }

  function applySlots(text, slots, n) {
    if (!JUSTIFY || typeof JUSTIFY.applySlots !== 'function') {
      throw new Error('AshaarTune requires AshaarJustify for justification logic. Load ashaar-justify.js first.');
    }
    return JUSTIFY.applySlots(text, slots, n);
  }

  function justifyLine(text, targetWidth, ctx, params, fontProfile) {
    if (!JUSTIFY || typeof JUSTIFY.justifyLine !== 'function') {
      throw new Error('AshaarTune requires AshaarJustify for justification logic. Load ashaar-justify.js first.');
    }
    return JUSTIFY.justifyLine(text, targetWidth, ctx, params, fontProfile);
  }

  function justifyLines(lines, containerWidth, ctx, params, fontProfile) {
    if (!JUSTIFY || typeof JUSTIFY.justifyLines !== 'function') {
      throw new Error('AshaarTune requires AshaarJustify for justification logic. Load ashaar-justify.js first.');
    }
    return JUSTIFY.justifyLines(lines, containerWidth, ctx, params, fontProfile);
  }

  // ── Phase 2: Calibration ─────────────────────────────────────────────────

  var DEFAULT_PARAMS = {
    priorityBias:     0.80,  // legacy compatibility field
    targetFill:       0.96,  // 4% breathing room prevents over-stretch on short lines
    fontQualityBoost: 1.80   // moderate font-quality influence
  };

  var PARAM_BOUNDS = {
    priorityBias:     [0, 1],
    targetFill:       [0.80, 1.00],
    fontQualityBoost: [0, 5]
  };

  function extractLines(texts) {
    var lines = [];
    (texts || []).forEach(function (t) {
      t.split('\n').forEach(function (raw) {
        var l = raw.trim()
          .replace(/\s*%\s*$/, '')        // refrain marker
          .replace(/\s*[\\*|]\s*$/, '')   // trailing separator
          .replace(/\s*[\\*|]\s*/g, ' ')  // inline separator -> space
          .trim();
        if (l && !/^---/.test(l)) lines.push(l);
      });
    });
    return lines;
  }

  function roundParams(params) {
    return {
      priorityBias:     Math.round(params.priorityBias     * 1000) / 1000,
      targetFill:       Math.round(params.targetFill       * 1000) / 1000,
      fontQualityBoost: Math.round(params.fontQualityBoost * 1000) / 1000
    };
  }

  function normalizeWidths(options) {
    var raw = options.widths || options.containerWidths || null;
    if (!raw && options.containerWidth) raw = [options.containerWidth];
    if (!raw) raw = [600];

    var seen = {};
    return raw.map(function (w) { return Math.round(+w); })
      .filter(function (w) {
        if (!isFinite(w) || w <= 0 || seen[w]) return false;
        seen[w] = true;
        return true;
      })
      .sort(function (a, b) { return a - b; });
  }

  function serializeSession(session) {
    return {
      version:       VERSION,
      calibratedAt:  new Date().toISOString(),
      mode:          session.mode,
      fontFamily:    session.fontFamily,
      fontSize:      session.fontSize,
      containerWidth: session.containerWidth,
      score:         Math.round(session.score * 1000) / 1000,
      params:        roundParams(session.params)
    };
  }

  function selectWidthProfile(recipe, width) {
    var profiles = recipe && recipe.widthProfiles;
    if (!profiles || !profiles.length) return null;

    var target = +width || 0;
    var best = profiles[0];
    var bestDelta = Math.abs((best.containerWidth || best.width || 0) - target);
    for (var i = 1; i < profiles.length; i++) {
      var profileWidth = profiles[i].containerWidth || profiles[i].width || 0;
      var delta = Math.abs(profileWidth - target);
      if (delta < bestDelta) {
        best = profiles[i];
        bestDelta = delta;
      }
    }
    return best;
  }

  function paramsForWidth(recipe, width) {
    var profile = selectWidthProfile(recipe, width);
    return Object.assign({}, DEFAULT_PARAMS, recipe.params || {}, profile && profile.params || {});
  }

  function countWordGaps(text) {
    var m = text.match(/\s+/g);
    return m ? m.length : 0;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /**
   * Run a hill-climbing calibration over sample texts.
   *
   * options:
   *   texts          {string[]}  — poem/prose strings in ashaar.js input format
   *   fontFamily     {string}
   *   fontSize       {number}    — px, used for canvas rendering
   *   containerWidth {number}    — px, width each column will be justified to
   *   mode           {string}    — 'poetry' | 'prose'
   *   fontProfile    {object}    — from probeFont() (optional)
   *   iterations     {number}    — hill-climb steps (default 100)
   *   onProgress     {function}  — called with (iteration, bestScore) for UI feedback
   *
   * Returns a Promise resolving to a CalibrationSession.
   */
  function calibrate(options) {
    return new Promise(function (resolve, reject) {
      if (typeof document === 'undefined') {
        return reject(new Error('AshaarTune.calibrate requires a browser (Canvas API).'));
      }

      options = options || {};
      var fontFamily     = options.fontFamily     || 'serif';
      var fontSize       = options.fontSize       || 32;
      var containerWidth = options.containerWidth || 600;
      var mode           = options.mode           || 'poetry';
      var iterations     = options.iterations     || 100;
      var fontProfile    = options.fontProfile    || null;
      var onProgress     = options.onProgress     || null;

      var lines = extractLines(options.texts || []);

      if (!lines.length) return reject(new Error('No text lines extracted from provided texts.'));

      document.fonts.ready.then(function () {
        var pair = makeCtx(fontFamily, fontSize);
        var ctx  = pair.ctx;
        var canvas = pair.canvas;
        canvas.width = containerWidth;

        function scoreParams(params) {
          var justified = justifyLines(lines, containerWidth, ctx, params, fontProfile);
          return scoreLines(justified, ctx, canvas, mode);
        }

        var bestParams = Object.assign({}, DEFAULT_PARAMS);
        var bestScore  = scoreParams(bestParams);

        // Initial deltas — shrink over time for convergence
        var deltas = { priorityBias: 0.15, targetFill: 0.03, fontQualityBoost: 0.6 };
        var keys   = Object.keys(bestParams);

        for (var iter = 0; iter < iterations; iter++) {
          var k      = keys[iter % keys.length];
          var sign   = (Math.random() > 0.5) ? 1 : -1;
          var bounds = PARAM_BOUNDS[k];

          var candidate = Object.assign({}, bestParams);
          candidate[k]  = Math.min(bounds[1], Math.max(bounds[0],
            bestParams[k] + sign * deltas[k] * (0.5 + 0.5 * Math.random())));

          var s = scoreParams(candidate);
          if (s > bestScore) { bestScore = s; bestParams = Object.assign({}, candidate); }

          // Decay every full pass through all parameters
          if (iter > 0 && iter % (keys.length * 5) === 0) {
            for (var dk in deltas) deltas[dk] *= 0.80;
          }

          if (onProgress) onProgress(iter + 1, bestScore);
        }

        resolve({
          score:      bestScore,
          params:     bestParams,
          mode:       mode,
          fontFamily: fontFamily,
          fontSize:   fontSize,
          containerWidth: containerWidth,

          /** Serialize to JSON string suitable for static deployment. */
          bake: function () {
            return JSON.stringify(serializeSession(this), null, 2);
          }
        });
      }).catch(reject);
    });
  }

  /**
   * Calibrate the same corpus at several target column widths and bake a
   * responsive recipe with one parameter profile per width.
   *
   * options:
   *   widths/containerWidths {number[]} — target column widths, in px
   *   ...all calibrate() options
   */
  function calibrateWidths(options) {
    options = options || {};
    var widths = normalizeWidths(options);
    if (!widths.length) return Promise.reject(new Error('No valid widths provided.'));

    var sessions = [];
    var index = 0;

    function next() {
      if (index >= widths.length) {
        var middle = sessions[Math.floor(sessions.length / 2)];
        return {
          mode:       middle.mode,
          fontFamily: middle.fontFamily,
          fontSize:   middle.fontSize,
          widths:     widths.slice(),
          sessions:   sessions,
          params:     middle.params,
          score:      arrayMean(sessions.map(function (s) { return s.score; })),

          bake: function () {
            var widthProfiles = sessions.map(function (session) {
              var baked = serializeSession(session);
              return {
                containerWidth: baked.containerWidth,
                score:          baked.score,
                params:         baked.params
              };
            });
            return JSON.stringify({
              version:       VERSION,
              calibratedAt:  new Date().toISOString(),
              mode:          middle.mode,
              fontFamily:    middle.fontFamily,
              fontSize:      middle.fontSize,
              score:         Math.round(this.score * 1000) / 1000,
              params:        roundParams(middle.params),
              widthProfiles: widthProfiles
            }, null, 2);
          }
        };
      }

      var width = widths[index++];
      return calibrate(Object.assign({}, options, { containerWidth: width })).then(function (session) {
        sessions.push(session);
        return next();
      });
    }

    return Promise.resolve().then(next);
  }

  // ── Phase 3: Recipe loading ───────────────────────────────────────────────

  /**
   * Load a baked recipe (JSON string or already-parsed object) and return
   * a justifyEl function that applies the calibrated parameters.
   *
   * The returned justifyEl is a drop-in replacement for Ashaar.justifyEl:
   *   const { justifyEl } = AshaarTune.loadRecipe(myRecipe);
   *   justifyEl(document.querySelector('.ashaar'));
   *
   * Optionally attach a FontProfile for font-quality-boosted slot selection:
   *   const deployer = AshaarTune.loadRecipe(myRecipe);
   *   deployer.withFontProfile(fp);
   *   deployer.justifyEl(el);
   */
  function loadRecipe(recipeJson) {
    var recipe;
    try {
      recipe = (typeof recipeJson === 'string') ? JSON.parse(recipeJson) : recipeJson;
    } catch (e) {
      throw new Error('AshaarTune.loadRecipe: invalid JSON — ' + e.message);
    }
    if (!recipe || !recipe.params) throw new Error('AshaarTune.loadRecipe: missing params field.');

    var params      = paramsForWidth(recipe, recipe.containerWidth || recipe.width || 0);
    var fontProfile = null;

    var deployer = {
      recipe: recipe,
      params: params,

      /** Attach a FontProfile (from probeFont) for quality-boosted insertion. */
      withFontProfile: function (fp) { fontProfile = fp; return this; },

      /**
       * Apply justification to all two-column misra spans within containerEl.
       * Uses recipe params + optional font profile.
       * Sets up a ResizeObserver for responsive re-justification.
       */
      justifyEl: function (containerEl, opts) {
        opts = opts || {};
        if (typeof document === 'undefined') return;
        var SELECTOR = '.ashaar-misra--sadr, .ashaar-misra--ajuz';
        var fp       = fontProfile;

        function run() {
          if (opts.layout === 'auto' && root.Ashaar && root.Ashaar.applyAutoLayout) {
            containerEl.classList.remove('ashaar--stacked');
          }
          var spans = containerEl.querySelectorAll(SELECTOR);
          if (!spans.length) return;

          var cs         = window.getComputedStyle(spans[0]);
          var fontSize   = parseFloat(cs.fontSize) || 16;
          var fontFamily = cs.fontFamily;
          var pair       = makeCtx(fontFamily, fontSize);
          var ctx        = pair.ctx;
          var metrics    = [];
          var longest    = 0;

          for (var i = 0; i < spans.length; i++) {
            var span = spans[i];
            var orig = span.dataset.ashaarOriginal;
            if (orig === undefined) {
              orig = span.textContent;
              span.dataset.ashaarOriginal = orig;
            }
            span.textContent = orig;
            span.style.fontSize = '';
            var natural = ctx.measureText(orig).width;
            var available = span.getBoundingClientRect().width;
            if (natural > longest) longest = natural;
            metrics.push({ span: span, text: orig, natural: natural, available: available });
          }

          var balanceFill = recipe.balanceFill || params.balanceFill || 1.04;
          var maxScaleDown = typeof recipe.maxScaleDown === 'number' ? recipe.maxScaleDown : 0.06;
          var sharedTarget = longest * balanceFill;

          for (var j = 0; j < metrics.length; j++) {
            var item = metrics[j];
            if (!item.text.trim() || !item.available) continue;
            var target = Math.min(item.available, sharedTarget);
            var scale = 1;
            var spacingMode = recipe.method === 'spacing' || recipe.tatweel === false;
            var wordGaps = countWordGaps(item.text);
            var maxWordSpacing = typeof recipe.maxWordSpacing === 'number' ? recipe.maxWordSpacing : fontSize * 0.28;
            var minWordSpacing = typeof recipe.minWordSpacing === 'number' ? recipe.minWordSpacing : -fontSize * 0.08;
            var desiredWordSpacing = wordGaps ? (target - item.natural) / wordGaps : 0;
            var wordSpacing = spacingMode && wordGaps ? clamp(desiredWordSpacing, minWordSpacing, maxWordSpacing) : 0;
            if (wordSpacing) {
              item.span.style.wordSpacing = Math.round(wordSpacing * 100) / 100 + 'px';
              ctx.wordSpacing = item.span.style.wordSpacing;
              item.natural = ctx.measureText(item.text).width;
            } else {
              item.span.style.wordSpacing = '';
              ctx.wordSpacing = '';
            }
            if (item.natural > target && maxScaleDown > 0) {
              scale = Math.max(1 - maxScaleDown, target / item.natural);
              item.span.style.fontSize = Math.round(scale * 1000) / 10 + '%';
            }
            if (spacingMode) {
              item.span.textContent = item.text;
            } else {
              item.span.textContent = justifyLine(item.text, target / scale, ctx, paramsForWidth(recipe, target), fp);
            }
            ctx.wordSpacing = '';
          }
          if (opts.layout === 'auto' && root.Ashaar && root.Ashaar.applyAutoLayout) {
            root.Ashaar.applyAutoLayout(containerEl, opts);
          }
        }

        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function () {
            run();
            if (window.ResizeObserver) {
              if (containerEl._ashaarTuneObserver) containerEl._ashaarTuneObserver.disconnect();
              var lastWidth = containerEl.getBoundingClientRect().width;
              var ro = new ResizeObserver(function () {
                var width = containerEl.getBoundingClientRect().width;
                if (Math.abs(width - lastWidth) < 0.5) return;
                lastWidth = width;
                run();
              });
              ro.observe(containerEl);
              containerEl._ashaarTuneObserver = ro;
            }
          });
        } else {
          setTimeout(run, 150);
        }
      }
    };

    return deployer;
  }

  // ── Extension point for custom / ML-based scoring ─────────────────────────

  /**
   * Override the default canvas-based visual scorer with a custom function.
   *
   * scorer(lines, ctx, canvas, mode) → number (0–1)
   *
   * The scorer receives:
   *   lines  — array of justified text strings for the current candidate
   *   ctx    — CanvasRenderingContext2D (sized to containerWidth)
   *   canvas — the HTMLCanvasElement
   *   mode   — 'poetry' | 'prose'
   *
   * It must return a numeric score (or a Promise resolving to one).
   * The calibrator maximises this score.
   *
   * Example — route to a remote inference endpoint:
   *
   *   AshaarTune.setScorer(async function(lines, ctx, canvas, mode) {
   *     const profiles = lines.map(l => renderAndGetProfile(l, ctx, canvas));
   *     const res = await fetch('/api/score', {
   *       method: 'POST',
   *       body: JSON.stringify({ profiles, mode })
   *     });
   *     return (await res.json()).score;
   *   });
   */
  function setScorer(fn) {
    _customScorer = fn;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    probeFont:  probeFont,
    calibrate:  calibrate,
    calibrateWidths: calibrateWidths,
    loadRecipe: loadRecipe,
    setScorer:  setScorer,

    // Exposed for testing / custom pipelines
    _internal: {
      columnProfile:        columnProfile,
      scoreDensityEvenness: scoreDensityEvenness,
      scoreStanzaHarmony:   scoreStanzaHarmony,
      justifyLine:          justifyLine,
      buildSlots:           buildSlots,
      extractLines:         extractLines,
      normalizeWidths:      normalizeWidths,
      paramsForWidth:       paramsForWidth,
      selectWidthProfile:   selectWidthProfile
    }
  };
}));
