# FRAME v0.17 — contact tangentiel sur bandes de pool américain

31 octobre 2026. Version active : **billard américain 9 pieds**. Le profil snooker historique est conservé sans recalibrage.

## Études analysées et ce qu'elles démontrent

1. **Thomas Nierhoff, Kerstin Heunisch, Sandra Hirche**, *Strategic play for a pool-playing robot*, TU München, [PDF](https://mediatum.ub.tum.de/doc/1155344/988748.pdf), section IV. Les auteurs exploitent **1 217 rebonds effectivement enregistrés sur une table de pool** ; ils ajustent une loi de direction (`e_bc`) et une loi de vitesse totale après rebond (`δ_v`) en fonction de la vitesse et de l'incidence. C'est **la source directe de calibrage US**. Le papier ne mesure ni le coefficient de frottement du caoutchouc ni les vitesses angulaires après impact.
2. **Raúl Gismeros Moreno et al.**, [*Modelling multiple-simultaneous impact problems with a nonlinear smooth approach: pool/billiard application*](https://doi.org/10.1007/s11071-021-07117-4), *Nonlinear Dynamics* 107, 1859–1886 (2022). Modèle multibody de **pool**, contact de type Lankarani–Nikravesh et forces de friction ; comparaison à une séquence vidéo haute vitesse d'un contact perpendiculaire à **2,724 m/s**. Les paramètres de frottement `0,14` et restitution `0,98` repris pour une autre comparaison viennent de **Mathavan et al., conditions de snooker** : ils ne constituent **pas** des mesures propres au caoutchouc K66 US.
3. **Rod Cross**, [*Impact of a ball on a surface with tangential compliance*](https://doi.org/10.1119/1.3313455), *American Journal of Physics* 78 (2010). Explication physique de la déformation tangentielle, du collage/glissement et de l'inversion du frottement pendant les collisions contre des surfaces souples. Le billard est évoqué, mais **les paramètres de son exemple de raquette de tennis ne sont pas des mesures de bande américaine**.
4. **Pooltool**, [documentation du moteur de collisions de bandes](https://pooltool.readthedocs.io/en/latest/autoapi/pooltool/physics/index.html). Implémentations distinctes du contact impulsionnel 3D, de Mathavan 2010 et de la conformité tangentielle de Stronge. C'est une **référence d'architecture**, non une nouvelle mesure de coefficient sur les bandes US.

## Correction technique

La v0.16 reproduisait la restitution normale après glissement, mais bloquait l'impulsion tangentielle à `μ = 0,20` quel que soit l'angle ou la vitesse. Cette valeur **n'avait pas été mesurée sur une bande US**. À `2,3 m/s` et `60°` de la normale, le modèle conservait ainsi **82,30 %** de la composante tangentielle, contre **70,10 %** prévus par la régression TUM.

La v0.17 effectue l'**identification inverse de la résistance tangentielle effective**. Pour une bille en roulement naturel, sans effet latéral, l'impulsion tangentielle permettant d'atteindre la composante post-glissement de TUM est :

```text
q              = sqrt((e_bc cos θ)^2 + sin^2 θ)
r_t            = δ_v / q
J_t,cible      = (r_t - 1) v sin θ / [5(1+h/R)/(7m)]
J_n,roulement  = (1+e_impulsion) (1+h/R) v cos θ · m / [1+2,5(h/R)^2]
μ_effectif     = min(0,90, max(0,20, |J_t,cible| / J_n,roulement))
```

`h = 0,27R` est le décalage vertical du nez de bande ; `e_impulsion` est le coefficient interne calculé à partir de la loi de restitution normale pool. On garde **le calcul d'impulsion rigide 3D et les trois composantes de rotation**, mais sa limite de résistance tangentielle dépend désormais de la vitesse et de l'incidence. La correction préexistante de vitesse tangentielle après glissement est **bornée par cette résistance inversement identifiée** et par un contrôle exact de l'énergie cinétique translation + rotation.

**Important :** `μ_effectif` n'est **ni** un coefficient de frottement statique/kinétique mesuré, **ni** une loi de matériau indépendante. Il rassemble en un paramètre opérationnel le frottement, la déformation de la bande et les approximations de notre solveur impulsionnel. Son utilisation avec des effets latéraux est **une extrapolation**. Le plafond `0,90` est un garde-fou numérique : pas une valeur publiée pour du caoutchouc de pool. Aux incidences encore plus rasantes et au-delà de l'enveloppe testée, un écart peut subsister.

## Régression de pool : comparaison avant / après

Chaque ligne ci-dessous compare une **valeur interpolée par les régressions de l'étude**, pas une observation directe enregistrée exactement à cet angle et cette vitesse.

| Vitesse / angle depuis la normale | Tangentielle TUM | FRAME v0.16 | FRAME v0.17 | `μ_effectif` v0.17 |
|---|---:|---:|---:|---:|
| 0,5 m/s / 30° | 85,64 % | 85,57 % | 85,57 % | 0,200 (seuil) |
| 1,2 m/s / 30° | 78,35 % | 78,33 % | 78,33 % | 0,200 (seuil) |
| 2,3 m/s / 30° | 66,40 % | 66,39 % | 66,39 % | 0,200 (seuil) |
| 2,3 m/s / 45° | 68,73 % | 69,18 % | 68,73 % | 0,203 |
| **2,3 m/s / 60°** | **70,10 %** | **82,30 %** | **70,08 %** | **0,338** |
| **2,3 m/s / 75°** | **71,85 %** | **91,80 % environ** | **71,84 %** | **0,689** |
| 2,3 m/s / 80° | 72,73 % | ≈ 92 % | **75,76 %** | 0,900 (plafond) |

À `2,3 m/s`, les composantes normales après glissement restent conformes à la loi TUM : par exemple à `60°`, **53,25 %** calculés contre **53,21 %** de régression. Leurs combinaisons reproduisent correctement la direction et la vitesse totale des rebonds sans effet.

**Ne pas interpréter le petit écart v0.17–TUM comme une validation indépendante** : la loi cible a servi explicitement à identifier le coefficient effectif. La validation doit se faire sur une autre table de pool et idéalement sur des trajectoires horodatées et rotations mesurées.

## Contrôles et compatibilité

- **65 tests réussis**, contre 64 avant. Les essais couvrent vitesses `0,5 / 1,2 / 2,3 m/s`, incidences `15 / 30 / 45 / 60 / 75°`, mouvements avec effet latéral et excès de spin, contrôle d'absence de gain artificiel d'énergie, collisions de billes, casse et identité trajectoire affichée/simulée.
- Le banc de calibration passe de **51 à 57 scénarios** avec les six composantes supplémentaires de bandes à `75°`. Export CSV inchangé.
- **Snooker conservé** : `simulatePhysics(balls, dt, {cushionProfile:'snooker'})` garde exactement son modèle d'impulsion v0.14, sa régression Mathavan `e_base = 0,76`, son frottement de bande `0,14` et sa résistance de tapis `0,0128`. La géométrie du plateau reste actuellement américaine, y compris en profil snooker.
- Même code physique pour jeu, prévision de trajectoire et banc de calibration ; réglage par défaut `pool`.
- L'archive n'effectue **aucune mise à jour d'un serveur distant**.

## Tous les paramètres encore à affiner

| Priorité | Paramètre | Valeur / état v0.17 | Donnée encore nécessaire |
|---|---|---|---|
| Critique | Frottement tangent **matériel** bille/bande | Seuil `0,20` ; identification inverse pouvant atteindre `0,90` | Essais friction contre caoutchouc K66/K55, forces normal/tangent et régime collage/glissement, indépendants du fit TUM |
| Critique | Raideur, hystérésis et durée du contact gomme/bille | Non résolues dans le temps ; effet concentré dans l'impulsion | Courbes force-déformation, vidéo 1 000–10 000 fps, temps de contact et variabilité de la température |
| Critique | Bancs obliques **avec spin mesuré** | Calcul 3D + enveloppe identifiée **sans effet** | Mesures pool `v_x/v_n/ω_x/ω_y/ω_z` à plusieurs angles, puissances et effets ; comparaison hors échantillon |
| Haute | Limite de validité TUM (grands angles / casses) | Vitesse bornée numériquement à `3 m/s`, friction à `0,90` ; residual à `80°` | Distribution réelle des 1 217 tirs, incertitudes et tests sur une autre table |
| Haute | Restitution normale en fonction de vitesse/incidence | `e_eff(v,θ)` inversée de `e_bc,δ_v` | Mesure sur plusieurs marques de bande US, type gomme, état de maintenance |
| Haute | Frottement de glissement sur tapis US | `μ_slide=0,20` constant | Fonctions vs vitesse, humidité, tissu et état des billes (TUM propose des coefficients dépendant de vitesse) |
| Haute | Résistance au roulement tapis US | `μ_roll=0,010` constant | Mesures sur tapis cible ; TUM observe ~`0,0075−0,0004v` à vitesse > 0,0473 m/s sur sa table |
| Haute | Rotation verticale résiduelle sur tapis | `μ_spin=0,015` | Mesures de `ω_y(t)` en pool sur billes marquées |
| Moyenne | Restitution des faces de poche | `e_facing=0,78`, `μ_facing=0,20` | Relevés de rejet/rattle sur *jaw facings* US à plusieurs vitesses et angles |
| Moyenne | Bille-bille : restitution | `e_bb=0,94` | Vidéo / impact instrumenté sur billes 57,15 mm en résine phénolique |
| Moyenne | Bille-bille : friction/throw | `μ_bb(s)=0,009951+0,108 exp(−1,088|s|)` | Angles de *throw* et transfert de spin en pool à différentes vitesses |
| Moyenne | Queue / contact procédé-bille | Masse effective `0,55 kg`, bout `0,018 kg`, fausse-queue `0,50R` | Tests de *squirt*, élévation, *swerve*, vitesse de queue, craie et procédé |
| Moyenne | Casse : raideur des contacts bille-bille | `K=3,8·10⁸ N/m^(3/2)` ; `1 µs` ; fenêtre `2,5 ms` | Vidéo à haute fréquence de l'ouverture du triangle et contacts simultanés |
| Moyenne | Géométrie détaillée des poches / rails | Table 2,54 × 1,27 m, nez 63,5 % du diamètre, facings 142°/104° | Plan coté d'une table US physique, profil et déformabilité de gomme, dimensions du *shelf* |
| Séparée | Snooker complet | Physique de bande d'origine disponible, mais plateau/poches/billes US | Géométrie 52,4 mm, tissus et bandes snooker ; calibrage distinct |

La gravité (`9,81 m/s²`) et l'inertie d'une bille homogène (`I=2mR²/5`) ne sont pas des paramètres d'ajustement libre.
