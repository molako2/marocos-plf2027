# MarocOS – Simulateur PLF 2027

« Chhal ghadi tzid f jibek ? » (Combien va rentrer en plus dans ta poche ?)

Page web statique qui estime la hausse de salaire net que le projet de loi de finances (PLF) 2027 apporte au Maroc, année par année de 2027 à 2031, par rapport à 2026.

- [Simulateur en ligne](https://molako2.github.io/marocos-plf2027/)
- [Dépôt GitHub molako2/marocos-plf2027](https://github.com/molako2/marocos-plf2027)

## Ce que fait la page

La page demande trois champs et met le résultat à jour à chaque saisie, sans bouton « Calculer » :

1. le salaire mensuel, en net (ce qui arrive sur le compte) ou en brut ;
2. le nombre de personnes à charge au sens fiscal, de 0 à 6 ;
3. le secteur : privé (CNSS + AMO) ou public (CMR).

Elle affiche le gain de salaire net par mois dès 2027, son évolution jusqu'en 2031 et le cumul sur 5 ans. La section « Kifach 7sebna ? » (Comment on a calculé ?) détaille le brut, le net 2026, l'impôt de chaque année, les barèmes et les hypothèses du calcul.

Une musique de fond joue en boucle. Le bouton « Musique » de l'en-tête la coupe ou la relance, et la page mémorise ce choix.

## Méthode

Le moteur de calcul est le fichier `engine.js`. Pour chaque année de 2026 à 2031 :

1. Revenu net imposable (RNI) annuel = brut annuel − frais professionnels − cotisations salariales déductibles, plancher 0.
2. Impôt sur le revenu (IR) annuel = barème de l'année appliqué au RNI − réduction pour charges de famille, plancher 0.
3. Gain de l'année = IR 2026 − IR de l'année, à salaire brut constant. Gain mensuel = gain annuel / 12.
4. Net mensuel = brut mensuel − cotisations − IR annuel / 12.

Le barème s'applique par tranches : chaque taux porte sur la part du RNI comprise dans sa tranche. Les montants sont arrondis au centime.

Si le salaire saisi est un net, alors le moteur recherche par dichotomie le brut qui donne ce net en 2026. Au-delà de 78 000 DH bruts par an, le taux des frais professionnels 2026 passe de 35 % à 25 % : deux bruts peuvent alors donner le même net, et le moteur retient le plus petit.

## Barèmes de l'IR

Tranches du revenu net imposable annuel, en DH.

| Année | Barème | Source |
|---|---|---|
| 2026 | 0 % jusqu'à 40 000 ; 10 % jusqu'à 60 000 ; 20 % jusqu'à 80 000 ; 30 % jusqu'à 100 000 ; 34 % jusqu'à 180 000 ; 37 % au-delà | Code général des impôts (CGI) 2026, art. 73-I |
| 2027 | 0 % jusqu'à 60 000 ; 10 % jusqu'à 80 000 ; 20 % jusqu'à 100 000 ; 34 % jusqu'à 180 000 ; 37 % au-delà | PLF 2027, art. 247-XXXXVII-1 (barème transitoire) |
| 2028 | 0 % jusqu'à 60 000 ; 10 % jusqu'à 100 000 ; 25 % jusqu'à 200 000 ; 37 % au-delà | PLF 2027, art. 247-XXXXVII-2 |
| 2029 | 0 % jusqu'à 60 000 ; 10 % jusqu'à 130 000 ; 20 % jusqu'à 200 000 ; 35 % au-delà | PLF 2027, art. 247-XXXXVII-3 |
| 2030 | 0 % jusqu'à 60 000 ; 10 % jusqu'à 150 000 ; 20 % jusqu'à 200 000 ; 30 % au-delà | PLF 2027, art. 247-XXXXVII-4 |
| 2031 | 0 % jusqu'à 60 000 ; 10 % jusqu'à 150 000 ; 20 % jusqu'à 500 000 ; 30 % au-delà | PLF 2027, art. 73-I modifié (barème cible) |

## Frais professionnels, réduction et cotisations

| Paramètre | Valeur | Source |
|---|---|---|
| Frais professionnels 2026 | 35 % du brut annuel si celui-ci ne dépasse pas 78 000 DH, 25 % au-delà (taux appliqué à tout le brut) ; plafond 35 000 DH par an | CGI 2026, art. 59-I-A |
| Frais professionnels 2027 à 2031 | 45 % du brut annuel ; plafond 35 000 DH par an | PLF 2027, art. 59-I-A |
| Réduction pour charges de famille | 600 DH par personne et par an, plafonnée à 3 600 DH (soit 6 personnes) ; supposée inchangée jusqu'en 2031 | CGI 2026, art. 74-I (la loi de finances 2026 a porté ces montants de 500 à 600 DH et de 3 000 à 3 600 DH) |
| Caisse nationale de sécurité sociale (CNSS), secteur privé | 4,48 % (0,52 % + 3,96 %) du salaire plafonné à 6 000 DH par mois | cnss.ma, page « Paiement de vos cotisations sociales » |
| Assurance maladie obligatoire (AMO), secteur privé | 2,26 % de tout le salaire | cnss.ma, même page |
| Caisse marocaine des retraites (CMR), secteur public | 14 % de tout le brut (approximation) | loi 71-14 portant réforme des pensions civiles, taux en vigueur depuis 2019 |
| AMO, secteur public | 2,5 % du brut, plafonnée à 400 DH par mois | décret 2-05-735 (source secondaire : clicpaie.ma) |

Les cotisations retenues sont la part salariale, déduite du revenu imposable (CGI, art. 59-II et 59-III).

## Limites

- Salaire mensuel constant de 2026 à 2031, versé sur 12 mois : pas de 13e mois, pas de prime, pas d'avantage en nature.
- Barèmes 2027 à 2031 tirés du PLF 2027 tel que déposé au Parlement : le texte voté peut différer.
- À partir de 2031, certaines indemnités forfaitaires permanentes deviendront imposables (art. 57-1°). Le simulateur ne les prend pas en compte.
- Secteur public : la CMR et l'AMO portent ici sur tout le brut, alors que leur assiette réelle exclut certaines indemnités. Le résultat est approximatif.
- Seul le salaire est simulé : autres revenus et régimes spéciaux hors calcul.
- Les équivalences affichées (verres de thé, tickets de tram…) reposent sur des prix indicatifs.

## Lancer la page en local

Les modules ES ne se chargent pas depuis une adresse `file://`. Pour servir la page, lancez cette commande depuis le dossier du projet :

```
python -m http.server 8080
```

Ouvrez ensuite `http://localhost:8080` dans le navigateur.

## Tests

Les tests du moteur se trouvent dans `test/engine.test.js` et demandent Node.js 22 ou plus. Lancez :

```
npm test
```

Facultatif : sans npm, lancez `node --test "test/*.test.js"`.

## Confidentialité

- Le calcul se fait dans le navigateur. Aucune donnée saisie ne quitte l'appareil.
- Le partage (« Sift l s7abek », envoie à tes amis) et la copie sont des actions de l'utilisateur. Le texte partagé ne contient pas le salaire.
- Le seul stockage local est le choix musique on/off, sous la clé `marocos-musique` de `localStorage`.

## Licence

MIT. Le texte complet se trouve dans le fichier [LICENSE](LICENSE).

## Avertissement

> Simulation indicative, fondée sur le projet de loi de finances 2027 tel que déposé au Parlement. Le texte n'est pas définitif : les montants peuvent changer au vote et à la publication de la loi. Cette page ne remplace pas un conseil personnalisé. MarocOS – Open source Project · code sous licence MIT · aucune donnée ne quitte votre téléphone.
