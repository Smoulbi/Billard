# Protocole de validation indépendante des rebonds de bandes de pool US

## Acquisition

1. Relever la table, le fabricant des bandes (K55/K66 si connu), leur état et la date. Noter diamètre et masse des billes, type et état du tapis.
2. Placer une caméra au-dessus de la table, étalonner les distances en mètres avec au moins deux repères mesurés ; filmer à **240 images/s si possible** et éviter la parallaxe.
3. Produire des impacts en roulement **sans effet latéral** : 0,5 / 1,2 / 2,3 m/s et 30° / 45° / 60° / 75° mesurés depuis la normale à la bande. Effectuer **au moins cinq répétitions** par combinaison et enregistrer chaque tir séparément.
4. Mesurer les vitesses des centres juste avant l'impact. Suivre la vitesse de la bille après impact jusqu'au **premier roulement sans glissement** ; identifier si possible cette transition grâce à des repères visuels de rotation sur la bille. Ne pas confondre vitesse immédiatement après le contact et vitesse après retour au roulement.
5. Projeter les vitesses entrante et sortante sur la normale et la tangente à la bande. Pour chaque tir, calculer deux pourcentages : `100 × |v_n,sortie| / |v_n,entrée|` et `100 × v_t,sortie / v_t,entrée` (conserver le signe tangent selon l'orientation choisie). Exclure les quasi-incidences normales si le dénominateur tangent n'est pas résoluble.
6. Conserver les coordonnées brutes, les images, les incertitudes et les tirs rejetés avec leur motif, avant d'effectuer l'analyse. Une mesure acquise sur une table jamais utilisée pour ajuster le moteur constitue un véritable test externe.

## Format JSON d'entrée

Créer `mesures-pool.json` en reprenant **uniquement des mesures réelles** :

```json
{
  "table": "identifiant unique et description de la table mesurée",
  "measurements": [
    {
      "shotId": "prise-001-normal",
      "incoming": 1.2,
      "angleDeg": 45,
      "component": "normal",
      "observedPercent": 63.5
    }
  ]
}
```

La valeur `63.5` ci-dessus est **un exemple fictif de syntaxe**, pas une donnée expérimentale. Pour un même tir, utiliser deux identifiants distincts (`-normal`, `-tangent`) si les deux composantes sont renseignées. L'identifiant `table` doit permettre de retrouver le protocole et les vidéos.

Lancer :

```bash
node scripts/compare-cushion-models.js mesures-pool.json
```

Le rapport JSON contient deux blocs séparés : `publishedRegression` pour l'ajustement interne et `independentTable` pour les nouvelles observations. Les erreurs (MAE, RMSE, biais) sont calculées **en points de pourcentage**, sans retrancher ni remplacer le bloc de référence. La classification « indépendante » suppose que les nouvelles mesures ne sont pas celles ayant servi au choix des paramètres.
