# FRAME v0.22 — expérimentation contrôlée et refus des régressions

31 octobre 2026. **Version de recherche, non promotion d'un moteur de bande.**

## Décision scientifique

Le modèle v0.22 de contact simultané bille–bande–tapis a été **implémenté, testé, comparé puis refusé pour le jeu**. Avec les constantes de contact exploratoires ci-dessous, il s'écarte davantage de la régression publiée pour le billard américain. La v0.21, les anciennes variantes et le snooker demeurent inchangés ; la référence empirique v0.17 reste choisie par défaut.

| Régression TUM : 24 composantes, points de pourcentage | v0.21 | v0.22 non calibrée |
| --- | ---: | ---: |
| Erreur absolue moyenne (MAE) | 2,783 | 15,092 |
| Erreur quadratique moyenne (RMSE) | 3,847 | 18,269 |
| Pire composante | 11,076 | 35,104 |
| RMSE à 0,5 m/s | 4,709 | 22,284 |
| RMSE à 1,2 m/s | 3,682 | 17,337 |
| RMSE à 2,3 m/s | 2,943 | 14,285 |

Il ne s'agit **pas** d'une validation indépendante : les 24 composantes sont calculées avec les équations de régression issues de 1 217 impacts sur une table de billard américain dans l'étude de Nierhoff, Heunisch et Hirche. La v0.21 a elle-même été ajustée en partie à cette régression. Un score de zéro ne prouverait donc pas une prédiction correcte sur une autre table.

## Physique nouvellement implémentée

`dist/simultaneous-cushion.js` calcule indépendamment une bille sphérique avec :

1. trois vitesses de translation et trois vitesses angulaires ; aucune hauteur imposée pendant le contact ;
2. pesanteur, réaction normale non linéaire du tapis et frottement au contact inférieur de la bille ;
3. réaction normale non linéaire de la bande, dirigée suivant le rayon de contact avec une lèvre arrondie ;
4. frottements tangentiels sur la bande et sur le tapis, calculés **au même pas de temps** à partir des vitesses de contact, puis intégrés simultanément ;
5. force normale de type Hertz à exposant 3/2, avec amortissement hystérétique de Lankarani–Nikravesh ;
6. énergie cinétique, potentielle gravitationnelle et énergies élastiques suivies à chaque micro-pas ;
7. poursuite de l'évolution 3D jusqu'au premier roulement sur le tapis pour la mesure comparative, y compris en présence d'un décollage temporaire.

L'intégration utilise un pas nominal de 1 µs, testé à 2 µs et 0,5 µs. Le calcul est **séparé du moteur temps réel**. Ce n'est ni une conversion fidèle du solveur publié ni une représentation mesurée du profil K55/K66. L'approximation géométrique actuelle est celle d'une lèvre arrondie, pas de tous les flancs de la bande de pool.

## Paramètres du scénario de recherche

Ces valeurs servent à tester la structure numérique. **Elles ne sont pas des propriétés expérimentales du caoutchouc américain.**

| Paramètre | Valeur de test | Preuve disponible |
| --- | ---: | --- |
| Raideur normale de la bande (Hertz) | 1,0 × 10⁸ N/m^1,5 | Hypothèse, pas mesurée |
| Restitution de contact intrinsèque de la bande | 0,85 | Hypothèse, pas identifiée |
| Frottement dynamique bande–bille | 0,15 | Hypothèse, pas mesurée |
| Raideur normale du tapis | 1,0 × 10⁸ N/m^1,5 | Hypothèse, pas mesurée |
| Restitution et vitesse de référence du tapis | 0,40 ; 0,20 m/s | Hypothèses d'amortissement |
| Frottement glissant du tapis | 0,20 | Repère déjà utilisé pour le pool |
| Régularisation du glissement | 0,001 m/s | Paramètre purement numérique |

Une étude de **27 scénarios** (raideur bande 0,5/1/2 × 10⁸ N/m^1,5 ; restitution 0,75/0,85/0,95 ; friction 0,05/0,15/0,30) donne un meilleur RMSE de **12,042 points**, restant très inférieur à la qualité de reproduction de la v0.21. Cette exploration est un test de sensibilité **en échantillon**, ni une estimation des propriétés matérielles ni une recherche exhaustive. Aucun de ces scénarios n'est installé.

## Contrôles passés

- Forces de bande et de tapis simultanément non nulles pendant le même choc.
- Déplacement vertical non contraint et décollage traité sans retour artificiel à un solveur plan.
- Énergie préservée à la tolérance numérique lorsque les deux contacts sont élastiques et sans frottement.
- Énergie dissipée lorsque les coefficients de friction et de restitution le prévoient, pour des incidences et des rotations latérales variées.
- Résultats du retour au roulement stables lors du raffinement temporel.
- Garde de non-régression : MAE, RMSE, pire composante et RMSE/pire cas de chaque groupe de vitesse.
- Compatibilité des tests de la v0.21 et comparaison bit à bit du snooker historique dans les modes jouables.
- **105 tests automatiques réussis** pour ce code.

Les forces et leur amortissement dépendent fortement de la géométrie de lèvre et de coefficients matériels inconnus. Des tests de cohérence mécanique **ne** prouvent **pas** la fidélité à des rebonds réels.

## Commandes de reproduction

```bash
npm test
node scripts/audit-v022.js
node scripts/sensitivity-v022.js
node scripts/compare-cushion-models.js
```

Une acquisition nouvelle sur une vraie table est décrite dans `VALIDATION_PROTOCOL_v0.22.md`. Pour réutiliser des enregistrements indépendants :

```bash
node scripts/audit-v022.js mesures-pool.json
```

Un résultat compatible avec la régression n'autoriserait **toujours pas** une promotion automatique : il faut vérifier l'origine des tirs et le maintien des performances sur les tirs réservés à la validation. Si le candidat est moins bon, `status` prend la valeur `REJECTED_REGRESSION` ou `REJECTED_INDEPENDENT_MEASUREMENTS`.

## Ce qui reste impossible à conclure

- Aucune acquisition indépendante n'a été effectuée sur une table américaine déterminée.
- Aucune caractérisation force–déformation/frottement d'un caoutchouc K55 ou K66 réel n'est fournie.
- L'hypothèse d'une lèvre arrondie peut être incorrecte pour les flancs du profil utilisé.
- Les publications disponibles ici ne fournissent pas toutes les trajectoires individuelles permettant de remplacer leurs régressions par des observations brutes indépendantes ; Gismeros Moreno et al. précisent que leurs jeux de données sont disponibles auprès de l'auteur correspondant sur demande raisonnable.
- Ni le moteur v0.21 ni le candidat v0.22 n'ont une validation établie sur des tirs comprenant effets latéraux, rebonds sur bandes multiples, géométries de poches et sauts.

## Travaux scientifiques

1. Nierhoff, T., Heunisch, K., Hirche, S. (2012), *Strategic play for a pool-playing robot* : régression de 1 217 impacts sur pool. https://mediatum.ub.tum.de/doc/1155344/988748.pdf
2. Gismeros Moreno, R. et al. (2022), *Modelling multiple-simultaneous impact problems with a nonlinear smooth approach: pool/billiard application*, *Nonlinear Dynamics* 107, 1859–1886. https://doi.org/10.1007/s11071-021-07117-4
3. Lankarani, H. M., Nikravesh, P. E. (1990), *A contact force model with hysteresis damping for impact analysis of multibody systems*. https://doi.org/10.1115/1.2912617
4. Mathavan, S., Jackson, M. R., Parkin, R. M. (2010), *A theoretical analysis of billiard ball dynamics under cushion impacts* : **snooker**, utilisé pour l'architecture de contact, pas comme propriétés mesurées du pool. https://doi.org/10.1243/09544062JMES1964
