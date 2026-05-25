/**
 * test/justify.test.js — targeted tests for ashaar-justify.js
 */

var AshaarJustify = require('../ashaar-justify.js');

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

function finish() {
  _log.unshift('TAP version 13\n1..' + _n);
  process.stdout.write(_log.join('\n') + '\n');
  process.exit(_fail > 0 ? 1 : 0);
}

(function testLamAlefWithDiacriticsIsNotBroken() {
  var text = 'أَلَا';
  var result = AshaarJustify.spreadTatweels(text, 2);
  eq(result, text, 'spreadTatweels keeps lam-alef intact when diacritics are present');
}());

(function testTatweelSlotsIgnoreDiacritics() {
  var slots = AshaarJustify.tatweelSlots('أَلَا');
  eq(slots.length, 0, 'tatweelSlots returns no slots for a lam-alef sequence with diacritics');
}());

(function testTatweelSlotsSkipFinalForm() {
  var slots = AshaarJustify.tatweelSlots('بيت');
  deepEq(slots, [], 'tatweelSlots skips insertion before the final-form letter');
}());

(function testTatweelSlotsSkipFinalFormInLongerWord() {
  var slots = AshaarJustify.tatweelSlots('قطعة');
  deepEq(slots, [], 'tatweelSlots skips the tail-adjacent slot in short words');
}());

(function testSpreadTatweelsKeepsShortWordsFromTailArtifacts() {
  var result = AshaarJustify.spreadTatweels('ليلي', 3);
  eq(result, 'ليلي', 'spreadTatweels keeps the extra tatweel off the tail-adjacent slot');
}());

(function testTatweelSlotsTreatsZwnjAsAJoinBreaker() {
  var slots = AshaarJustify.tatweelSlots('می‌باشد');
  ok(slots.every(function (slot) { return slot.pos !== 2; }), 'tatweelSlots never inserts at the zwnj boundary');
}());

(function testSpreadTatweelsDoesNotInsertBeforeZwnj() {
  var result = AshaarJustify.spreadTatweels('می‌باشد', 3);
  eq(result.indexOf('ـ‌'), -1, 'spreadTatweels does not place a tatweel before zwnj');
}());

(function testSpreadTatweelsDoesNotInsertAfterFinalFormAcrossZwnj() {
  var result = AshaarJustify.spreadTatweels('بی‌اثر', 3);
  eq(result, 'بی‌اثر', 'spreadTatweels keeps tatweels off the post-zwnj slot after a final-form glyph');
}());

(function testTatweelSlotsSkipSlotsAroundIsolatedForms() {
  var slots = AshaarJustify.tatweelSlots('ب‌ا');
  deepEq(slots, [], 'tatweelSlots skips insertions around isolated-form characters');
}());

(function testTatweelSlotsSkipsTheNoonSlotInNiestan() {
  var slots = AshaarJustify.tatweelSlots('نیستان');
  deepEq(slots, [
    { pos: 1, priority: 7 }
  ], 'tatweelSlots keeps only the safe first noon slot in نیستان');
}());

(function testSpreadTatweelsDoesNotAppendATailToMarkedFinalWords() {
  var result = AshaarJustify.spreadTatweels('تَكَلَّمِي', 20);
  ok(result.slice(-1) !== 'ـ', 'spreadTatweels does not append a tail to تَكَلَّمِي');
}());

(function testSpreadTatweelsDoesNotAppendATailToMarkedFinalWordsWithMeem() {
  var result = AshaarJustify.spreadTatweels('مَطِيَّهُم', 20);
  ok(result.slice(-1) !== 'ـ', 'spreadTatweels does not append a tail to مَطِيَّهُم');
}());

(function testSpreadTatweelsLeavesShortWordsUnchanged() {
  var result = AshaarJustify.spreadTatweels('مجنة', 3);
  eq(result, 'مجنة', 'spreadTatweels leaves short words unchanged when only tail-adjacent slots exist');
}());

function deepEq(actual, expected, desc) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), desc);
}

finish();
