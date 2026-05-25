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

finish();
