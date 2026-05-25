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
  var ZWNJ = 0x200C;
  var DEFAULT_PRIORITY = 7;

  // Letters that can connect from the previous character but not onward.
  var RIGHT_JOIN = (function () {
    var s = {};
    [0x0622,0x0623,0x0624,0x0625,0x0627,
     0x062F,0x0630,
     0x0631,0x0632,0x0698,
     0x0648,0x06C1,0x06C3,0x06BA,
     0x0671,0x0672,0x0673,0x0675,0x0677,
     0x06D5].forEach(function (cp) { s[cp] = 1; });
    return s;
  }());

  // Bare hamza does not connect on either side.
  var NON_JOIN = { 0x0621: 1 };

  // Lam + alef forms a required ligature and must never be split by tatweel.
  var ALEF_VARIANTS = {
    0x0627: 1, 0x0622: 1, 0x0623: 1, 0x0624: 1, 0x0625: 1
  };

  // Arabic combining marks (harakat) should not be treated as letters.
  function isArabicMark(cp) {
    return (cp >= 0x0610 && cp <= 0x061A) ||
      (cp >= 0x064B && cp <= 0x065F) ||
      cp === 0x0670 ||
      (cp >= 0x06D6 && cp <= 0x06ED);
  }

  // ZWNJ is a hard connection boundary in Persian/Arabic shaping.
  function isZwnj(cp) {
    return cp === ZWNJ;
  }

  function isArabicLetter(cp) {
    return (cp >= 0x0621 && cp <= 0x063A) ||
      (cp >= 0x0641 && cp <= 0x064A) ||
      (cp >= 0x066E && cp <= 0x066F) ||
      (cp >= 0x0671 && cp <= 0x06D3) ||
      cp === 0x06D5;
  }

  function isJoiningLetter(cp) {
    return isArabicLetter(cp) && !isArabicMark(cp) && !isZwnj(cp) && !NON_JOIN[cp];
  }

  // Dual-joining letters are the ones that can connect onward to the left.
  function isDualJoining(cp) {
    return isJoiningLetter(cp) && !RIGHT_JOIN[cp];
  }

  // Returns true for alef variants used in lam-alef ligature detection.
  function isAlifVariant(cp) {
    return !!ALEF_VARIANTS[cp];
  }

  function getLetters(word) {
    var letters = [];
    for (var i = 0; i < word.length; i++) {
      var cp = word.charCodeAt(i);
      if (isJoiningLetter(cp)) letters.push({ index: i, cp: cp });
    }
    return letters;
  }

  function onlyMarksBetween(word, start, end) {
    for (var i = start + 1; i < end; i++) {
      var cp = word.charCodeAt(i);
      if (isArabicMark(cp)) continue;
      return false;
    }
    return true;
  }

  function connectsToNext(word, current, next) {
    return isDualJoining(current.cp) &&
      isJoiningLetter(next.cp) &&
      onlyMarksBetween(word, current.index, next.index);
  }

  // Detects lam + alef variants that should not receive an extra stretch.
  function isLamAlefSequence(prevCp, nextCp) {
    return prevCp === 0x0644 && isAlifVariant(nextCp);
  }

  function canInsertTatweel(word, current, next) {
    if (!connectsToNext(word, current, next)) return false;
    if (isLamAlefSequence(current.cp, next.cp)) return false;
    return true;
  }

  function insertionPosition(next) {
    return next.index;
  }

  // Discover all legal tatweel insertion points for a single word.
  function tatweelSlots(word) {
    var slots = [];
    var letters = getLetters(word);
    for (var i = 0; i < letters.length - 1; i++) {
      if (canInsertTatweel(word, letters[i], letters[i + 1])) {
        slots.push({ pos: insertionPosition(letters[i + 1]), priority: DEFAULT_PRIORITY });
      }
    }
    return slots;
  }

  // Spread a fixed number of tatweels across the legal slots.
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
        var tatweels = new Array(entry.count + 1).join(TATWEEL).split('');
        Array.prototype.splice.apply(chars, [entry.pos + offset, 0].concat(tatweels));
        offset += tatweels.length;
      });
      return chars.join('');
    }).join(' ');
  }

  // Build a ranked list of insertion slots for a line, optionally using font quality.
  function buildSlots(text, params, fontProfile) {
    params = params || {};
    var words = text.split(' ');
    var slots = [];
    words.forEach(function (w, wi) {
      var letters = getLetters(w);
      for (var i = 0; i < letters.length - 1; i++) {
        var current = letters[i];
        var next = letters[i + 1];
        if (!canInsertTatweel(w, current, next)) continue;
        var base = DEFAULT_PRIORITY;
        var bonus = 0;
        if (fontProfile) {
          var q = fontProfile.getQuality(w[current.index], w[next.index]);
          bonus = (q - 0.5) * (params.fontQualityBoost || 0);
        }
        slots.push({ wi: wi, pos: insertionPosition(next), score: base + bonus });
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
        var tatweels = new Array(e.count + 1).join(TATWEEL).split('');
        Array.prototype.splice.apply(chars, [e.pos + offset, 0].concat(tatweels));
        offset += tatweels.length;
      });
      return chars.join('');
    }).join(' ');
  }

  // Find the maximum acceptable number of tatweels for a single line.
  function justifyLine(text, targetWidth, ctx, params, fontProfile) {
    params = params || {};
    var target = targetWidth * (params.targetFill || 1);
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
