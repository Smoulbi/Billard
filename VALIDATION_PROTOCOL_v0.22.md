# Protocole de validation indépendante — billard américain

## Objet et séparation des preuves

Le code ne dispose aujourd'hui que de régressions de tirs publiés et de cas théoriques. Aucun enregistrement brut indépendant de notre table n'est présent. Le protocole décrit l'acquisition nécessaire pour départager les moteurs v0.17, v0.21 et le candidat v0.22, **sans** modifier des lois pour forcer un accord apparent.

## Matériel et conditions à documenter

- Table américaine identifiable : fabricant, modèle, dimensions réelles au nez de bande, type de gomme (K55/K66 si établi), âge et entretien du tapis, température et humidité.
- Billes américaines 57,15 mm ; mesurer masse et diamètre, décrire propreté et état du jeu.
- Caméra au-dessus de la bande, référence métrique plane et correction de perspective. Viser 500 images/s ou davantage, avec obturation rapide et trajectoires de centres résolues à l'échelle millimétrique. Une seconde vue latérale rapide permet de quantifier l'élévation verticale : indispensable si l'on veut réellement valider le solveur 6-DOF.
- Image et données brutes non retraitées archivées ; horodatage, procédure de calibrage de la caméra, précision en pixels, incertitudes et exclusions consignées.

## Matrice d'essais

- Vitesses incidentes approchées : 0,5 ; 1,2 ; 2,3 m/s, **mesurées** avant impact, non supposées égales à un réglage de puissance.
- Angles incidents approchés : 30°, 45°, 60°, 75° par rapport à la normale à la bande, **mesurés** avant impact.
- Au moins cinq répétitions indépendantes par combinaison = **60 tirs** sans effet latéral intentionnel, avec roulement naturel initial. Les impacts doivent être placés assez loin des poches et des jonctions.
- Réserver au minimum deux répétitions de chaque combinaison pour une validation finale, non utilisées pour ajuster les paramètres. Conserver les conditions séparées par table si plusieurs tables sont filmées.
- Répéter ensuite avec des effets latéraux connus, mais les tenir **hors** du premier ajustement tant qu'une mesure fiable de vitesse angulaire est indisponible.

## Extraction des observables

1. Estimer les vitesses du centre de la bille avec une régression position–temps sur plusieurs images juste avant impact. Corriger le facteur de perspective et quantifier l'incertitude.
2. À la sortie du choc et après le premier retour au roulement (fin du glissement), mesurer les deux composantes selon normale et tangente à la bande. Vérifier le premier roulement par les marques tournantes ou une mesure de spin ; il ne suffit pas de prendre une image arbitraire « après choc ».
3. Calculer les ratios : `observedPercent_normal = 100 * v_normal_sortie / abs(v_normal_entrée)` et `observedPercent_tangent = 100 * v_tangent_sortie / v_tangent_entrée`. Les angles choisis excluent 0°, qui rend le dénominateur tangentiel nul.
4. Conserver la direction signée, les écarts-types de répétition et les incertitudes de poursuite. Ne pas supprimer les échecs sans règle préalable consignée.
5. Séparer strictement les tirs « identification » des tirs « validation ». Comparer, sur la validation, le biais, la MAE, la RMSE, le pire écart, chaque vitesse, chaque angle et la dépendance à l'effet.

## Fichier JSON d'import

Chaque tir physique peut produire deux lignes possédant le **même** `shotId` et des composantes différentes. Un même identifiant ne peut pas mélanger les conditions d'acquisition.

```json
{
  "table": "IDENTIFIANT_REEL_DE_LA_TABLE",
  "measurements": [
    {
      "shotId": "IDENTIFIANT_REEL_DU_TIR",
      "incoming": 1.2,
      "angleDeg": 45,
      "component": "normal",
      "observedPercent": 0
    }
  ]
}
```

**Le `0` ci-dessus est un emplacement de saisie, pas un résultat expérimental. Ce bloc est uniquement un schéma illustratif ; ne pas l'utiliser dans les audits.** Il faut ajouter une seconde ligne de composante `tangent` lorsqu'elle est disponible, puis les mesures de tous les tirs. Les métadonnées originales et les vidéos doivent être conservées à part, car les scripts ne peuvent pas vérifier leur authenticité.

## Contrôle logiciel

```bash
npm test
node scripts/compare-cushion-models.js mesures-pool.json
node scripts/audit-v022.js mesures-pool.json
```

- Le premier audit sert à comparer les moteurs déjà jouables aux mesures **fournies**.
- Le second vérifie aussi le candidat à contact simultané et retourne son **statut de non-régression**.
- Aucun succès de script ne constitue une certification de provenance. Il faut analyser les vidéos, l'étalonnage et la séparation réelle entre identification et validation.
- Une nouvelle loi n'entre dans l'application que si elle apporte un gain sur l'échantillon indépendant et ne dégrade pas de manière significative les cas précédents, avec les incertitudes expérimentales documentées.
