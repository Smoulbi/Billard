# FRAME v0.20 — contact 3D couplé, identification contrainte et contrôle de preuve

**Date** : 31 octobre 2026. **Profil** : billard américain, bille de 57,15 mm, masse 170,097 g, nez de bande à 63,5 % du diamètre.

## 1. Modification du modèle

La v0.19 résout une restitution normale et un seul ressort tangentiel dans le plan de jeu. Or le contact est situé **au-dessus du centre** de la sphère, et la rotation entraîne un glissement **vertical** au niveau de la bande. La v0.20 ajoute ce deuxième degré de liberté tangentielle et leur interaction avec l'impulsion normale :

- Repère local `(n,t,u)` : normale horizontale à la bande, tangente horizontale, verticale ; point de contact `r = -a n + h u`, `h = hauteur_nez - R`, `a = sqrt(R² - h²)`.
- Vitesse relative normale `v_n = v·n - h ω·t`.
- Vitesse tangentielle horizontale `v_t = v·t + h ω·n + a ω_y`.
- Vitesse de cisaillement vertical `v_u = -a ω·t` (translation verticale de la bille contrainte à zéro).
- Inverse de masse de contact : `K_nn = 1/m + h²/I`, `K_tt = 1/m + R²/I`, `K_uu = a²/I`, **`K_nu = h*a/I`**, `I = 2/5 m R²`.
- Force tangentielle simulée par **deux** ressorts-amortisseurs à intégration événementielle ; un seul cône de Coulomb impose `sqrt(F_t²+F_u²) ≤ μ F_n`, avec adhérence et glissement.
- L'impulsion normale est compensée de la contribution verticale : `J_n = [-(1+e)v_n - K_nu J_u] / K_nn`. La restitution normale imposée demeure exacte.
- Le bilan d'énergie cinétique de translation horizontale et de rotation est calculé exactement comme une forme quadratique en impulsions. Un éventuel excès numérique entraîne une réduction uniforme des impulsions de cisaillement, **sans altérer la restitution normale**.

Ce modèle est **original et simplifié**. Il n'est **pas** le solveur analytique Stronge de Pooltool ; celui-ci étudie notamment les transitions adhérence/glissement dans un contact tridimensionnel et peut autoriser une composante verticale du mouvement. FRAME conserve le centre de la bille sur le tapis. Ce choix implique une réaction du tapis supposée immédiate et exclut les sauts, l'écrasement local géométrique des bandes et les impacts simultanés détaillés bille–bande–tapis.

## 2. Variation de frottement et identification

La v0.20 teste une **loi de frottement effective**, et **non une loi constitutive mesurée du caoutchouc** :

`μ(s) = clamp(μ0 + A * tanh[(s / s0)²], 0, 1.5)`.

| Paramètre v0.20 | Valeur | Statut |
| --- | ---: | --- |
| `normalAngularFrequency` | 2 200 rad/s | Hypothèse v0.18 conservée |
| `tangentToNormalFrequency` | 1,8560389 | Ajustement interne v0.19 conservé |
| `tangentDampingRatio` | 0,0261137 | Ajustement interne v0.19 conservé |
| `verticalToHorizontalStiffness` | 1,0 | Hypothèse isotrope, non mesurée |
| `dynamicFriction = μd0` | 0,120 | Borne basse de recherche, effectif |
| `staticFriction = μs0` | 0,125 | Très proche de la borne, effectif |
| `velocityFrictionGain = A` | 0,450 | Borne haute de recherche, effectif |
| `velocityFrictionScale = s0` | 1,7 m/s | Ajustement interne, arrondi |
| `integrationSteps` | 320 | Quadrature locale événementielle |

Recherche : `node scripts/explore-coupled-friction.js` avec graine déterministe, `7 000` tirages larges et `3 000` tirages locaux. Les vitesses **0,5 et 2,3 m/s** appartiennent à l'objectif ; **1,2 m/s** n'entre pas dans l'objectif et mesure uniquement la cohérence d'interpolation des mêmes régressions.

**Avertissement : l'optimum au bord des bornes** indique que ces paramètres ne sont pas physiquement identifiés de manière unique. Une augmentation de l'intervalle pourrait baisser l'erreur interne, sans apporter d'information supplémentaire sur le matériau. Les limites sont délibérément conservées.

## 3. Résultats sur la régression TUM (non indépendante)

24 composantes : 3 vitesses, 4 angles, 2 directions ; erreur en points de pourcentage.

| Solveur | MAE | RMSE |
| --- | ---: | ---: |
| Empirique v0.17 | 0,051 | 0,081 |
| Déformable v0.18 | 4,584 | 7,793 |
| Ajusté v0.19 | 4,409 | 7,193 |
| Couplé v0.20 | **3,339** | **5,009** |

RMSE par sous-ensemble de vitesse :

| Vitesse | v0.19 | v0.20 | Interprétation |
| --- | ---: | ---: | --- |
| 0,5 m/s | 8,476 | 6,371 | Donnée d'ajustement |
| 1,2 m/s | 4,864 | 4,675 | Contrôle d'interpolation, toujours même régression |
| 2,3 m/s | 7,727 | 3,581 | Donnée d'ajustement |

Sur un impact à 2,3 m/s et 75° : composante tangentielle **régression 71,85 %**, v0.19 **90,82 %**, v0.20 **80,96 %**. L'écart reste **9,11 points**. Ne pas qualifier v0.20 de solution « calibrée physiquement » ni supprimer le mode empirique v0.17.

## 4. Origine des données

1. **Nierhoff, Heunisch & Hirche**, *Strategic Play for a Pool-Playing Robot*, données rapportées sur **1 217 impacts** : [TU München — PDF](https://mediatum.ub.tum.de/doc/1155344/988748.pdf). Les formules de sortie au premier roulement sont les **cibles de calibration**. Le jeu de mesures brutes 1 217 tirs n'est pas inclus.
2. **Evan Kiefl et coll., Pooltool**, code/documentation de référence : [modèles de collisions bille–bande](https://pooltool.readthedocs.io/en/latest/autoapi/pooltool/physics/index.html) et [résolveur par défaut](https://pooltool.readthedocs.io/en/latest/_modules/pooltool/physics/resolve/resolver.html). Leurs modèles Stronge 2D/3D ne sont pas reproduits à l'identique ; ils éclairent les limites de notre ressort simplifié.
3. **Mathavan, Jackson & Parkin (2009–2010)**, étude de collisions et de bandes de snooker : [article AJP](https://drdavepoolinfo.com/physics_articles/ajp_09_hsv_article.pdf). Référence méthodologique, **pas** coefficient mesuré sur un caoutchouc de pool US.

## 5. Ce qui manque encore

- **Validation sur de nouvelles vidéos d'impacts US** : positions/vitesses entrantes et sortantes et moment du premier roulement, idéalement plusieurs tables K55/K66.
- **Mesures matérielles** : réponse en fréquence, loi force–déformation, amortissement, durée de contact, frottement statique/dynamique sur la bande réelle ; les paramètres actuels sont effectifs et corrélés.
- **Interaction bille–tapis pendant l'impact** : la translation verticale est bloquée ; ne permet pas de simuler les sauts, les décollements et les pertes d'énergie au tapis en même temps que le contact bande.
- **Géométrie réelle des bandes** : face biseautée, rayon d'arête, position exacte du nez, différences K55/K66 et compressibilité locale.
- **Données avec effet** : réponse à l'effet latéral, rétro, coulé et à l'angle rasant. La régression TUM utilisée concerne des tirs en roulement sans effet latéral.
- **Validation hors régression** : la vitesse de 1,2 m/s réservée ne constitue pas un échantillon indépendant. Aucune mesure indépendante n'est déclarée avant import explicite d'un nouveau jeu.
- **Évaluation statistique** : incertitude des mesures, répétitions, variation entre tables, et sensibilité des paramètres de ressort/amortissement à mesurer séparément.

## 6. Conservation

Les fonctions de v0.17, v0.18 et v0.19 restent dans leurs fichiers et leur branche de résolution antérieure. La nouvelle loi n'est appelée que pour `profile='pool'`, segment de bande `rail` et `cushionModel='coupled-3d'`. Le snooker et les coins de poche ne sont pas modifiés ; la géométrie de table utilisée pour le snooker reste cependant américaine.
