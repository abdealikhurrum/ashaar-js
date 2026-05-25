/**
 * test/tune.test.js — targeted tests for ashaar-tune.js
 */

var AshaarTune = require('../ashaar-tune.js');
var tuneCorpus = require('./tune-corpus.js');

var _n = 0, _pass = 0, _fail = 0, _log = [];

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
  ok(actual === expected, desc);
}

function deepEq(actual, expected, desc) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), desc);
}

function finish() {
  _log.unshift('TAP version 13\n1..' + _n);
  process.stdout.write(_log.join('\n') + '\n');
  process.exit(_fail > 0 ? 1 : 0);
}

var internal = AshaarTune._internal;

(function testTuneCorpusHasAtLeastThirtyBayts() {
  ok(tuneCorpus.TUNE_BAYT_COUNT >= 30, 'tuning corpus contains at least 30 bayts');
}());

(function testTuneCorpusUsesMultipleLongQasidas() {
  eq(tuneCorpus.TUNE_QASIDAS.length, 2, 'tuning corpus contains two qasidas');
  ok(tuneCorpus.TUNE_QASIDAS.every(function (qasida) {
    return qasida.form === 'qasida' && qasida.text.split('\n').length >= 15;
  }), 'each tuning qasida is long enough for calibration');
}());

(function testExtractLinesSplitsBaytsIntoPlainLines() {
  var lines = internal.extractLines(tuneCorpus.TUNE_TEXTS);
  eq(lines.length, tuneCorpus.TUNE_BAYT_COUNT, 'extractLines keeps one calibration line per bayt');
  ok(lines.every(function (line) {
    return line.indexOf('\\') === -1 && line.indexOf('|') === -1 && line.indexOf('*') === -1;
  }), 'extractLines removes ashaar separators');
}());

(function testNormalizeWidthsSortsAndDeduplicates() {
  deepEq(internal.normalizeWidths({ widths: [760, '360', 520, 520, 0, -1, 'bad'] }), [360, 520, 760],
    'normalizeWidths keeps sorted unique positive widths');
}());

(function testParamsForWidthUsesClosestProfile() {
  var recipe = {
    params: { targetFill: 0.9, fontQualityBoost: 1.2 },
    widthProfiles: [
      { containerWidth: 360, params: { targetFill: 0.91 } },
      { containerWidth: 520, params: { targetFill: 0.94 } },
      { containerWidth: 760, params: { targetFill: 0.98 } }
    ]
  };
  eq(internal.paramsForWidth(recipe, 500).targetFill, 0.94, 'paramsForWidth selects the nearest width profile');
  eq(internal.paramsForWidth(recipe, 700).targetFill, 0.98, 'paramsForWidth selects the wider nearest profile when appropriate');
  eq(internal.paramsForWidth(recipe, 500).fontQualityBoost, 1.2, 'paramsForWidth preserves base recipe params');
}());

(function testParamsForWidthSupportsLegacyRecipe() {
  var recipe = { params: { targetFill: 0.93, fontQualityBoost: 2.4 } };
  var params = internal.paramsForWidth(recipe, 400);
  eq(params.targetFill, 0.93, 'paramsForWidth supports recipes without width profiles');
  eq(params.fontQualityBoost, 2.4, 'paramsForWidth keeps legacy fontQualityBoost');
}());

(function testLoadRecipeExposesResponsiveRecipe() {
  var recipe = {
    params: { targetFill: 0.9 },
    widthProfiles: [
      { containerWidth: 360, params: { targetFill: 0.91 } },
      { containerWidth: 760, params: { targetFill: 0.98 } }
    ]
  };
  var deployer = AshaarTune.loadRecipe(recipe);
  eq(deployer.recipe.widthProfiles.length, 2, 'loadRecipe keeps width profile metadata');
  eq(deployer.params.targetFill, 0.91, 'loadRecipe exposes a compatible default params object');
}());

finish();
