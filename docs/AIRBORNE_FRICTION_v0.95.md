# Frottement des billes en vol — 0.95

## Recherche complémentaire

La version publiée de l’étude de Hyeong-Chan Kim a été retrouvée et consultée :
*Collision of Two Spinning Billiard Balls and the Role of Table*, **New Physics:
Sae Mulli 74(6), 621–633, 2024**, DOI **10.3938/NPSM.74.621**.
[PDF éditeur](https://pdf.medrang.co.kr/NPSM/2024/074/npsm-74-6-621.pdf).
L’article souligne notamment pp. 622–625 que la réaction du tapis et le frottement
associé peuvent agir pendant le choc. Sa géométrie initiale place les billes sur
un plan : il ne calibre pas les collisions quelconques de deux billes en vol.
Les hauteurs de hop qu’il estime sont des illustrations théoriques, pas des
mesures à transformer en cibles automatiques pour notre jeu.

La note de Peskin (2020) et TP A-14 ont été relues pour les vitesses de surface,
les signes des couples et l’arrêt du glissement. Les équations et leurs limites
restent détaillées dans [l’étude 0.94](FROTTEMENT_EN_VOL_v0.94.md).

## Intégration retenue

Un noyau indépendant applique une impulsion normale et une impulsion tangentielle
entre sphères homogènes identiques, avec la normale réelle du contact 3D.

- **Deux billes libres :** les deux composantes tangentielles utilisent la vitesse
  des surfaces, avec les trois composantes de rotation. Coulomb est plafonné par
  l’annulation du glissement, avec mobilité tangentielle `7/m`. Les deux billes
  reçoivent les variations de rotation correspondant aux couples de contact.
- **Bille soutenue par le tapis :** le support normal existant reste présent.
  Seule la tangente horizontale perpendiculaire à la normale du choc reçoit le
  frottement ajouté, car elle est découplée de ce support. Pour une normale
  verticale, le plan tangent est horizontal et ses deux composantes sont libres.
  La tangente inclinée, la réaction normale et le frottement du tapis pendant
  un contact simultané demandent encore un solveur couplé. Ils ne sont pas
  présentés comme résolus par cette mise à jour.
- Une bille qui s’élève déjà depuis la hauteur du tapis est correctement classée
  libre, plutôt que soutenue à cause de sa seule position.
- Les corrections de chevauchement conservent la somme des hauteurs entre deux
  billes libres lorsque c’est possible. Avec support, la correction reste
  horizontale ; pour un choc quasi vertical aligné, les vitesses séparent le
  petit chevauchement au pas fin suivant. Aucun déplacement vertical arbitraire
  n’ajoute d’énergie potentielle pour forcer la séparation.

La restitution bille–bille reste à **0,94**. La loi de frottement existante,
`μ(s)=0,009951+0,108 exp(-1,088s)`, utilise maintenant le glissement de surface 3D
pour ce parcours. Il s’agit d’une extension isotrope de l’ajustement TP A-14/Marlow,
**sans nouvelle calibration expérimentale de chocs aériens**.
Les coups entièrement au sol conservent leur solveur précédent. Le guide et le
replay restent liés aux trajectoires du même moteur.

## Validation terminée

- **329 tests réussis**, aucun échec ni test ignoré, dont les huit nouveaux tests
  du noyau et de son intégration. Les anciens tests de trajectoire, de replay,
  de réception et de règles restent inclus dans la suite.
- Cas libres : comparaison aux résultats indépendants de l’étude 0.94 et bilans
  de quantité de mouvement/énergie sur 150 états et rotations de repère.
- Cas soutenus : 150 états dissipatifs, réaction normale de la table prise en
  compte dans le bilan vertical, cible restant à la hauteur du tapis.
- Chromium/SwiftShader : deux billes libres démarrent à 20 cm de hauteur de
  centre, dont une avec une rotation de 30 rad/s. Après le choc, la cible a une
  rotation de −8,90 rad/s et les vitesses verticales diffèrent. Les hauteurs des
  maillages correspondent aux corps physiques et le replay enregistre la rotation.
- Sur une cible soutenue, une rotation latérale d’environ −0,562 rad/s est observée
  juste après le contact, puis le frottement du tapis la dissipe. La cible reste
  à `y=R` avec `vy=0`. L’énergie mécanique totale ne croît pas dans les deux
  parcours synthétiques contrôlés. Aucune erreur JavaScript relevée.

Ces contrôles utilisent des états initiaux artificiels pour isoler le phénomène,
avec des accès QA ajoutés uniquement par un serveur temporaire ; ils ne sont
pas des mesures de billes réelles. Le cas de contact soutenu reste volontairement
limité : la tangente inclinée et le frottement du tapis pendant le choc multiple
sont les prochaines parties à modéliser et à confronter à des mesures.

[Mesures navigateur](data/airborne-friction-v095-validation.json) ·
[Capture du cas libre](data/airborne-friction-v095.png) ·
[Sources complémentaires](data/airborne-friction-v095-sources.json).
