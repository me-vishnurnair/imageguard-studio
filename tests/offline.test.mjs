import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('offline update only removes ImageGuard caches for its own scope', async () => {
  const handlers = {}, removed = [], scope = 'https://example.test/imageguard-studio/';
  const prefix = 'imageguard-' + scope + '-';
  vm.runInNewContext(readFileSync('web/sw.js','utf8'), {
    URL, Set,
    self: {registration:{scope},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{}}},
    caches: {keys:async()=>['other-app-cache', 'imageguard-https://example.test/other-project/-v1', prefix+'v1',prefix+'v2'],delete:async key=>removed.push(key)}
  });
  let pending; handlers.activate({waitUntil:promise=>pending=promise}); await pending;
  assert.deepEqual(removed,[prefix+'v1']);
});

test('offline handler ignores unrelated pages and non-GET requests', () => {
  const handlers = {};
  vm.runInNewContext(readFileSync('web/sw.js','utf8'), {
    URL, Set, self:{registration:{scope:'https://example.test/imageguard-studio/'},addEventListener:(name,fn)=>handlers[name]=fn}
  });
  for (const request of [{method:'GET',url:'https://example.test/other-app/'},{method:'POST',url:'https://example.test/imageguard-studio/'}]) {
    handlers.fetch({request, respondWith:()=>assert.fail('Should not intercept unrelated request')});
  }
});
