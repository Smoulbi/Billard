# FRAME v0.29 — poches visuelles raccourcies aux mâchoires physiques

1er novembre 2026. Les demi-cercles noirs des poches latérales de la v0.28 découpaient 64,8 mm de drap vers le centre de la table, alors que les lois physiques décrivent une entrée entre les deux mâchoires, puis un seuil de capture au-delà de la ligne de bande. La v0.29 conserve exactement les extrémités des mâchoires physiques et réduit la profondeur visible des poches latérales à 12 mm. Les quatre poches d'angle adoptent également une découpe moins concave. Les garnitures suivent les nouvelles ouvertures ; la doublure descend dans un conduit derrière la découpe avant de rejoindre le panier sous le plateau. Les couches de drap, d'ardoise et de support sont cohérentes.

Les dimensions et lois de collision, rayons physiques de poches et données expérimentales restent inchangés. Contrôles de découpe, raccords et non-recouvrement, voir [RELEASE_NOTES_v0.29.md](RELEASE_NOTES_v0.29.md).

## Historique : v0.28 — raccords continus et poches encastrées

1er novembre 2026. Correction de deux défauts constatés sur la table v0.27 : les longues et courtes traverses se terminaient avant leurs coins, créant des fentes de 35 à 50 mm ; les raccords des poches latérales étaient des rectangles pleins qui paraissaient avancer sur le cadre. La v0.28 utilise des coordonnées de raccord uniques partagées par les rails et les coins, prolonge les âmes et les tabliers jusqu'à ces raccords, remplace les pièces latérales pleines par une géométrie en U et abaisse les fines lèvres noires sous le drap. Les six ouvertures sont toujours dérivées des dimensions physiques, sans modification des collisions.

Les vues de diagnostic et les tests incluent maintenant un contrôle explicite de l'absence de fentes aux six raccords et de la profondeur des lèvres de poches. Voir [RELEASE_NOTES_v0.28.md](RELEASE_NOTES_v0.28.md).

## Historique : v0.27 — refonte inspirée de la photographie Diamond

1er novembre 2026. La v0.27 change la **silhouette de la table** en suivant la photographie fournie : rails et raccords entièrement en bois graphite foncé à veinage visible, angles extérieurs arrondis, bande turquoise bordant le drap bleu, quatre gros pieds légèrement fuselés sous les coins, jupe et caisson continus. Suppression des pièces argentées, des chaussures métalliques et de l'ancien piètement à traverses apparentes. Marque FRAME conservée, repositionnée sur les deux petits côtés.

Tous les éléments de physique et les données expérimentales sont inchangés. Tests d'empiètement aux poches, de symétrie, d'alignement des incrustations, de continuité de la structure et du contact des pieds avec le sol : `tests/table-geometry.test.js`. L'inspection logicielle s'appuie sur les maillages effectivement générés avec `scripts/export-table-geometry.mjs` et `scripts/render-table-geometry.py`. Ce moteur logiciel ne prétend pas reproduire les matériaux WebGL.

Voir [RELEASE_NOTES_v0.27.md](RELEASE_NOTES_v0.27.md).

## Historique : v0.26 — refonte de la table de tournoi

1er novembre 2026. Reconstruction exclusivement graphique inspirée de la Brunswick Gold Crown VI Tournament : rail en profil biseauté et couronnement à dix-huit véritables alvéoles pour les repères en nacre, bandes visuelles raccordées aux rails, garnitures métalliques externes aux six poches, collets et paniers en profondeur, châssis continu, panneaux et pieds inclinés solidaires de la structure, avec patins au sol. Les couleurs de la v0.25 sont conservées.

Les maillages sont générés par `makeTable()` dans `dist/game.js`. Les anciens tests et scripts de vérification sont conservés dans l'historique Git de la v0.26 ; la v0.27 emploie leurs équivalents sans suffixe de version.

**Statut historique :** la v0.26 a été publiée avant la refonte v0.27. Ses vérifications logicielles ne constituaient pas une validation complète du rendu WebGL.

## Démarrage local de la version courante

```bash
python3 -m http.server 8036 --directory dist
```

Ouvrir **http://127.0.0.1:8036/index.html?v=029-poches**. Voir [RELEASE_NOTES_v0.28.md](RELEASE_NOTES_v0.28.md), [RELEASE_NOTES_v0.27.md](RELEASE_NOTES_v0.27.md) et [RELEASE_NOTES_v0.26.md](RELEASE_NOTES_v0.26.md) pour l'historique.

## Historique : v0.25 — correction des empiètements sur le drap

1er novembre 2026. Les couronnes circulaires de garniture de la v0.24 recouvraient involontairement le drap. La v0.25 les remplace par des **raccords externes non circulaires**, avec des lèvres qui suivent exactement les arcs des ouvertures et des doublures entièrement sous la surface. Des tests échantillonnent les surfaces 2D et les triangles 3D des six raccords pour détecter toute intersection avec la surface jouable. Le moteur physique reste inchangé.

## Démarrage de la v0.25

```bash
python3 -m http.server 8035 --directory dist
```

Ouvrir **http://127.0.0.1:8035/index.html?v=025-poches** et vérifier **VERSION 0.25**. Voir [RELEASE_NOTES_v0.25.md](RELEASE_NOTES_v0.25.md).

## Historique : v0.24 — structure réaliste de la table

1er novembre 2026. La v0.24 corrige exclusivement la **modélisation 3D** de la table de tournoi : retour des coloris bleu/turquoise et graphite, vraie épaisseur des bandes et des flancs, rail supérieur joint à une jupe verticale et à une âme porteuse, nez du caoutchouc plus bas que le rail conformément à sa fonction, ouvertures géométriques dans le drap, l'ardoise et le support, poches en profondeur avec doublure et filet, raccords d'angles et de poches latérales. Caméra initiale un peu plus basse pour voir la structure. Aucun fichier de physique, aucune constante et aucun résultat scientifique n'ont changé.

## Démarrage de la v0.24

```bash
python3 -m http.server 8034 --directory dist
```

Ouvrir **http://127.0.0.1:8034/index.html?v=024-geometrie** et vérifier **VERSION 0.24**. Voir [RELEASE_NOTES_v0.24.md](RELEASE_NOTES_v0.24.md).

## Historique : v0.23 — travail initial sur les matières

1er novembre 2026. La v0.23 est une **mise à jour exclusivement graphique** de la v0.22 : drap bleu texturé, noyer veiné, rails biseautés, garnitures des six poches, repères en nacre, piètement, éclairage et billes plus réalistes. Les textures sont générées localement ; aucun téléchargement d'image n'est nécessaire. Le rendu de secours sans WebGL a également été harmonisé.

**Aucune équation de mouvement, dimension de collision, loi de contact, constante matérielle, valeur de réglage ou routine de calibration n'a été modifiée.** Le profil de bande actif par défaut reste la référence empirique v0.17 ; le candidat physique de recherche v0.22 demeure non activé.

## Démarrage de la v0.23

Depuis le dossier extrait :

```bash
python3 -m http.server 8033 --directory dist
```

Ouvrir **http://127.0.0.1:8033/index.html?v=023-graphismes** et vérifier l'inscription **VERSION 0.23**. Le port et le paramètre d'URL permettent de distinguer cette version des instances anciennes encore ouvertes.

Voir [RELEASE_NOTES_v0.23.md](RELEASE_NOTES_v0.23.md) pour les changements visuels, leurs limites et les tests. Le contenu scientifique de la version précédente est conservé ci-dessous.

## Historique : v0.22 — audit physique et prévention des régressions

31 octobre 2026. La version v0.22 introduit un solveur de recherche à six degrés de liberté pour le contact simultané bille–bande–tapis, des tests de conservation et un **audit comparatif automatisé**. Ce solveur **n'est pas activé dans le jeu**, car il échoue à reproduire la référence de rebond américaine aussi précisément que la v0.21. Aucune constante de caoutchouc n'a été identifiée à partir de données de matériau.

**Complément du 1er novembre 2026 :** deux configurations de recherche ajoutées, avec raideurs hertziennes dérivées de la littérature et loi de glissement du tapis mesurée sur pool américain. Leurs RMSE globales baissent à 12,630 puis 11,705 points ; **elles dégradent toutefois certaines composantes individuelles et restent rejetées**. L'audit examine désormais aussi les écarts par angle, par composante et tir par tir. Voir [ETUDE_MATERIAUX_v0.22.md](ETUDE_MATERIAUX_v0.22.md).

Cinq variantes de billard américain demeurent accessibles dans **MODÈLE DE BANDE** :

- **v0.17 · Référence empirique** (choisie par défaut) : ajustement aux régressions de 1 217 impacts de billard américain, conservé intégralement.
- **v0.18 · Contact déformable** : ressort normal/tangentiel et adhérence–glissement, hypothèses de matériau non mesurées.
- **v0.19 · Contact déformable ajusté** : quatre paramètres tangentiels ajustés de manière prudente, conservés intégralement.
- **v0.20 · Contact 3D couplé** : deuxième direction de cisaillement (verticale), couplage normal/vertical, cône de frottement à deux composantes et frottement effectif dépendant de la vitesse. **Toujours expérimental**.
- **v0.21 · Contact 3D affiné** : région de confiance autour de v0.20 ; réajustement de la raideur, de l'amortissement et du frottement effectif, avec contrôle sur la vitesse intermédiaire. **Expérimental et non validé sur table indépendante**.

Le profil snooker historique reste accessible dans l'API et inchangé. La géométrie de table de l'application reste américaine. **v0.22 désigne le logiciel et l'outillage d'audit ; le dernier moteur mécanique jouable reste v0.21 et le modèle de bande choisi par défaut reste v0.17.**

## Démarrage indépendant d'une archive v0.22

Depuis le dossier extrait de cette archive, exécuter :

```bash
python3 -m http.server 8032 --directory dist
```

Ouvrir : **http://127.0.0.1:8032/index.html?v=022-materiaux**.

Vérifier l'inscription **VERSION 0.22** en haut de la page. Le port `8032` est distinct de celui des archives précédentes pour éviter de réutiliser un serveur plus ancien. Le moteur jouable reste celui de la v0.22 officielle ; les nouveaux scénarios physiques sont exclusivement utilisables par les scripts d'étude. Le dossier `dist/vendor` inclut Three.js.

## Comparaison chiffrée avec la publication TUM

Sur les **24 composantes calculées à partir de régressions publiées**, erreurs absolues en points de pourcentage :

| Moteur | MAE | RMSE |
| --- | ---: | ---: |
| v0.17 empirique | 0,051 | 0,081 |
| v0.18 déformable | 4,584 | 7,793 |
| v0.19 ajusté | 4,409 | 7,193 |
| v0.20 couplé | 3,339 | 5,009 |
| **v0.21 affiné** | **2,783** | **3,847** |
| v0.22 contact 6-DOF non calibré, **refusé** | 15,092 | 18,269 |

Ces 24 cibles sont dérivées **des mêmes régressions** qui ont servi à identifier le frottement effectif, ce qui constitue une évaluation **interne**. Le groupe de vitesse intermédiaire (1,2 m/s) a été laissé hors de la recherche v0.21 : il sert au contrôle d'interpolation, **pas** à une validation indépendante. Aucun coefficient matériel de caoutchouc K55/K66 n'a été mesuré.

Le candidat v0.22 intègre réellement les forces simultanées et la translation verticale jusqu'au premier retour au roulement. Ses 24 résidus se dégradent. Un balayage de 27 hypothèses de raideur, de restitution et de friction (sensibilité, **pas identification**) n'a pas suffi : meilleur RMSE 12,042 points. **Il serait scientifiquement injustifié de substituer cette nouvelle loi au modèle actuel.**

L'erreur maximale des 24 composantes passe de **14,16 points (v0.20)** à **11,08 points (v0.21)**. Les groupes de vitesses 0,5, 1,2 et 2,3 m/s s'améliorent tous, mais la composante tangentielle à 0,5 m/s / 30° demeure la plus mal reproduite.

## Tests, diagnostics et acquisition de données

```bash
npm test
node scripts/compare-cushion-models.js
node scripts/explore-coupled-friction.js
node scripts/fit-cushion-v021.js
node scripts/audit-v022.js
node scripts/audit-material-v022.js
node scripts/sensitivity-v022.js
```

- `npm test` : algèbre de contact, énergie, convergence temporelle, intégration et non-régression snooker/anciens modèles.
- `compare-cushion-models.js` : erreur des cinq résolveurs par rapport à la **régression TUM**, avec type de preuve explicitement indiqué.
- `explore-coupled-friction.js` : recherche numérique bornée et reproductible ; coefficients **effectifs**, pas propriétés matérielles.
- `fit-cushion-v021.js` : recherche dans une région de confiance autour de v0.20 ; la vitesse 1,2 m/s n'entre pas dans la fonction objectif.
- `audit-v022.js` : confronte la v0.21 et le contact simultané non calibré sur 24 composantes ; rejette automatiquement tout accroissement du MAE, du RMSE, de l'écart maximal ou d'un groupe de vitesses.
- `audit-material-v022.js` : compare la v0.22 initiale, les modules hertziens issus de la publication de 2022 et la loi de frottement du tapis américain publiée par la TUM ; **refuse** une diminution de RMSE moyenne si elle masque des régressions locales.
- `sensitivity-v022.js` : étudie 27 hypothèses de matériau **sans modifier le moteur**.

Pour comparer les modèles à de **vraies mesures indépendantes**, utiliser :

```bash
node scripts/compare-cushion-models.js mesures-pool.json
node scripts/audit-v022.js mesures-pool.json
```

La structure requise, le protocole de prise de vue et les limites sont indiqués dans [VALIDATION_PROTOCOL_v0.22.md](VALIDATION_PROTOCOL_v0.22.md). Aucun fichier de mesures fictives n'est inclus dans le score indépendant. La phase d'acquisition physique demeure impossible sans accès à une table réelle et à ses enregistrements.

Les tirs, prévisions de trajectoire, replays et **57 essais du banc** utilisent le modèle sélectionné. Le CSV exporté identifie ce modèle. Les anciens moteurs et leurs paramètres restent dans le code, ainsi que leurs notes de version.

**La v0.21 ne remplace pas encore la référence empirique v0.17 en précision démontrée sur la régression utilisée pour calibrer.** Détails du modèle de recherche et causes du refus : [RELEASE_NOTES_v0.22.md](RELEASE_NOTES_v0.22.md). Les versions précédentes restent archivées, notamment [RELEASE_NOTES_v0.21.md](RELEASE_NOTES_v0.21.md).
