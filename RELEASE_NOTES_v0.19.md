# FRAME v0.19 — calibration tangentielle limitée et contrôlée

31 octobre 2026. **La précision expérimentale n'est améliorée que modestement**. Pool v0.17 empirique reste sélectionné par défaut ; v0.18 déformable non modifié ; v0.19 ajusté accessible en option ; snooker historique intact.

## Résultat scientifique

L'étude de [Nierhoff, Heunisch et Hirche (2012)](https://mediatum.ub.tum.de/doc/1155344/988748.pdf) fournit deux **régressions vitesse–direction** tirées de 1 217 rebonds de billard américain. Elles servent ici de référence opérationnelle. Le contact souple est inspiré de [Stronge (2018)](https://www.cambridge.org/core/books/abs/impact-mechanics/tangential-compliance-in-planar-impact-of-rough-bodies/7F648E2F331B395BF60EC6B9FC561013) et de [Pooltool](https://pooltool.readthedocs.io/en/latest/autoapi/pooltool/physics/index.html). Le frottement du caoutchouc peut dépendre de la vitesse et de la viscoélasticité, mais les [travaux généraux sur les élastomères](https://www.nature.com/articles/s41598-021-97921-0) ne constituent **pas** une mesure de notre bande américaine.

**Attention :** tous les points d'ajustement et de contrôle mentionnés ci-dessous proviennent **de la même régression TUM**, évaluée à différentes vitesses/angles. Les groupes permettent de détecter une suradaptation de la grille, **pas** de démontrer une précision sur des tables indépendantes. Les vitesses angulaires après collision et les paramètres matériaux K55/K66 restent inconnus.

## Procédure effectuée

1. **Sensibilité locale** de quatre variables : `μ_d`, `μ_s`, `ω_t/ω_n`, `ζ_t`, par perturbations de ±10 % autour de la v0.18. Chaque perturbation influence les vitesses tangentielles ; les régimes adhérence/glissement sont parfois discontinus.
2. **Recherche large** sur un jeu d'ajustement : 1 500 tirages pseudoaléatoires, optimisation locale par pas bornés, puis 180 générations d'évolution différentielle. Bornes d'ingénierie `μ_d∈[0,15;0,70]`, `μ_s−μ_d∈[0;0,25]`, `ω_t/ω_n∈[0,6;4]`, `ζ_t∈[0;0,5]`.
3. La meilleure solution large atteignait `μ_d≈0,70` et `μ_s≈0,95`, près des bornes. Erreur quadratique moyenne d'ajustement : **11,88 → 9,87 points** ; contrôle à vitesse intermédiaire : **9,06 → 11,76 points**. **Rejetée** : paramètres extrêmes et contrôle dégradé.
4. **Recherche locale bornée** autour des valeurs initiales : 16 000 tirages reproductibles (`seed=472931`), avec trois groupes de points de la régression TUM. Acceptation seulement si l'erreur quadratique des **trois groupes** et l'écart maximal global ne se dégradent pas. **8 combinaisons acceptées**, parmi 149 améliorant le premier groupe. Le meilleur réglage conservateur devient le profil facultatif v0.19.

Scripts de reproduction : `scripts/calibrate-cushion.js` et `scripts/guarded-cushion-fit.js`. Ils n'accèdent à aucune donnée confidentielle et ne dépendent d'aucun service externe.

## Paramètres avant / après

Ces nombres sont des **coefficients effectifs de notre solveur**, et **non** des mesures directes du frottement ou de la raideur d'une bande K55/K66.

| Coefficient | v0.18 initiale | v0.19 ajustée | Variation |
|---|---:|---:|---:|
| Frottement dynamique `μ_d` | `0,200000` | `0,223722` | `+11,9 %` |
| Frottement statique `μ_s` | `0,240000` | `0,269222` | `+12,2 %` |
| Rapport de pulsations `ω_t/ω_n` | `1,800000` | `1,856039` | `+3,1 %` |
| Amortissement tangentiel `ζ_t` | `0,060000` | `0,026114` | `−56,5 %` |
| Pulsation normale `ω_n` | `2 200 rad/s` | **inchangée** | — |
| Restitution normale `e_n(v,θ)` | Empirique pool TUM | **inchangée** | — |

La baisse relative d'amortissement est importante, même si sa valeur absolue change de seulement `0,034`. Aucun paramètre n'a été présenté comme propriété physique identifiée du caoutchouc.

## Vérification des 3 groupes

Toutes les erreurs sont des **points de pourcentage de vitesse tangentielle conservée après glissement**, comparés à la régression publiée :

| Groupe | Cas | RMSE v0.18 | RMSE v0.19 | Écart maximal v0.18 → v0.19 |
|---|---:|---:|---:|---:|
| Ajustement : `0,5` et `2,3 m/s` × `30/45/60/75°` | 8 | `11,882` | `11,470` | `19,94 → 18,97` |
| Contrôle de vitesse : `1,2 m/s` × mêmes angles | 4 | `9,058` | `6,879` | `13,82 → 10,03` |
| Interpolation de la régression : `0,8/1,6/2 m/s` × `20/40/55/70°` | 12 | `11,013` | `10,496` | `22,45 → 22,05` |

Le contrôle de vitesse et le groupe d'interpolation **ont servi de critères d'acceptation** du profil final : les appeler validation indépendante serait erroné. L'erreur absolue moyenne du premier groupe augmente légèrement malgré la baisse de RMSE : l'amélioration est **partielle**, pas uniforme tir par tir.

### Banc de calibration du jeu (57 scénarios)

Sur les **24 composantes normales et tangentielles pool** :

| Modèle | Erreur absolue moyenne (points) | RMSE (points) | Tangentielle après rebond à `2,3 m/s`, `75°` |
|---|---:|---:|---:|
| Pool v0.17 empirique | `0,0515` | `0,0810` | `71,84 %` |
| Pool v0.18 déformable initial | `4,5838` | `7,7935` | `91,79 %` |
| **Pool v0.19 déformable ajusté** | **`4,4089`** | **`7,1930`** | **`90,82 %`** |
| Régression TUM (cible, `75°`) | — | — | `71,85 %` |

**Conclusion :** quatre coefficients constants permettent un progrès limité, mais ne corrigent pas les rebonds rasants. Le fit empirique v0.17 reste très supérieur sur les observables qui ont servi à le construire. Pour aller plus loin, il faudra étudier un frottement ou un amortissement dépendant du régime de contact/vitesse, ou recueillir des mesures indépendantes ; les études générales sur le caoutchouc ne suffisent pas à imposer une loi propre au pool.

## Intégration et compatibilité

- Nouvelle sélection **Pool v0.19 · Élastique ajusté (provisoire)** dans le menu `MODÈLE DE BANDE`. Elle passe par le même calcul que la v0.18 avec un preset distinct, sans modification de l'algorithme de la v0.17.
- Le profil snooker continue de contourner la branche américaine et n'est pas recalibré ; géométrie snooker toujours non modélisée séparément.
- Les **57 scénarios** et les trajectoires prédites utilisent le modèle choisi. Rejouer un tir rétablit désormais automatiquement son modèle d'origine.
- L'export de trajectoire CSV fournit une colonne `cushion_model`; l'export du banc porte le modèle dans son nom de fichier.
- **79 tests** : vérification des trois groupes, stabilité énergétique des collisions avec effets importants, non-régression du snooker, conservation des profils v0.17/v0.18, métadonnées de trajectoire CSV, identité entre prévision de bande et simulation v0.19, tests de collisions et de trajectoires déjà existants.

## Paramètres encore non identifiés

Les valeurs complètes et leur statut sont dans [RELEASE_NOTES_v0.18.md](RELEASE_NOTES_v0.18.md). Restent prioritaires : mesure de `k_n` et du temps de contact, frottements `μ_s(v,T)` / `μ_d(v,T)` **sur bande américaine réelle**, raideur et hystérésis tangentielle, transfert de rotation avec effets latéraux, contact simultané tapis–bande, restitution en fonction de la vitesse et de l'angle, puis validation sur une autre table. Le tapis, les facings des poches, le contact bille–bille, le procédé et les contacts simultanés de la casse restent également à affiner.
