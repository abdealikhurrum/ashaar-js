(function (root, factory) {
  // Expose the module for CommonJS and browser usage.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.AshaarJustify = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // The tatweel is the Arabic stretching character used for justification.
  var TATWEEL = 'ـ';

  // Letters that do not connect to the following character are treated as right-joining.
  var RIGHT_JOIN = (function () {
    var s = {};
    [0x0621,0x0622,0x0623,0x0624,0x0625,0x0627,
     0x062F,0x0630,
     0x0631,0x0632,0x0698,
     0x0648,0x06C1,0x06C3,0x06BA,
     0x0671,0x0672,0x0673,0x0675,0x0677,
     0x06D5].forEach(function (cp) { s[cp] = 1; });
    return s;
  }());

  // Certain Arabic letters need special handling when they form lam-alef ligatures.
  var ALEF_VARIANTS = {
    0x0627: 1, 0x0622: 1, 0x0623: 1, 0x0624: 1, 0x0625: 1
  };

  // Letters that behave like beh in final/medial ligature contexts.
  var BEH_CLASS = {
    0x0628: 1, 0x067E: 1, 0x062A: 1, 0x062B: 1,
    0x0686: 1, 0x06A4: 1, 0x069A: 1
  };

  // Reh family letters used for ligature heuristics.
  var REH_CLASS = {
    0x0631: 1, 0x0632: 1, 0x0698: 1
  };

  // Meem is used in a special beh-final ligature check.
  var MEEM_CLASS = {
    0x0645: 1
  };

  // Yaa-family letters are also considered in ligature heuristics.
  var YAA_CLASS = {
    0x064A: 1, 0x0649: 1, 0x0626: 1, 0x06CC: 1
  };

  // Returns true when the code point is in the Arabic block.
  function isArabic(cp) {
    return cp >= 0x0600 && cp <= 0x06FF;
  }

  // Arabic combining marks (harakat) should not be treated as letters.
  function isArabicMark(cp) {
    return (cp >= 0x064B && cp <= 0x065F) || cp === 0x0670;
  }

  // ZWNJ is a hard connection boundary in Persian/Arabic shaping.
  function isZwnj(cp) {
    return cp === 0x200C;
  }

  // Dual-joining letters are the ones that can form a medial connection.
  function isDualJoining(cp) {
    return isArabic(cp) && !isArabicMark(cp) && !RIGHT_JOIN[cp];
  }

  // Returns true for alef variants used in lam-alef ligature detection.
  function isAlifVariant(cp) {
    return !!ALEF_VARIANTS[cp];
  }

  // Convenience helpers for letter class lookups.
  function isBehClass(cp) {
    return !!BEH_CLASS[cp];
  }

  function isRehClass(cp) {
    return !!REH_CLASS[cp];
  }

  function isMeemClass(cp) {
    return !!MEEM_CLASS[cp];
  }

  function isYaaClass(cp) {
    return !!YAA_CLASS[cp];
  }

  function nextVisibleLetterIndex(index, word) {
    for (var i = index; i < word.length; i++) {
      var cp = word.charCodeAt(i);
      if (isZwnj(cp)) return -1;
      if (!isArabicMark(cp)) return i;
    }
    return -1;
  }

  function prevVisibleLetterIndex(index, word) {
    for (var i = index; i >= 0; i--) {
      var cp = word.charCodeAt(i);
      if (isZwnj(cp)) return -1;
      if (!isArabicMark(cp)) return i;
    }
    return -1;
  }

  function getLetterIndices(word) {
    var indices = [];
    for (var i = 0; i < word.length; i++) {
      var cp = word.charCodeAt(i);
      if (isZwnj(cp) || isArabicMark(cp)) continue;
      indices.push(i);
    }
    return indices;
  }

  function isNearFinalVisibleSlot(index, word) {
    var letterIndices = getLetterIndices(word);
    if (!letterIndices.length) return false;
    return index >= letterIndices[letterIndices.length - 2];
  }

  function isShortWordInitialSlot(index, word) {
    var letterIndices = getLetterIndices(word);
    return letterIndices.length <= 4 && index <= letterIndices[1];
  }

  function hasIsolatedTail(word) {
    var letterIndices = getLetterIndices(word);
    return letterIndices.length > 1 && isIsolatedForm(letterIndices[letterIndices.length - 1], word);
  }

  function hasCombiningMark(word) {
    for (var i = 0; i < word.length; i++) {
      if (isArabicMark(word.charCodeAt(i))) return true;
    }
    return false;
  }

  // A character is initial when it has no previous dual-joining letter.
  function isInitialForm(index, word) {
    var prevIndex = prevVisibleLetterIndex(index - 1, word);
    if (prevIndex < 0) return true;
    return !isDualJoining(word.charCodeAt(prevIndex));
  }

  // A character is final when it has no next dual-joining letter.
  function isFinalForm(index, word) {
    var nextIndex = nextVisibleLetterIndex(index + 1, word);
    if (nextIndex < 0) return true;
    return !isDualJoining(word.charCodeAt(nextIndex));
  }

  // A character is medial when it is between two dual-joining letters.
  function isMedialForm(index, word) {
    return !isInitialForm(index, word) && !isFinalForm(index, word) && isDualJoining(word.charCodeAt(index));
  }

  // A character is isolated when it connects to neither side.
  function isIsolatedForm(index, word) {
    var cp = word.charCodeAt(index);
    if (RIGHT_JOIN[cp]) return true;
    return isInitialForm(index, word) && isFinalForm(index, word);
  }

  // Detects lam + alef variants that should not receive an extra stretch.
  function isLamAlefSequence(prevCp, nextCp) {
    return prevCp === 0x0644 && isAlifVariant(nextCp);
  }

  // Detects the beh + reh/meem/yaa final-ligature case that should also be skipped.
  function isBehFinalLigature(prevCp, nextCp, nextIndex, word) {
    return isBehClass(prevCp) && (isRehClass(nextCp) || isMeemClass(nextCp) || isYaaClass(nextCp)) && isFinalForm(nextIndex, word);
  }

  // Decide whether a potential insertion point should be excluded.
  function shouldSkipTatweelSlot(prevCp, nextCp, currentIndex, nextIndex, word) {
    if (isLamAlefSequence(prevCp, nextCp)) return true;
    if (isBehFinalLigature(prevCp, nextCp, nextIndex, word)) return true;
    if (isIsolatedForm(currentIndex, word)) return true;
    if (isIsolatedForm(nextIndex, word)) return true;
    if (hasIsolatedTail(word) && currentIndex !== getLetterIndices(word)[0]) return true;
    if (isFinalForm(currentIndex, word)) return true;
    if (isInitialForm(nextIndex, word)) return true;
    if (isNearFinalVisibleSlot(nextIndex, word)) return true;
    if (isShortWordInitialSlot(nextIndex, word)) return true;
    return false;
  }

  // Assign a heuristic score to each possible insertion point.
  // Higher scores are preferred when distributing tatweels.
  function slotPriority(prevCp, nextCp, word, nextIndex) {
    if (prevCp === 0x0644 && nextIndex !== undefined && isFinalForm(nextIndex, word)) {
      if (isAlifVariant(nextCp)) return 12;
      return 1;
    }
    if (isBehClass(prevCp) && nextIndex !== undefined) {
      if (isInitialForm(nextIndex, word) || isMedialForm(nextIndex, word)) return 1;
    }
    if (prevCp === 0x633 || prevCp === 0x634 || prevCp === 0x635 || prevCp === 0x636) return 12;
    if (nextCp === 0x647 || nextCp === 0x629 || nextCp === 0x62F || nextCp === 0x630) return 11;
    if (nextCp === 0x627 || nextCp === 0x622 || nextCp === 0x623 || nextCp === 0x625 ||
        nextCp === 0x644 || nextCp === 0x643 || nextCp === 0x6A9 || nextCp === 0x6AF) return 10;
    var isBeh = isBehClass(prevCp);
    var isRaYa = isRehClass(nextCp) || isYaaClass(nextCp);
    if (isBeh && isRaYa) return 9;
    if (nextCp === 0x648 || nextCp === 0x639 || nextCp === 0x63A) return 8;
    return 7;
  }

  // Discover all legal tatweel insertion points for a single word.
  function tatweelSlots(word) {
    var slots = [];
    var letterIndices = getLetterIndices(word);
    for (var i = 0; i < letterIndices.length - 1; i++) {
      var currentIndex = letterIndices[i];
      var nextIndex = letterIndices[i + 1];
      var cp = word.charCodeAt(currentIndex);
      if (!RIGHT_JOIN[cp] && cp >= 0x0600 && cp <= 0x06FF) {
        var nextCp = word.charCodeAt(nextIndex);
        if (shouldSkipTatweelSlot(cp, nextCp, currentIndex, nextIndex, word)) continue;
        slots.push({ pos: nextIndex, priority: slotPriority(cp, nextCp, word, nextIndex) });
      }
    }
    if (hasCombiningMark(word) && letterIndices.length > 1 && isFinalForm(letterIndices[letterIndices.length - 1], word)) {
      return slots.slice(0, 1);
    }
    return slots;
  }

  // Spread a fixed number of tatweels across the line using the highest-priority slots.
  function spreadTatweels(text, n) {
    if (n <= 0) return text;
    var words = text.split(' ');
    var allSlots = [];
    words.forEach(function (w, wi) {
      tatweelSlots(w).forEach(function (s) {
        allSlots.push({ wi: wi, pos: s.pos, priority: s.priority });
      });
    });
    if (!allSlots.length) return text;
    allSlots.sort(function (a, b) {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.wi - b.wi || a.pos - b.pos;
    });

    // Rotate through the sorted slots so extra tatweels do not pile up on the same
    // position before other valid insertions have been used.
    var slotOrder = allSlots.slice();
    var chosen = [];
    for (var i = 0; i < n; i++) {
      chosen.push(slotOrder[0]);
      slotOrder.push(slotOrder.shift());
    }

    // Aggregate insertions by word and character position.
    var insertMap = {};
    chosen.forEach(function (s) {
      var key = s.wi + ':' + s.pos;
      insertMap[key] = (insertMap[key] || 0) + 1;
    });

    return words.map(function (w, wi) {
      var chars = w.split('');
      var offset = 0;
      var ins = [];
      for (var key in insertMap) {
        var kp = key.split(':');
        if (+kp[0] === wi) ins.push({ pos: +kp[1], count: insertMap[key] });
      }
      ins.sort(function (a, b) { return a.pos - b.pos; });
      ins.forEach(function (entry) {
        var t = new Array(entry.count + 1).join(TATWEEL);
        chars.splice(entry.pos + offset, 0, t);
        offset += entry.count;
      });
      return chars.join('');
    }).join(' ');
  }

  // Build a ranked list of insertion slots for a line, optionally blending in font quality.
  function buildSlots(text, params, fontProfile) {
    var words = text.split(' ');
    var slots = [];
    words.forEach(function (w, wi) {
      var letterIndices = getLetterIndices(w);
      for (var i = 0; i < letterIndices.length - 1; i++) {
        var currentIndex = letterIndices[i];
        var nextIndex = letterIndices[i + 1];
        var cp = w.charCodeAt(currentIndex);
        if (RIGHT_JOIN[cp] || cp < 0x0600 || cp > 0x06FF) continue;
        var nextCp = w.charCodeAt(nextIndex);
        if (shouldSkipTatweelSlot(cp, nextCp, currentIndex, nextIndex, w)) continue;
        var base = slotPriority(cp, nextCp, w, nextIndex);
        var bonus = 0;
        if (fontProfile) {
          var q = fontProfile.getQuality(w[currentIndex], w[nextIndex]);
          bonus = (q - 0.5) * params.fontQualityBoost;
        }
        var blended = base * params.priorityBias + 7 * (1 - params.priorityBias) + bonus;
        slots.push({ wi: wi, pos: nextIndex, score: blended });
      }
    });
    slots.sort(function (a, b) { return b.score - a.score; });
    return slots;
  }

  // Apply the top-scoring slots to a text string, inserting the requested number of tatweels.
  function applySlots(text, slots, n) {
    if (!n || !slots.length) return text;
    var words = text.split(' ');
    var insertMap = {};
    for (var i = 0; i < n; i++) {
      var s = slots[i % slots.length];
      var key = s.wi + ':' + s.pos;
      insertMap[key] = (insertMap[key] || 0) + 1;
    }
    return words.map(function (w, wi) {
      var chars = w.split('');
      var offset = 0;
      var ins = [];
      for (var key in insertMap) {
        var kp = key.split(':');
        if (+kp[0] === wi) ins.push({ pos: +kp[1], count: insertMap[key] });
      }
      ins.sort(function (a, b) { return a.pos - b.pos; });
      ins.forEach(function (e) {
        chars.splice(e.pos + offset, 0, new Array(e.count + 1).join(TATWEEL));
        offset += e.count;
      });
      return chars.join('');
    }).join(' ');
  }

  // Find the maximum acceptable number of tatweels for a single line.
  function justifyLine(text, targetWidth, ctx, params, fontProfile) {
    var target = targetWidth * params.targetFill;
    var natural = ctx.measureText(text).width;

    // If the line already fits, or it has no visible text, do nothing.
    if (natural >= target || !text.trim()) return text;

    // Build the ranked insertion points and stop early if no candidate exists.
    var slots = buildSlots(text, params, fontProfile);
    if (!slots.length) return text;

    // Binary search the number of tatweels that fit within the target width.
    var lo = 1, hi = text.replace(/\s/g, '').length, best = text;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var candidate = applySlots(text, slots, mid);
      if (ctx.measureText(candidate).width <= target) {
        best = candidate;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  }

  // Apply justification to each non-empty line in the input array.
  function justifyLines(lines, containerWidth, ctx, params, fontProfile) {
    return lines.map(function (l) {
      return l.trim() ? justifyLine(l, containerWidth, ctx, params, fontProfile) : l;
    });
  }

  return {
    tatweelSlots: tatweelSlots,
    spreadTatweels: spreadTatweels,
    buildSlots: buildSlots,
    applySlots: applySlots,
    justifyLine: justifyLine,
    justifyLines: justifyLines
  };
}));
