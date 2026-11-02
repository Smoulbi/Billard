# FRAME v0.21 — amélioration contrôlée des rebonds de pool américain

**31 octobre 2026.** Ce mode expérimental conserve l'architecture du contact 3D v0.20 ; seuls ses paramètres **effectifs** sont réestimés dans un intervalle restreint. Les versions v0.17, v0.18, v0.19 et v0.20, ainsi que la branche snooker, restent sélectionnables ou accessibles sans modification de leurs équations.

## Résultat quantifié

La référence demeure la régression publiée issue de **1 217 impacts sur une table de pool américain**, Nierhoff, Heunisch et Hirche. Nous comparons 24 composantes (normale et tangentielle, 3 vitesses, 4 angles) après retour au premier roulement.

| Variante | Erreur absolue moyenne (points) | RMSE (points) | Plus grand écart absolu (points) |
| --- | ---: | ---: | ---: |
| v0.17 empirique | 0,051 | 0,081 | — |
| v0.18 déformable | 4,584 | 7,793 | — |
| v0.19 déformable ajusté | 4,409 | 7,193 | — |
| v0.20 contact 3D | 3,339 | 5,009 | 14,161 |
| **v0.21 contact 3D affiné** | **2,783** | **3,847** | **11,076** |

Le RMSE baisse de **23,2 %** par rapport à v0.20 ; la MAE baisse de **16,7 %**. Sur les deux composantes de la vitesse sortante :

| Vitesse initiale | RMSE v0.20 | RMSE v0.21 | Type de contrôle |
| --- | ---: | ---: | --- |
| 0,5 m/s | 6,371 | 4,709 | Entraînement |
| 1,2 m/s | 4,675 | 3,682 | Interpolation, exclue de l'objectif |
| 2,3 m/s | 3,581 | 2,943 | Entraînement |

Les quatre angles (30°, 45°, 60°, 75°) montrent également des réductions du RMSE agrégé.

Deux cas restent problématiques :

- **0,5 m/s, 30°, tangente** : valeur publiée 85,64 %, v0.20 71,48 %, **v0.21 74,56 %**, soit encore **−11,08 points**.
- **2,3 m/s, 75°, tangente** : valeur publiée 71,85 %, v0.20 80,96 %, **v0.21 78,55 %**, soit encore **+6,69 points**.

La v0.17 correspond presque parfaitement à cette régression parce que ses équations ont été **inversées à partir de celle-ci**. Ses 0,051 point ne constituent pas une validation externe.

## Procédure de recherche reproductible

`node scripts/fit-cushion-v021.js` exécute une recherche différentielle déterministe de **42 candidats × 220 générations**. La fonction objectif utilise les impacts à **0,5 et 2,3 m/s** ; elle pénalise le RMSE et le plus gros écart, afin de ne pas améliorer la moyenne en sacrifiant un angle. Les cas à **1,2 m/s** sont évalués **après** la recherche.

Une première recherche très large avait atteint simultanément les bornes des coefficients de frottement, raideur et dépendance à la vitesse. Elle a été **rejetée** : ces valeurs pouvaient reproduire les régressions mais ressemblaient à une compensation numérique sans fondement matériel vérifié.

La recherche finale est limitée à une **région de confiance** autour de la v0.20. Les paramètres obtenus sont arrondis avant intégration dans le moteur ; les chiffres ci-dessus sont recalculés avec ces valeurs arrondies.

| Paramètre effectif | v0.20 | v0.21 | Bornes de recherche v0.21 |
| --- | ---: | ---: | ---: |
| Frottement dynamique de base `μd0` | 0,120 | **0,105** | 0,105–0,150 |
| Frottement statique de base `μs0` | 0,125 | **0,106** | `μd0` à `μd0+0,060` |
| Gain de friction selon vitesse `A` | 0,450 | **0,600** | 0,350–0,600 |
| Vitesse caractéristique `s0` | 1,70 m/s | **1,59 m/s** | 1,30–2,10 m/s |
| Exposant de transition `p` | 2,0 | **2,8** | 1,4–2,8 |
| Fréquence tangente / normale | 1,856 | **1,60** | 1,60–2,10 |
| Rapport de raideur verticale/horizontale | 1,0 | **0,70** | 0,70–1,40 |
| Amortissement tangentiel réduit | 0,0261 | **0,050** | 0,015–0,050 |
| Fréquence normale | 2 200 rad/s | **inchangée** | Non identifiée |
| Pas d'intégration du contact | 320 | **inchangé** | Choix numérique |

La loi effective est :

`μ(s) = clamp[μ0 + A × tanh((|s|/s0)^p), 0, 1,5]`.

Elle s'applique à chaque itération en utilisant la norme des **deux glissements tangentiels au point de contact**. La direction de la force suit la loi de Coulomb vectorielle du résolveur v0.20. La restitution normale et le contrôle exact de l'énergie sont conservés.

**Important :** plusieurs coefficients de v0.21 touchent encore les limites de la région de confiance. Il serait incorrect de les identifier à la raideur, au coefficient de frottement ou à la viscoélasticité mesurés d'une bande K55/K66. Ils sont corrélés et leur unicité n'est pas démontrée.

## Vérifications réalisées

- 94 tests automatisés réussis : contacts physiques, conservation ou dissipation d'énergie à fort effet, mêmes états entre prévision et tir réel simulé, stabilité des modes précédents, snooker inchangé.
- Amélioration de l'erreur **pour chacun des trois groupes de vitesse**, y compris celui exclu du critère d'entraînement.
- Diminution du **plus grand écart** de chaque groupe de vitesse.
- Les rapports distinguent toujours le **fit de publication** d'une **validation indépendante sur table réelle**.

## Travaux et limites physiques

- [Mathavan, Jackson et Parkin (2010)](https://drdavepoolinfo.com/physics_articles/Mathavan_IMechE_2010.pdf) obtiennent `e≈0,98`, `μ≈0,14` à partir d'expériences sur le snooker. Ces nombres ne sont **pas** des propriétés mesurées des bandes américaines de notre simulation.
- [Gismeros Moreno et al. (2022)](https://doi.org/10.1007/s11071-021-07117-4) évaluent un modèle de contacts multiples incluant tapis et bandes, avec une vérification sur vidéo de pool. Leur article indique que les jeux de données de l'étude sont **disponibles auprès de l'auteur sur demande**, et non directement utilisables pour notre calibration.
- Les études générales sur la friction viscoélastique du caoutchouc, notamment [Persson et al. (2015)](https://pubmed.ncbi.nlm.nih.gov/26001467/), justifient d'examiner une dépendance à la vitesse, mais **pas** de reprendre automatiquement leurs coefficients pour une bande K55/K66.
- [Pooltool](https://pooltool.readthedocs.io/en/latest/autoapi/pooltool/physics/index.html) expose des modèles Stronge 2D/3D plus complets ; notre solveur reste une approximation indépendante.

Le principal progrès technique suivant ne réside pas dans un nouvel élargissement arbitraire de la recherche de paramètres. Il exige des **mesures indépendantes de vitesse, angle, rotation et glissement** sur des bandes américaines identifiées, puis l'introduction d'un **contact simultané bille–tapis–bande** lorsque les données le justifient. Notre simulation continue de contraindre le centre de la bille à rester sur le tapis : elle ne calcule ni saut ni impulsion de support vertical dynamique.

Les consignes d'acquisition et d'import de mesures réelles restent dans [VALIDATION_PROTOCOL_v0.20.md](VALIDATION_PROTOCOL_v0.20.md). Une vitesse mise de côté dans une régression déjà utilisée pour calibrer n'est **pas une validation indépendante**.
