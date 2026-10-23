// Moteur IR sur salaire (Maroc) : CGI 2026 comparé au projet de loi de finances (PLF) 2027, années 2027 à 2031.
export const ANNEES = [2027, 2028, 2029, 2030, 2031];

export const BAREMES = {
  2026: [[40000, 0], [60000, 0.1], [80000, 0.2], [100000, 0.3], [180000, 0.34], [Infinity, 0.37]], // CGI 2026, art. 73-I
  2027: [[60000, 0], [80000, 0.1], [100000, 0.2], [180000, 0.34], [Infinity, 0.37]], // PLF 2027, art. 247-XXXXVII-1 (transitoire)
  2028: [[60000, 0], [100000, 0.1], [200000, 0.25], [Infinity, 0.37]], // PLF 2027, art. 247-XXXXVII-2
  2029: [[60000, 0], [130000, 0.1], [200000, 0.2], [Infinity, 0.35]], // PLF 2027, art. 247-XXXXVII-3
  2030: [[60000, 0], [150000, 0.1], [200000, 0.2], [Infinity, 0.3]], // PLF 2027, art. 247-XXXXVII-4
  2031: [[60000, 0], [150000, 0.1], [500000, 0.2], [Infinity, 0.3]], // PLF 2027, art. 73-I modifié (barème cible)
};

const PLAFOND_FP = 35000; // CGI 2026 art. 59-I-A et PLF 2027 art. 59-I-A : frais professionnels plafonnés à 35 000 DH/an
const SEUIL_FP_2026 = 78000; // CGI 2026 art. 59-I-A : 35 % jusqu'à 78 000 DH de brut annuel, 25 % au-delà
const REDUC_PAR_CHARGE = 600, REDUC_MAX = 3600; // CGI 2026 art. 74-I (LF 2026 : 500 → 600 DH, plafond 3 000 → 3 600 DH)
const CNSS = 0.0448, PLAFOND_CNSS = 6000; // cnss.ma « Paiement de vos cotisations sociales » : 0,52 % + 3,96 %, salaire plafonné à 6 000 DH/mois
const AMO_PRIVE = 0.0226; // cnss.ma, même page : AMO salariale 2,26 % sur tout le salaire
const CMR = 0.14; // loi 71-14 (réforme des pensions civiles) : retenue salariale 14 % depuis 2019
const AMO_PUBLIC = 0.025, PLAFOND_AMO_PUBLIC = 400; // décret 2-05-735 : 2,5 % plafonné à 400 DH/mois (source secondaire : clicpaie.ma)
const SALAIRE_MAX = 1e6;
const NB = String.fromCharCode(0xa0); // espace insécable

const arrondi = (x) => Math.round(x * 100) / 100 + 0; // + 0 transforme -0 en 0

function verifier(montant, max, { charges = 0, secteur = 'prive' } = {}) {
  if (!Number.isFinite(montant) || montant < 0 || montant > max)
    throw new RangeError(max < Infinity ? `Le salaire doit être un nombre de 0 à 1${NB}000${NB}000${NB}DH par mois.` : 'Le montant doit être un nombre fini, positif ou nul.');
  if (!Number.isInteger(charges) || charges < 0 || charges > 6)
    throw new RangeError('Le nombre de personnes à charge doit être un entier de 0 à 6.');
  if (secteur !== 'prive' && secteur !== 'public')
    throw new RangeError(`Le secteur doit valoir «${NB}prive${NB}» ou «${NB}public${NB}».`);
  return { charges, secteur };
}

function bareme(annee) {
  if (!Object.hasOwn(BAREMES, annee)) throw new RangeError(`Année non prise en charge${NB}: ${annee}. Années possibles${NB}: 2026 à 2031.`);
  return BAREMES[annee];
}

export function irBareme(rni, annee) {
  let ir = 0, bas = 0;
  for (const [plafond, taux] of bareme(annee)) {
    if (rni > bas) ir += (Math.min(rni, plafond) - bas) * taux;
    bas = plafond;
  }
  return ir;
}

function cotisations(brut, secteur) { // mensuel, part salariale déductible (art. 59-II et 59-III)
  if (secteur === 'prive') return CNSS * Math.min(brut, PLAFOND_CNSS) + AMO_PRIVE * brut;
  // shortcut: CMR et AMO assises sur tout le brut alors que l'assiette réelle exclut certaines indemnités, à remplacer par une saisie du traitement soumis à retenue si l'outil doit refléter une paie publique exacte
  return CMR * brut + Math.min(AMO_PUBLIC * brut, PLAFOND_AMO_PUBLIC);
}

function ir(brutAnnuel, annee, charges, secteur) { // non arrondi
  const tauxFp = annee >= 2027 ? 0.45 : brutAnnuel <= SEUIL_FP_2026 ? 0.35 : 0.25; // PLF 2027 art. 59-I-A : 45 % dès 2027
  const rni = Math.max(0, brutAnnuel - Math.min(tauxFp * brutAnnuel, PLAFOND_FP) - 12 * cotisations(brutAnnuel / 12, secteur));
  return Math.max(0, irBareme(rni, annee) - Math.min(REDUC_PAR_CHARGE * charges, REDUC_MAX));
}

const net = (brut, annee, charges, secteur) => brut - cotisations(brut, secteur) - ir(12 * brut, annee, charges, secteur) / 12;

function brutPour(cible, charges, secteur) { // dichotomie sur le net 2026, non arrondie
  if (cible <= 0) return 0;
  // en 2026, le net chute juste au-delà de 78 000 DH bruts par an (art. 59-I-A) : deux bruts peuvent donner le même net, on garde le plus petit
  const seuil = SEUIL_FP_2026 / 12;
  let bas = 0, haut = net(seuil, 2026, charges, secteur) >= cible ? seuil : 2 * cible + 100; // le net reste au-dessus de 50 % du brut
  while (haut - bas > 1e-7) {
    const milieu = (bas + haut) / 2;
    if (net(milieu, 2026, charges, secteur) < cible) bas = milieu; else haut = milieu;
  }
  return haut;
}

export function irAnnuel(brutAnnuel, annee, opts) {
  const { charges, secteur } = verifier(brutAnnuel, Infinity, opts);
  return arrondi(ir(brutAnnuel, annee, charges, secteur));
}

export function netMensuel(brutMensuel, annee, opts) {
  const { charges, secteur } = verifier(brutMensuel, Infinity, opts);
  return arrondi(net(brutMensuel, annee, charges, secteur));
}

export function brutDepuisNet(netMensuel, opts) {
  const { charges, secteur } = verifier(netMensuel, SALAIRE_MAX, opts);
  return arrondi(brutPour(netMensuel, charges, secteur));
}

export function simuler({ salaire, type = 'net', charges = 0, secteur = 'prive' } = {}) {
  verifier(salaire, SALAIRE_MAX, { charges, secteur });
  if (type !== 'net' && type !== 'brut') throw new RangeError(`Le type doit valoir «${NB}net${NB}» ou «${NB}brut${NB}».`);
  const brut = type === 'brut' ? salaire : brutPour(salaire, charges, secteur);
  const ir2026 = ir(12 * brut, 2026, charges, secteur);
  let cumul = 0;
  const annees = ANNEES.map((annee) => {
    const irY = ir(12 * brut, annee, charges, secteur);
    cumul += ir2026 - irY;
    return { annee, irAnnuel: arrondi(irY), gainAnnuel: arrondi(ir2026 - irY), gainMensuel: arrondi((ir2026 - irY) / 12), netMensuel: arrondi(net(brut, annee, charges, secteur)) };
  });
  return {
    brutMensuel: arrondi(brut),
    netMensuel2026: arrondi(net(brut, 2026, charges, secteur)),
    irAnnuel2026: arrondi(ir2026),
    annees,
    cumul5ans: arrondi(cumul),
    hypotheses: [
      'Salaire mensuel constant de 2026 à 2031, versé sur 12 mois, sans prime ni avantage en nature.',
      `Barèmes 2027 à 2031 tirés du projet de loi de finances 2027${NB}: le texte voté peut différer.`,
      `Frais professionnels${NB}: 35${NB}% ou 25${NB}% en 2026, 45${NB}% de 2027 à 2031, plafonnés à 35${NB}000${NB}DH par an.`,
      `Réduction pour charges de famille${NB}: 600${NB}DH par personne et par an (article 74 du CGI), supposée inchangée jusqu’en 2031.`,
      secteur === 'prive'
        ? `Cotisations salariales${NB}: CNSS 4,48${NB}% sur le salaire plafonné à 6${NB}000${NB}DH, AMO 2,26${NB}% sur tout le salaire.`
        : `Secteur public${NB}: calcul approximatif. La retenue CMR (14${NB}%) et l’AMO (2,5${NB}%, plafonnée à 400${NB}DH par mois) portent ici sur tout le brut, alors que leur assiette réelle exclut certaines indemnités.`,
      ...(type === 'net' ? ['Brut recalculé à partir du net 2026 saisi.'] : []),
    ],
  };
}
