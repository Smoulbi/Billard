# FRAME v0.37 — Audit des approximations et contrôles

Date : 1 novembre 2026. Périmètre : code applicatif `dist/*.js`, scripts de modélisation/calibration et suite de tests du dépôt. Le moteur Three.js fourni dans `dist/vendor` est une dépendance tierce, hors audit. Il s'agit d'une inspection du code et de contrôles ciblés, **pas d'une validation métrologique indépendante**.

## 1. Erreur avérée corrigée — géométrie des six poches

La v0.36 utilisait `p.radius + RADIUS` comme rayon d'un cercle **entrant** dans le tapis (`pocketVisibleSagitta`). Or `p.radius` est une étiquette de poche de `physics.js`, et non un rayon de découpe du drap mesuré. Cette construction effaçait artificiellement **24,36 mm** de surface bleue au milieu des poches latérales et **16,11 mm** aux poches d'angle, mesurés perpendiculairement à la corde des mâchoires. Une doublure noire recouvrait ensuite la zone artificielle entre ce cercle et la découpe d'ardoise, augmentant encore le « trou » visible.

La v0.37 :

- conserve exactement les six cordes entre les mâchoires de `physics.js` : **129,6 mm latérales** et **environ 114,27 mm d'angle** ;
- reconstruit le bord du drap du côté **extérieur** de ces cordes, en suivant la profondeur de *shelf* existante, **6 mm** latéral et **35 mm** angle ;
- place les bordures noires et doublures derrière le bord d'ardoise et sous le plan de jeu ;
- fait employer au Canvas2D la même découpe et réduit son trait foncé de **24 à 6 mm**, ce qui évite un effet de poche élargie spécifique au navigateur de secours ;
- ajoute des assertions géométriques de signe (aucun retrait de drap vers le centre), des contrôles de triangles réellement triangulés, de symétrie et de non-recouvrement.

**Limite résiduelle :** la WPA impose une profondeur de tablette au milieu de la poche, mais ne fournit pas l'intégralité du contour d'ardoise d'un fabricant. Le profil circulaire employé entre les mâchoires est donc une **hypothèse de raccordement**, bornée par les dimensions physiques de la simulation, et non une numérisation d'une Brunswick ou d'une Diamond. Aucun changement à `dist/physics.js` ou aux lois de contact.

## 2. Inventaire des autres approximations importantes

| Gravité | Source | Constat | Conséquence / statut |
| --- | --- | --- | --- |
| **Élevée pour le réalisme de l'empochage** | `dist/physics.js` : `inPocket` | La bille est désactivée après un seuil de profondeur et une condition de position (marges `0.006` / `0.016` m). Aucun volume de chute, collision avec le cuir, basculement au bord ou rattle tridimensionnel. `p.radius` n'intervient pas dans cette capture. | Une poche visuellement exacte ne rendra pas à elle seule les empochages réalistes. **Physique inchangée**, à traiter comme projet séparé avec mesures et tirs de référence. |
| **Élevée pour les tirs spéciaux** | `dist/physics.js` : `getCueImpact`, `advanceBall` | Le moteur actif reste planaire pour les positions. Élévation et effet latéral créent du *swerve*, mais ni sauts, ni massés complets, ni translation verticale. Les pertes d'impulsion d'une fausse queue sont représentées par des facteurs déterministes `0.60 - 0.25 × slipExcess`, non mesurés ici. | Ne pas interpréter ces scénarios comme des prédictions 3D validées. **Inchangé** et signalé dans l'interface. |
| **Moyenne** | `dist/power.js` | Conversion curseur 0–100 % → 0–12 m/s par une fonction par morceaux ajoutant une réserve de casse. Elle n'est pas issue d'une courbe mesurée queue/impact ; les tests valident sa cohérence interne. | Dosage reproductible mais pas étalonnage d'un geste humain. **Inchangé**. |
| **Moyenne** | `dist/cushion-profiles.js`, `dist/compliant-cushion.js`, `dist/coupled-cushion.js` | Le mode pool par défaut reproduit la régression TUM de 1 217 rebonds sur une table donnée, sans jeu de tirs indépendants. Extrapolations pour effet latéral, rétro et vitesses hors de la plage de référence. Les variantes mécaniques ont raideurs/frottements effectifs identifiés ou hypothétiques et ne sont pas des mesures K55/K66. | Résidus sur le fit ≠ validation indépendante. **Modes et constantes inchangés**. |
| **Moyenne** | `dist/physics.js` : `BALL_CONTACT_STIFFNESS`, `PACK_CONTACT_DURATION`, `MAX_COLLISION_EVENTS` | La casse en grappe utilise une raideur Hertz effective de `3.8e8 N/m^(3/2)`, une fenêtre de `2.5 ms` et un plafond de `80` événements par sous-pas. Ces choix ne sont pas des propriétés mesurées du lot de billes de l'utilisateur. | Tests de stabilité et de répartition passent, mais un plafond d'événements peut tronquer des configurations pathologiques. **Inchangé**, contrôle expérimental futur requis. |
| **Moyenne pour la fidélité visuelle** | `dist/game.js` : `addCushionWedge`, `makeCornerLeg`, `makeTable` | Profils de caoutchouc « K55-like », épaisseurs des rails, châssis et pieds dessinés à partir de cotes de construction choisies, sans plan coté de la table photographiée. Le nez de bande et la surface de jeu utilisent les cotes physiques cohérentes. | Rendu plausible, mais pas jumeau numérique dimensionnel de la table de référence. **Inchangé**. |
| **Moyenne pour la fidélité des poches** | `dist/table-pocket-geometry.js` : `pocketCastingOutline`, `pocketCollectorRadii`, `pocketShelfCurve` | Congés 34/37 mm, retour supérieur circulaire, rayons du collecteur (`0.66` / `0.46` de demi-ouverture) et profil complet de tablette non mesurés sur une pièce d'origine. | Les dimensions des mâchoires sont fiables, mais le bois et la poche sous le plateau restent modélisés. **Maintenus** ; tests garantissent qu'ils n'empiètent pas sur le tapis. |
| **Faible, visuelle** | `dist/trajectory.js`, `dist/lab.js` | Prévision de trajectoire limitée à 540 pas, tronçons après impact à 72 pas / 0,62 m ; télémétrie échantillonnée au plus à 60 Hz. | Affichage et export limités, mais ces bornes **ne modifient pas** le mouvement du jeu. |
| **Faible, visualisation** | `dist/game.js` : `drawFallback`, `dist/table-pocket-geometry.js` : `pocketWellOutline` | Le rendu Canvas2D simplifie les volumes sous la table en aplats et dégradés. Son ancien trait de drap démesuré a été corrigé en v0.37. | Le secours 2D ne reproduit pas le relief WebGL ; contour de jeu partagé et **corrigé**. |
| **Faible, placement** | `dist/placement.js` | Marges fixes de quelques millimètres empêchant la mise en place de la blanche dans une bande ou une autre bille. | Tolérances de sécurité d'interface, et non rayons réels de poches. **Inchangé**. |

## 3. Ce qui est étayé plutôt qu'arbitraire

- Surface de jeu 100 × 50 pouces (`LENGTH=1.27`, `WIDTH=0.635`) ; billes 57,15 mm de diamètre.
- Largeurs de bouche des six poches à l'emplacement des nez de bande : environ 114,27 mm aux coins et 129,6 mm aux côtés, dans les intervalles de la WPA ; hauteur de nez égale à 63,5 % du diamètre de bille.
- Tablette de 35 mm / 6 mm choisie **à l'intérieur** des intervalles WPA. Ce sont des profondeurs réglées, pas un contour constructeur complet.
- Régression empirique pool TUM explicitement isolée des anciens résultats sur snooker ; étude de contact simultané bille–bande–drap conservée comme **recherche**, hors moteur actif.

## 4. Contrôles v0.37

- Suite complète : `npm test` — **129 tests réussis, 0 échec** après modification. Tests géométriques ciblés relancés après ajout des contrôles de triangulation : **12 réussis**.
- Scène exportée : **166 maillages, 18 748 triangles** ; vues de dessus, perspective, profil, angle et poche latérale générées et inspectées avec le moteur de projection hors ligne.
- Aperçu dans le navigateur de prépublication : FRAME **v0.37** chargé ; Canvas2D de secours inspecté. **WebGL indisponible dans ce navigateur**, donc aucune affirmation de validation visuelle en WebGL réel.
- Diff limité aux fichiers de géométrie/rendu/présentation, scripts de contrôle, tests et ce rapport ; `dist/physics.js`, les autres solveurs, les constantes et les données expérimentales ne sont pas modifiés.

## 5. Suites techniquement justifiées

Pour atteindre une fidélité 3D mesurable, il manque au modèle des orthophotos et des cotes du bord des poches ainsi qu'une coupe rail/bande et des dimensions de châssis du fabricant choisi. Pour le comportement dynamique, il manque des essais mesurés distincts pour l'empochage, les fausses queues, l'effet latéral et la casse. Aucun de ces manques ne justifie d'inventer un « rayon de poche » visuel.
