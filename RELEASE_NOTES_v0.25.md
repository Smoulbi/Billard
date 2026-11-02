# FRAME v0.25 — poches sans débordement sur le drap

**1er novembre 2026 — correctif purement graphique.**

## Cause du défaut

En v0.24, les garnitures des poches étaient fabriquées comme des **portions de couronnes circulaires trop larges**, positionnées au niveau supérieur des rails. Leurs arcs recouvraient le drap, notamment près des poches latérales. Les doublures en forme de cylindre dépassaient également au-dessus de la surface du tapis, et leur bord supérieur était un anneau complet.

## Correction

- Suppression de toutes les couronnes circulaires de garniture au-dessus du plateau.
- Remplacement par des **raccords métalliques géométriquement extérieurs au rectangle de jeu** : pièces d'angle en L et ponts au dos des deux poches latérales. Ils conservent les raccords aux rails sans surplomber le tapis.
- Lèvres de poche correspondant aux arcs du drap existant : **90° dans les coins, 180° au milieu**. Chaque lèvre reste à l'intérieur de l'échancrure dans le drap, avec un très faible retrait radial.
- Bord supérieur du filet et de la doublure déplacé sous le drap ; diamètre extérieur réduit pour demeurer à l'intérieur des évidements réels.
- Nouvelle vérification automatique des six poches, par échantillonnage des contours **et** des triangles 3D effectivement créés par Three.js : aucun point inspecté n'empiète sur la surface jouable.
- Paramètres `?v=025` sur les ressources du rendu pour éviter qu'un ancien modèle reste présent en cache dans le navigateur.

## Aucun changement mécanique

`dist/physics.js`, les lois de bandes, les dimensions et les données expérimentales restent identiques à la v0.24. Le correctif ne modifie que le rendu.
