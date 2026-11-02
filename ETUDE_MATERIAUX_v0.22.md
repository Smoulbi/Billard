# FRAME v0.22 — étude documentaire et essai matériel séparé

## Décision

Le solveur simultané bande–bille–tapis v0.22 reste **expérimental**. Le comportement jouable de la v0.21 n'est pas modifié. Les données de référence américaines disponibles ne justifient pas son remplacement.

Une étude publiée fournit toutefois des modules élastiques et coefficients de Poisson utilisables pour remplacer **deux paramètres de raideur exploratoires**, sans retoucher la restitution ou le frottement pour mieux coller artificiellement aux résultats.

## Valeurs issues de la littérature

Gismeros Moreno et al., *Modelling multiple-simultaneous impact problems with a nonlinear smooth approach: pool/billiard application*, *Nonlinear Dynamics* 107 (2022), 1859–1886, tableau 1 et équation (3.6), DOI: https://doi.org/10.1007/s11071-021-07117-4, manuscrit : https://e-archivo.uc3m.es/bitstream/handle/10016/34167/modelling_ND_2022.pdf?isAllowed=y&sequence=1.

| Matériau considéré par l'étude | Module de Young | Coefficient de Poisson | Origine et limites |
|---|---:|---:|---|
| Bille en résine phénol-formaldéhyde | 3 800 MPa | 0,375 | Valeur matérielle rapportée, pas mesure de nos billes |
| Caoutchouc de la bande | 7 MPa | 0,50 | Caoutchouc représentatif, **pas mesure de gomme K55/K66 précise** |
| Laine du tapis | 3 100 MPa | 0,38 | Hypothèse matérielle de l'étude, **pas rigidité assemblée tapis + ardoise** |

Avec le rayon américain `R = 0,028575 m`, l'approximation hertzienne **sphère–plan** donne :

`K = (4/3) * sqrt(R) / [(1 - ν_b²)/E_b + (1 - ν_s²)/E_s]`

La force normale élastique a pour forme `F_n = K * δ^(3/2)`.

| Contact | Raideur exploratoire v0.22 | Raideur dérivée de l'étude | Unité |
|---|---:|---:|---|
| Bille–bande | 100 000 000 | **2 099 196** | N/m^(3/2) |
| Bille–tapis | 100 000 000 | **448 845 888** | N/m^(3/2) |

Ces valeurs sont des **sorties d'un calcul conditionné aux hypothèses de 2022**, pas des mesures de raideur sur une bande réelle. Le contact avec une arête de bande arrondie est notamment différent d'une sphère contre un plan infini. Le modèle de Hertz n'établit pas à lui seul la loi hystérétique du caoutchouc.

## Autres sources contrôlées et non-importation de constantes

1. Nierhoff, Heunisch et Hirche, *Strategic play for a pool-playing robot* (2012), publient deux régressions de composantes cinématiques à partir de **1 217 rebonds de billard américain**. Leur modèle adopte des hypothèses de roulement autour du choc et ne mesure pas isolément les constantes intrinsèques gomme–bille. Il sert ici de **référence de sortie**, pas de fournisseur de restitution Lankarani–Nikravesh. Document : https://mediatum.ub.tum.de/doc/1155344/988748.pdf.
2. Mathavan, Jackson et Parkin, *A theoretical analysis of billiard ball dynamics under cushion impacts*, *Proceedings of the Institution of Mechanical Engineers, Part C* (2010), DOI: https://doi.org/10.1243/09544062JMES1964. Les constantes `e=0,98` et `μ=0,14` qui circulent dans les modèles ultérieurs proviennent de **snooker**, pas d'une caractérisation spécifique K55/K66 américaine. **Non transférées.**
3. Gismeros Moreno et al. (2022) emploient des constantes de restitution/frottement dans des simulations, mais leur tableau ne constitue pas une campagne indépendante d'identification K55/K66. **Non transférées.**
4. Mathavan, Jackson et Parkin, *Application of high-speed imaging to determine the dynamics of billiards*, *American Journal of Physics* 77 (2009), 788–794, DOI: https://doi.org/10.1119/1.3157159. Leur vidéo rapide mesure, sur **snooker**, une restitution effective moyenne de `0,818` pour les chocs perpendiculaires, sans effet latéral, avec roulement initial. Cette valeur **inclut** les effets de rotation et de frottement : elle ne peut pas être injectée comme restitution matérielle de la gomme américaine. L'article est utile pour définir l'acquisition et séparer les observables avant/après glissement.

## Audit reproductible

Commande depuis le dossier du projet :

```bash
node scripts/audit-material-v022.js
npm test
```

Les données comparées sont **24 composantes théoriques calculées avec les régressions publiées** (trois vitesses, quatre angles, deux composantes), pas les 1 217 mesures brutes. Le même référentiel a déjà guidé les versions précédentes : il ne constitue **pas un échantillon indépendant**.

| Candidat | RMSE, points de pourcentage | Pire écart, points de pourcentage | État |
|---|---:|---:|---|
| v0.21 maintenue | **3,84684** | 11,07588 | Modèle actif ; comparaison *sur la régression*, pas validation indépendante |
| v0.22 simultanée initiale | 18,26853 | 35,10392 | Rejetée |
| v0.22 + modules publiés | 12,63045 | 21,59037 | Amélioration du candidat, **toujours rejetée** |
| v0.22 + modules publiés + lois du tapis documentées | **11,7054** | **20,3578** | Amélioration supplémentaire, **toujours rejetée** |

Les modules publiés réduisent la RMSE du candidat de `5,63808` points, mais son erreur reste plus de trois fois celle de v0.21 sur la référence choisie. **Aucun réglage ne modifie les comportements de jeu** ; le nouveau jeu de paramètres est accessible séparément par `PUBLISHED_MODULI_POOL_CONTACT` dans `dist/simultaneous-cushion.js`.

### Essai complémentaire : lois du tapis directement documentées

Gismeros Moreno et al. (2022), équation (3.9), privilégient une loi **purement hertzienne** pour la réaction normale du tapis, sans amortissement normal de Lankarani–Nikravesh. La variante `LITERATURE_POOL_CONTACT` applique cette formulation. Le reste du modèle de bande demeure intact.

La même variante teste la mesure sur **billard américain** de Nierhoff et al. (2012), équations (6), (17) et (18). Ils mesurent une résistance au glissement à l'aide d'un montage de trois billes tiré sur le tapis. Dans leur écriture, l'intensité de frottement vaut `F_frottement = μ(v) * F_normal` avec `μ(v) = λ_sa + λ_sr * v`, où `v` est la norme de la vitesse tangentielle du contact. Les coefficients publiés sont :

| Vitesse de glissement | `λ_sa` | `λ_sr` (s/m) | Source |
|---|---:|---:|---|
| `v ≤ 0,672 m/s` | 0,2014 | 0,4763 | Régression TUM (2012) |
| `v > 0,672 m/s` | 0,2322 | 0,0180 | Régression TUM (2012) |

Cette loi publiée est discontinue au seuil de 0,672 m/s ; elle est reproduite telle quelle dans cette **hypothèse de recherche**, sans raccord arbitraire. Les données concernent la table instrumentée par les auteurs. Leur utilisation pour améliorer les comparaisons avec leur régression des bandes n'est **pas une validation indépendante**.

La mesure TUM décrit une force de traction `mg(λ_sa + λ_sr·v)` sur le montage ; dans notre simulateur 3D, son application à `F_normal` est une **extension mécanique à vérifier**, spécialement pendant le contact transitoire avec une bande.

La prise en compte des deux lois du tapis réduit la RMSE de **12,6305 à 11,7054 points**, mais ne rapproche pas suffisamment la variante de la v0.21 (**3,8468** points). L'expérience avec le seul modèle normal hertzien change très peu la RMSE (`12,6286` points), tandis que l'essentiel du gain vient du frottement du tapis mesuré par la TUM. Les lois de gomme, leur dépendance à la vitesse et la géométrie K55/K66 restent non identifiées.

### Garde-fou renforcé : les régressions locales comptent

Le script effectue maintenant deux comparaisons avec une tolérance de `0,05` point de pourcentage sur **chaque composante** :

| Évolution expérimentale | RMSE avant → après | Composantes dégradées sur 24 | État |
|---|---:|---:|---|
| Raideurs exploratoires → modules publiés | 18,2685 → 12,6305 | **5** | Rejet local |
| Modules publiés → lois du tapis publiées | 12,6305 → 11,7054 | **7** | Rejet local |

Dans le deuxième essai, l'angle de `30°` se dégrade de `11,6342` à `12,1248` points de RMSE, et la composante tangentielle de `10,4240` à `10,6194` points. Les trois groupes de vitesses progressent, mais cela ne compense **pas** ces pertes locales.

Le contrôle `comparePoolResearchVariants` vérifie la RMSE par vitesse, angle et composante, ainsi que les 24 écarts individuels. **Le scénario est refusé dès qu'une composante s'éloigne de plus de 0,05 point de la référence.** Il ne peut être promu sur la seule base de son erreur globale.

L'accès à la variante est limité aux scripts et à l'API de recherche : `LITERATURE_POOL_CONTACT`. Elle **n'est pas sélectionnable comme nouveau moteur jouable** tant que les garde-fous de non-régression échouent.

Un fichier de mesures indépendantes peut être fourni en argument :

```bash
node scripts/audit-material-v022.js mesures-pool.json
```

Il est interprété conformément à `VALIDATION_PROTOCOL_v0.22.md`, sans authentification automatique de sa provenance.

## Paramètres et phénomènes qui restent à identifier

| Priorité | Inconnue | Mesure ou condition nécessaire |
|---|---|---|
| Haute | Géométrie et déformabilité du nez de bande K55/K66 | Profil métrique réel, hauteur, rayon local, essais de compression dynamique |
| Haute | Restitution normale de la gomme selon la vitesse d'impact et la température | Rebond rapide filmé en distinguant vitesse juste après choc et vitesse après glissement |
| Haute | Frottement bille–bande, selon vitesse de glissement et rotation | Impacts obliques sur table américaine, suivi 3D de rotation |
| Haute | Frottement et compliance de l'ensemble tapis–ardoise | Mesures sur la table cible, dont décollage vertical et durée de contact |
| Moyenne | Paramètres dissipatifs tapis/caoutchouc (hystérésis, fréquence, état) | Essais répétés à plusieurs vitesses et températures |
| Moyenne | Rugosité, variabilité entre tables, usure, humidité | Échantillons sur plusieurs tables avec incertitudes |
| Technique | Discrétisation et formulation du contact de nez arrondi | Étude de convergence, variation de loi de contact à paramètres mesurés constants |

La validation décisive exige des tirs réservés au test, jamais utilisés pour calibrer les paramètres. Des séries avec et sans effet et des vidéos latérales sont nécessaires pour vérifier la cinématique verticale à six degrés de liberté.
