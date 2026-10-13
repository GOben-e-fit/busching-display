const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/../index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function runtime(time, cached = null) {
  let now = Date.parse(time), html = '', request, urls = [];
  const store = new Map(cached ? [['busching-display-status-v2', JSON.stringify(cached)]] : []);
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  const context = vm.createContext({ Date: Clock, isFinite, JSON, String, parseInt,
    document: { getElementById: () => ({ set innerHTML(value) { html = value; } }) },
    localStorage: { getItem: key => store.get(key) || null, setItem: (key,value) => store.set(key,value) },
    XMLHttpRequest: function() { request = this; this.open = (_method, url) => urls.push(url); this.send = () => {}; },
    setInterval: () => {}, setTimeout: () => {}, window: { location: { reload() {} } }
  });
  vm.runInContext(source, context);
  return { context, urls, get html() { return html; }, setTime(value) { now = Date.parse(value); },
    respond(status, data) { request.status = status; request.responseText = typeof data === 'string' ? data : JSON.stringify(data); request.readyState = 4; request.onreadystatechange(); }
  };
}
const notice = { mode:'closed', customMessage:'Heute erst ab 10:00 Uhr geöffnet', customSubtitle:'Verkehrssituation', autoScheduleEnabled:false, overrideUntil:'2026-10-13T08:00:00Z' };
test('temporary closure survives errors and expires at exactly 10 Berlin', () => {
  const r = runtime('2026-10-13T07:59:59Z');
  r.respond(200, notice);
  assert.match(r.html, /GESCHLOSSEN/);
  r.context.loadStatus();
  r.respond(500, 'error');
  assert.match(r.html, /Heute erst ab/);
  r.setTime('2026-10-13T08:00:00Z'); r.context.renderLastStatus();
  assert.match(r.html, /GEÖFFNET/); assert.doesNotMatch(r.html, /Heute erst ab/);
});
test('cache survives page reload and malformed replies', () => {
  const r = runtime('2026-10-13T07:30:00Z', notice);
  assert.match(r.html, /Heute erst ab/);
  r.respond(200, 'not-json'); assert.match(r.html, /Heute erst ab/);
  r.context.loadStatus();
  r.respond(200, {...notice, mode:'garbage'}); assert.match(r.html, /Heute erst ab/);
});
test('freitext is rendered as text, never active markup', () => {
  const r = runtime('2026-10-13T07:30:00Z');
  r.respond(200, {...notice, customMessage:'<img src=x onerror=alert(1)>', customSubtitle:'A & B "Test"'});
  assert.match(r.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(r.html, /<img src=x/); assert.match(r.html, /A &amp; B &quot;Test&quot;/);
});
test('Berlin schedule covers summer, winter, Monday, lunch and weekends', () => {
  for (const [time, expected] of [['2026-10-13T07:00:00Z','open'],['2026-12-08T08:00:00Z','open'],['2026-10-12T07:30:00Z','closed'],['2026-10-12T08:00:00Z','open'],['2026-10-13T11:00:00Z','lunch'],['2026-10-17T09:00:00Z','closed']]) {
    assert.equal(runtime(time).context.getAutoStatus().mode, expected, time);
  }
});
test('active override takes precedence over automatic schedule', () => {
  const r = runtime('2026-10-13T07:30:00Z');
  r.respond(200, {...notice, autoScheduleEnabled:true}); assert.match(r.html, /GESCHLOSSEN/);
});
test('subtitle alone remains visible', () => {
  const r = runtime('2026-10-13T07:30:00Z');
  r.respond(200, {...notice, customMessage:''}); assert.match(r.html, /Verkehrssituation/);
});
test('bootstrap is only used without a last confirmed status', () => {
  const empty = runtime('2026-10-13T07:30:00Z');
  empty.respond(503, 'offline');
  assert.match(empty.urls[1], /^status.json/);
  empty.respond(200, notice); assert.match(empty.html, /Heute erst ab/);
  empty.context.loadStatus(); empty.respond(503, 'offline');
  assert.equal(empty.urls.length, 3); assert.match(empty.html, /Heute erst ab/);
  const cached = runtime('2026-10-13T07:30:00Z', notice);
  cached.respond(503, 'offline'); assert.equal(cached.urls.length, 1);
});
