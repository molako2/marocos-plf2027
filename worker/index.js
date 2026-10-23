// MarocOS : compteur commun des simulations (Cloudflare Worker + Durable Object).
// Il ne reçoit que le gain sur 5 ans arrondi au millier de dirhams : ni salaire, ni identifiant, et l'IP n'est jamais écrite sur disque.
const ORIGINES = ['https://molako2.github.io', 'http://localhost:8080']; // filtre les autres sites, pas une authentification
const GAIN_MAX = 3_200_000; // gain 5 ans d'un net de 1 000 000 DH/mois (maximum du simulateur) ≈ 3 134 171 DH
const PAR_HEURE = 30; // envois acceptés par IP (ou par bloc IPv6 /64) et par heure
const TOUS_PAR_HEURE = 3_000; // plafond global, qui borne aussi la mémoire du limiteur
const PAS_GAIN = 1_000, PAS_TOTAL = 10_000; // arrondis : le total publié ne laisse pas déduire le gain d'une personne

export class Compteur {
  constructor(state) {
    this.storage = state.storage;
    this.envois = new Map();
  }

  async fetch(req) {
    if (req.method !== 'POST') return Response.json(publier(await this.stats()));
    const gain = Number((await req.json().catch(() => ({}))).gain);
    if (!Number.isInteger(gain) || gain < 0 || gain > GAIN_MAX || gain % PAS_GAIN) return Response.json({ erreur: 'gain invalide' }, { status: 400 });
    // shortcut: limiteur en mémoire seulement (remis à zéro quand l'objet redémarre), suffisant pour un compteur ludique ; passer au binding Rate Limiting si le compteur est attaqué
    const heure = Math.floor(Date.now() / 3_600_000);
    if (heure !== this.heure) { this.heure = heure; this.total = 0; this.envois.clear(); }
    const cle = bloc(req.headers.get('CF-Connecting-IP') ?? '?');
    const n = (this.envois.get(cle) ?? 0) + 1;
    // limite par adresse d'abord : une seule adresse ne peut pas épuiser le plafond global ; la table reste bornée
    if (n > PAR_HEURE || this.envois.size >= 50_000) return Response.json({ erreur: 'trop de simulations' }, { status: 429 });
    this.envois.set(cle, n);
    if (++this.total > TOUS_PAR_HEURE) return Response.json({ erreur: 'trop de simulations' }, { status: 429 });
    const s = await this.stats(); // l'objet traite une requête à la fois : lecture puis écriture sans course
    s.simulations += 1;
    s.economies += gain;
    await this.storage.put('stats', s);
    return Response.json(publier(s));
  }

  async stats() {
    return (await this.storage.get('stats')) ?? { simulations: 0, economies: 0 };
  }
}

// IPv6 : un abonné dispose de tout un /64. On développe « :: » avant de garder les 4 premiers groupes, sinon « 2001:db8::1 » échappe au regroupement.
export function bloc(ip) {
  if (!ip.includes(':')) return ip;
  const [g, d = ''] = ip.toLowerCase().split('::');
  const a = g ? g.split(':') : [], b = d ? d.split(':') : [];
  return [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b].slice(0, 4).map((x) => x.replace(/^0+(?=.)/, '')).join(':');
}

const publier = ({ simulations, economies }) => ({ simulations, economies: Math.round(economies / PAS_TOTAL) * PAS_TOTAL });

export default {
  async fetch(req, env) {
    const origine = req.headers.get('Origin');
    const cors = { 'Access-Control-Allow-Origin': ORIGINES.includes(origine) ? origine : ORIGINES[0], Vary: 'Origin' };
    if (req.method !== 'GET' && req.method !== 'POST') return new Response(null, { status: 405, headers: cors });
    if (req.method === 'POST' && !ORIGINES.includes(origine)) return new Response(null, { status: 403, headers: cors });
    const rep = await env.COMPTEUR.get(env.COMPTEUR.idFromName('global')).fetch(req);
    const r = new Response(rep.body, rep);
    for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
    return r;
  },
};
