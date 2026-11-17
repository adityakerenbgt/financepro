import test from 'node:test';
import assert from 'node:assert/strict';
import { scrubEvent, scrubText } from './sentryScrub';

test('scrubText menyamarkan email, token, JWT, password, dan URL database', () => {
  const s = scrubText('gagal untuk budi@example.com Bearer abcdef123456789 password=hunter2 postgresql://u:pw@host:5432/db eyJhbGciOi.eyJ1c2VySWQi.sig123');
  assert.ok(!/budi@example\.com|abcdef123456789|hunter2|u:pw@|eyJhbGciOi/.test(s), s);
});

test('scrubText memotong pesan panjang', () => {
  assert.ok(scrubText('x'.repeat(5000)).length <= 500);
});

test('scrubEvent membuang body, cookie, header, query, extra, dan menyisakan hanya user.id', () => {
  const ev: any = scrubEvent({
    message: 'error untuk a@b.co',
    request: { url: 'https://app.test/api/x?token=abc&email=a@b.co#frag', method: 'POST', data: { password: 'p' }, cookies: { 'auth-token': 'jwt' }, headers: { authorization: 'Bearer zzz', cookie: 'a=b' }, query_string: 'token=abc' },
    user: { id: 'h123', email: 'a@b.co', username: 'budi', ip_address: '1.2.3.4' },
    extra: { body: 'rahasia' },
    server_name: 'my-machine',
    contexts: { runtime: { name: 'node' }, app: { secret: 1 }, culture: { locale: 'id' } },
    exception: { values: [{ value: 'Query gagal: email=a@b.co', stacktrace: { frames: [{ filename: 'a.ts', vars: { password: 'p' } }] } }] },
    breadcrumbs: [{ category: 'fetch', message: 'GET /api?token=abc', data: { url: '/api?token=abc', body: 'x' }, timestamp: 1 }],
  });
  const json = JSON.stringify(ev);
  assert.deepEqual(ev.request, { url: 'https://app.test/api/x', method: 'POST' });
  assert.deepEqual(ev.user, { id: 'h123' });
  assert.equal(ev.extra, undefined);
  assert.equal(ev.server_name, undefined);
  assert.deepEqual(Object.keys(ev.contexts), ['runtime']);
  assert.equal(ev.exception.values[0].stacktrace.frames[0].vars, undefined);
  assert.equal(ev.breadcrumbs[0].data, undefined);
  assert.ok(!/a@b\.co|rahasia|1\.2\.3\.4|budi|jwt|zzz|"p"/.test(json), json);
});

test('scrubEvent aman untuk event minimal', () => {
  assert.doesNotThrow(() => scrubEvent({}));
});
