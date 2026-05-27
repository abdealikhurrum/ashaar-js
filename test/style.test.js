/**
 * test/style.test.js — targeted stylesheet checks
 */

var fs = require('fs');
var path = require('path');

var css = fs.readFileSync(path.join(__dirname, '..', 'stylesheet.css'), 'utf8');
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

function finish() {
  _log.unshift('TAP version 13\n1..' + _n);
  process.stdout.write(_log.join('\n') + '\n');
  process.exit(_fail > 0 ? 1 : 0);
}

(function testStackedAjuzKeepsSameMeasure() {
  var rules = css.match(/(?:^|\n)\.ashaar--stacked \.ashaar-misra--ajuz\s*\{[^}]+\}/g) || [];
  var transformRule = rules.filter(function (rule) { return /transform:\s*translateX/.test(rule); })[0];
  ok(!!rules.length, 'stacked ajuz rule exists');
  ok(!!transformRule, 'stacked ajuz is shifted rather than narrowed');
  ok(transformRule && transformRule.indexOf('width: calc') === -1, 'stacked ajuz does not reduce the column width');
}());

(function testColumnHemistichesHugCenterGap() {
  ok(/\.ashaar-misra--sadr\s*\{[^}]*text-align:\s*left/.test(css), 'sadr aligns toward center gap');
  ok(/\.ashaar-misra--ajuz\s*\{[^}]*text-align:\s*right/.test(css), 'ajuz aligns toward center gap');
}());

(function testMultiMisraRowsExist() {
  ok(/\.ashaar-misra-row\s*\{[^}]*display:\s*flex/.test(css), 'multi-misra rows render as flex rows');
  ok(/\.ashaar-misra--row\s*\{[^}]*text-align:\s*center/.test(css), 'multi-misra row items center within columns');
}());

(function testStackedAlternateRulesExist() {
  ok(/\.ashaar--stacked \.ashaar-bayt:not\(\.ashaar-bayt--solo\)\s*\{[^}]*width:\s*var\(--ashaar-stack-measure\)[^}]*margin-inline:\s*auto/.test(css), 'default stacked bayts use centered configured measure');
  ok(/\.ashaar--stacked\.ashaar--stack-vertical \.ashaar-misra--ajuz\s*\{[^}]*transform:\s*none/.test(css), 'vertical stacked hemistiches stay in the same column');
  ok(/\.ashaar--stacked\.ashaar--stack-vertical\.ashaar--stack-alternate\s*\{[^}]*--ashaar-stack-measure:\s*var\(--ashaar-stack-vertical-alternate-measure\)/.test(css), 'vertical alternate stacked mode uses a wider overlapping measure');
  ok(/\.ashaar--stacked\.ashaar--stack-offset\.ashaar--stack-alternate\s*\{[^}]*--ashaar-stack-measure:\s*min\(/.test(css), 'offset alternate stacked mode caps bayt measure');
  ok(/--ashaar-stack-offset-alternate-clearance/.test(css), 'offset alternate stacked mode keeps center clearance');
  ok(/margin-block:\s*var\(--ashaar-stack-alternate-gap\)/.test(css), 'alternate stacked bayts get vertical clearance');
  ok(/nth-child\(odd\)[^{]*\{[^}]*margin-inline-end:\s*auto/.test(css), 'odd stacked bayts start on the right');
  ok(/nth-child\(even\)[^{]*\{[^}]*margin-inline-start:\s*auto/.test(css), 'even stacked bayts alternate to the left');
}());

finish();
