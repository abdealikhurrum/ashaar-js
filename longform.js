function tuneLongform(el) {
  var spacingOnly = el.classList.contains('urdu-ghazal');
  var recipe = {
    version: '1.0',
    mode: 'poetry',
    balanceFill: 1.02,
    params: {
      targetFill: 0.96,
      fontQualityBoost: 1.8
    },
    method: spacingOnly ? 'spacing' : 'kashida',
    tatweel: !spacingOnly,
    maxScaleDown: 0.03
  };

  AshaarTune.loadRecipe(recipe).justifyEl(el, {
    layout: 'auto',
    justify: false,
    stackBelow: 620,
    gapWidth: getComputedStyle(el).getPropertyValue('--ashaar-gap-width') || '24px'
  });
}

if (window.Ashaar && window.AshaarTune) {
  var poetryBlocks = Array.prototype.slice.call(document.querySelectorAll('[data-ashaar]'));

  Ashaar.init('[data-ashaar]', {
    layout: 'auto',
    stackBelow: 620,
    justify: false
  });

  poetryBlocks.forEach(tuneLongform);
}

function makeMeasureContext(el) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var cs = window.getComputedStyle(el);
  ctx.direction = 'rtl';
  ctx.textBaseline = 'middle';
  ctx.font = cs.font;
  return ctx;
}

function copyTextStyles(from, to) {
  var cs = window.getComputedStyle(from);
  to.style.fontFamily = cs.fontFamily;
  to.style.fontSize = cs.fontSize;
  to.style.fontWeight = cs.fontWeight;
  to.style.lineHeight = cs.lineHeight;
}

function proseLines(text, width, ctx) {
  var words = text.trim().split(/\s+/).filter(Boolean);
  var lines = [];
  var current = '';

  words.forEach(function (word) {
    var next = current ? current + ' ' + word : word;
    if (current && ctx.measureText(next).width > width) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function justifyProseLine(line, width, ctx, recipe, params, mode) {
  if (mode === 'spacing') {
    var gaps = (line.match(/\s+/g) || []).length;
    if (!gaps) return { text: line, wordSpacing: '' };
    var natural = ctx.measureText(line).width;
    var desired = (width - natural) / gaps;
    var fontSize = parseFloat(ctx.font) || 16;
    var spacing = Math.max(-fontSize * 0.04, Math.min(fontSize * 0.24, desired));
    return { text: line, wordSpacing: Math.round(spacing * 100) / 100 + 'px' };
  }

  return {
    text: AshaarTune._internal.justifyLine(line, width, ctx, params, null),
    wordSpacing: ''
  };
}

function tuneProseBlock(original) {
  if (!window.AshaarTune || !window.AshaarJustify || original.dataset.proseReady === 'true') return;
  original.dataset.proseReady = 'true';

  var isUrdu = original.classList.contains('urdu-text');
  var recipe = {
    version: '1.0',
    mode: 'prose',
    params: {
      targetFill: isUrdu ? 0.985 : 1,
      fontQualityBoost: isUrdu ? 0 : 1.8
    },
    method: isUrdu ? 'spacing' : 'kashida',
    tatweel: !isUrdu
  };
  var params = AshaarTune._internal.paramsForWidth(recipe, original.getBoundingClientRect().width);

  var comparison = document.createElement('div');
  comparison.className = 'prose-toggle-shell';

  var controls = document.createElement('div');
  controls.className = 'prose-toggle';
  controls.innerHTML = '<div class="prose-toggle-group" role="group" aria-label="Prose rendering mode">' +
    '<button type="button" data-prose-mode="original" aria-pressed="true">Original</button>' +
    '<button type="button" data-prose-mode="tuned" aria-pressed="false">Tuned</button>' +
    '</div>';

  var originalClone = original.cloneNode(true);
  originalClone.dataset.proseReady = 'true';
  var tunedClone = original.cloneNode(false);
  tunedClone.dataset.proseReady = 'true';
  tunedClone.hidden = true;
  copyTextStyles(original, tunedClone);

  comparison.appendChild(controls);
  comparison.appendChild(originalClone);
  comparison.appendChild(tunedClone);

  original.replaceWith(comparison);

  controls.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-prose-mode]');
    if (!button) return;
    var mode = button.getAttribute('data-prose-mode');
    controls.querySelectorAll('button').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn === button ? 'true' : 'false');
    });
    originalClone.hidden = mode !== 'original';
    tunedClone.hidden = mode !== 'tuned';
  });

  function render() {
    tunedClone.innerHTML = '';
    var ctx = makeMeasureContext(originalClone);
    var width = tunedClone.getBoundingClientRect().width;
    if (!width) width = originalClone.getBoundingClientRect().width;
    params = AshaarTune._internal.paramsForWidth(recipe, width);

    originalClone.querySelectorAll('p').forEach(function (p) {
      var outP = document.createElement('p');
      var lines = proseLines(p.textContent, width, ctx);
      lines.forEach(function (line, index) {
        var div = document.createElement('span');
        div.className = 'prose-line';
        var isLast = index === lines.length - 1;
        var justified = isLast ? { text: line, wordSpacing: '' } :
          justifyProseLine(line, width, ctx, recipe, params, recipe.method);
        div.textContent = justified.text;
        if (justified.wordSpacing) div.style.wordSpacing = justified.wordSpacing;
        outP.appendChild(div);
      });
      tunedClone.appendChild(outP);
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(render);
  } else {
    setTimeout(render, 150);
  }

  if (window.ResizeObserver) {
    var ro = new ResizeObserver(render);
    ro.observe(comparison);
  }
}

document.querySelectorAll('[data-prose-compare]').forEach(tuneProseBlock);
