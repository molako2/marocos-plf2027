import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { Compteur } from '../worker/index.js';

// Faux environnement Cloudflare : un seul objet durable, stockage en mémoire.
function env() {
  const donnees = new Map();
  const objet = new Compteur({ storage: { get: async (k) => donnees.get(k), put: async (k, v) => void donnees.set(k, v) } });
  return { COMPTEUR: { idFromName: () => 'global', get: () => objet } };
}
const ORIGINE = 'https://molako2.github.io';
const poster = (e, corps, { origine = ORIGINE, ip = '1.2.3.4' } = {}) => worker.fetch(new Request('https://x/', {
  method: 'POST', body: typeof corps === 'string' ? corps : JSON.stringify(corps),
  headers: { 'Content-Type': 'text/plain', Origin: origine, 'CF-Connecting-IP': ip },
}), e);
const lire = (e) => worker.fetch(new Request('https://x/', { headers: { Origin: ORIGINE } }), e);

test('compte les simulations et cumule les gains', async () => {
  const e = env();
  assert.deepEqual(await (await lire(e)).json(), { simulations: 0, economies: 0 });
  await poster(e, { gain: 26562 });
  const r = await poster(e, { gain: 0 });
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGINE);
  assert.deepEqual(await r.json(), { simulations: 2, economies: 26562 });
  assert.deepEqual(await (await lire(e)).json(), { simulations: 2, economies: 26562 });
});

test('refuse un gain invalide sans toucher au compteur', async () => {
  const e = env();
  for (const corps of [{ gain: -1 }, { gain: 1.5 }, { gain: 3_200_001 }, { gain: 'abc' }, {}, 'pas du json'])
    assert.equal((await poster(e, corps)).status, 400);
  assert.deepEqual(await (await lire(e)).json(), { simulations: 0, economies: 0 });
});

test('refuse une autre origine et une autre méthode', async () => {
  const e = env();
  assert.equal((await poster(e, { gain: 10 }, { origine: 'https://ailleurs.example' })).status, 403);
  assert.equal((await worker.fetch(new Request('https://x/', { method: 'DELETE' }), e)).status, 405);
});

test('limite à 30 envois par IP et par heure', async () => {
  const e = env();
  for (let i = 0; i < 30; i++) assert.equal((await poster(e, { gain: 1 })).status, 200);
  assert.equal((await poster(e, { gain: 1 })).status, 429);
  assert.equal((await poster(e, { gain: 1 }, { ip: '5.6.7.8' })).status, 200);
});
