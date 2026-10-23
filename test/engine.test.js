import test from 'node:test';
import assert from 'node:assert/strict';
import { ANNEES, BAREMES, irBareme, irAnnuel, netMensuel, brutDepuisNet, simuler } from '../engine.js';

const proche = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('contrat : années et barèmes', () => {
  assert.deepEqual(ANNEES, [2027, 2028, 2029, 2030, 2031]);
  for (const a of [2026, ...ANNEES]) assert.equal(BAREMES[a].at(-1)[0], Infinity);
});

test('barème seul, revenu net imposable annuel', () => {
  const attendus = { 100000: [12000, 6000, 4000, 4000, 4000, 4000], 300000: [83600, 77600, 66000, 56000, 49000, 39000] };
  for (const [rni, irs] of Object.entries(attendus))
    [2026, ...ANNEES].forEach((a, i) => proche(irBareme(Number(rni), a), irs[i]));
});

test('vecteurs de référence : privé, 0 charge', () => {
  const vecteurs = [
    // brut, IR 2026, IR 2027, IR 2031, gain mensuel 2027, gain mensuel 2031
    [6000, 194.72, 0, 0, 16.23, 16.23],
    [8000, 3320.96, 0, 0, 276.75, 276.75],
    [10000, 7218.72, 1906.24, 1906.24, 442.71, 442.71],
    [20000, 45249.65, 39249.65, 18270.08, 500, 2248.3],
    [50000, 175439.33, 169439.33, 93464.32, 500, 6831.25],
  ];
  for (const [brut, ir26, ir27, ir31, g27, g31] of vecteurs) {
    const r = simuler({ salaire: brut, type: 'brut' });
    assert.equal(r.irAnnuel2026, ir26);
    assert.equal(irAnnuel(12 * brut, 2026), ir26);
    assert.equal(r.annees[0].irAnnuel, ir27);
    assert.equal(r.annees[4].irAnnuel, ir31);
    assert.equal(r.annees[0].gainMensuel, g27);
    assert.equal(r.annees[4].gainMensuel, g31);
    proche(r.cumul5ans, r.annees.reduce((s, y) => s + y.gainAnnuel, 0), 0.03);
  }
});

test('aller-retour net → brut → net à 0,01 DH près', () => {
  for (const secteur of ['prive', 'public'])
    for (const charges of [0, 3])
      for (const n of [0.01, 3000, 5000, 6000, 8000, 15000, 50000, 1e6]) {
        const brut = brutDepuisNet(n, { charges, secteur });
        proche(netMensuel(brut, 2026, { charges, secteur }), n, 0.01 + 1e-9);
        proche(simuler({ salaire: n, charges, secteur }).netMensuel2026, n, 0.01 + 1e-9);
      }
  // un net de 6 000 DH s'obtient avec environ 6 460 ou 6 531 DH bruts en 2026 (effet de seuil de l'art. 59-I-A) : le moteur garde le plus petit
  assert.ok(brutDepuisNet(6000) < 6500);
  assert.equal(brutDepuisNet(0), 0);
  assert.equal(simuler({ salaire: 0 }).brutMensuel, 0);
});

test('charges de famille : 600 DH par personne (CGI 2026 art. 74-I), jamais d’IR négatif', () => {
  proche(irAnnuel(240000, 2026, { charges: 3 }), 45249.65 - 1800);
  assert.equal(irAnnuel(72000, 2026, { charges: 3 }), 0);
  assert.ok(simuler({ salaire: 6000, type: 'brut', charges: 3 }).annees.every((y) => y.irAnnuel === 0 && y.gainAnnuel === 0));
  assert.throws(() => simuler({ salaire: 10000, charges: 7 }), RangeError);
  assert.throws(() => irAnnuel(120000, 2026, { charges: 1.5 }), RangeError);
});

test('secteur public : gain ≥ 0 et net < brut', () => {
  for (const salaire of [4000, 9000, 15000, 30000, 120000]) {
    const r = simuler({ salaire, type: 'brut', secteur: 'public' });
    assert.ok(r.netMensuel2026 < r.brutMensuel);
    assert.ok(r.annees.every((y) => y.gainAnnuel >= 0 && y.netMensuel < r.brutMensuel && y.netMensuel >= r.netMensuel2026));
    assert.ok(r.hypotheses.some((h) => h.includes('approximatif')));
  }
});

test('netMensuel croît avec le brut, hors effet de seuil 2026 à 78 000 DH par an', () => {
  for (const annee of [2026, ...ANNEES]) {
    let avant = -1;
    for (let b = 0; b <= 60000; b += 25) {
      if (annee === 2026 && b > 6500 && b < 6600) continue;
      const n = netMensuel(b, annee);
      assert.ok(n >= avant, `${annee} : net(${b}) = ${n} < ${avant}`);
      avant = n;
    }
  }
  // CGI 2026 art. 59-I-A : le taux de frais passe de 35 % à 25 % au-delà de 78 000 DH, le net baisse d'environ 65 DH
  assert.ok(netMensuel(6500.01, 2026) < netMensuel(6500, 2026));
});

test('entrées invalides : RangeError', () => {
  for (const salaire of [NaN, -1, Infinity, 1e6 + 1, '5000', undefined])
    assert.throws(() => simuler({ salaire }), RangeError);
  assert.throws(() => simuler({ salaire: 5000, type: 'annuel' }), RangeError);
  assert.throws(() => simuler({ salaire: 5000, secteur: 'mixte' }), RangeError);
  assert.throws(() => netMensuel(-5, 2027), RangeError);
  assert.throws(() => irAnnuel(100000, 2025), RangeError);
  assert.throws(() => brutDepuisNet(NaN), RangeError);
});
