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

(function testTatweelSlotsAllowInitialAndMedialForms() {
  var slots = AshaarJustify.tatweelSlots('بيت');
  deepEq(slots, [
    { pos: 1, priority: 7 },
    { pos: 2, priority: 7 }
  ], 'tatweelSlots allows insertion after initial and medial forms');
}());

(function testTatweelSlotsAllowTailAdjacentMedialForm() {
  var slots = AshaarJustify.tatweelSlots('قطعة');
  deepEq(slots, [
    { pos: 1, priority: 7 },
    { pos: 2, priority: 7 },
    { pos: 3, priority: 7 }
  ], 'tatweelSlots allows a slot before a final form when the previous character is medial');
}());

(function testSpreadTatweelsUsesAllLegalSlots() {
  var result = AshaarJustify.spreadTatweels('ليلي', 3);
  eq(result, 'لـيـلـي', 'spreadTatweels uses all legal initial and medial slots');
}());

(function testTatweelSlotsTreatsZwnjAsAJoinBreaker() {
  var slots = AshaarJustify.tatweelSlots('می‌باشد');
  ok(slots.every(function (slot) { return slot.pos !== 2; }), 'tatweelSlots never inserts at the zwnj boundary');
}());

(function testSpreadTatweelsDoesNotInsertBeforeZwnj() {
  var result = AshaarJustify.spreadTatweels('می‌باشد', 3);
  eq(result.indexOf('ـ‌'), -1, 'spreadTatweels does not place a tatweel before zwnj');
}());

(function testSpreadTatweelsCanResumeAfterZwnj() {
  var result = AshaarJustify.spreadTatweels('بی‌اثر', 3);
  eq(result, 'بــی‌اثـر', 'spreadTatweels resumes within the joining run after zwnj');
}());

(function testTatweelSlotsSkipSlotsAroundIsolatedForms() {
  var slots = AshaarJustify.tatweelSlots('ب‌ا');
  deepEq(slots, [], 'tatweelSlots skips insertions around isolated-form characters');
}());

(function testTatweelSlotsAllowJoiningSlotsInNiestan() {
  var slots = AshaarJustify.tatweelSlots('نیستان');
  deepEq(slots, [
    { pos: 1, priority: 7 },
    { pos: 2, priority: 7 },
    { pos: 3, priority: 7 },
    { pos: 4, priority: 7 }
  ], 'tatweelSlots keeps each joining slot in نیستان');
}());

(function testSpreadTatweelsIgnoresMarksInShaping() {
  var result = AshaarJustify.spreadTatweels('تَكَلَّمِي', 20);
  ok(/تَـ+/.test(result), 'spreadTatweels keeps marks attached to the current letter in تَكَلَّمِي');
}());

(function testSpreadTatweelsIgnoresMarksInMarkedWordWithMeem() {
  var result = AshaarJustify.spreadTatweels('مَطِيَّهُم', 20);
  ok(/مَـ+/.test(result), 'spreadTatweels keeps marks attached to the current letter in مَطِيَّهُم');
}());

(function testSpreadTatweelsChangesShortJoinableWords() {
  var result = AshaarJustify.spreadTatweels('مجنة', 3);
  eq(result, 'مـجـنـة', 'spreadTatweels changes short words when the slots are joinable');
}());

(function testSpreadTatweelsDoesNotAppendAfterFinalMarkedYeh() {
  var result = AshaarJustify.spreadTatweels('تَكَلَّمِي', 20);
  ok(!/يـ/.test(result), 'spreadTatweels does not insert after final yeh even when marks are present');
}());

(function testSpreadTatweelsDoesNotAppendAfterFinalMarkedMeem() {
  var result = AshaarJustify.spreadTatweels('مَطِيَّهُم', 20);
  ok(!/مـ$/.test(result), 'spreadTatweels does not insert after final meem even when marks are present');
}());

(function testSpreadTatweelsDoesNotAppendAfterTaaMarbuta() {
  var result = AshaarJustify.spreadTatweels('مجنة', 20);
  ok(result.indexOf('ةـ') === -1, 'spreadTatweels does not insert after final taa marbuta');
}());

(function testTatweelSlotsSkipBareHamza() {
  var slots = AshaarJustify.tatweelSlots('بءت');
  deepEq(slots, [], 'tatweelSlots treats bare hamza as non-joining');
}());

(function testTatweelSlotsSkipArabicPunctuation() {
  var slots = AshaarJustify.tatweelSlots('ب،ت');
  deepEq(slots, [], 'tatweelSlots does not treat Arabic punctuation as a joining letter');
}());

function deepEq(actual, expected, desc) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), desc);
}

finish();
