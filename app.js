// MarocOS : interface du simulateur PLF 2027. Vanilla, sans build ; tous les chiffres viennent de engine.js.
const bouchon = { ANNEES: [2027, 2028, 2029, 2030, 2031], BAREMES: {}, simuler: ({ salaire, type, charges, secteur }) => {
  const brut = type === 'net' ? salaire * 1.1 : salaire, b = brut * 12, ir = a => Math.max(0, (b - 60000) * (a === 2026 ? .12 : .12 - (a - 2026) * .015) - charges * 600);
  const annees = [2027, 2028, 2029, 2030, 2031].map(annee => ({ annee, irAnnuel: ir(annee), gainAnnuel: ir(2026) - ir(annee), gainMensuel: (ir(2026) - ir(annee)) / 12, netMensuel: brut - ir(annee) / 12 }));
  return { brutMensuel: brut, netMensuel2026: brut - ir(2026) / 12, irAnnuel2026: ir(2026), annees, cumul5ans: annees.reduce((s, a) => s + a.gainAnnuel, 0), hypotheses: ['BOUCHON, chiffres factices'] };
} };
const moteur = await import('./engine.js').catch(() => (console.warn('engine.js absent, bouchon'), bouchon));
const { simuler, BAREMES = {} } = moteur;

const $ = (s) => document.querySelector(s);
const NB = String.fromCharCode(0xa0); // espace insécable
const SITE = 'https://molako2.github.io/marocos-plf2027/';
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nombre = (x) => nf.format(x).replace(/\s/g, NB); // l'espace fine de fr-FR se voit mal en Fraunces : espace insécable
const dh = (x) => nombre(x) + NB + 'DH';
const plus = (x) => '+' + dh(x);
const calme = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 899px)');
const comportement = () => (calme.matches ? 'auto' : 'smooth');

// Prix indicatifs (source: 'approx'). Quantité = floor(gain / prix), affichée de 2 à 300 : toujours au pluriel.
const EQUIV = [['verres de thé', 10], ['msemens', 3], ['khobz', 1.2], ['tickets de tram', 8], ['tajines au resto', 45],
  ["litres d'essence", 13], ['recharges 10 Go', 50], ['billets Al Boraq Casa–Tanger', 224], ["mois de loyer d'un studio", 3000]]
  .map(([nom, prix]) => ({ nom, prix, source: 'approx' }));
const LOYER = EQUIV.pop(); // la dernière ligne sert au cumul 5 ans
const equivalences = (gain, liste) => liste.map((e) => [Math.floor(gain / e.prix), e.nom])
  .filter(([q]) => q >= 2 && q <= 300).map(([q, nom]) => `Ya3ni ≈ ${q} ${nom}`);

const form = $('#formulaire'), salaire = $('#salaire'), charges = $('#charges'), erreur = $('#erreur');
const carte = $('#resultat'), hssala = $('#hssala'), chute = $('#chute');
const barres = [...document.querySelectorAll('.barres li')];
const etoiles = $('#etoiles');
etoiles.innerHTML = '<svg viewBox="0 0 20 20"><use href="#khatam" width="20" height="20"/></svg>'.repeat(6);

// Comptage animé : 600 ms, easeOutCubic, posé sans animation si l'utilisateur réduit les mouvements.
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
function compter(el, vers, format) {
  cancelAnimationFrame(el.raf);
  const de = el.valeur ?? 0;
  el.valeur = vers;
  if (calme.matches || de === vers) { el.textContent = format(vers); return; }
  const debut = performance.now();
  const pas = (t) => {
    const p = Math.min(1, Math.max(0, (t - debut) / 600));
    el.textContent = format(de + (vers - de) * easeOutCubic(p));
    if (p < 1) el.raf = requestAnimationFrame(pas);
  };
  el.raf = requestAnimationFrame(pas);
}

// Pièces : k = min(8, max(1, round(gain / 100))), 60 ms d'écart, la tirelire se secoue à la dernière.
function pieces(gain) {
  if (calme.matches || chute.childElementCount > 12) return;
  const k = Math.min(8, Math.max(1, Math.round(gain / 100)));
  for (let i = 0; i < k; i++) {
    const p = document.createElement('i');
    p.className = 'piece';
    p.style.cssText = `--d:${i * 60}ms;--x:${Math.round(Math.random() * 64 - 32)}px;--r:${Math.round(Math.random() * 240 - 120)}deg`;
    p.addEventListener('animationend', () => { p.remove(); if (i === k - 1) secouer(); });
    chute.append(p);
  }
}
function secouer() {
  hssala.classList.remove('secoue');
  void hssala.offsetWidth; // relance l'animation
  hssala.classList.add('secoue');
}

// Équivalence : change toutes les 4 s parmi celles qui s'appliquent, fixe si mouvements réduits.
let equivs = [], iEq = 0;
function montrerEquiv() {
  const el = $('#equiv'), t = equivs[iEq] ?? '';
  $('#equiv-bloc').hidden = !t;
  if (el.textContent === t) return;
  el.textContent = t;
  if (!calme.matches) el.animate([{ opacity: 0, transform: 'translateY(.5em)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'ease-out' });
}
setInterval(() => {
  if (calme.matches || equivs.length < 2) return;
  iEq = (iEq + 1) % equivs.length;
  montrerEquiv();
}, 4000);

const ligne = (cells) => `<tr><th scope="row">${cells[0]}</th>${cells.slice(1).map((c) => `<td>${c}</td>`).join('')}</tr>`;
const signe = (x) => (x > 0 ? '+' : '') + nombre(x);

function frise(r) {
  const annees = r?.annees ?? [], max = Math.max(0, ...annees.map((a) => a.gainAnnuel));
  barres.forEach((li, i) => {
    const a = annees[i];
    li.querySelector('b').textContent = a ? signe(a.gainMensuel) : '0';
    li.style.setProperty('--h', a && max > 0 ? a.gainAnnuel / max : 0);
  });
  $('#tb-frise').innerHTML = annees.map((a) => ligne([a.annee, dh(a.gainMensuel), dh(a.gainAnnuel)])).join('');
}

function details(r) {
  $('#bases').innerHTML = r ? [['Brut mensuel', r.brutMensuel], ['Net mensuel 2026', r.netMensuel2026], ['IR annuel 2026', r.irAnnuel2026]]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${dh(v)}</dd></div>`).join('') : '';
  $('#t-ir').innerHTML = r ? ligne([2026, nombre(r.irAnnuel2026), '–', nombre(r.netMensuel2026)])
    + r.annees.map((a) => ligne([a.annee, nombre(a.irAnnuel), signe(a.gainMensuel), nombre(a.netMensuel)])).join('') : '';
  if (r) $('#hypotheses').replaceChildren(...r.hypotheses.map((h) => Object.assign(document.createElement('li'), { textContent: h })));
}
const pct = (t) => Math.round(t * 100) + NB + '%';
$('#baremes').innerHTML = Object.entries(BAREMES).map(([an, tranches]) => `<li><b>${an}${NB}:</b> ${tranches
  .map(([plafond, taux]) => `<span>${pct(taux)} ${plafond === Infinity ? 'au-delà' : "jusqu'à " + nombre(plafond)}</span>`).join(' · ')}</li>`).join('');

// Partage : texte sans le salaire ; feuille de partage du téléphone si possible, sinon lien wa.me.
let texte = '';
function partage(r, etat) {
  texte = (etat === 'gain'
    ? `Avec le PLF 2027, mon salaire net monterait de ${plus(r.annees[0].gainMensuel)}/mois dès 2027 et de ${plus(r.annees.at(-1).gainMensuel)}/mois en 2031, soit ${dh(r.cumul5ans)} sur 5 ans.`
    : etat === 'zero' ? `Avec le PLF 2027, mon impôt sur le revenu ne change pas${NB}: je n'en payais déjà pas.`
      : "Le PLF 2027 baisse l'impôt sur le revenu.") + ` Chhal ghadi tzid f jibek${NB}? Calcule le tien${NB}:`;
  $('#partager').href = 'https://wa.me/?text=' + encodeURIComponent(texte + ' ' + SITE);
}
$('#partager').addEventListener('click', (e) => {
  const data = { text: texte, url: SITE };
  if (navigator.canShare?.(data)) { e.preventDefault(); navigator.share(data).catch(() => {}); }
});
let tRetour;
const retour = (t) => {
  $('#retour').textContent = t;
  clearTimeout(tRetour);
  tRetour = setTimeout(() => ($('#retour').textContent = ''), 2000);
};
$('#copier').addEventListener('click', () => {
  if (!navigator.clipboard) return retour('Copie impossible');
  navigator.clipboard.writeText(texte + ' ' + SITE).then(() => retour(`Copié${NB}!`), () => retour('Copie impossible'));
});

let precedent = 0, defiler = false, dejaDefile = false;
function afficher(r) {
  const etat = !r ? 'vide' : r.cumul5ans > 0 ? 'gain' : 'zero';
  const g = r ? r.annees[0].gainMensuel : 0, g31 = r ? r.annees.at(-1).gainMensuel : 0, cumul = r ? r.cumul5ans : 0;
  carte.dataset.etat = etat;
  carte.classList.remove('perime');
  hssala.classList.toggle('fermee', etat !== 'gain');
  const [titre, message] = {
    vide: ['Dkhel salaire dyalek…', 'Entre ton salaire, en net ou en brut.'],
    gain: [`Mabrouk${NB}!`, `En 2031${NB}: ${plus(g31)} / mois.`],
    zero: ['Walou…', "tu ne payais déjà pas d'IR en 2026, rien ne change pour toi."],
  }[etat];
  $('#titre').textContent = titre;
  $('#message').textContent = message;
  $('#unite').textContent = etat === 'gain' ? 'DH / mois dès 2027' : 'DH / mois';
  compter($('#gain'), g, etat === 'gain' ? (x) => '+' + nombre(x) : nombre);
  compter($('#cumul'), cumul, dh);
  $('#annonce').textContent = etat === 'gain'
    ? `Mabrouk${NB}! ${plus(g)} / mois dès 2027, et ${plus(g31)} / mois en 2031. F 5 snin, en 5 ans${NB}: ${dh(cumul)}.`
    : `${titre} ${message}`;
  equivs = etat === 'gain' ? equivalences(g, EQUIV).map((t) => t + ' par mois.') : [];
  iEq = 0;
  montrerEquiv();
  $('#loyer').textContent = equivalences(cumul, [LOYER]).map((t) => t + '.').join('');
  if (g !== precedent && !calme.matches) $('#gain').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], 450);
  if (g > precedent) pieces(g);
  precedent = g;
  frise(r);
  details(r);
  partage(r, etat);
  // Téléphone : au premier calcul après une saisie du salaire, le résultat remonte au-dessus du clavier.
  if (defiler && mobile.matches) { carte.scrollIntoView({ block: 'nearest', behavior: comportement() }); dejaDefile = true; }
  defiler = false;
}

function calculer() {
  const v = { salaire: salaire.valueAsNumber, type: form.elements.type.value, charges: Number(charges.value), secteur: form.elements.secteur.value };
  erreur.textContent = '';
  salaire.removeAttribute('aria-invalid');
  if (!v.salaire) return afficher(null); // champ vide, illisible ou 0 : état vide
  try {
    const r = simuler(v);
    afficher(r);
    return r;
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    erreur.textContent = e.message;
    salaire.setAttribute('aria-invalid', 'true');
    carte.classList.add('perime');
  }
}

function majCharges() {
  const n = Number(charges.value), txt = n + NB + (n > 1 ? 'personnes' : 'personne');
  charges.setAttribute('aria-valuetext', txt);
  $('#nb-charges').value = txt;
  [...etoiles.children].forEach((s, i) => s.classList.toggle('on', i < n));
}

let minuterie;
form.addEventListener('input', (e) => {
  if (e.target === charges) majCharges();
  if (e.target === salaire && !dejaDefile) defiler = true;
  clearTimeout(minuterie);
  minuterie = setTimeout(() => { const r = calculer(); if (r) compterSimulation(r.cumul5ans); }, 120);
});
form.addEventListener('submit', (e) => { // touche Entrée / OK du clavier : on ferme le clavier et on montre le résultat
  e.preventDefault();
  salaire.blur();
  carte.scrollIntoView({ block: 'nearest', behavior: comportement() });
});
// Compteur commun : seul le gain sur 5 ans arrondi au millier part, après 2,5 s sans saisie, 10 fois au plus par visite.
// Le chiffre prérempli à l'ouverture ne compte pas : il faut une saisie.
const API = 'https://marocos-compteur.chicshop.workers.dev';
let envois = 0, dernierGain = null, tCompteur;
function majCompteur(s) {
  if (!Number.isFinite(s?.simulations)) return;
  $('#compteur').hidden = false;
  compter($('#nb-sims'), s.simulations, nombre);
  compter($('#total-eco'), s.economies, dh);
}
const appel = (init) => fetch(API, init).then((r) => r.json()).then(majCompteur, () => {}); // hors ligne : le bloc reste masqué
function compterSimulation(cumul) {
  clearTimeout(tCompteur);
  tCompteur = setTimeout(() => {
    const gain = Math.round(cumul / 1000) * 1000; // le serveur refuse un gain plus précis
    if (gain === dernierGain || envois >= 10) return;
    dernierGain = gain;
    envois++;
    appel({ method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ gain }) }); // text/plain : pas de requête préalable CORS
  }, 2500);
}
appel();

majCharges();
calculer();

// Musique : essai au chargement, sinon au premier geste ; choix mémorisé ; pause en arrière-plan.
const audio = $('#musique'), btnMusique = $('#btn-musique'), CLE = 'marocos-musique';
audio.volume = 0.4; // iOS ignore ce réglage : le volume y suit les boutons du téléphone
let actif = true;
try { actif = localStorage.getItem(CLE) !== 'off'; } catch { /* stockage bloqué : musique active */ }
// Pas de { once: true } : sur téléphone, pointerdown au doigt n'autorise pas la lecture ; l'écouteur reste jusqu'au premier succès.
const gestes = ['pointerdown', 'keydown', 'focusin', 'touchend', 'click'];
const desarmer = () => gestes.forEach((t) => document.removeEventListener(t, geste, true));
function geste() { if (actif) audio.play().then(desarmer, () => {}); }
function lancer() { audio.play().then(desarmer, () => gestes.forEach((t) => document.addEventListener(t, geste, true))); }
function majMusique() {
  btnMusique.setAttribute('aria-pressed', String(actif));
  btnMusique.lastElementChild.textContent = `Musique${NB}: ${actif ? 'on' : 'off'}`;
}
btnMusique.addEventListener('click', () => {
  actif = !actif;
  majMusique();
  try { localStorage.setItem(CLE, actif ? 'on' : 'off'); } catch { /* navigation privée : choix non mémorisé */ }
  if (actif) lancer(); else audio.pause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.pause(); else if (actif) lancer();
});
audio.addEventListener('playing', () => btnMusique.classList.add('joue'));
audio.addEventListener('pause', () => btnMusique.classList.remove('joue'));
majMusique();
if (actif) lancer();
