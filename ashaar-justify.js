(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.AshaarJustify = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  var TATWEEL = 'ـ';

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

  var ALEF_VARIANTS = {
    0x0627: 1, 0x0622: 1, 0x0623: 1, 0x0624: 1, 0x0625: 1
  };

  var BEH_CLASS = {
    0x0628: 1, 0x067E: 1, 0x062A: 1, 0x062B: 1,
    0x0686: 1, 0x06A4: 1, 0x069A: 1
  };

  var REH_CLASS = {
    0x0631: 1, 0x0632: 1, 0x0698: 1
  };

  var MEEM_CLASS = {
    0x0645: 1
  };

  var YAA_CLASS = {
    0x064A: 1, 0x0649: 1, 0x0626: 1, 0x06CC: 1
  };

  function isArabic(cp) {
    return cp >= 0x0600 && cp <= 0x06FF;
  }

  function isDualJoining(cp) {
    return isArabic(cp) && !RIGHT_JOIN[cp];
  }

  function isAlifVariant(cp) {
    return !!ALEF_VARIANTS[cp];
  }

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

  function isInitialForm(index, word) {
    if (index === 0) return true;
    var prevCp = word.charCodeAt(index - 1);
    return !isDualJoining(prevCp);
  }

  function isFinalForm(index, word) {
    if (index >= word.length - 1) return true;
    var nextCp = word.charCodeAt(index + 1);
    return !isDualJoining(nextCp);
  }

  function isMedialForm(index, word) {
    return !isInitialForm(index, word) && !isFinalForm(index, word) && isDualJoining(word.charCodeAt(index));
  }

  function isLamAlefSequence(prevCp, nextCp) {
    return prevCp === 0x0644 && isAlifVariant(nextCp);
  }

  function isBehFinalLigature(prevCp, nextCp, nextIndex, word) {
    return isBehClass(prevCp) && (isRehClass(nextCp) || isMeemClass(nextCp) || isYaaClass(nextCp)) && isFinalForm(nextIndex, word);
  }

  function shouldSkipTatweelSlot(prevCp, nextCp, nextIndex, word) {
    if (isLamAlefSequence(prevCp, nextCp)) return true;
    if (isBehFinalLigature(prevCp, nextCp, nextIndex, word)) return true;
    if (isInitialForm(nextIndex, word)) return true;
    return false;
  }

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

  function tatweelSlots(word) {
    var slots = [];
    for (var i = 0; i < word.length - 1; i++) {
      var cp = word.charCodeAt(i);
      if (!RIGHT_JOIN[cp] && cp >= 0x0600 && cp <= 0x06FF) {
        var nextCp = word.charCodeAt(i + 1);
        if (shouldSkipTatweelSlot(cp, nextCp, i + 1, word)) continue;
        slots.push({ pos: i + 1, priority: slotPriority(cp, nextCp, word, i + 1) });
      }
    }
    return slots;
  }

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
    var chosen = [];
    for (var i = 0; i < n; i++) chosen.push(allSlots[i % allSlots.length]);
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

  function buildSlots(text, params, fontProfile) {
    var words = text.split(' ');
    var slots = [];
    words.forEach(function (w, wi) {
      for (var i = 0; i < w.length - 1; i++) {
        var cp = w.charCodeAt(i);
        if (RIGHT_JOIN[cp] || cp < 0x0600 || cp > 0x06FF) continue;
        var nextCp = w.charCodeAt(i + 1);
        if (shouldSkipTatweelSlot(cp, nextCp, i + 1, w)) continue;
        var base = slotPriority(cp, nextCp, w, i + 1);
        var bonus = 0;
        if (fontProfile) {
          var q = fontProfile.getQuality(w[i], w[i + 1]);
          bonus = (q - 0.5) * params.fontQualityBoost;
        }
        var blended = base * params.priorityBias + 7 * (1 - params.priorityBias) + bonus;
        slots.push({ wi: wi, pos: i + 1, score: blended });
      }
    });
    slots.sort(function (a, b) { return b.score - a.score; });
    return slots;
  }

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

  function justifyLine(text, targetWidth, ctx, params, fontProfile) {
    var target = targetWidth * params.targetFill;
    var natural = ctx.measureText(text).width;
    if (natural >= target || !text.trim()) return text;
    var slots = buildSlots(text, params, fontProfile);
    if (!slots.length) return text;
    var lo = 1, hi = text.replace(/\s/g, '').length, best = text;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var candidate = applySlots(text, slots, mid);
      if (ctx.measureText(candidate).width <= target) { best = candidate; lo = mid + 1; }
      else { hi = mid - 1; }
    }
    return best;
  }

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
